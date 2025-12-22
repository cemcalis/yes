const db = require('./db');

(async () => {
  try {
    await db.run("INSERT INTO products (name,slug,price,pre_order,created_at) VALUES (?,?,?,?,datetime('now'))", ['Test Product','test-product-123',99.9,0]);
    const rows = await db.dbAll("SELECT id,name,pre_order FROM products WHERE slug='test-product-123'");
    console.log(rows);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
