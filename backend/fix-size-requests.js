const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('C:/Users/Cem/Desktop/istek/data/dev.sqlite');

db.serialize(() => {
  // Add admin_description column to products table
  db.run('ALTER TABLE products ADD COLUMN admin_description TEXT', (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.log('Admin_description column error:', err.message);
    } else {
      console.log('Admin_description column added or already exists');
    }
  });
  
  db.run('ALTER TABLE special_size_requests ADD COLUMN status TEXT DEFAULT "pending"', (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.log('Status column error:', err.message);
    } else {
      console.log('Status column added or already exists');
    }
  });
  
  db.run('ALTER TABLE special_size_requests ADD COLUMN updated_at DATETIME', (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.log('Updated_at column error:', err.message);
    } else {
      console.log('Updated_at column added or already exists');
    }
  });
});

db.close();
