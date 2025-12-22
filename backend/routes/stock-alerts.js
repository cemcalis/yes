const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken: auth } = require('../middleware/authMiddleware');

// Subscribe to stock alert
router.post('/subscribe', async (req, res) => {
  try {
    const { product_id, variant_id, email } = req.body;

    if (!email || !product_id) {
      return res.status(400).json({ error: 'Email ve product_id gerekli' });
    }

    // Check if already subscribed
    const checkQuery = variant_id
      ? 'SELECT id FROM stock_alerts WHERE product_id = ? AND variant_id = ? AND user_email = ? AND notified = 0'
      : 'SELECT id FROM stock_alerts WHERE product_id = ? AND variant_id IS NULL AND user_email = ? AND notified = 0';
    
    const params = variant_id ? [product_id, variant_id, email] : [product_id, email];

    db.get(checkQuery, params, (err, existing) => {
      if (err) {
        return res.status(500).json({ error: 'Veritabanı hatası' });
      }

      if (existing) {
        return res.status(400).json({ error: 'Zaten bildirim listesine kayıtlısınız' });
      }

      // Add alert subscription
      const insertQuery = 'INSERT INTO stock_alerts (product_id, variant_id, user_email) VALUES (?, ?, ?)';
      db.run(insertQuery, [product_id, variant_id || null, email], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Kayıt başarısız' });
        }

        res.json({
          success: true,
          message: 'Stokta kaldığında size haber vereceğiz',
          alert_id: this.lastID
        });
      });
    });
  } catch (error) {
    console.error('Stock alert subscription error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Unsubscribe from stock alert
router.delete('/unsubscribe/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM stock_alerts WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Silme başarısız' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Bildirim bulunamadı' });
    }

    res.json({ success: true, message: 'Bildirim kaydı silindi' });
  });
});

// Get pending alerts (admin only)
router.get('/pending', auth, (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }

  const query = `
    SELECT sa.*, p.name as product_name, v.size, v.color
    FROM stock_alerts sa
    LEFT JOIN products p ON sa.product_id = p.id
    LEFT JOIN variants v ON sa.variant_id = v.id
    WHERE sa.notified = 0
    ORDER BY sa.created_at DESC
  `;

  db.all(query, [], (err, alerts) => {
    if (err) {
      return res.status(500).json({ error: 'Veritabanı hatası' });
    }
    res.json(alerts);
  });
});

// Get low stock products (admin only)
router.get('/low-stock', auth, (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }

  const query = `
    SELECT p.id, p.name, p.stock, p.low_stock_threshold,
           COUNT(DISTINCT v.id) as variant_count,
           SUM(CASE WHEN v.stock <= 5 THEN 1 ELSE 0 END) as low_stock_variants
    FROM products p
    LEFT JOIN variants v ON p.product_id = v.product_id
  WHERE p.stock_alert_enabled IS TRUE 
      AND (p.stock <= p.low_stock_threshold OR v.stock <= 5)
    GROUP BY p.id
    ORDER BY p.stock ASC
  `;

  db.all(query, [], (err, products) => {
    if (err) {
      return res.status(500).json({ error: 'Veritabanı hatası' });
    }
    res.json(products);
  });
});

module.exports = router;
