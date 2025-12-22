const express = require('express');
const router = express.Router();
const { dbAll, dbGet, dbRun } = require('../db');

// Public banners endpoint
router.get('/', async (req, res) => {
  try {
    const banners = await dbAll(
      `SELECT * FROM banners
       WHERE is_active = 1
       ORDER BY sort_order ASC, created_at DESC`
    );

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
