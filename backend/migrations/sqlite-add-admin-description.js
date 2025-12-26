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
    console.log('[migrate] Ensuring admin_description column exists on products...');
    try {
      await run(`ALTER TABLE products ADD COLUMN admin_description TEXT`);
      console.log('[migrate] admin_description column added');
    } catch (err) {
      console.log('[migrate] admin_description column likely already exists or could not be added:', err.message);
    }
    console.log('[migrate] Done.');
  } catch (err) {
    console.error('[migrate] Failed:', err);
    process.exit(1);
  } finally {
    db.close();
  }
}

migrate();
