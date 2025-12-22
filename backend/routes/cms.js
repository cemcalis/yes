const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken: auth } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

// Setup multer for banner uploads
const uploadDir = path.join(__dirname, '../public/uploads/banners');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece resim dosyaları yüklenebilir'));
    }
  }
});

// ============= PAGES =============

// Get all published pages
router.get('/pages', async (req, res) => {
  try {
    const pages = await allAsync(
  'SELECT id, title, slug, meta_title, meta_description, created_at, updated_at FROM pages WHERE is_published IS TRUE ORDER BY title'
    );
    res.json(pages);
  } catch (error) {
    console.error('Get pages error:', error);
    res.status(500).json({ error: 'Sayfalar alınamadı' });
  }
});

// Get single page by slug
router.get('/pages/:slug', async (req, res) => {
  try {
    const page = await getAsync(
  'SELECT * FROM pages WHERE slug = ? AND is_published IS TRUE',
      [req.params.slug]
    );

    if (!page) {
      return res.status(404).json({ error: 'Sayfa bulunamadı' });
    }

    res.json(page);
  } catch (error) {
    console.error('Get page error:', error);
    res.status(500).json({ error: 'Sayfa alınamadı' });
  }
});

// Admin: Get all pages (including unpublished)
router.get('/admin/pages', auth, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }

  try {
    const pages = await allAsync('SELECT * FROM pages ORDER BY created_at DESC');
    res.json(pages);
  } catch (error) {
    console.error('Get admin pages error:', error);
    res.status(500).json({ error: 'Sayfalar alınamadı' });
  }
});

// Admin: Create page
router.post('/admin/pages', auth, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }

  try {
    const { title, slug, content, meta_title, meta_description, is_published } = req.body;

    if (!title || !slug || !content) {
      return res.status(400).json({ error: 'Başlık, slug ve içerik gerekli' });
    }

    const result = await runAsync(
      'INSERT INTO pages (title, slug, content, meta_title, meta_description, is_published) VALUES (?, ?, ?, ?, ?, ?)',
      [title, slug, content, meta_title || title, meta_description || '', is_published ? 1 : 0]
    );

    const newPage = await getAsync('SELECT * FROM pages WHERE id = ?', [result.lastID]);

    res.status(201).json({ success: true, page: newPage });
  } catch (error) {
    console.error('Create page error:', error);
    if (error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Bu slug zaten kullanılıyor' });
    }
    res.status(500).json({ error: 'Sayfa oluşturulamadı' });
  }
});

// Admin: Update page
router.put('/admin/pages/:id', auth, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }

  try {
    const { id } = req.params;
    const { title, slug, content, meta_title, meta_description, is_published } = req.body;

    await runAsync(
      `UPDATE pages SET 
       title = ?, slug = ?, content = ?, meta_title = ?, meta_description = ?, 
       is_published = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [title, slug, content, meta_title, meta_description, is_published ? 1 : 0, id]
    );

    const updatedPage = await getAsync('SELECT * FROM pages WHERE id = ?', [id]);

    res.json({ success: true, page: updatedPage });
  } catch (error) {
    console.error('Update page error:', error);
    res.status(500).json({ error: 'Sayfa güncellenemedi' });
  }
});

// Admin: Delete page
router.delete('/admin/pages/:id', auth, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }

  try {
    await runAsync('DELETE FROM pages WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Sayfa silindi' });
  } catch (error) {
    console.error('Delete page error:', error);
    res.status(500).json({ error: 'Sayfa silinemedi' });
  }
});

// ============= BANNERS =============

// Get active banners for position
router.get('/banners', async (req, res) => {
  try {
    const { position = 'home' } = req.query;

    const banners = await allAsync(
      `SELECT * FROM banners 
  WHERE is_active IS TRUE 
       AND position = ?
       AND (valid_from IS NULL OR valid_from <= CURRENT_TIMESTAMP)
       AND (valid_until IS NULL OR valid_until >= CURRENT_TIMESTAMP)
       ORDER BY display_order ASC, created_at DESC`,
      [position]
    );

    res.json(banners);
  } catch (error) {
    console.error('Get banners error:', error);
    res.status(500).json({ error: 'Bannerlar alınamadı' });
  }
});

// Admin: Get all banners
router.get('/admin/banners', auth, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }

  try {
    const banners = await allAsync('SELECT * FROM banners ORDER BY position, display_order, created_at DESC');
    res.json(banners);
  } catch (error) {
    console.error('Get admin banners error:', error);
    res.status(500).json({ error: 'Bannerlar alınamadı' });
  }
});

// Admin: Create banner
router.post('/admin/banners', auth, upload.single('image'), async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }

  try {
    const { title, link_url, description, position, display_order, is_active, valid_from, valid_until } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Banner görseli gerekli' });
    }

    const imageUrl = `/uploads/banners/${req.file.filename}`;

    const result = await runAsync(
      `INSERT INTO banners (title, image_url, link_url, description, position, display_order, is_active, valid_from, valid_until)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title || '',
        imageUrl,
        link_url || null,
        description || null,
        position || 'home',
        display_order || 0,
        is_active ? 1 : 0,
        valid_from || null,
        valid_until || null
      ]
    );

    const newBanner = await getAsync('SELECT * FROM banners WHERE id = ?', [result.lastID]);

    res.status(201).json({ success: true, banner: newBanner });
  } catch (error) {
    console.error('Create banner error:', error);
    res.status(500).json({ error: 'Banner oluşturulamadı' });
  }
});

// Admin: Update banner
router.put('/admin/banners/:id', auth, upload.single('image'), async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }

  try {
    const { id } = req.params;
    const { title, link_url, description, position, display_order, is_active, valid_from, valid_until } = req.body;

    const existing = await getAsync('SELECT * FROM banners WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Banner bulunamadı' });
    }

    let imageUrl = existing.image_url;

    if (req.file) {
      imageUrl = `/uploads/banners/${req.file.filename}`;
      // Delete old image
      if (existing.image_url) {
        const oldPath = path.join(__dirname, '../public', existing.image_url);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }

    // If client requested to remove image without uploading a new one
    if (!req.file && (req.body && (req.body.remove_image === '1' || req.body.remove_image === 'true'))) {
      if (existing.image_url) {
        const oldPath = path.join(__dirname, '../public', existing.image_url);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
      imageUrl = null;
    }

    await runAsync(
      `UPDATE banners SET 
       title = ?, image_url = ?, link_url = ?, description = ?, 
       position = ?, display_order = ?, is_active = ?, valid_from = ?, valid_until = ?
       WHERE id = ?`,
      [
        title || '',
        imageUrl,
        link_url || null,
        description || null,
        position || 'home',
        display_order || 0,
        is_active ? 1 : 0,
        valid_from || null,
        valid_until || null,
        id
      ]
    );

    const updatedBanner = await getAsync('SELECT * FROM banners WHERE id = ?', [id]);

    res.json({ success: true, banner: updatedBanner });
  } catch (error) {
    console.error('Update banner error:', error);
    res.status(500).json({ error: 'Banner güncellenemedi' });
  }
});

// Admin: Delete banner
router.delete('/admin/banners/:id', auth, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }

  try {
    const { id } = req.params;

    const banner = await getAsync('SELECT image_url FROM banners WHERE id = ?', [id]);
    if (banner && banner.image_url) {
      const imagePath = path.join(__dirname, '../public', banner.image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await runAsync('DELETE FROM banners WHERE id = ?', [id]);

    res.json({ success: true, message: 'Banner silindi' });
  } catch (error) {
    console.error('Delete banner error:', error);
    res.status(500).json({ error: 'Banner silinemedi' });
  }
});

// ============= NEWSLETTER =============

// Subscribe to newsletter
router.post('/newsletter/subscribe', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Geçerli bir email adresi girin' });
    }

    await runAsync(
  'INSERT INTO newsletter_subscriptions (email) VALUES (?) ON CONFLICT(email) DO UPDATE SET is_active = TRUE, subscribed_at = CURRENT_TIMESTAMP',
      [email.toLowerCase().trim()]
    );

    res.json({ success: true, message: 'Bültene kaydoldunuz' });
  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    res.status(500).json({ error: 'Kayıt yapılamadı' });
  }
});

// Unsubscribe from newsletter
router.post('/newsletter/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;

    await runAsync(
      'UPDATE newsletter_subscriptions SET is_active = 0, unsubscribed_at = CURRENT_TIMESTAMP WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    res.json({ success: true, message: 'Bülten aboneliğiniz iptal edildi' });
  } catch (error) {
    console.error('Newsletter unsubscribe error:', error);
    res.status(500).json({ error: 'İptal işlemi yapılamadı' });
  }
});

// Admin: Get all newsletter subscribers
router.get('/admin/newsletter', auth, async (req, res) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Yetkisiz erişim' });
  }

  try {
    const subscribers = await allAsync(
      'SELECT * FROM newsletter_subscriptions ORDER BY subscribed_at DESC'
    );
    res.json(subscribers);
  } catch (error) {
    console.error('Get newsletter subscribers error:', error);
    res.status(500).json({ error: 'Aboneler alınamadı' });
  }
});

module.exports = router;
