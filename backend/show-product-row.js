const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const slug = process.argv[2] || 'test-preorder-product';
const dbFile = process.env.SQLITE_PATH || path.join(__dirname, '..', 'data', 'dev.sqlite');
const db = new sqlite3.Database(dbFile);

db.get('SELECT * FROM products WHERE slug = ?', [slug], (err, row) => {
  if (err) { console.error('DB error', err); process.exit(1); }
  if (!row) { console.log('Product not found:', slug); process.exit(0); }
  console.log('Product row:');
  console.log(JSON.stringify({
    id: row.id,
    name: row.name,
    slug: row.slug,
    price: row.price,
    pre_order: row.pre_order,
    pre_order_sizes: row.pre_order_sizes,
    admin_description: row.admin_description,
    slogan: row.slogan,
    images: row.images,
    stock: row.stock
  }, null, 2));
  db.all('SELECT size,stock FROM variants WHERE product_id = ?', [row.id], (err2, rows) => {
    if (err2) { console.error('Variants error', err2); process.exit(1); }
    console.log('Variants:');
    console.log(JSON.stringify(rows, null, 2));
    db.close();
  });
});
