const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    // Token olmasa bile isteğin devam etmesine izin ver.
    // Rota kendi içinde req.user'ın varlığını kontrol ederek yetkilendirme yapabilir.
    // Bu, public (herkese açık) ve private (korumalı) rotaların daha esnek yönetilmesini sağlar.
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // Geçersiz token durumunda da isteği kesme, sadece kullanıcı bilgisi ekleme.
      req.user = null;
      return next();
    }

    req.user = user; // { userId: ..., email: ... }
    next();
  });
}

function isAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Yetkisiz erişim. Admin yetkisi gerekli.' });
  }
  next();
}

module.exports = { authenticateToken, isAdmin };