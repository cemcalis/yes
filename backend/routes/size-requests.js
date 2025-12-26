const express = require('express');
const router = express.Router();
const { dbRun, dbAll } = require('../db');
const adminAuth = require('../middleware/adminAuth');

// Create a special size request
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, productName, size, note, consent } = req.body || {};

    if (!name || !email || !size) {
      return res.status(400).json({
        success: false,
        message: 'Ad, e-posta ve beden zorunludur'
      });
    }

    await dbRun(
      `INSERT INTO special_size_requests (name, email, phone, product_name, size, note, consent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        name,
        email,
        phone || null,
        productName || null,
        size,
        note || null,
        consent ? 1 : 0
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Talebiniz alındı. En kısa sürede dönüş yapacağız.'
    });
  } catch (error) {
    console.error('Special size request error:', error);
    return res.status(500).json({
      success: false,
      message: 'Talep kaydedilemedi'
    });
  }
});

// Get all special size requests (admin only)
router.get('/', adminAuth, async (req, res) => {
  try {
    const requests = await dbAll(`
      SELECT * FROM special_size_requests 
      ORDER BY created_at DESC
    `);
    
    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error('Get size requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Talepler yüklenemedi'
    });
  }
});

// Update size request status (admin only)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const requestId = req.params.id;
    
    await dbRun(
      'UPDATE special_size_requests SET status = ? WHERE id = ?',
      [status, requestId]
    );
    
    res.json({
      success: true,
      message: 'Talep durumu güncellendi'
    });
  } catch (error) {
    console.error('Update size request error:', error);
    res.status(500).json({
      success: false,
      message: 'Talep güncellenemedi'
    });
  }
});

// Delete size request (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const requestId = req.params.id;
    
    await dbRun(
      'DELETE FROM special_size_requests WHERE id = ?',
      [requestId]
    );
    
    res.json({
      success: true,
      message: 'Talep silindi'
    });
  } catch (error) {
    console.error('Delete size request error:', error);
    res.status(500).json({
      success: false,
      message: 'Talep silinemedi'
    });
  }
});

module.exports = router;
