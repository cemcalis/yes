const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const db = require('./db');

// Usage: node reset-admin-password.js [email] [newPassword]
function getArg(name, fallback) {
  const flag = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (flag) return flag.split('=')[1];
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1 && process.argv[index + 1]) return process.argv[index + 1];
  return fallback;
}

const email =
  getArg('email', process.argv[2]) ||
  process.env.ADMIN_EMAIL ||
  'admin@ravor.com';
const newPassword =
  getArg('password', process.argv[3]) ||
  process.env.ADMIN_PASSWORD ||
  'admin123admin';

async function run() {
  try {
    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        console.error('DB error:', err);
        process.exit(1);
      }

      if (!user) {
        console.error('Admin user not found for email:', email);
        process.exit(1);
      }

      // Backup row
      const backupDir = path.join(__dirname, 'backups');
      fs.mkdirSync(backupDir, { recursive: true });
      const backupPath = path.join(backupDir, `user-${user.id}-${Date.now()}.json`);
      fs.writeFileSync(backupPath, JSON.stringify(user, null, 2));
      console.log('Backed up user row to', backupPath);

      // Hash new password
      const hash = await bcrypt.hash(newPassword, 10);

      db.run('UPDATE users SET password = ? WHERE id = ?', [hash, user.id], function (updateErr) {
        if (updateErr) {
          console.error('Failed to update password:', updateErr);
          process.exit(1);
        }

        console.log(`Password for ${email} updated successfully (id=${user.id}).`);
        // Close DB connection if available and exit
        if (db._raw && typeof db._raw.close === 'function') {
          db._raw.close(() => process.exit(0));
        } else {
          process.exit(0);
        }
      });
    });
  } catch (e) {
    console.error('Unexpected error:', e);
    if (db._raw && typeof db._raw.close === 'function') {
      db._raw.close(() => process.exit(1));
      return;
    }
    process.exit(1);
  }
}

run();
