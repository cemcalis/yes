const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../db');

// Public banners endpoint
router.get('/', async (req, res) => {
  try {
    // Detect whether `sort_order` column exists; fall back to `display_order` or no-order
    const cols = await new Promise((resCols, rejCols) => dbAll("PRAGMA table_info('banners')", [], (err, rows) => err ? rejCols(err) : resCols((rows || []).map(r => r.name))));
    let orderClause = 'created_at DESC';
    if (cols.includes('sort_order')) orderClause = 'sort_order ASC, created_at DESC';
    else if (cols.includes('display_order')) orderClause = 'display_order ASC, created_at DESC';

    const banners = await dbAll(`SELECT * FROM banners WHERE is_active = 1 ORDER BY ${orderClause}`);
    res.json(banners);
  } catch (error) {
    console.error('Public banners error:', error);
    res.status(500).json({ error: 'Bannerlar alınamadı' });
  }
});

// Get single banner
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await dbGet('SELECT * FROM banners WHERE id = $1', [id]);
    
    if (!banner) {
      return res.status(404).json({ error: 'Banner bulunamadı' });
    }
    
    res.json(banner);
  } catch (error) {
    console.error('Get banner error:', error);
    res.status(500).json({ error: 'Banner alınamadı' });
  }
});

module.exports = router;
