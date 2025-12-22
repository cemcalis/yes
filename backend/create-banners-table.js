const db = require('./db');

async function createBannersTable() {
  try {
    await db.run(`
      CREATE TABLE IF NOT EXISTS banners (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        subtitle TEXT,
        image_url TEXT NOT NULL,
        link_url TEXT,
        button_text TEXT,
        is_active BOOLEAN DEFAULT 1,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Banners table created successfully');
    
    // Add a sample banner
    await db.run(`
      INSERT INTO banners (title, subtitle, image_url, link_url, button_text, is_active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      'New Season',
      'Discover the latest collection',
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1920&q=80',
      '/koleksiyon/elbiseler',
      'Shop Now',
      1,
      0
    ]);
    
    console.log('Sample banner added');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createBannersTable();
