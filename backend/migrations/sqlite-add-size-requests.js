const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const dataDir = path.join(__dirname, '..', '..', 'data');
const dbFile = process.env.SQLITE_PATH || path.join(dataDir, 'dev.sqlite');

if (!fs.existsSync(dbFile)) {
  console.error('[migrate] SQLite file not found at', dbFile);
  process.exit(1);
}

const db = new sqlite3.Database(dbFile);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => (err ? reject(err) : resolve()));
  });
}

async function migrate() {
  try {
    console.log('[migrate] Creating special_size_requests table if missing...');
    await run(`CREATE TABLE IF NOT EXISTS special_size_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      product_name TEXT,
      size TEXT NOT NULL,
      note TEXT,
      consent INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('[migrate] Done.');
  } catch (err) {
    console.error('[migrate] Failed:', err);
    process.exit(1);
  } finally {
    db.close();
  }
}

migrate();
