const express = require('express');
const router = express.Router();
const db = require('../db');

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

// Advanced search with filters
router.get('/', async (req, res) => {
  try {
    const {
      q,
      category,
      min_price,
      max_price,
      colors,
      sizes,
      materials,
      seasons,
      tags,
      sort = 'relevance',
      page = 1,
      limit = 20,
      in_stock_only = 'false'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = `
      SELECT DISTINCT p.*, c.name as category_name,
  (SELECT AVG(rating) FROM reviews WHERE product_id = p.id AND is_approved IS TRUE) as avg_rating,
  (SELECT COUNT(*) FROM reviews WHERE product_id = p.id AND is_approved IS TRUE) as review_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN variants v ON p.id = v.product_id
      WHERE 1=1
    `;
    const params = [];

    // Search query
    if (q) {
      query += ` AND (p.name LIKE ? OR p.description LIKE ? OR p.tags LIKE ? OR c.name LIKE ?)`;
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Category filter
    if (category) {
      query += ` AND c.slug = ?`;
      params.push(category);
    }

    // Price range
    if (min_price) {
      query += ` AND p.price >= ?`;
      params.push(parseFloat(min_price));
    }
    if (max_price) {
      query += ` AND p.price <= ?`;
      params.push(parseFloat(max_price));
    }

    // Color filter
    if (colors) {
      const colorArray = colors.split(',');
      const colorPlaceholders = colorArray.map(() => '?').join(',');
      query += ` AND v.color IN (${colorPlaceholders})`;
      params.push(...colorArray);
    }

    // Size filter
    if (sizes) {
      const sizeArray = sizes.split(',');
      const sizePlaceholders = sizeArray.map(() => '?').join(',');
      query += ` AND v.size IN (${sizePlaceholders})`;
      params.push(...sizeArray);
    }

    // Material filter
    if (materials) {
      const materialArray = materials.split(',');
      const materialPlaceholders = materialArray.map(() => '?').join(',');
      query += ` AND p.material IN (${materialPlaceholders})`;
      params.push(...materialArray);
    }

    // Season filter
    if (seasons) {
      const seasonArray = seasons.split(',');
      const seasonPlaceholders = seasonArray.map(() => '?').join(',');
      query += ` AND p.season IN (${seasonPlaceholders})`;
      params.push(...seasonArray);
    }

    // Tags filter
    if (tags) {
      const tagArray = tags.split(',');
      tagArray.forEach(tag => {
        query += ` AND p.tags LIKE ?`;
        params.push(`%"${tag}"%`);
      });
    }

    // Stock filter
    if (in_stock_only === 'true') {
      query += ` AND p.stock_status = 'in_stock'`;
    }

    // Sorting
    switch (sort) {
      case 'price_asc':
        query += ` ORDER BY p.price ASC`;
        break;
      case 'price_desc':
        query += ` ORDER BY p.price DESC`;
        break;
      case 'newest':
        query += ` ORDER BY p.created_at DESC`;
        break;
      case 'rating':
        query += ` ORDER BY avg_rating DESC NULLS LAST`;
        break;
      case 'popular':
        query += ` ORDER BY review_count DESC, p.is_featured DESC`;
        break;
      default: // relevance
        query += ` ORDER BY p.is_featured DESC, p.created_at DESC`;
    }

    // Pagination
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const products = await allAsync(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN variants v ON p.id = v.product_id
      WHERE 1=1
    `;
    const countParams = params.slice(0, -2); // Remove limit and offset
    
    // Rebuild count query with same filters
    if (q) {
      countQuery += ` AND (p.name LIKE ? OR p.description LIKE ? OR p.tags LIKE ? OR c.name LIKE ?)`;
    }
    if (category) countQuery += ` AND c.slug = ?`;
    if (min_price) countQuery += ` AND p.price >= ?`;
    if (max_price) countQuery += ` AND p.price <= ?`;
    if (colors) {
      const colorArray = colors.split(',');
      const colorPlaceholders = colorArray.map(() => '?').join(',');
      countQuery += ` AND v.color IN (${colorPlaceholders})`;
    }
    if (sizes) {
      const sizeArray = sizes.split(',');
      const sizePlaceholders = sizeArray.map(() => '?').join(',');
      countQuery += ` AND v.size IN (${sizePlaceholders})`;
    }
    if (materials) {
      const materialArray = materials.split(',');
      const materialPlaceholders = materialArray.map(() => '?').join(',');
      countQuery += ` AND p.material IN (${materialPlaceholders})`;
    }
    if (seasons) {
      const seasonArray = seasons.split(',');
      const seasonPlaceholders = seasonArray.map(() => '?').join(',');
      countQuery += ` AND p.season IN (${seasonPlaceholders})`;
    }
    if (tags) {
      const tagArray = tags.split(',');
      tagArray.forEach(() => {
        countQuery += ` AND p.tags LIKE ?`;
      });
    }
    if (in_stock_only === 'true') countQuery += ` AND p.stock_status = 'in_stock'`;

    const { total } = await getAsync(countQuery, countParams);

    // Parse JSON fields
    const parsedProducts = products.map(p => ({
      ...p,
      images: p.images ? JSON.parse(p.images) : [],
      tags: p.tags ? JSON.parse(p.tags) : [],
      specifications: p.specifications ? JSON.parse(p.specifications) : {}
    }));

    // Track search if query exists
    if (q) {
      const userId = req.user?.id || null;
      const sessionId = req.sessionID || null;
      
      await runAsync(
        'INSERT INTO search_history (user_id, session_id, query, results_count) VALUES (?, ?, ?, ?)',
        [userId, sessionId, q, total]
      );

      // Update search suggestions
      await runAsync(
        `INSERT INTO search_suggestions (query, search_count, last_searched) 
         VALUES (?, 1, CURRENT_TIMESTAMP)
         ON CONFLICT(query) DO UPDATE SET 
         search_count = search_count + 1, 
         last_searched = CURRENT_TIMESTAMP`,
        [q.toLowerCase().trim()]
      );
    }

    res.json({
      products: parsedProducts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      filters: {
        q, category, min_price, max_price, colors, sizes, materials, seasons, tags, sort, in_stock_only
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Arama yapılırken hata oluştu' });
  }
});

// Autocomplete suggestions
router.get('/autocomplete', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.length < 2) {
      return res.json([]);
    }

    const searchTerm = `${q.toLowerCase()}%`;

    // Get product suggestions
    const products = await allAsync(
      `SELECT id, name, slug, image_url, price 
       FROM products 
       WHERE LOWER(name) LIKE ? 
       ORDER BY is_featured DESC, name ASC 
       LIMIT ?`,
      [searchTerm, Math.floor(parseInt(limit) / 2)]
    );

    // Get popular search suggestions
    const searches = await allAsync(
      `SELECT query 
       FROM search_suggestions 
       WHERE query LIKE ? 
       ORDER BY search_count DESC, last_searched DESC 
       LIMIT ?`,
      [searchTerm, Math.ceil(parseInt(limit) / 2)]
    );

    res.json({
      products: products.map(p => ({
        type: 'product',
        id: p.id,
        name: p.name,
        slug: p.slug,
        image_url: p.image_url,
        price: p.price
      })),
      queries: searches.map(s => ({
        type: 'query',
        text: s.query
      }))
    });
  } catch (error) {
    console.error('Autocomplete error:', error);
    res.status(500).json({ error: 'Öneri alınırken hata oluştu' });
  }
});

// Get popular searches
router.get('/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const popular = await allAsync(
      `SELECT query, search_count 
       FROM search_suggestions 
       ORDER BY search_count DESC, last_searched DESC 
       LIMIT ?`,
      [parseInt(limit)]
    );

    res.json(popular);
  } catch (error) {
    console.error('Popular searches error:', error);
    res.status(500).json({ error: 'Popüler aramalar alınırken hata oluştu' });
  }
});

// Get available filters for current search
router.get('/filters', async (req, res) => {
  try {
    const { category, q } = req.query;

    // Get available colors
    const colors = await allAsync(
      `SELECT DISTINCT v.color, v.color_hex
       FROM variants v
       INNER JOIN products p ON v.product_id = p.id
       ${category ? 'INNER JOIN categories c ON p.category_id = c.id WHERE c.slug = ?' : 'WHERE v.color IS NOT NULL'}
       ORDER BY v.color`,
      category ? [category] : []
    );

    // Get available sizes
    const sizes = await allAsync(
      `SELECT DISTINCT v.size
       FROM variants v
       INNER JOIN products p ON v.product_id = p.id
       ${category ? 'INNER JOIN categories c ON p.category_id = c.id WHERE c.slug = ?' : 'WHERE v.size IS NOT NULL'}
       ORDER BY 
         CASE v.size
           WHEN 'XS' THEN 1
           WHEN 'S' THEN 2
           WHEN 'M' THEN 3
           WHEN 'L' THEN 4
           WHEN 'XL' THEN 5
           WHEN 'XXL' THEN 6
           ELSE 7
         END`,
      category ? [category] : []
    );

    // Get available materials
    const materials = await allAsync(
      `SELECT DISTINCT material
       FROM products
       ${category ? 'INNER JOIN categories c ON products.category_id = c.id WHERE c.slug = ? AND' : 'WHERE'} material IS NOT NULL
       ORDER BY material`,
      category ? [category] : []
    );

    // Get price range
    const priceRange = await getAsync(
      `SELECT MIN(price) as min_price, MAX(price) as max_price
       FROM products
       ${category ? 'INNER JOIN categories c ON products.category_id = c.id WHERE c.slug = ?' : ''}`,
      category ? [category] : []
    );

    res.json({
      colors: colors.map(c => ({ color: c.color, hex: c.color_hex })),
      sizes: sizes.map(s => s.size),
      materials: materials.map(m => m.material),
      price_range: priceRange
    });
  } catch (error) {
    console.error('Get filters error:', error);
    res.status(500).json({ error: 'Filtreler alınırken hata oluştu' });
  }
});

module.exports = router;
