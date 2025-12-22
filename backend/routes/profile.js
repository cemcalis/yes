const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken: auth } = require('../middleware/authMiddleware');

// Setup multer for profile picture uploads
const uploadDir = path.join(__dirname, '../public/uploads/profiles');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Sadece JPG, PNG ve WEBP dosyaları yüklenebilir'));
    }
  }
});

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

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

// Get user profile
router.get('/', auth, async (req, res) => {
  try {
    const user = await getAsync(
      'SELECT id, email, name, phone, address, profile_picture, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Profil bilgileri alınırken hata oluştu' });
  }
});

// Update user profile
router.put('/', auth, async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    await runAsync(
      'UPDATE users SET name = ?, phone = ?, address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [name, phone || null, address || null, req.user.id]
    );

    const updatedUser = await getAsync(
      'SELECT id, email, name, phone, address, profile_picture FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Profil güncellenirken hata oluştu' });
  }
});

// Upload profile picture
router.post('/picture', auth, upload.single('profile_picture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Dosya yüklenmedi' });
    }

    const pictureUrl = `/uploads/profiles/${req.file.filename}`;

    // Get old picture to delete
    const oldUser = await getAsync('SELECT profile_picture FROM users WHERE id = ?', [req.user.id]);
    
    // Update database
    await runAsync(
      'UPDATE users SET profile_picture = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [pictureUrl, req.user.id]
    );

    // Delete old picture if exists
    if (oldUser && oldUser.profile_picture) {
      const oldPath = path.join(__dirname, '../public', oldUser.profile_picture);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    res.json({ success: true, profile_picture: pictureUrl });
  } catch (error) {
    console.error('Upload picture error:', error);
    res.status(500).json({ error: 'Profil resmi yüklenirken hata oluştu' });
  }
});

// Change password
router.post('/change-password', auth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Mevcut şifre ve yeni şifre gerekli' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Yeni şifre en az 6 karakter olmalıdır' });
    }

    // Get current user
    const user = await getAsync('SELECT password FROM users WHERE id = ?', [req.user.id]);

    // Verify current password
    const isMatch = await bcrypt.compare(current_password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Mevcut şifre hatalı' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update password
    await runAsync(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, req.user.id]
    );

    res.json({ success: true, message: 'Şifre başarıyla değiştirildi' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Şifre değiştirirken hata oluştu' });
  }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email gerekli' });
    }

    const user = await getAsync('SELECT id, email FROM users WHERE email = ?', [email]);

    if (!user) {
      // Don't reveal if email exists for security
      return res.json({ success: true, message: 'Eğer email kayıtlıysa, şifre sıfırlama bağlantısı gönderildi' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save reset request
    await runAsync(
      'INSERT INTO password_reset_requests (email, token, expires_at) VALUES (?, ?, ?)',
      [email, resetToken, expiresAt.toISOString()]
    );

    // TODO: Send email with reset link
    // const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    // sendEmail(email, 'Şifre Sıfırlama', resetUrl);

    console.log(`Password reset token for ${email}: ${resetToken}`);

    res.json({ success: true, message: 'Şifre sıfırlama bağlantısı gönderildi', token: resetToken });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Şifre sıfırlama isteği oluşturulurken hata oluştu' });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, new_password } = req.body;

    if (!token || !new_password) {
      return res.status(400).json({ error: 'Token ve yeni şifre gerekli' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır' });
    }

    // Find valid reset request
    const resetRequest = await getAsync(
      'SELECT * FROM password_reset_requests WHERE token = ? AND used = 0 AND expires_at > datetime("now")',
      [token]
    );

    if (!resetRequest) {
      return res.status(400).json({ error: 'Geçersiz veya süresi dolmuş token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 10);

    // Update user password
    await runAsync(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?',
      [hashedPassword, resetRequest.email]
    );

    // Mark token as used
    await runAsync(
      'UPDATE password_reset_requests SET used = 1 WHERE id = ?',
      [resetRequest.id]
    );

    res.json({ success: true, message: 'Şifre başarıyla sıfırlandı' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Şifre sıfırlanırken hata oluştu' });
  }
});

module.exports = router;
