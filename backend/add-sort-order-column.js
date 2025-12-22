const db = require('./db');

async function addSortOrderColumn() {
  try {
    await db.run('ALTER TABLE banners ADD COLUMN sort_order INTEGER DEFAULT 0');
    console.log('Added sort_order column');
    
    await db.run(`
      INSERT OR REPLACE INTO banners (title, subtitle, image_url, link_url, button_text, is_active, sort_order)
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
    
    console.log('Sample banner added successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addSortOrderColumn();
