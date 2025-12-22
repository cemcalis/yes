const path = require('path');
const db = require(path.join(__dirname, '..', 'backend', 'db.js'));

(async () => {
  try {
    await db.dbRun("ALTER TABLE products ADD COLUMN pre_order BOOLEAN DEFAULT 0");
    console.log('ALTER products.pre_order: OK');
  } catch (e) {
    console.error('products.pre_order:', e.message);
  }

  try {
    await db.dbRun("ALTER TABLE orders ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP");
    console.log('ALTER orders.updated_at: OK');
  } catch (e) {
    console.error('orders.updated_at:', e.message);
  }

  process.exit(0);
})();
