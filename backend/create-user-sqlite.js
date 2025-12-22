const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dataDir = path.join(__dirname, '..', 'data');
const dbFile = path.join(dataDir, 'dev.sqlite');
const db = new sqlite3.Database(dbFile);

async function getColumns() {
  return new Promise((resolve, reject) => {
    db.all("PRAGMA table_info('users')", [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows.map(r => r.name));
    });
  });
}

async function run() {
  try {
    const email = process.argv[2] || 'tester1@example.com';
    const password = process.argv[3] || 'pass123';
    const name = process.argv[4] || 'Tester';

    const cols = await getColumns();
    const hash = await bcrypt.hash(password, 10);

    // Build insert dynamically based on available columns
    const available = ['email', 'password', 'name'];
    const insertCols = available.filter(c => cols.includes(c));
    const placeholders = insertCols.map(() => '?').join(', ');
    const values = [email, hash, name].slice(0, insertCols.length);

    const sql = `INSERT INTO users (${insertCols.join(',')}) VALUES (${placeholders})`;

    db.run(sql, values, function (err) {
      if (err) {
        console.error('Insert user failed:', err);
        process.exit(1);
      }
      console.log('Created user', { email, id: this.lastID });
      process.exit(0);
    });
  } catch (err) {
    console.error('Failed to create user:', err);
    process.exit(1);
  }
}

run();
