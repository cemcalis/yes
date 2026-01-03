const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { dbGet, dbAll, dbRun, query: dbQuery } = require('../db');
const adminAuth = require('../middleware/adminAuth');
const { importFromCSV } = require('../import-csv');
const { loginLimiter } = require('../middleware/security');

const router = express.Router();

const multer = require('multer');
const path = require('path');
const fs = require('fs');
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.warn('`sharp` not installed. Thumbnail generation disabled.');
  sharp = null;
}

const allowAdminDiag = process.env.ALLOW_ADMIN_DIAG === 'true';
const allowSeedEndpoint = process.env.ALLOW_ADMIN_SEED === 'true';

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const sanitizeFileName = (original) => {
  const base = path.basename(original || '');
  const normalized = base.normalize('NFKD').replace(/[^\w.-]+/g, '-');
  const trimmed = normalized.replace(/-+/g, '-').replace(/^-+|-+$/g, '');
  return trimmed || `upload-${Date.now()}`;
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const safeName = sanitizeFileName(file.originalname);
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const allowedMimes = new Set(['image/svg+xml', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']);
const allowedExts = new Set(['.svg', '.png', '.jpeg', '.jpg', '.webp', '.gif']);

const MAX_UPLOAD_SIZE = process.env.UPLOAD_MAX_FILE_SIZE ? parseInt(process.env.UPLOAD_MAX_FILE_SIZE, 10) : 50 * 1024 * 1024; // default 50MB

const upload = multer({
  storage,
  fileFilter: function (req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (allowedMimes.has(file.mimetype) && allowedExts.has(ext)) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type. Only images (including SVG) are allowed'));
  },
  limits: { fileSize: MAX_UPLOAD_SIZE }
});

// Build unique variant combinations to avoid duplicate sizes/colors
const buildUniqueVariants = (sizes = [], colors = []) => {
  const uniqueSizes = Array.from(new Set((sizes || []).filter(Boolean)));
  const uniqueColors = Array.from(new Set((colors || []).filter(Boolean)));
  const variants = [];
  const seen = new Set();

  if (uniqueSizes.length && uniqueColors.length) {
    for (const size of uniqueSizes) {
      for (const color of uniqueColors) {
        const key = `${size}::${color}`;
        if (seen.has(key)) continue;
        seen.add(key);
        variants.push({ size, color });
      }
    }
  } else if (uniqueSizes.length) {
    for (const size of uniqueSizes) {
      const key = `${size}::`;
      if (seen.has(key)) continue;
      seen.add(key);
      variants.push({ size, color: null });
    }
  } else if (uniqueColors.length) {
    for (const color of uniqueColors) {
      const key = `::${color}`;
      if (seen.has(key)) continue;
      seen.add(key);
      variants.push({ size: null, color });
    }
  }

  return variants;
};

// Admin login - DB backed
router.post('/auth/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email ve şifre gerekli' });
    }

    const user = await dbGet('SELECT * FROM users WHERE email = $1', [email]);
    
    if (!user || !user.is_admin) {
      return res.status(401).json({ success: false, message: 'Geçersiz email veya şifre' });
    }

    // Compare password
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Geçersiz email veya şifre' });
    }

    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const token = jwt.sign({ userId: user.id, email: user.email, isAdmin: true }, jwtSecret, { expiresIn: '24h' });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    };

    res.cookie('adminToken', token, cookieOptions);
    res.json({ success: true, token, message: 'Giriş başarılı' });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

// Upload product image (admin only)
router.post('/upload', adminAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Dosya gerekli' });
    }

    // If SVG, perform lightweight sanitization using async I/O to avoid blocking
    try {
      const mime = req.file.mimetype || '';
      if (mime === 'image/svg+xml' || path.extname(req.file.originalname).toLowerCase() === '.svg') {
        const filePath = req.file.path;
        try {
          const svg = await fs.promises.readFile(filePath, 'utf8');

          // Remove <script>...</script>
          let cleaned = svg.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');

          // Remove on* attributes like onclick, onload (basic)
          cleaned = cleaned.replace(/\son[a-zA-Z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

          // Remove javascript: in href/xlink:href
          cleaned = cleaned.replace(/(href|xlink:href)\s*=\s*("|')?javascript:[^"'>\s]+(\2)?/gi, '$1="#"');

          await fs.promises.writeFile(filePath, cleaned, 'utf8');
        } catch (sErr) {
          console.error('SVG sanitization error (async):', sErr);
          // proceed even if sanitization fails
        }
      }
    } catch (sErr) {
      console.error('SVG sanitization guard error:', sErr);
    }

    const fileName = path.basename(req.file.path);
    // Use relative URL so it works with frontend proxy
    const url = `/uploads/${fileName}`;

    // Generate thumbnails / webp versions if sharp is available
    const thumbs = {};
    try {
      if (sharp) {
        const ext = path.extname(req.file.path);
        const base = req.file.path.slice(0, -ext.length);
        // small (400px), large (800px), and webp of original
        const smallPath = `${base}-sm.webp`;
        const largePath = `${base}-lg.webp`;
        const webpPath = `${base}.webp`;

        await sharp(req.file.path).resize({ width: 400 }).webp({ quality: 75 }).toFile(smallPath);
        await sharp(req.file.path).resize({ width: 800 }).webp({ quality: 80 }).toFile(largePath);
        await sharp(req.file.path).webp({ quality: 90 }).toFile(webpPath);

        thumbs.small = `/uploads/${path.basename(smallPath)}`;
        thumbs.large = `/uploads/${path.basename(largePath)}`;
        thumbs.webp = `/uploads/${path.basename(webpPath)}`;
      }
    } catch (tErr) {
      console.error('Thumbnail generation error:', tErr);
    }

    res.json({ success: true, url, thumbs, message: 'Dosya yüklendi' });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ success: false, message: 'Dosya yüklenemedi' });
  }
});

// ----------------- Admin banners (mounted at /api/admin/banners) -----------------
// These endpoints mirror the CMS banners but are provided here so the admin UI
// can call `/api/admin/banners` and reuse the existing `upload` middleware.
router.get('/banners', adminAuth, async (req, res) => {
  try {
    const banners = await dbAll('SELECT * FROM banners ORDER BY position, display_order, created_at DESC');
    res.json(banners);
  } catch (error) {
    console.error('Get admin banners error:', error);
    res.status(500).json({ success: false, message: 'Bannerlar alınamadı' });
  }
});

router.post('/banners', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const { title, subtitle, link_url, button_text, is_active, sort_order } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Banner görseli gerekli' });
    }

    const imageUrl = `/uploads/${path.basename(req.file.path)}`;

    const result = await dbQuery(
      `INSERT INTO banners (title, subtitle, image_url, link_url, button_text, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [title || '', subtitle || null, imageUrl, link_url || null, button_text || null, is_active ? 1 : 0, sort_order || 0]
    );

    const newBanner = await dbGet('SELECT * FROM banners WHERE id = $1', [result.rows[0].id]);

    res.status(201).json({ success: true, banner: newBanner });
  } catch (error) {
    console.error('Create banner error (admin):', error);
    res.status(500).json({ success: false, message: 'Banner oluşturulamadı' });
  }
});

router.put('/banners/:id', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, link_url, description, position, display_order, is_active, valid_from, valid_until, remove_image } = req.body;

    const existing = await dbGet('SELECT * FROM banners WHERE id = $1', [id]);
    if (!existing) return res.status(404).json({ success: false, message: 'Banner bulunamadı' });

    let imageUrl = existing.image_url;

    if (req.file) {
      imageUrl = `/uploads/${path.basename(req.file.path)}`;
      // delete old image if present
      if (existing.image_url) {
        const oldPath = path.join(__dirname, '../public', existing.image_url);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    if (!req.file && (remove_image === '1' || remove_image === 'true')) {
      if (existing.image_url) {
        const oldPath = path.join(__dirname, '../public', existing.image_url);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      imageUrl = null;
    }

    await dbRun(
      `UPDATE banners SET title = $1, image_url = $2, link_url = $3, description = $4, position = $5, display_order = $6, is_active = $7, valid_from = $8, valid_until = $9, updated_at = CURRENT_TIMESTAMP WHERE id = $10`,
      [title || '', imageUrl, link_url || null, description || null, position || 'home', display_order || 0, is_active ? 1 : 0, valid_from || null, valid_until || null, id]
    );

    const updated = await dbGet('SELECT * FROM banners WHERE id = $1', [id]);
    res.json({ success: true, banner: updated });
  } catch (error) {
    console.error('Update banner error (admin):', error);
    res.status(500).json({ success: false, message: 'Banner güncellenemedi' });
  }
});

router.delete('/banners/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await dbGet('SELECT image_url FROM banners WHERE id = $1', [id]);
    if (banner && banner.image_url) {
      const imagePath = path.join(__dirname, '../public', banner.image_url);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }
    await dbRun('DELETE FROM banners WHERE id = $1', [id]);
    res.json({ success: true, message: 'Banner silindi' });
  } catch (error) {
    console.error('Delete banner error (admin):', error);
    res.status(500).json({ success: false, message: 'Banner silinemedi' });
  }
});

// Get dashboard stats
router.get('/stats', adminAuth, async (req, res) => {
  try {
    // Get total products
    const productsRow = await dbGet('SELECT COUNT(*) as count FROM products');
    const totalProducts = productsRow?.count || 0;

    // Get total orders
    const ordersRow = await dbGet('SELECT COUNT(*) as count FROM orders');
    const totalOrders = ordersRow?.count || 0;

    // Get total users
    const usersRow = await dbGet('SELECT COUNT(*) as count FROM users');
    const totalUsers = usersRow?.count || 0;

    // Get total revenue
    const revenueRow = await dbGet('SELECT SUM(total) as sum FROM orders WHERE status = $1', ['completed']);
    const totalRevenue = parseFloat(revenueRow?.sum) || 0;

    // Get recent orders
    const recentOrders = await dbAll(`
      SELECT o.*, u.name as customerName
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        totalProducts: parseInt(totalProducts) || 0,
        totalOrders: parseInt(totalOrders) || 0,
        totalUsers: parseInt(totalUsers) || 0,
        totalRevenue: parseFloat(totalRevenue) || 0,
        recentOrders
      }
    });
  } catch (error) {
    console.error('Error in /api/admin/stats:', error && error.stack ? error.stack : error);
    res.status(500).json({
      success: false,
      message: 'İstatistikler alınamadı'
    });
  }
});

// Analytics: add-to-cart aggregation for admin charts
router.get('/analytics/add-to-cart', adminAuth, async (req, res) => {
  try {
    const rows = await dbAll(`
      SELECT json_extract(payload, '$.product_id') as product_id, COUNT(*) as cnt
      FROM analytics_events
      WHERE event_type = ?
      GROUP BY product_id
      ORDER BY cnt DESC
      LIMIT 50
    `, ['add_to_cart']);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, message: 'Analitik verisi alınamadı' });
  }
});

// Get all products
router.get('/products', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    // Increase default admin listing limit so admin UI shows all products
    // when the frontend doesn't pass an explicit `limit` parameter.
    const limit = parseInt(req.query.limit) || 1000;
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    const filterParams = [];
    let filterClause = '';
    if (search) {
      filterClause = ' WHERE LOWER(p.name) LIKE ? OR LOWER(p.description) LIKE ?';
      const like = `%${search.toLowerCase()}%`;
      filterParams.push(like, like);
    }

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

    const dataQuery = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      ${filterClause}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const countQuery = `
      SELECT COUNT(*) as count
      FROM products p
      ${filterClause}
    `;

    const dataParams = [...filterParams, limit, offset];

    const [productsResult, countResult] = await Promise.all([
      dbAll(dataQuery, dataParams),
      dbGet(countQuery, filterParams)
    ]);

    const products = productsResult.map((p) => ({
      ...p,
      images: parseImages(p.images),
      pre_order: Boolean(p.pre_order),
      is_featured: Boolean(p.is_featured),
      is_new: Boolean(p.is_new),
      is_active: Boolean(p.is_active),
      pre_order_sizes: p.pre_order_sizes || null
    }));

    const total = parseInt(countResult?.count || 0, 10);

    res.json({
      success: true,
      data: {
        products,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Ürünler alınamadı',
      error: error.message
    });
  }
});

// Get product by id (admin)
router.get('/products/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const product = await dbGet(`SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = $1`, [id]);
    if (!product) return res.status(404).json({ success: false, message: 'Ürün bulunamadı' });

    // Get variants
    const variants = await dbAll('SELECT * FROM variants WHERE product_id = $1', [id]);

    const parseImagesLocal = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) return parsed;
        } catch {}
        return value.split(',').map((s) => s.trim()).filter(Boolean);
      }
      return [];
    };

    const result = {
      ...product,
      images: parseImagesLocal(product.images),
      variants,
      pre_order: Boolean(product.pre_order),
      is_featured: Boolean(product.is_featured),
      is_new: Boolean(product.is_new),
      is_active: Boolean(product.is_active),
      pre_order_sizes: product.pre_order_sizes || null
    };

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get product by id (admin) error:', error);
    res.status(500).json({ success: false, message: 'Ürün alınamadı' });
  }
});

// Public analytics: top-favorited products
router.get('/analytics/top-favorites', async (req, res) => {
  try {
    const rows = await dbAll(`
      SELECT f.product_id, COUNT(*) as cnt, p.name, p.image_url
      FROM favorites f
      LEFT JOIN products p ON f.product_id = p.id
      GROUP BY f.product_id, p.name, p.image_url
      ORDER BY cnt DESC
      LIMIT 6
    `, []);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Top favorites error:', error);
    res.status(500).json({ success: false, message: 'Veri alınamadı' });
  }
});

// Update product
router.put('/products/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      admin_description,
      slogan,
      price,
      compare_price,
      image,
      images,
      category_id,
      stock = 100,
      sizes = [],
      colors = [],
      pre_order_sizes = [],
      is_featured = false,
      pre_order = false,
      is_new = false,
      is_active = true
    } = req.body;

    // Validation
    if (!name || !price) {
      return res.status(400).json({
        success: false,
        message: 'Ürün adı ve fiyat gereklidir'
      });
    }

    if (price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Fiyat 0\'dan büyük olmalıdır'
      });
    }

    // Update product
    const slug = req.body.slug ? req.body.slug.toString().toLowerCase().trim().replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,'').replace(/\-+/g,'-') : name.toString().toLowerCase().trim().replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,'').replace(/\-+/g,'-');
    const imagesJson = Array.isArray(images) ? JSON.stringify(images) : images;

    await dbRun(`
      UPDATE products
      SET name = $1, slug = $2, description = $3, admin_description = $4, slogan = $5, price = $6, compare_price = $7, image_url = $8, images = $9, category_id = $10, stock_status = $11, pre_order_sizes = $12, pre_order = $13, is_featured = $14, is_new = $15, is_active = $16, updated_at = CURRENT_TIMESTAMP
      WHERE id = $17
    `, [
      name,
      slug,
      description,
      admin_description,
      slogan || null,
      price,
      compare_price,
      image,
      imagesJson,
      category_id,
      stock > 0 ? 'in_stock' : 'out_of_stock',
      Array.isArray(pre_order_sizes) ? pre_order_sizes.join(',') : (pre_order_sizes || null),
      Number(Boolean(pre_order)),
      Number(Boolean(is_featured)),
      Number(Boolean(is_new)),
      Number(Boolean(is_active)),
      id
    ]);

    // Update variants:
    // If `variants` array is provided in the request body, use it (each item: {size, color, stock}).
    // Otherwise, fall back to building variants from `sizes` and `colors` and preserve existing stocks.
    if (Array.isArray(req.body.variants) && req.body.variants.length > 0) {
      // Delete existing and insert provided variants
      await dbRun('DELETE FROM variants WHERE product_id = $1', [id]);
      for (const v of req.body.variants) {
        const vs = v && v.size ? v.size : null;
        const vc = v && v.color ? v.color : null;
        const vst = Number.isFinite(Number(v && v.stock ? v.stock : stock)) ? Number(v.stock) : stock;
        await dbRun(`
          INSERT INTO variants (product_id, size, color, stock, is_active)
          VALUES ($1, $2, $3, $4, $5)
        `, [id, vs, vc, vst, vst > 0 ? 1 : 0]);
      }
    } else if ((Array.isArray(sizes) && sizes.length > 0) || (Array.isArray(colors) && colors.length > 0) || (Array.isArray(pre_order_sizes) && pre_order_sizes.length > 0)) {
      // Preserve existing variant stock levels where possible
      const existingVariants = await dbAll('SELECT * FROM variants WHERE product_id = $1', [id]);
      const existingStockMap = {};
      for (const ev of existingVariants) {
        const key = `${ev.size || ''}::${ev.color || ''}`;
        existingStockMap[key] = ev.stock;
      }

      // Delete existing variants for this product
      await dbRun('DELETE FROM variants WHERE product_id = $1', [id]);

      // Use only explicitly selected sizes for purchasable variants
      let sizesToUse = Array.isArray(sizes) ? sizes.slice() : [];

      const variantsToInsert = buildUniqueVariants(sizesToUse, colors);
      for (const variant of variantsToInsert) {
        const key = `${variant.size || ''}::${variant.color || ''}`;
        const variantStock = existingStockMap.hasOwnProperty(key) ? existingStockMap[key] : stock;
        await dbRun(`
          INSERT INTO variants (product_id, size, color, stock, is_active)
          VALUES ($1, $2, $3, $4, $5)
        `, [id, variant.size, variant.color, variantStock, variantStock > 0 ? 1 : 0]);
      }
    }

    res.json({
      success: true,
      message: 'Ürün güncellendi'
    });
  } catch (error) {
    console.error('Product update error:', error && error.stack ? error.stack : error);
    res.status(500).json({
      success: false,
      message: 'Ürün güncellenemedi'
    });
  }
});

// Create product
router.post('/products', adminAuth, async (req, res) => {
  try {
    const {
      name,
      description,
        slogan,
      price,
      compare_price,
      image,
      images,
      category_id,
      stock = 100,
      sizes = [],
      colors = [],
        pre_order_sizes = [],
        is_featured = false,
        pre_order = false,
        is_new = false,
        is_active = true
    } = req.body;

    // Validation
    if (!name || !price) {
      return res.status(400).json({
        success: false,
        message: 'Ürün adı ve fiyat gereklidir'
      });
    }

    if (price <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Fiyat 0\'dan büyük olmalıdır'
      });
    }

    // Helper to generate slug
    const slugify = (s) => {
      if (!s) return '';
      return s.toString().toLowerCase().trim()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\-]/g, '')
        .replace(/\-+/g, '-');
    };

    const slug = req.body.slug ? slugify(req.body.slug) : slugify(name);

    // Convert images to JSON string if it's an array
    const imagesJson = Array.isArray(images) ? JSON.stringify(images) : images;

    // Insert product
    const result = await dbQuery(
      `INSERT INTO products (name, slug, description, slogan, price, compare_price, image_url, images, category_id, stock, pre_order_sizes, pre_order, is_featured, is_new, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id`
      , [
        name,
        slug,
        description,
        slogan || null,
        price,
        compare_price,
        image,
        imagesJson,
        category_id,
        stock,
        Array.isArray(pre_order_sizes) ? pre_order_sizes.join(',') : (pre_order_sizes || null),
        Number(Boolean(pre_order)),
        Number(Boolean(is_featured)),
        Number(Boolean(is_new)),
        Number(Boolean(is_active))
      ]
    );

    const productId = result.rows[0].id;
    
    console.log('Product created with ID:', productId, 'Result:', result);

    // Insert variants. If `variants` provided in request body, use those (allow per-variant stock).
    if (Array.isArray(req.body.variants) && req.body.variants.length > 0) {
      for (const v of req.body.variants) {
        const vs = v && v.size ? v.size : null;
        const vc = v && v.color ? v.color : null;
        const vst = Number.isFinite(Number(v && v.stock ? v.stock : stock)) ? Number(v.stock) : stock;
        await dbRun(`
          INSERT INTO variants (product_id, size, color, stock, is_active)
          VALUES ($1, $2, $3, $4, $5)
        `, [productId, vs, vc, vst, vst > 0 ? 1 : 0]);
      }
    } else {
      // Backwards-compatible: build variants from sizes/colors
      let sizesToUse = Array.isArray(sizes) ? sizes.slice() : [];
      const variantsToInsert = buildUniqueVariants(sizesToUse, colors);
      for (const variant of variantsToInsert) {
        await dbRun(`
          INSERT INTO variants (product_id, size, color, stock, is_active)
          VALUES ($1, $2, $3, $4, $5)
        `, [productId, variant.size, variant.color, stock, stock > 0 ? 1 : 0]);
      }
    }

    res.json({
      success: true,
      data: { id: productId },
      message: 'Ürün oluşturuldu'
    });
  } catch (error) {
    console.error('Product create error:', error && error.stack ? error.stack : error);
    res.status(500).json({
      success: false,
      message: 'Ürün oluşturulamadı',
      error: error.message,
      details: error.toString()
    });
  }
});

// ...
// Toggle product active status
router.patch('/products/:id/toggle-active', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    await dbRun(`
      UPDATE products
      SET is_active = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [is_active, id]);

    res.json({
      success: true,
      message: is_active ? 'Ürün aktif edildi' : 'Ürün pasif edildi'
    });
  } catch (error) {
    console.error('Toggle product active error:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün durumu değiştirilemedi'
    });
  }
});

// Delete product
router.delete('/products/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    await dbRun('DELETE FROM products WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Ürün silindi'
    });
  } catch (error) {
    console.error('Product delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Ürün silinemedi'
    });
  }
});

// Get all categories
router.get('/categories', adminAuth, async (req, res) => {
  try {
    const categories = await dbAll('SELECT * FROM categories ORDER BY name');

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategoriler alınamadı'
    });
  }
});

// Get all orders
router.get('/orders', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const ordersResult = await dbQuery(`
      SELECT o.*, u.name as customerName, u.email as customerEmail
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const orders = ordersResult.rows;

    const totalRow = await dbGet('SELECT COUNT(*) as count FROM orders');
    const total = totalRow?.count || 0;

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Siparişler alınamadı'
    });
  }
});

// Get order details by id
router.get('/orders/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const order = await dbGet(`
      SELECT o.*, u.name as customerName, u.email as customerEmail
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
    `, [id]);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Sipariş bulunamadı'
      });
    }

    // Get order items
    const items = await dbAll(`
      SELECT oi.*, p.name as productName, p.image_url as productImage
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = $1
    `, [id]);

    order.items = items;

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order details error:', error);
    res.status(500).json({
      success: false,
      message: 'Sipariş detayları alınamadı'
    });
  }
});

// Update order status
router.put('/orders/:id/status', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await dbRun(`
      UPDATE orders
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [status, id]);

    res.json({
      success: true,
      message: 'Sipariş durumu güncellendi'
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Sipariş durumu güncellenemedi'
    });
  }
});

// Get all users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const usersResult = await dbQuery(`
      SELECT id, name, email, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const users = usersResult.rows;

    const totalRow = await dbGet('SELECT COUNT(*) as count FROM users');
    const total = totalRow?.count || 0;

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcılar alınamadı'
    });
  }
});

// Get user by id
router.get('/users/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await dbGet('SELECT * FROM users WHERE id = $1', [id]);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    } else {
      res.json({
        success: true,
        data: user
      });
    }
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı alınamadı'
    });
  }
});

// Update user
router.put('/users/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    await dbRun(`
      UPDATE users
      SET name = $1, email = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [name, email, id]);

    res.json({
      success: true,
      message: 'Kullanıcı güncellendi'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı güncellenemedi'
    });
  }
});

// Delete user
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    await dbRun('DELETE FROM users WHERE id = $1', [id]);

    res.json({
      success: true,
      message: 'Kullanıcı silindi'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı silinemedi'
    });
  }
});

// Ban/Unban user
router.put('/users/:id/ban', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const banned = req.body && typeof req.body.banned !== 'undefined'
      ? req.body.banned
      : true; // default to ban when body missing

    // First check if is_banned column exists, if not add it
    await dbRun(`
      UPDATE users
      SET is_banned = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [banned ? true : false, id]);

    res.json({
      success: true,
      message: banned ? 'Kullanıcı banlandı' : 'Kullanıcı banı kaldırıldı'
    });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı ban durumu güncellenemedi',
      error: error.message
    });
  }
});

// Get settings
router.get('/settings', adminAuth, async (req, res) => {
  try {
    const settings = await dbAll('SELECT * FROM settings ORDER BY key');
    
    // Convert array to object
    const settingsObj = {};
    settings.forEach(setting => {
      // Convert type if needed
      let value = setting.value;
      if (setting.type === 'number') {
        value = parseFloat(value);
      } else if (setting.type === 'boolean') {
        value = value === 'true';
      }
      settingsObj[setting.key] = value;
    });

    res.json({ success: true, data: settingsObj });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Ayarlar alınamadı'
    });
  }
});

// Update settings
router.put('/settings', adminAuth, async (req, res) => {
  try {
    const settings = req.body || {};

    // Update each setting in the database
    for (const [key, value] of Object.entries(settings)) {
      await dbRun(`
        UPDATE settings 
        SET value = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE key = $2
      `, [String(value), key]);
    }

    res.json({ success: true, message: 'Ayarlar güncellendi' });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Ayarlar güncellenemedi'
    });
  }
});

// CSV'den ürün import
router.post('/import-csv', adminAuth, async (req, res) => {
  try {
    const { csvData } = req.body;

    if (!csvData) {
      return res.status(400).json({
        success: false,
        message: 'CSV verisi gerekli'
      });
    }

    // Geçici CSV dosyası oluştur
    const fs = require('fs');
    const path = require('path');
    const tempDir = path.join(__dirname, '../temp');

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = path.join(tempDir, `import_${Date.now()}.csv`);

    // CSV verisini dosyaya yaz
    const csvContent = csvData.trim();
    fs.writeFileSync(tempFilePath, csvContent);

    // Import işlemini başlat
    importFromCSV(tempFilePath);

    // Geçici dosyayı sil
    setTimeout(() => {
      try {
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (error) {
        console.error('Geçici dosya silinemedi:', error);
      }
    }, 5000);

    res.json({
      success: true,
      message: 'CSV import işlemi başlatıldı. İşlem tamamlandığında sonuçlar konsola yazılacak.'
    });
  } catch (error) {
    console.error('CSV import hatası:', error);
    res.status(500).json({
      success: false,
      message: 'CSV import başarısız'
    });
  }
});

module.exports = router;

// Diagnostic endpoint to help with production deploy checks (admin-only)
// Returns basic info (DB file exists, uploads dir exists, JWT secret presence)
// Keep this protected by adminAuth and remove or restrict in long-term production.
// Usage: GET /api/admin/_diag (must be authenticated as admin)
router.get('/_diag', adminAuth, (req, res) => {
  if (!allowAdminDiag) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  try {
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');

    const uploadsExists = fs.existsSync(uploadsDir);

    res.json({
      success: true,
      data: {
        nodeEnv: process.env.NODE_ENV || null,
        baseUrl: process.env.BASE_URL || null,
        jwtSecretSet: !!process.env.JWT_SECRET,
        databaseUrlSet: !!process.env.DATABASE_URL,
        uploadsDir,
        uploadsExists
      }
    });
  } catch (err) {
    console.error('Admin diag error:', err && err.stack ? err.stack : err);
    res.status(500).json({ success: false, message: 'Diag failed' });
  }
});


// Analytics endpoints for charts
router.get('/analytics/sales-trend', adminAuth, async (req, res) => {
  try {
    const { period = 'daily', days = 30 } = req.query;
    const parsedDays = parseInt(days) || 30;

    const dateFormat = period === 'daily'
      ? "strftime('%Y-%m-%d', o.created_at)"
      : "strftime('%Y-%m', o.created_at)";
    const dateFilter = `o.created_at >= date('now', '-${parsedDays} day')`;

    const salesData = await dbAll(`
      SELECT
        ${dateFormat} as date,
        COUNT(DISTINCT o.id) as orders,
        COALESCE(SUM(o.total), 0) as revenue,
        COALESCE(SUM(oi.quantity), 0) as items_sold
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE ${dateFilter}
      GROUP BY ${dateFormat}
      ORDER BY date ASC
    `);

    // Convert to proper numbers
    const formattedSalesData = salesData.map(row => ({
      date: row.date,
      orders: parseInt(row.orders) || 0,
      revenue: parseFloat(row.revenue) || 0,
      items_sold: parseInt(row.items_sold) || 0
    }));

    res.json({
      success: true,
      data: {
        period,
        days: parsedDays,
        salesData: formattedSalesData
      }
    });
  } catch (error) {
    console.error('Sales trend error:', error);
    res.status(500).json({ success: false, message: 'Satış trend verileri alınırken hata oluştu' });
  }
});

router.get('/analytics/top-products', adminAuth, async (req, res) => {
  try {
    const { limit = 10, days = 30 } = req.query;
    const parsedDays = parseInt(days) || 30;

    const dateFilter = `o.created_at >= date('now', '-${parsedDays} day')`;

    const topProducts = await dbAll(`
      SELECT
        p.id,
        p.name,
        p.price,
        COALESCE(SUM(oi.quantity), 0) as total_sold,
        COALESCE(SUM(oi.quantity * oi.price), 0) as total_revenue,
        COUNT(DISTINCT o.id) as order_count
      FROM products p
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      WHERE ${dateFilter} OR o.created_at IS NULL
      GROUP BY p.id, p.name, p.price
      ORDER BY total_sold DESC
      LIMIT ${parseInt(limit)}
    `);

    // Convert to proper numbers
    const formattedTopProducts = topProducts.map(row => ({
      id: row.id,
      name: row.name,
      price: parseFloat(row.price) || 0,
      total_sold: parseInt(row.total_sold) || 0,
      total_revenue: parseFloat(row.total_revenue) || 0,
      order_count: parseInt(row.order_count) || 0
    }));

    res.json({
      success: true,
      data: {
        limit: parseInt(limit),
        days: parseInt(days),
        topProducts: formattedTopProducts
      }
    });
  } catch (error) {
    console.error('Top products error:', error);
    res.status(500).json({ success: false, message: 'En çok satan ürünler verileri alınırken hata oluştu' });
  }
});

router.get('/analytics/stock-levels', adminAuth, async (req, res) => {
  try {
    const { threshold = 10 } = req.query;

    const stockData = await dbAll(`
      SELECT
        p.id,
        p.name,
        p.stock,
        p.price,
        c.name as category_name,
        CASE
          WHEN p.stock = 0 THEN 'out_of_stock'
          WHEN p.stock <= ${parseInt(threshold)} THEN 'low_stock'
          ELSE 'in_stock'
        END as stock_status
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true
      ORDER BY p.stock ASC
      LIMIT 50
    `);

    // Convert to proper numbers
    const formattedStockData = stockData.map(row => ({
      id: row.id,
      name: row.name,
      stock: parseInt(row.stock) || 0,
      price: parseFloat(row.price) || 0,
      category_name: row.category_name,
      stock_status: row.stock_status
    }));

    res.json({
      success: true,
      data: {
        threshold: parseInt(threshold),
        stockData: formattedStockData
      }
    });
  } catch (error) {
    console.error('Stock levels error:', error);
    res.status(500).json({ success: false, message: 'Stok seviyeleri verileri alınırken hata oluştu' });
  }
});

router.get('/analytics/price-analysis', adminAuth, async (req, res) => {
  try {
    const priceStats = await dbGet(`
      SELECT
        COUNT(*) as total_products,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        SUM(price) as total_value
      FROM products
      WHERE is_active = true
    `);

    const priceRanges = await dbAll(`
      SELECT
        CASE
          WHEN price < 100 THEN '0-99'
          WHEN price < 500 THEN '100-499'
          WHEN price < 1000 THEN '500-999'
          WHEN price < 2000 THEN '1000-1999'
          ELSE '2000+'
        END as price_range,
        COUNT(*) as count
      FROM products
      WHERE is_active = true
      GROUP BY
        CASE
          WHEN price < 100 THEN '0-99'
          WHEN price < 500 THEN '100-499'
          WHEN price < 1000 THEN '500-999'
          WHEN price < 2000 THEN '1000-1999'
          ELSE '2000+'
        END
      ORDER BY MIN(price) ASC
    `);

    // Convert to proper numbers
    const formattedPriceStats = {
      total_products: parseInt(priceStats?.total_products) || 0,
      avg_price: parseFloat(priceStats?.avg_price) || 0,
      min_price: parseFloat(priceStats?.min_price) || 0,
      max_price: parseFloat(priceStats?.max_price) || 0,
      total_value: parseFloat(priceStats?.total_value) || 0
    };

    const formattedPriceRanges = priceRanges.map(row => ({
      price_range: row.price_range,
      count: parseInt(row.count) || 0
    }));

    res.json({
      success: true,
      data: {
        priceStats: formattedPriceStats,
        priceRanges: formattedPriceRanges
      }
    });
  } catch (error) {
    console.error('Price analysis error:', error);
    res.status(500).json({ success: false, message: 'Fiyat analizi verileri alınırken hata oluştu' });
  }
});

// Seed database endpoint (admin only, production safe)
router.post('/seed', adminAuth, async (req, res) => {
  if (!allowSeedEndpoint) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  try {
    const seedScript = 'seed-sqlite.js';

    // Check if products already exist
    const countRow = await dbGet('SELECT COUNT(*) as count FROM products');
    const existingProducts = parseInt(countRow?.count || 0);

    if (existingProducts > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Database already has ${existingProducts} products. Delete them first if you want to re-seed.` 
      });
    }

    // Run seed script
    const { spawn } = require('child_process');
    const seedProcess = spawn('node', [seedScript], {
      cwd: __dirname + '/..',
      env: process.env
    });

    let output = '';
    let errorOutput = '';

    seedProcess.stdout.on('data', (data) => {
      output += data.toString();
    });

    seedProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    seedProcess.on('close', (code) => {
      if (code === 0) {
        res.json({ 
          success: true, 
          message: `Database seeded successfully using ${seedScript}`,
          output: output
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'Seed script failed',
          error: errorOutput,
          output: output
        });
      }
    });

  } catch (error) {
    console.error('Seed endpoint error:', error);
    res.status(500).json({ success: false, message: 'Seed işlemi başlatılamadı', error: error.message });
  }
});

// Get newsletter subscribers
router.get('/newsletter', adminAuth, async (req, res) => {
  try {
    const subscribers = await dbAll(`
      SELECT * FROM newsletter_subscriptions 
      ORDER BY subscribed_at DESC
    `);
    
    res.json({
      success: true,
      data: subscribers
    });
  } catch (error) {
    console.error('Get newsletter subscribers error:', error);
    res.status(500).json({
      success: false,
      message: 'Aboneler alınamadı'
    });
  }
});

module.exports = router;




