const express = require('express');
const { authenticateToken: auth } = require('../middleware/authMiddleware');
const router = express.Router();
const db = require('../db');

const parseImages = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return value.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
};


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

// Track product view
router.post('/track-view/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user?.id || null;
    const sessionId = req.body.session_id || req.sessionID || null;

    // Check if product exists
    const product = await getAsync('SELECT id FROM products WHERE id = ?', [productId]);
    if (!product) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    // Delete old views (keep last 50 per user/session)
    if (userId) {
      const oldViews = await allAsync(
        'SELECT id FROM recently_viewed WHERE user_id = ? ORDER BY viewed_at DESC LIMIT -1 OFFSET 50',
        [userId]
      );
      if (oldViews.length > 0) {
        const ids = oldViews.map(v => v.id).join(',');
        await runAsync(`DELETE FROM recently_viewed WHERE id IN (${ids})`);
      }
    }

    // Insert new view
    await runAsync(
      'INSERT INTO recently_viewed (user_id, session_id, product_id) VALUES (?, ?, ?)',
      [userId, sessionId, productId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Track view error:', error);
    res.status(500).json({ error: 'Görüntüleme kaydedilemedi' });
  }
});

// Get recently viewed products
router.get('/recently-viewed', async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const sessionId = req.query.session_id || null;
    const limit = parseInt(req.query.limit) || 10;

    let query, params;

    if (userId) {
      query = `
        SELECT DISTINCT p.*, rv.viewed_at
        FROM recently_viewed rv
        INNER JOIN products p ON rv.product_id = p.id
        WHERE rv.user_id = ?
        ORDER BY rv.viewed_at DESC
        LIMIT ?
      `;
      params = [userId, limit];
    } else if (sessionId) {
      query = `
        SELECT DISTINCT p.*, rv.viewed_at
        FROM recently_viewed rv
        INNER JOIN products p ON rv.product_id = p.id
        WHERE rv.session_id = ?
        ORDER BY rv.viewed_at DESC
        LIMIT ?
      `;
      params = [sessionId, limit];
    } else {
      return res.json([]);
    }

    const products = await allAsync(query, params);

    const parsedProducts = products.map(p => ({
      ...p,
      images: parseImages(p.images),
      tags: parseJson(p.tags, []),
      specifications: parseJson(p.specifications, {})
    }));

    res.json(parsedProducts);
  } catch (error) {
    console.error('Get recently viewed error:', error);
    res.status(500).json({ error: 'Son görüntülenenler alınamadı' });
  }
});

// Add products to comparison
router.post('/compare/add', async (req, res) => {
  try {
    const { product_ids } = req.body;
    const userId = req.user?.id || null;
    const sessionId = req.body.session_id || req.sessionID || null;

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return res.status(400).json({ error: 'Ürün ID\'leri gerekli' });
    }

    if (product_ids.length > 5) {
      return res.status(400).json({ error: 'En fazla 5 ürün karşılaştırılabilir' });
    }

    // Verify all products exist
    const placeholders = product_ids.map(() => '?').join(',');
    const products = await allAsync(
      `SELECT id FROM products WHERE id IN (${placeholders})`,
      product_ids
    );

    if (products.length !== product_ids.length) {
      return res.status(400).json({ error: 'Bazı ürünler bulunamadı' });
    }

    // Save comparison
    const productIdsJson = JSON.stringify(product_ids);
    const result = await runAsync(
      'INSERT INTO product_comparisons (user_id, session_id, product_ids) VALUES (?, ?, ?)',
      [userId, sessionId, productIdsJson]
    );

    res.json({ success: true, comparison_id: result.lastID });
  } catch (error) {
    console.error('Add to comparison error:', error);
    res.status(500).json({ error: 'Karşılaştırmaya eklenemedi' });
  }
});

// Get comparison data
router.post('/compare', async (req, res) => {
  try {
    const { product_ids } = req.body;

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return res.status(400).json({ error: 'Ürün ID\'leri gerekli' });
    }

    if (product_ids.length > 5) {
      return res.status(400).json({ error: 'En fazla 5 ürün karşılaştırılabilir' });
    }

    const placeholders = product_ids.map(() => '?').join(',');
    const products = await allAsync(
      `SELECT p.*, c.name as category_name,
  (SELECT AVG(rating) FROM reviews WHERE product_id = p.id AND is_approved IS TRUE) as avg_rating,
  (SELECT COUNT(*) FROM reviews WHERE product_id = p.id AND is_approved IS TRUE) as review_count
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id IN (${placeholders})`,
      product_ids
    );

    // Parse JSON fields and get variants
    const enrichedProducts = await Promise.all(products.map(async (p) => {
      const variants = await allAsync('SELECT * FROM variants WHERE product_id = ?', [p.id]);
      
        return {
          ...p,
          images: parseImages(p.images),
          tags: parseJson(p.tags, []),
          specifications: parseJson(p.specifications, {}),
          variants
        };
    }));

    res.json({
      products: enrichedProducts,
      comparison_attributes: [
        'name',
        'price',
        'category_name',
        'avg_rating',
        'review_count',
        'stock_status',
        'specifications',
        'variants'
      ]
    });
  } catch (error) {
    console.error('Compare products error:', error);
    res.status(500).json({ error: 'Ürünler karşılaştırılamadı' });
  }
});

// Get product recommendations based on views and favorites
router.get('/recommendations/:productId', async (req, res) => {
  try {
    const { productId } = req.params;
    const limit = parseInt(req.query.limit) || 4;

    // Get current product details
    const currentProduct = await getAsync(
      'SELECT category_id, tags FROM products WHERE id = ?',
      [productId]
    );

    if (!currentProduct) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    // Get similar products (same category or similar tags)
    const recommendations = await allAsync(
      `SELECT p.*, c.name as category_name,
  (SELECT AVG(rating) FROM reviews WHERE product_id = p.id AND is_approved IS TRUE) as avg_rating,
  (SELECT COUNT(*) FROM reviews WHERE product_id = p.id AND is_approved IS TRUE) as review_count

       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id != ? 
         AND (p.category_id = ? OR p.is_featured IS TRUE)
         AND p.stock_status = 'in_stock'
       ORDER BY 
         CASE WHEN p.category_id = ? THEN 1 ELSE 2 END,
         p.is_featured DESC,
         RANDOM()
       LIMIT ?`,
      [productId, currentProduct.category_id, currentProduct.category_id, limit]
    );

    // Parse JSON fields
    const parsedRecommendations = recommendations.map(p => ({
      ...p,
      images: parseImages(p.images),
      tags: parseJson(p.tags, [])
    }));

    res.json(parsedRecommendations);
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Öneriler alınamadı' });
  }
});

module.exports = router;
