const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken: auth } = require('../middleware/authMiddleware');

// Helper functions
function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

// Validate coupon code
router.post('/validate', async (req, res) => {
  try {
    const { code, cart_total, items } = req.body;
    const userId = req.user?.userId || null;

    if (!code) {
      return res.status(400).json({ error: 'Kupon kodu gerekli' });
    }

    // Get coupon
    const coupon = await getAsync(
      `SELECT * FROM coupons 
  WHERE code = ? AND is_active IS TRUE 
       AND (valid_from IS NULL OR valid_from <= CURRENT_TIMESTAMP)
       AND (valid_until IS NULL OR valid_until >= CURRENT_TIMESTAMP)`,
      [code.toUpperCase().trim()]
    );

    if (!coupon) {
      return res.status(404).json({ error: 'Geçersiz veya süresi dolmuş kupon kodu' });
    }

    // Check usage limit
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return res.status(400).json({ error: 'Kupon kullanım limiti doldu' });
    }

    // Check user usage limit
    if (userId && coupon.user_limit) {
      const userUsage = await getAsync(
        'SELECT COUNT(*) as count FROM coupon_usage WHERE coupon_id = ? AND user_id = ?',
        [coupon.id, userId]
      );
      if (userUsage.count >= coupon.user_limit) {
        return res.status(400).json({ error: 'Bu kuponu daha önce kullandınız' });
      }
    }

    // Check minimum purchase
    if (coupon.min_purchase && cart_total < coupon.min_purchase) {
      return res.status(400).json({ 
        error: `Bu kupon için minimum ${coupon.min_purchase} TL alışveriş yapmalısınız` 
      });
    }

    // Check applicable categories/products
    if (coupon.applicable_categories || coupon.applicable_products) {
      // TODO: Implement category/product specific validation based on cart items
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.type === 'percentage') {
      discountAmount = (cart_total * coupon.value) / 100;
    } else if (coupon.type === 'fixed') {
      discountAmount = coupon.value;
    } else if (coupon.type === 'free_shipping') {
      // Shipping discount will be applied during checkout
      discountAmount = 0;
    }

    // Apply max discount limit
    if (coupon.max_discount && discountAmount > coupon.max_discount) {
      discountAmount = coupon.max_discount;
    }

    // Ensure discount doesn't exceed cart total
    if (discountAmount > cart_total) {
      discountAmount = cart_total;
    }

    res.json({
      valid: true,
      coupon_id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      discount_amount: Math.round(discountAmount * 100) / 100,
      final_total: Math.max(0, cart_total - discountAmount)
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(500).json({ error: 'Kupon doğrulanamadı' });
  }
});

// Apply coupon to order (called during checkout)
router.post('/apply', auth, async (req, res) => {
  try {
    const { coupon_code, order_id } = req.body;
    const userId = req.user.userId;

    const coupon = await getAsync(
  'SELECT * FROM coupons WHERE code = ? AND is_active IS TRUE',
      [coupon_code.toUpperCase().trim()]
    );

    if (!coupon) {
      return res.status(404).json({ error: 'Kupon bulunamadı' });
    }

    // Record usage
    await runAsync(
      'INSERT INTO coupon_usage (coupon_id, user_id, order_id, discount_amount) VALUES (?, ?, ?, ?)',
      [coupon.id, userId, order_id, req.body.discount_amount || 0]
    );

    // Update coupon usage count
    await runAsync(
      'UPDATE coupons SET usage_count = usage_count + 1 WHERE id = ?',
      [coupon.id]
    );

    res.json({ success: true, message: 'Kupon uygulandı' });
  } catch (error) {
    console.error('Apply coupon error:', error);
    res.status(500).json({ error: 'Kupon uygulanamadı' });
  }
});

// Admin: Get all coupons
router.get('/admin/all', auth, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }

  try {
    const coupons = await allAsync(
      'SELECT * FROM coupons ORDER BY created_at DESC'
    );
    res.json(coupons);
  } catch (error) {
    console.error('Get coupons error:', error);
    res.status(500).json({ error: 'Kuponlar alınamadı' });
  }
});

// Admin: Create coupon
router.post('/admin/create', auth, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }

  try {
    const {
      code,
      type,
      value,
      min_purchase,
      max_discount,
      usage_limit,
      user_limit,
      valid_from,
      valid_until,
      applicable_categories,
      applicable_products
    } = req.body;

    if (!code || !type || !value) {
      return res.status(400).json({ error: 'Kod, tip ve değer gerekli' });
    }

    const result = await runAsync(
      `INSERT INTO coupons 
       (code, type, value, min_purchase, max_discount, usage_limit, user_limit, valid_from, valid_until, applicable_categories, applicable_products)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        code.toUpperCase().trim(),
        type,
        value,
        min_purchase || 0,
        max_discount || null,
        usage_limit || null,
        user_limit || 1,
        valid_from || null,
        valid_until || null,
        applicable_categories ? JSON.stringify(applicable_categories) : null,
        applicable_products ? JSON.stringify(applicable_products) : null
      ]
    );

    const newCoupon = await getAsync('SELECT * FROM coupons WHERE id = ?', [result.lastID]);

    res.status(201).json({ success: true, coupon: newCoupon });
  } catch (error) {
    console.error('Create coupon error:', error);
    if (error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Bu kupon kodu zaten mevcut' });
    }
    res.status(500).json({ error: 'Kupon oluşturulamadı' });
  }
});

// Admin: Update coupon
router.put('/admin/:id', auth, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }

  try {
    const { id } = req.params;
    const {
      code,
      type,
      value,
      min_purchase,
      max_discount,
      usage_limit,
      user_limit,
      valid_from,
      valid_until,
      is_active,
      applicable_categories,
      applicable_products
    } = req.body;

    await runAsync(
      `UPDATE coupons SET 
       code = ?, type = ?, value = ?, min_purchase = ?, max_discount = ?, 
       usage_limit = ?, user_limit = ?, valid_from = ?, valid_until = ?, 
       is_active = ?, applicable_categories = ?, applicable_products = ?,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        code.toUpperCase().trim(),
        type,
        value,
        min_purchase || 0,
        max_discount || null,
        usage_limit || null,
        user_limit || 1,
        valid_from || null,
        valid_until || null,
        is_active ? 1 : 0,
        applicable_categories ? JSON.stringify(applicable_categories) : null,
        applicable_products ? JSON.stringify(applicable_products) : null,
        id
      ]
    );

    const updatedCoupon = await getAsync('SELECT * FROM coupons WHERE id = ?', [id]);

    res.json({ success: true, coupon: updatedCoupon });
  } catch (error) {
    console.error('Update coupon error:', error);
    res.status(500).json({ error: 'Kupon güncellenemedi' });
  }
});

// Admin: Delete coupon
router.delete('/admin/:id', auth, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }

  try {
    const { id } = req.params;

    await runAsync('DELETE FROM coupons WHERE id = ?', [id]);

    res.json({ success: true, message: 'Kupon silindi' });
  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({ error: 'Kupon silinemedi' });
  }
});

// Admin: Get coupon usage statistics
router.get('/admin/:id/stats', auth, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }

  try {
    const { id } = req.params;

    const stats = await getAsync(
      `SELECT 
        c.*,
        COUNT(cu.id) as total_uses,
        SUM(cu.discount_amount) as total_discount_given,
        COUNT(DISTINCT cu.user_id) as unique_users
       FROM coupons c
       LEFT JOIN coupon_usage cu ON c.id = cu.coupon_id
       WHERE c.id = ?
       GROUP BY c.id`,
      [id]
    );

    res.json(stats);
  } catch (error) {
    console.error('Get coupon stats error:', error);
    res.status(500).json({ error: 'İstatistikler alınamadı' });
  }
});

module.exports = router;
