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

function hasColumn(table, column) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${table})`, (err, rows) => {
      if (err) return reject(err);
      resolve(rows.some((r) => r.name === column));
    });
  });
}

async function run() {
  try {
    console.log('[migrate] Checking categories.updated_at in', dbFile);
    const exists = await hasColumn('categories', 'updated_at');
    if (exists) {
      console.log('[migrate] Column already exists, nothing to do.');
      db.close();
      return;
    }

    await new Promise((resolve, reject) => {
      db.run('ALTER TABLE categories ADD COLUMN updated_at DATETIME', (err) =>
        err ? reject(err) : resolve()
      );
    });

    console.log('[migrate] Column added. Normalizing timestamps...');
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE categories SET updated_at = COALESCE(created_at, CURRENT_TIMESTAMP) WHERE updated_at IS NULL',
        (err) => (err ? reject(err) : resolve())
      );
    });

    console.log('[migrate] Done.');
  } catch (err) {
    console.error('[migrate] Failed:', err);
    process.exit(1);
  } finally {
    db.close();
  }
}

run();
