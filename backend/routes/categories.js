const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../db');
const adminAuth = require('../middleware/adminAuth');
const fs = require('fs');
const path = require('path');

// Tüm kategorileri getir
router.get('/', async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT * FROM categories
       ORDER BY
         CASE
           WHEN name = 'Elbiseler' THEN 1
           WHEN name = 'Üst Giyim' THEN 2
           WHEN name = 'Alt Giyim' THEN 3
           ELSE 4
         END,
       name COLLATE NOCASE ASC`
    );
    res.json(rows);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Tüm kategorileri getir (admin)
router.get('/admin', adminAuth, async (req, res) => {
  try {
    const rows = await dbAll(
      `SELECT * FROM categories
       ORDER BY
         CASE
           WHEN name = 'Elbiseler' THEN 1
           WHEN name = 'Üst Giyim' THEN 2
           WHEN name = 'Alt Giyim' THEN 3
           ELSE 4
         END,
       name COLLATE NOCASE ASC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get admin categories error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Tek kategori detayı (ID veya slug ile)
router.get('/:idOrSlug', async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    
    // ID mi slug mu kontrol et
    let row;
    if (/^\d+$/.test(idOrSlug)) {
      // Numeric ID
      row = await dbGet('SELECT * FROM categories WHERE id = $1', [parseInt(idOrSlug)]);
    } else {
      // Slug
      row = await dbGet('SELECT * FROM categories WHERE slug = $1', [idOrSlug]);
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Kategori bulunamadı' });
    }
    res.json(row);
  } catch (error) {
    console.error('Get category error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Yeni kategori ekle
router.post('/', async (req, res) => {
  try {
    const { name, slug, description, image_url } = req.body;
    const result = await dbRun(
      'INSERT INTO categories (name, slug, description, image_url) VALUES ($1, $2, $3, $4)',
      [name, slug, description, image_url]
    );
    res.status(201).json({ id: result.lastID, message: 'Kategori eklendi' });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Yeni kategori ekle (admin)
router.post('/admin', adminAuth, async (req, res) => {
  try {
    const { name, image_url } = req.body;

    // Slug oluştur
    const slug = name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '')
      .replace(/\-+/g, '-');

    const result = await dbRun(
      'INSERT INTO categories (name, slug, image_url) VALUES ($1, $2, $3)',
      [name, slug, image_url || null]
    );
    res.status(201).json({ success: true, data: { id: result.lastID }, message: 'Kategori oluşturuldu' });
  } catch (error) {
    console.error('Create admin category error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Kategori güncelle (admin)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { name, image_url, remove_image } = req.body;
    const { id } = req.params;

    // fetch existing to possibly delete old file
    const existing = await dbGet('SELECT image_url FROM categories WHERE id = $1', [id]);

    let imageUrlToStore = image_url || null;
    if (remove_image) {
      imageUrlToStore = null;
      if (existing && existing.image_url) {
        try {
          const imagePath = path.join(__dirname, '..', 'public', existing.image_url.replace(/^\//, ''));
          if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
        } catch (err) {
          console.error('Error deleting old category image:', err);
        }
      }
    }

    const result = await dbRun(
      'UPDATE categories SET name = $1, image_url = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [name, imageUrlToStore, id]
    );
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Kategori bulunamadı' });
    }
    res.json({ success: true, message: 'Kategori güncellendi' });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Kategori sil (admin)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await dbRun('DELETE FROM categories WHERE id = $1', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Kategori bulunamadı' });
    }
    res.json({ success: true, message: 'Kategori silindi' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
