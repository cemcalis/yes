const db = require('./db');

console.log('Checking database tables...');

async function main() {
  try {
    const products = await db.query('SELECT COUNT(*) as count FROM products');
    console.log('Total products:', products.rows[0]?.count || 0);

    const orders = await db.query('SELECT COUNT(*) as count FROM orders');
    console.log('Total orders:', orders.rows[0]?.count || 0);

    const users = await db.query('SELECT COUNT(*) as count FROM users');
    console.log('Total users:', users.rows[0]?.count || 0);

    const revenue = await db.query('SELECT COALESCE(SUM(total_amount), 0) as revenue FROM orders WHERE status = $1', ['completed']);
    console.log('Total revenue:', revenue.rows[0]?.revenue || 0);
  } catch (err) {
    console.error('Stats check error:', err);
  } finally {
    if (db._raw && typeof db._raw.end === 'function') {
      await db._raw.end();
    }
  }
}

main();