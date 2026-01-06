const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbFile = path.join(__dirname, '..', 'data', 'dev.sqlite');
const db = new sqlite3.Database(dbFile);

function runSql(sql) {
  return new Promise((res, rej) => {
    db.run(sql, (err) => {
      if (err) return rej(err);
      res();
    });
  });
}

(async () => {
  try {
    console.log('Opening', dbFile);
    const cols = await new Promise((res, rej) => db.all("PRAGMA table_info('banners')", [], (err, rows) => err ? rej(err) : res((rows||[]).map(r=>r.name))));
    console.log('Existing columns:', cols.join(', '));

    const toAdd = [];
    if (!cols.includes('subtitle')) toAdd.push("ALTER TABLE banners ADD COLUMN subtitle TEXT");
    if (!cols.includes('button_text')) toAdd.push("ALTER TABLE banners ADD COLUMN button_text TEXT");
    if (!cols.includes('display_order')) toAdd.push("ALTER TABLE banners ADD COLUMN display_order INTEGER DEFAULT 0");

    for (const sql of toAdd) {
      console.log('Running:', sql);
      try {
        await runSql(sql);
        console.log('Added column via:', sql);
      } catch (e) {
        console.error('Failed to run:', sql, e && e.message ? e.message : e);
      }
    }

    if (toAdd.length === 0) console.log('No columns needed');
    db.close();
  } catch (err) {
    console.error('Error ensuring banner columns:', err);
    db.close();
    process.exit(1);
  }
})();
