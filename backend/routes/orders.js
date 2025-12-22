const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../db');
const logger = require('../lib/logger');
const { authenticateToken: auth } = require('../middleware/authMiddleware');

// Sipariş oluştur (authentication GEREKLİ DEĞİL, guest de olabilir)
router.post('/', async (req, res) => {
  const {
    customer_name,
    customer_email,
    customer_phone,
    shipping_address,
    items = [],
    total_amount,
    payment_method
  } = req.body;

  // Giriş yapan kullanıcı varsa userId, yoksa null (guest order)
  const userId = req.user?.userId || req.user?.id || null;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Sipariş için en az bir ürün gerekli' });
  }

  try {
    // Aggregate quantities per variant to avoid double-check races in same order
    const qtyByVariant = {};
    for (const it of items) {
      const vid = it.variant_id || 0; // 0 means no variant
      qtyByVariant[vid] = (qtyByVariant[vid] || 0) + (Number(it.quantity) || 0);
    }

    // Begin transaction
    await dbRun('BEGIN TRANSACTION');

    // Check stock for variants referenced in order
    for (const [vidStr, requiredQty] of Object.entries(qtyByVariant)) {
      const vid = Number(vidStr);
      if (vid > 0) {
        const variant = await dbGet('SELECT id, product_id, stock FROM variants WHERE id = $1', [vid]);
        if (!variant) {
          await dbRun('ROLLBACK');
          return res.status(400).json({ error: `Varyant bulunamadı (variant_id=${vid})` });
        }
        if (variant.stock == null) variant.stock = 0;
        if (variant.stock < requiredQty) {
          await dbRun('ROLLBACK');
          return res.status(400).json({ error: `Yetersiz stok: variant_id=${vid}` });
        }
      }
    }

    // Insert order
    // Ensure we provide both `total` and `total_amount` to match DB schema
    const insertOrder = `
      INSERT INTO orders (user_id, customer_name, customer_email, customer_phone, shipping_address, total, total_amount, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', CURRENT_TIMESTAMP)
    `;

    const totalValue = Number(total_amount) || 0;
    const orderResult = await dbRun(insertOrder, [userId, customer_name, customer_email, customer_phone, shipping_address, totalValue, totalValue]);
    const orderId = orderResult.lastID;

  // Insert order items and decrement variant stocks or product stock
  const itemQuery = 'INSERT INTO order_items (order_id, product_id, variant_id, quantity, price) VALUES ($1, $2, $3, $4, $5)';

    for (const item of items) {
      const productId = item.product_id || null;
      const variantId = item.variant_id || null;
      const quantity = Number(item.quantity) || 1;
      const price = Number(item.price) || 0;

      await dbRun(itemQuery, [orderId, productId, variantId, quantity, price]);

      if (variantId) {
        // Decrement stock for the variant
        await dbRun('UPDATE variants SET stock = stock - $1 WHERE id = $2', [quantity, variantId]);
        logger.info(`Order ${orderId}: decremented variant ${variantId} by ${quantity}`);
      } else if (productId) {
        // Decrement product-level stock if exists
        const prod = await dbGet('SELECT id, stock FROM products WHERE id = $1', [productId]);
        if (!prod) {
          await dbRun('ROLLBACK');
          return res.status(400).json({ error: `Ürün bulunamadı (product_id=${productId})` });
        }
        if (prod.stock == null) prod.stock = 0;
        if (prod.stock < quantity) {
          await dbRun('ROLLBACK');
          return res.status(400).json({ error: `Yetersiz stok: product_id=${productId}` });
        }
        await dbRun('UPDATE products SET stock = stock - $1 WHERE id = $2', [quantity, productId]);
        logger.info(`Order ${orderId}: decremented product ${productId} by ${quantity}`);
      }
    }

    // Commit transaction
    await dbRun('COMMIT');

    res.status(201).json({ order_id: orderId, message: 'Sipariş oluşturuldu', customer_email });
  } catch (err) {
    // Try rollback if possible
    try {
      await dbRun('ROLLBACK');
    } catch (e) {
      // ignore
    }
    console.error('Order creation error:', err && err.stack ? err.stack : err);
    // Return more detailed error for debugging (temporary)
    const resp = { error: 'Sipariş oluşturulurken hata oluştu' };
    try {
      resp.details = err.message;
      resp.stack = err.stack;
    } catch (e) {
      // ignore
    }
    res.status(500).json(resp);
  }
});

// Kullanıcının tüm siparişlerini getir
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const orders = await dbAll('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sipariş detayı
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await dbGet('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    
    if (!order) {
      return res.status(404).json({ error: 'Sipariş bulunamadı' });
    }

    // Sipariş öğelerini getir
    const items = await dbAll(`
      SELECT oi.*, p.name, p.image_url 
      FROM order_items oi 
      LEFT JOIN products p ON oi.product_id = p.id 
      WHERE oi.order_id = $1
    `, [order.id]);
    
    order.items = items;
    res.json(order);
  } catch (error) {
    console.error('Get order detail error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel order (restore stock)
router.post('/:id/cancel', auth, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const userId = req.user?.userId || req.user?.id;

  try {
    // Get order details
    const order = await dbGet('SELECT * FROM orders WHERE id = $1', [id]);
    
    if (!order) {
      return res.status(404).json({ error: 'Sipariş bulunamadı' });
    }

    // Check if user owns this order or is admin
    if (order.user_id !== userId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Bu siparişi iptal etme yetkiniz yok' });
    }

    // Check if order can be cancelled
    if (order.status === 'cancelled') {
      return res.status(400).json({ error: 'Sipariş zaten iptal edilmiş' });
    }

    if (order.status === 'delivered') {
      return res.status(400).json({ error: 'Teslim edilmiş sipariş iptal edilemez. İade işlemi başlatın.' });
    }

    await dbRun('BEGIN TRANSACTION');

    // Get order items
    const items = await dbAll('SELECT * FROM order_items WHERE order_id = $1', [id]);

    // Restore stock for each item
    for (const item of items) {
      if (item.variant_id) {
        await dbRun('UPDATE variants SET stock = stock + $1 WHERE id = $2', [item.quantity, item.variant_id]);
        logger.info(`Cancelled order ${id}: restored variant ${item.variant_id} stock by ${item.quantity}`);
      } else if (item.product_id) {
        await dbRun('UPDATE products SET stock = stock + $1 WHERE id = $2', [item.quantity, item.product_id]);
        logger.info(`Cancelled order ${id}: restored product ${item.product_id} stock by ${item.quantity}`);
      }
    }

    // Update order status
    await dbRun(
      'UPDATE orders SET status = $1, cancellation_reason = $2, cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      ['cancelled', reason || 'Kullanıcı tarafından iptal edildi', id]
    );

    await dbRun('COMMIT');

    res.json({ 
      success: true, 
      message: 'Sipariş iptal edildi ve stoklar güncellendi' 
    });
  } catch (err) {
    try {
      await dbRun('ROLLBACK');
    } catch (e) {
      // ignore
    }
    console.error('Order cancellation error:', err && err.stack ? err.stack : err);
    res.status(500).json({ error: 'Sipariş iptali sırasında hata oluştu' });
  }
});

// Request return/refund
router.post('/:id/return', auth, async (req, res) => {
  const { id } = req.params;
  const { items, reason } = req.body;
  const userId = req.user?.userId || req.user?.id;

  try {
    const order = await dbGet('SELECT * FROM orders WHERE id = $1', [id]);
    
    if (!order) {
      return res.status(404).json({ error: 'Sipariş bulunamadı' });
    }

    if (order.user_id !== userId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Bu sipariş için iade talebi oluşturamazsınız' });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({ error: 'Sadece teslim edilmiş siparişler için iade talebi oluşturulabilir' });
    }

    // Create return request (for now, just log it - you can create a returns table later)
    logger.info(`Return request for order ${id}: ${JSON.stringify({ items, reason })}`);

    res.json({ 
      success: true, 
      message: 'İade talebiniz alındı. En kısa sürede size dönüş yapılacak.',
      return_id: Date.now() // temporary - should use proper returns table
    });
  } catch (err) {
    console.error('Return request error:', err);
    res.status(500).json({ error: 'İade talebi oluşturulurken hata oluştu' });
  }
});

module.exports = router;
