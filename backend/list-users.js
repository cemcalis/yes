const db = require('./db');

db.all('SELECT id, email, is_admin FROM users ORDER BY id LIMIT 20', (err, rows) => {
  if (err) {
    console.error('DB error', err);
    process.exit(1);
  }
  console.log(rows);
  process.exit(0);
});
