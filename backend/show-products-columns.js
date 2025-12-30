const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbFile = process.env.SQLITE_PATH || path.join(__dirname, '..', 'data', 'dev.sqlite');
const db = new sqlite3.Database(dbFile);

db.all("PRAGMA table_info('products')", (err, rows) => {
  if(err){ console.error(err); process.exit(1); }
  console.log('products table columns:');
  rows.forEach(r => console.log(r.cid, r.name, r.type, r.notnull, r.dflt_value));
  db.close();
});
