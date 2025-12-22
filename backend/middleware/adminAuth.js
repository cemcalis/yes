const jwt = require('jsonwebtoken');
const db = require('../db');

// Only accept Authorization: Bearer <token>
const adminAuth = async (req, res, next) => {
  try {
    // Accept token from Authorization header OR from cookie named 'adminToken'
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token = authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token && req.cookies) {
      token = req.cookies.adminToken || null;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Admin token gerekli' });
    }

    const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Geçersiz token' });
    }

    if (!decoded || !decoded.userId) {
      return res.status(403).json({ success: false, message: 'Geçersiz token' });
    }

    // Ensure token has admin claim
    if (!decoded.isAdmin && decoded.isAdmin !== true) {
      return res.status(403).json({ success: false, message: 'Admin yetkisi gerekli' });
    }

    // Ensure user exists and is admin in DB
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT id, email, is_admin FROM users WHERE id = ?', [decoded.userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    // Normalize is_admin truthiness (handle boolean true, integer 1, or string '1'/'true')
    const isAdmin = user.is_admin === true || user.is_admin === 1 || user.is_admin === '1' || user.is_admin === 'true';
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Admin yetkisi gerekli' });
    }

    req.admin = { id: user.id, email: user.email };
    next();
  } catch (error) {
    console.error('adminAuth error:', error && error.stack ? error.stack : error);
    return res.status(401).json({ success: false, message: 'Geçersiz token' });
  }
};

module.exports = adminAuth;
