const jwt = require('jsonwebtoken');
const { dbGet } = require('../db');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    console.debug('[auth] authorization header present:', !!authHeader);
    const token = authHeader?.split && authHeader.split(' ')[1];
    console.debug('[auth] token preview:', token ? `${token.slice(0,8)}...${token.slice(-8)}` : null);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token gerekli'
      });
    }

    let decoded;
    try {
      const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
      console.error('[auth] SECRET LENGTH:', secret ? secret.length : '<nil>');
      decoded = jwt.verify(token, secret);
    } catch (verr) {
      console.error('[auth] jwt.verify failed:', verr && verr.message ? verr.message : String(verr));
      return res.status(401).json({ success: false, message: 'Geçersiz token' });
    }

    // Kullanıcı bilgilerini veritabanından al
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [decoded.userId]);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz kullanıcı'
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      address: user.address,
      isAdmin: user.is_admin || false
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Geçersiz token'
    });
  }
};

module.exports = auth;
