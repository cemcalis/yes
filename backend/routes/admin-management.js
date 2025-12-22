const express = require('express');
const { dbAll, dbRun } = require('../db');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// List users (admin only)
router.get('/', adminAuth, async (req, res) => {
  try {
    const rows = await dbAll('SELECT id, name, email, is_admin, created_at FROM users ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ success: false, message: 'Kullanıcılar alınamadı' });
  }
});

// Promote user to admin
router.post('/promote', adminAuth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'userId gerekli' });

    const result = await dbRun('UPDATE users SET is_admin = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [userId]);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }
    
    res.json({ success: true, message: 'Kullanıcı admin yapıldı' });
  } catch (error) {
    console.error('Promote user error:', error);
    res.status(500).json({ success: false, message: 'Sunucu hatası' });
  }
});

module.exports = router;
