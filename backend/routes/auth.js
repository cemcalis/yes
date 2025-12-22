const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { 
  validateRegistration, 
  validateLogin, 
  handleValidationErrors, 
  createAccountLimiter, 
  loginLimiter 
} = require('../middleware/security');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SALT_ROUNDS = 10;

// Kayıt ol
router.post('/register', createAccountLimiter, validateRegistration, handleValidationErrors, async (req, res) => {
  const { email, password, name, phone, address } = req.body;

  // Validasyon
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, şifre ve isim gereklidir' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır' });
  }

  try {
    const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Bu email zaten kayıtlı' });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const insertResult = await db.query(
      'INSERT INTO users (email, password, name, phone, address) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [email, hashedPassword, name, phone || null, address || null]
    );

    const userId = insertResult.rows[0].id;

    const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Kayıt başarılı',
      token,
      user: {
        id: userId,
        email,
        name,
        phone,
        address,
        is_admin: false
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Giriş yap
router.post('/login', loginLimiter, validateLogin, handleValidationErrors, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email ve şifre gereklidir' });
  }

  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email veya şifre hatalı' });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Email veya şifre hatalı' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Giriş başarılı',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        address: user.address,
        is_admin: user.is_admin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// Token'ı doğrula
router.post('/verify', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(401).json({ error: 'Token bulunamadı' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    const result = await db.query('SELECT id, email, name, phone, avatar_url, is_admin FROM users WHERE id = $1', [decoded.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    const user = result.rows[0];
    res.json({
      message: 'Token geçerli',
      user: {
        ...user,
        is_admin: user.is_admin || false
      }
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(401).json({ error: 'Geçersiz token' });
  }
});

module.exports = router;
