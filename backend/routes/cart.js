const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { dbGet, dbAll, dbRun } = require('../db');

// Basit in-memory cart (gerçek projede session/cookie kullanılır)
let carts = {};

// Sepeti getir
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const rows = await dbAll(
      'SELECT * FROM cart_items WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );

    const total = rows.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    res.json({
      items: rows.map(item => ({
        id: item.id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        price: item.price,
        name: item.name,
        image_url: item.image_url,
        size: item.size,
        color: item.color
      })),
      total
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new session id and set cookie (frontend can call this once)
router.post('/session', (req, res) => {
  const sessionId = crypto.randomBytes(12).toString('hex');
  // set cookie so browser sends sessionId automatically; not HttpOnly so frontend can read if needed
  res.cookie('sessionId', sessionId, { maxAge: 30 * 24 * 60 * 60 * 1000, sameSite: 'lax' });
  // initialize empty cart
  carts[sessionId] = { items: [], total: 0 };
  res.json({ success: true, sessionId });
});

// Sepete ürün ekle
router.post('/:sessionId/add', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { product_id, variant_id, quantity, price, name, image_url, size, color } = req.body;

    // Önce aynı ürünün sepette olup olmadığını kontrol et
    const existingItem = await dbGet(
      'SELECT id, quantity FROM cart_items WHERE session_id = $1 AND product_id = $2 AND (variant_id = $3 OR (variant_id IS NULL AND $3 IS NULL))',
      [sessionId, product_id, variant_id || null]
    );

    if (existingItem) {
      // Mevcut ürünü güncelle
      const newQuantity = existingItem.quantity + quantity;
      await dbRun(
        'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newQuantity, existingItem.id]
      );
    } else {
      // Yeni ürün ekle
      await dbRun(
        'INSERT INTO cart_items (session_id, product_id, variant_id, quantity, price, name, image_url, size, color) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
        [sessionId, product_id, variant_id || null, quantity, price, name, image_url, size, color]
      );
    }

    // Record analytics event for add_to_cart
    try {
      const payload = JSON.stringify({ product_id, variant_id: variant_id || null, quantity, price, name, size, color });
      await dbRun('INSERT INTO analytics_events (event_type, payload, session_id) VALUES ($1, $2, $3)', [
        'add_to_cart', payload, sessionId
      ]);
    } catch (aErr) {
      console.error('Failed to record analytics event:', aErr);
    }

    // Güncellenmiş sepeti döndür
    const rows = await dbAll(
      'SELECT * FROM cart_items WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );

    const total = rows.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    res.json({
      items: rows.map(item => ({
        id: item.id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        price: item.price,
        name: item.name,
        image_url: item.image_url,
        size: item.size,
        color: item.color
      })),
      total
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(500).json({ error: error.message });
  }
});

  // Update quantity for a cart item
  router.post('/:sessionId/update', async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { product_id, quantity } = req.body;

      if (!product_id || typeof quantity !== 'number') {
        return res.status(400).json({ error: 'product_id and quantity required' });
      }

      await dbRun(
        'UPDATE cart_items SET quantity = $1, updated_at = CURRENT_TIMESTAMP WHERE session_id = $2 AND product_id = $3',
        [quantity, sessionId, product_id]
      );

      // Return updated cart
      const rows = await dbAll(
        'SELECT * FROM cart_items WHERE session_id = $1 ORDER BY created_at ASC',
        [sessionId]
      );

      const total = rows.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      res.json({
        items: rows.map(item => ({
          id: item.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          price: item.price,
          name: item.name,
          image_url: item.image_url,
          size: item.size,
          color: item.color
        })),
        total
      });
    } catch (error) {
      console.error('Update cart item error:', error);
      res.status(500).json({ error: error.message });
    }
  });

// Sepetten ürün çıkar
router.delete('/:sessionId/remove/:productId', async (req, res) => {
  try {
    const { sessionId, productId } = req.params;

    await dbRun(
      'DELETE FROM cart_items WHERE session_id = $1 AND product_id = $2',
      [sessionId, parseInt(productId)]
    );

    // Güncellenmiş sepeti döndür
    const rows = await dbAll(
      'SELECT * FROM cart_items WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );

    const total = rows.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    res.json({
      items: rows.map(item => ({
        id: item.id,
        product_id: item.product_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        price: item.price,
        name: item.name,
        image_url: item.image_url,
        size: item.size,
        color: item.color
      })),
      total
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sepeti temizle
router.delete('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    await dbRun(
      'DELETE FROM cart_items WHERE session_id = $1',
      [sessionId]
    );

    res.json({ items: [], total: 0 });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
