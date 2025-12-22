const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken: auth } = require('../middleware/authMiddleware');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// Helper functions
function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

// Generate 2FA secret and QR code
router.post('/setup', auth, async (req, res) => {
  try {
    const user = await getAsync(
      'SELECT email, two_factor_enabled FROM users WHERE id = ?',
      [req.user.id]
    );

    if (user.two_factor_enabled) {
      return res.status(400).json({ error: 'İki faktörlü doğrulama zaten aktif' });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `RAVOR (${user.email})`,
      length: 32
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Store secret temporarily (will be activated after verification)
    await runAsync(
      'UPDATE users SET two_factor_secret = ? WHERE id = ?',
      [secret.base32, req.user.id]
    );

    res.json({
      success: true,
      secret: secret.base32,
      qr_code: qrCodeUrl,
      manual_entry: secret.otpauth_url
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: '2FA kurulumu başarısız' });
  }
});

// Verify and enable 2FA
router.post('/verify', auth, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token || token.length !== 6) {
      return res.status(400).json({ error: 'Geçersiz doğrulama kodu' });
    }

    const user = await getAsync(
      'SELECT two_factor_secret FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user.two_factor_secret) {
      return res.status(400).json({ error: 'Önce 2FA kurulumunu başlatın' });
    }

    // Verify token
    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: token,
      window: 2 // Allow 2 time steps before/after
    });

    if (!verified) {
      return res.status(400).json({ error: 'Geçersiz doğrulama kodu' });
    }

    // Enable 2FA
    await runAsync(
      'UPDATE users SET two_factor_enabled = 1 WHERE id = ?',
      [req.user.id]
    );

    // Generate backup codes
    const backupCodes = generateBackupCodes();
    
    res.json({
      success: true,
      message: 'İki faktörlü doğrulama aktif edildi',
      backup_codes: backupCodes
    });
  } catch (error) {
    console.error('2FA verify error:', error);
    res.status(500).json({ error: 'Doğrulama başarısız' });
  }
});

// Disable 2FA
router.post('/disable', auth, async (req, res) => {
  try {
    const { password, token } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Şifre gerekli' });
    }

    const user = await getAsync(
      'SELECT password, two_factor_secret, two_factor_enabled FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user.two_factor_enabled) {
      return res.status(400).json({ error: 'İki faktörlü doğrulama zaten kapalı' });
    }

    // Verify password
    const bcrypt = require('bcrypt');
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Geçersiz şifre' });
    }

    // Verify 2FA token
    if (token) {
      const verified = speakeasy.totp.verify({
        secret: user.two_factor_secret,
        encoding: 'base32',
        token: token,
        window: 2
      });

      if (!verified) {
        return res.status(400).json({ error: 'Geçersiz doğrulama kodu' });
      }
    }

    // Disable 2FA
    await runAsync(
      'UPDATE users SET two_factor_enabled = 0, two_factor_secret = NULL WHERE id = ?',
      [req.user.id]
    );

    res.json({
      success: true,
      message: 'İki faktörlü doğrulama kapatıldı'
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ error: 'Kapatma işlemi başarısız' });
  }
});

// Validate 2FA token during login
router.post('/validate', async (req, res) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({ error: 'Email ve token gerekli' });
    }

    const user = await getAsync(
      'SELECT two_factor_secret, two_factor_enabled FROM users WHERE email = ?',
      [email]
    );

    if (!user || !user.two_factor_enabled) {
      return res.status(400).json({ error: 'İki faktörlü doğrulama aktif değil' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: token,
      window: 2
    });

    if (!verified) {
      return res.status(401).json({ error: 'Geçersiz doğrulama kodu', valid: false });
    }

    res.json({ success: true, valid: true });
  } catch (error) {
    console.error('2FA validate error:', error);
    res.status(500).json({ error: 'Doğrulama başarısız' });
  }
});

// Check 2FA status
router.get('/status', auth, async (req, res) => {
  try {
    const user = await getAsync(
      'SELECT two_factor_enabled FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({
      enabled: user.two_factor_enabled === 1
    });
  } catch (error) {
    console.error('2FA status error:', error);
    res.status(500).json({ error: 'Durum alınamadı' });
  }
});

// Helper function to generate backup codes
function generateBackupCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code.match(/.{1,4}/g).join('-'));
  }
  return codes;
}

module.exports = router;
