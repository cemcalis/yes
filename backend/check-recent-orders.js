const db = require('./db');

console.log('Checking recent orders...');

async function main() {
  try {
    const result = await db.query(`
      SELECT o.*, u.name as "customerName"
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 5
    `);

    console.log('Recent orders:');
    result.rows.forEach(order => {
      console.log(`- Order #${order.id}: ${order.customerName || 'Unknown'} - ₺${order.total_amount} - Status: ${order.status}`);
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    if (db._raw && typeof db._raw.end === 'function') {
      await db._raw.end();
    }
  }
}

main();