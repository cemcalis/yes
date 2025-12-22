const express = require('express');
const { dbGet, dbAll, dbRun } = require('../db');
const { authenticateToken: auth } = require('../middleware/authMiddleware');

const router = express.Router();

// Tüm yorumları getir (ürün ID'sine göre)
router.get('/product/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Önce toplam yorum sayısını al
    const totalRow = await dbGet(
      'SELECT COUNT(*) as count FROM reviews WHERE product_id = $1 AND is_approved IS TRUE',
      [productId]
    );
    const total = totalRow?.count || 0;

    // Yorumları getir
    const reviews = await dbAll(`
      SELECT r.*, u.name as user_name
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.product_id = $1 AND r.is_approved IS TRUE
      ORDER BY r.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `, [productId]);

    // Ürün bilgilerini al
    const product = await dbGet('SELECT name, slug FROM products WHERE id = $1', [productId]);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }

    // Ortalama puanı hesapla
    const avgRow = await dbGet(
      'SELECT AVG(rating) as avg FROM reviews WHERE product_id = $1 AND is_approved IS TRUE',
      [productId]
    );
    const avgRating = avgRow?.avg || 0;

    res.json({
      success: true,
      data: {
        reviews,
        product,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        averageRating: Math.round(avgRating * 10) / 10,
        totalReviews: total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Yorumlar alınamadı'
    });
  }
});

// Yeni yorum ekle
router.post('/product/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;

    if (!rating || !comment || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli puan ve yorum gerekli'
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

    // Kullanıcı zaten yorum yapmış mı kontrol et
    const existingReview = await dbGet('SELECT id FROM reviews WHERE product_id = $1 AND user_id = $2', [productId, req.user.id]);

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Bu ürün için zaten yorum yaptınız'
      });
    }

    // Yorum ekle
    await dbRun(`
      INSERT INTO reviews (product_id, user_id, customer_name, customer_email, rating, comment)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [productId, req.user.id, req.user.name, req.user.email, rating, comment]);

    res.json({
      success: true,
      message: 'Yorumunuz eklendi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Yorum eklenemedi'
    });
  }
});

// Yorum güncelle
router.put('/:reviewId', auth, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    if (!rating || !comment || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli puan ve yorum gerekli'
      });
    }

    // Yorumu bul ve kullanıcı kontrolü yap
    const review = await dbGet('SELECT * FROM reviews WHERE id = $1', [reviewId]);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Yorum bulunamadı'
      });
    }

    // Sadece kendi yorumunu güncelleyebilir veya admin olabilir
    if (review.user_id !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bu yorumu düzenleme yetkiniz yok'
      });
    }

    // Yorum güncelle
    await dbRun(`
      UPDATE reviews
      SET rating = $1, comment = $2, created_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [rating, comment, reviewId]);

    res.json({
      success: true,
      message: 'Yorum güncellendi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Yorum güncellenemedi'
    });
  }
});

// Yorum sil
router.delete('/:reviewId', auth, async (req, res) => {
  try {
    const { reviewId } = req.params;

    // Yorumu bul ve kullanıcı kontrolü yap
    const review = await dbGet('SELECT * FROM reviews WHERE id = $1', [reviewId]);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Yorum bulunamadı'
      });
    }

    // Sadece kendi yorumunu silebilir veya admin olabilir
    if (review.user_id !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bu yorumu silme yetkiniz yok'
      });
    }

    // Yorum sil
    await dbRun('DELETE FROM reviews WHERE id = $1', [reviewId]);

    res.json({
      success: true,
      message: 'Yorum silindi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Yorum silinemedi'
    });
  }
});

// Admin için tüm yorumları getir
router.get('/admin/all', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin yetkisi gerekli'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const reviews = await dbAll(`
      SELECT r.*, p.name as product_name, p.slug as product_slug, u.name as user_name
      FROM reviews r
      JOIN products p ON r.product_id = p.id
      LEFT JOIN users u ON r.user_id = u.id
      ORDER BY r.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const totalRow = await dbGet('SELECT COUNT(*) as count FROM reviews');
    const total = totalRow?.count || 0;

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Yorumlar alınamadı'
    });
  }
});

// Admin için yorum onayla/reddet
router.put('/admin/:reviewId/status', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin yetkisi gerekli'
      });
    }

    const { reviewId } = req.params;
    const { isApproved } = req.body;

    await dbRun(
      'UPDATE reviews SET is_approved = $1 WHERE id = $2',
      [isApproved ? 1 : 0, reviewId]
    );

    res.json({
      success: true,
      message: `Yorum ${isApproved ? 'onaylandı' : 'reddedildi'}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Yorum durumu güncellenemedi'
    });
  }
});

module.exports = router;
