const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
const dbFile = path.join(dataDir, 'dev.sqlite');
const db = new sqlite3.Database(dbFile);

function getColumns() {
  return new Promise((resolve, reject) => {
    db.all("PRAGMA table_info('users')", [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows.map(r => r.name));
    });
  });
}

async function run() {
  try {
    const cols = await getColumns();
    const toAdd = [];
    if (!cols.includes('phone')) toAdd.push("ALTER TABLE users ADD COLUMN phone TEXT");
    if (!cols.includes('address')) toAdd.push("ALTER TABLE users ADD COLUMN address TEXT");
    if (!cols.includes('avatar_url')) toAdd.push("ALTER TABLE users ADD COLUMN avatar_url TEXT");
    if (!cols.includes('email_verified')) toAdd.push("ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0");

    // Ensure variants table has is_active column
    const variantCols = await new Promise((res, rej) => db.all("PRAGMA table_info('variants')", [], (err, rows) => err ? rej(err) : res(rows.map(r => r.name))));
    if (!variantCols.includes('is_active')) {
      toAdd.push("ALTER TABLE variants ADD COLUMN is_active INTEGER DEFAULT 1");
    }

    for (const sql of toAdd) {
      await new Promise((res, rej) => db.run(sql, (e) => e ? rej(e) : res()));
      console.log('Ran:', sql);
    }

    if (toAdd.length === 0) console.log('Users table already has expected columns.');
    else console.log('Schema updated.');
    process.exit(0);
  } catch (err) {
    console.error('Schema ensure failed:', err);
    process.exit(1);
  }
}

run();
