const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Sadece SQLite kullanıyoruz.
// Use env override or default to /app/data/dev.sqlite (shared volume)
const defaultDbPath = path.join(__dirname, '..', 'data', 'dev.sqlite');
const envDbPath = process.env.SQLITE_PATH;

// Eğer env ile verilen yol açılamazsa, projedeki data/dev.sqlite'a düş
let dbFile = envDbPath || defaultDbPath;
if (envDbPath && !fs.existsSync(envDbPath)) {
  const cwdDbPath = path.join(process.cwd(), 'data', 'dev.sqlite');
  const fallback = fs.existsSync(defaultDbPath)
    ? defaultDbPath
    : fs.existsSync(cwdDbPath)
      ? cwdDbPath
      : envDbPath;
  console.warn('[db] Provided SQLITE_PATH not found:', envDbPath, '-> falling back to', fallback);
  dbFile = fallback;
}

// Varsayılan yol kullanılıyorsa klasörü oluştur.
const dataDir = path.dirname(dbFile);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbFile);

// Yardımcılar: $1 -> ?, RETURNING id kaldır.
function dollarToQuestion(sql) {
  return sql.replace(/\$\d+/g, '?');
}

function normalizeInsertForSqlite(sql) {
  return sql.replace(/\s+RETURNING\s+id\s*;?\s*$/i, '');
}

function query(sql, params = []) {
  const text = normalizeInsertForSqlite(dollarToQuestion(sql));
  return new Promise((resolve, reject) => {
    const isSelect = /^\s*SELECT/i.test(text);
    if (isSelect) {
      db.all(text, params, (err, rows) => (err ? reject(err) : resolve({ rows })));
    } else {
      db.run(text, params, function (err) {
        if (err) return reject(err);
        resolve({ rows: [{ id: this.lastID }], rowCount: this.changes || 0 });
      });
    }
  });
}

async function dbGet(sql, params = []) {
  const res = await query(sql, params);
  return res.rows[0] || null;
}

async function dbAll(sql, params = []) {
  const res = await query(sql, params);
  return res.rows || [];
}

async function dbRun(sql, params = []) {
  const res = await query(sql, params);
  return { lastID: res.rows[0]?.id || null, changes: res.rowCount || 0 };
}

const adapter = {
  all: (s, p, cb) => dbAll(s, p).then(r => { if (cb) cb(null, r); return r; }).catch(e => { if (cb) cb(e); else throw e; }),
  get: (s, p, cb) => dbGet(s, p).then(r => { if (cb) cb(null, r); return r; }).catch(e => { if (cb) cb(e); else throw e; }),
  run: (s, p, cb) => dbRun(s, p).then(r => { if (cb) cb(null, r); return r; }).catch(e => { if (cb) cb(e); else throw e; }),
  dbGet,
  dbAll,
  dbRun,
  query,
  _raw: db
};

console.log('[db] SQLite adapter initialized using', dbFile);
module.exports = adapter;
