const express = require('express');
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
const adminAuth = require('../middleware/adminAuth');

// Tüm ürünleri getir (filtreleme + sıralama)
router.get('/', async (req, res) => {
  try {
    const { category, sort, featured, new_arrivals, search } = req.query;
    
    let query = `
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
    `;
    const params = [];

    if (category) {
      query += ` AND c.slug = ?`;
      params.push(category);
    }

    if (featured === 'true') {
      query += ' AND p.is_featured = 1';
    }

    if (new_arrivals === 'true') {
      query += ' AND p.is_new = 1';
    }

    if (search) {
      query += ` AND (LOWER(p.name) LIKE LOWER(?) OR LOWER(p.description) LIKE LOWER(?))`;
      params.push(`%${search}%`, `%${search}%`);
    }

    // Sıralama
    switch (sort) {
      case 'price_asc':
        query += ' ORDER BY p.price ASC';
        break;
      case 'price_desc':
        query += ' ORDER BY p.price DESC';
        break;
      case 'name_asc':
        query += ' ORDER BY p.name ASC';
        break;
      case 'name_desc':
        query += ' ORDER BY p.name DESC';
        break;
      case 'newest':
        query += ' ORDER BY p.created_at DESC';
        break;
      default:
        query += ' ORDER BY p.is_featured DESC, p.created_at DESC';
    }

    const result = await db.query(query, params);
    const products = result.rows.map(p => ({
      ...p,
      images: parseImages(p.images)
    }));
    res.json(products);
  } catch (error) {
    console.error('Products list error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Tek ürün detayı
router.get('/:slug', async (req, res) => {
  try {
    const query = `
      SELECT p.*, c.name as category_name, c.slug as category_slug 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      WHERE p.slug = ?
    `;

    const result = await db.query(query, [req.params.slug]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ürün bulunamadı' });
    }

    const product = result.rows[0];

    const variantsResult = await db.query('SELECT * FROM variants WHERE product_id = ?', [product.id]);
    product.variants = variantsResult.rows;

    product.images = parseImages(product.images);
    res.json(product);
  } catch (error) {
    console.error('Product detail error:', error);
    res.status(500).json({ error: error.message });
  }
});

// En çok beğenilen ürünleri getir
router.get('/most-liked', async (req, res) => {
  try {
    const query = `
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = 1
      ORDER BY p.is_featured DESC, p.created_at DESC
      LIMIT 3
    `;

    const result = await db.query(query);
    const products = result.rows.map(p => ({
      ...p,
      images: parseImages(p.images)
    }));
    res.json(products);
  } catch (error) {
    console.error('Most liked products error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Yeni ürün ekle
router.post('/', adminAuth, async (req, res) => {
  const {
    name,
    slug,
    description,
    price,
    compare_price,
    category_id,
    image_url,
    images,
    stock_status,
    is_featured,
    pre_order = false,
    is_new,
    is_active = true
  } = req.body;

  const imagesJson = images ? JSON.stringify(images) : null;

  const insertQuery = `
    INSERT INTO products (name, slug, description, price, compare_price, category_id, image_url, images, stock_status, pre_order, is_featured, is_new, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    name,
    slug,
    description,
    price,
    compare_price || null,
    category_id || null,
    image_url || null,
    imagesJson,
    stock_status || 'in_stock',
    pre_order === true || pre_order === 'true',
    is_featured === true || is_featured === 'true',
    is_new === true || is_new === 'true',
    is_active === true || is_active === 'true'
  ];

  try {
    const result = await db.query(insertQuery, params);
    // SQLite'ta son eklenen ID'yi almak için `result.lastID` kullanılır.
    // Bu özelliğin `db.js` dosyanızda ayarlanması gerekir.
    const productId = result.lastID;
    res.status(201).json({ id: productId, message: 'Ürün eklendi' });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
