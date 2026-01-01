const db = require('./db');

async function run() {
  const args = process.argv.slice(2).map((s) => Number(s)).filter(Boolean);
  if (args.length === 0) {
    console.log('Kullanım: node activate-products.js <id1> <id2> ...');
    console.log('Örnek: node activate-products.js 34 35 36');
    process.exit(1);
  }

  try {
    const placeholders = args.map(() => '?').join(',');
    const sql = `UPDATE products SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`;
    const res = await db.run(sql, args);
    console.log(`Güncellendi. changes: ${res.changes}, ids: ${args.join(',')}`);
    process.exit(0);
  } catch (err) {
    console.error('Hata:', err);
    process.exit(1);
  }
}

run();
