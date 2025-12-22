const express = require('express');
const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../db');
const { authenticateToken: auth } = require('../middleware/authMiddleware');

// Get all addresses for user
router.get('/', auth, async (req, res) => {
  try {
    const addresses = await dbAll(
      'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
      [req.user.id]
    );

    res.json(addresses);
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ error: 'Adresler alınırken hata oluştu' });
  }
});

// Get single address
router.get('/:id', auth, async (req, res) => {
  try {
    const address = await dbGet(
      'SELECT * FROM addresses WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    if (!address) {
      return res.status(404).json({ error: 'Adres bulunamadı' });
    }

    res.json(address);
  } catch (error) {
    console.error('Get address error:', error);
    res.status(500).json({ error: 'Adres alınırken hata oluştu' });
  }
});

// Create new address
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      full_name,
      phone,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country,
      is_default
    } = req.body;

    if (!full_name || !address_line1 || !city || !postal_code) {
      return res.status(400).json({ error: 'Gerekli alanlar eksik' });
    }

    // If this is set as default, remove default from other addresses
    if (is_default) {
      await dbRun(
        'UPDATE addresses SET is_default = 0 WHERE user_id = $1',
        [req.user.id]
      );
    }

    const result = await dbRun(
      `INSERT INTO addresses 
       (user_id, title, full_name, phone, address_line1, address_line2, city, state, postal_code, country, is_default) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        req.user.id,
        title || null,
        full_name,
        phone || null,
        address_line1,
        address_line2 || null,
        city,
        state || null,
        postal_code,
        country || 'Türkiye',
        is_default ? 1 : 0
      ]
    );

    const newAddress = await dbGet(
      'SELECT * FROM addresses WHERE id = $1',
      [result.lastID]
    );

    res.status(201).json({ success: true, address: newAddress });
  } catch (error) {
    console.error('Create address error:', error);
    res.status(500).json({ error: 'Adres oluşturulurken hata oluştu' });
  }
});

// Update address
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      full_name,
      phone,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country,
      is_default
    } = req.body;

    // Verify ownership
    const existing = await dbGet(
      'SELECT * FROM addresses WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Adres bulunamadı' });
    }

    // If this is set as default, remove default from other addresses
    if (is_default) {
      await dbRun(
        'UPDATE addresses SET is_default = 0 WHERE user_id = $1 AND id != $2',
        [req.user.id, id]
      );
    }

    await dbRun(
      `UPDATE addresses SET 
       title = $1, full_name = $2, phone = $3, address_line1 = $4, address_line2 = $5, 
       city = $6, state = $7, postal_code = $8, country = $9, is_default = $10, updated_at = CURRENT_TIMESTAMP
       WHERE id = $11 AND user_id = $12`,
      [
        title || null,
        full_name,
        phone || null,
        address_line1,
        address_line2 || null,
        city,
        state || null,
        postal_code,
        country || 'Türkiye',
        is_default ? 1 : 0,
        id,
        req.user.id
      ]
    );

    const updatedAddress = await dbGet(
      'SELECT * FROM addresses WHERE id = $1',
      [id]
    );

    res.json({ success: true, address: updatedAddress });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ error: 'Adres güncellenirken hata oluştu' });
  }
});

// Delete address
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const existing = await dbGet(
      'SELECT * FROM addresses WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Adres bulunamadı' });
    }

    await dbRun(
      'DELETE FROM addresses WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    // If deleted address was default, set another as default
    if (existing.is_default) {
      const firstAddress = await dbGet(
        'SELECT id FROM addresses WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1',
        [req.user.id]
      );

      if (firstAddress) {
        await dbRun(
          'UPDATE addresses SET is_default = TRUE WHERE id = $1',
          [firstAddress.id]
        );
      }
    }

    res.json({ success: true, message: 'Adres silindi' });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ error: 'Adres silinirken hata oluştu' });
  }
});

// Set address as default
router.post('/:id/set-default', auth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const existing = await dbGet(
      'SELECT * FROM addresses WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (!existing) {
      return res.status(404).json({ error: 'Adres bulunamadı' });
    }

    // Remove default from all addresses
    await dbRun(
      'UPDATE addresses SET is_default = 0 WHERE user_id = $1',
      [req.user.id]
    );

    // Set this as default
    await dbRun(
  'UPDATE addresses SET is_default = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );

    res.json({ success: true, message: 'Varsayılan adres ayarlandı' });
  } catch (error) {
    console.error('Set default address error:', error);
    res.status(500).json({ error: 'Varsayılan adres ayarlanırken hata oluştu' });
  }
});

module.exports = router;
