const express = require('express');
const { dbGet, dbAll, dbRun } = require('../db');
const { authenticateToken: auth } = require('../middleware/authMiddleware');

const router = express.Router();

// Tüm favori ürünleri getir
router.get('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Kullanıcı sadece kendi favorilerini görebilir
    if (req.user.userId != userId && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Yetkisiz erişim'
      });
    }

    const favorites = await dbAll(`
      SELECT f.*, p.name, p.price, p.image_url, p.slug, c.name as category_name
      FROM favorites f
      JOIN products p ON f.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE f.user_id = $1
      ORDER BY f.created_at DESC
    `, [userId]);

    res.json({
      success: true,
      data: favorites
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Favori ürünler alınamadı'
    });
  }
});

// Favoriye ürün ekle
router.post('/:userId/:productId', auth, async (req, res) => {
  try {
    const { userId, productId } = req.params;

    // Kullanıcı sadece kendi favorilerini yönetebilir
    if (req.user.userId != userId && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Yetkisiz erişim'
      });
    }

    // Ürün var mı kontrol et
    const product = await dbGet('SELECT id FROM products WHERE id = $1', [productId]);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }

    // Zaten favoride mi kontrol et
    const existing = await dbGet('SELECT id FROM favorites WHERE user_id = $1 AND product_id = $2', [userId, productId]);

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Ürün zaten favorilerde'
      });
    }

    // Favoriye ekle
    await dbRun(`
      INSERT INTO favorites (user_id, product_id)
      VALUES ($1, $2)
    `, [userId, productId]);

    res.json({
      success: true,
      message: 'Ürün favorilere eklendi'
    });
  } catch (error) {
    console.error('Add to favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün favorilere eklenemedi'
    });
  }
});

// Favoriden ürün çıkar
router.delete('/:userId/:productId', auth, async (req, res) => {
  try {
    const { userId, productId } = req.params;

    // Kullanıcı sadece kendi favorilerini yönetebilir
    if (req.user.userId != userId && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Yetkisiz erişim'
      });
    }

    await dbRun('DELETE FROM favorites WHERE user_id = $1 AND product_id = $2', [userId, productId]);

    res.json({
      success: true,
      message: 'Ürün favorilerden çıkarıldı'
    });
  } catch (error) {
    console.error('Remove from favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün favorilerden çıkarılamadı'
    });
  }
});

// Tüm favorileri temizle
router.delete('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Kullanıcı sadece kendi favorilerini yönetebilir
    if (req.user.userId != userId && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Yetkisiz erişim'
      });
    }

    await dbRun('DELETE FROM favorites WHERE user_id = $1', [userId]);

    res.json({
      success: true,
      message: 'Tüm favoriler temizlendi'
    });
  } catch (error) {
    console.error('Clear favorites error:', error);
    res.status(500).json({
      success: false,
      message: 'Favoriler temizlenemedi'
    });
  }
});

module.exports = router;
