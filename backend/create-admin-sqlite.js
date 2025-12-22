const bcrypt = require('bcrypt');
const db = require('./db');

async function run() {
  try {
    const email = process.argv[2] || 'admin@ravor.com';
    const password = process.argv[3] || 'admin123';

    // Check if user exists
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      console.log('Admin already exists with id=', existing.id);
      return process.exit(0);
    }

    const hash = await bcrypt.hash(password, 10);
    // Try inserting with common column sets; older DBs may not have `email_verified`.
    let res;
    try {
      res = await db.run(
        `INSERT INTO users (email, password, name, is_admin) VALUES (?, ?, ?, 1)`,
        [email, hash, 'Admin']
      );
    } catch (e) {
      // Fall back to raw insert without column list (best-effort)
      res = await db.run(`INSERT INTO users VALUES (NULL, ?, ?, ?, 1, datetime('now'))`, [email, hash, 'Admin']);
    }

    console.log('Created admin user:', { email, id: res.lastID });
    process.exit(0);
  } catch (err) {
    console.error('Failed to create admin:', err);
    process.exit(1);
  }
}

run();
