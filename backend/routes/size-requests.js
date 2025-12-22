const express = require('express');
const router = express.Router();
const { dbRun } = require('../db');

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

module.exports = router;
