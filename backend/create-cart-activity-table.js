const db = require('./db');

async function createCartActivityTable() {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS cart_activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        product_id INTEGER,
        action TEXT NOT NULL,
        quantity INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Cart activity table created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createCartActivityTable();
