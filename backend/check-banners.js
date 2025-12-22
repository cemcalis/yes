const db = require('./db');

async function checkBannersTable() {
  try {
    const columns = await db.all('PRAGMA table_info(banners)');
    console.log('Banners table columns:');
    columns.forEach(col => {
      console.log(`${col.name}: ${col.type}`);
    });
    
    // Add missing columns if needed
    const columnNames = columns.map(col => col.name);
    
    if (!columnNames.includes('subtitle')) {
      await db.run('ALTER TABLE banners ADD COLUMN subtitle TEXT');
      console.log('Added subtitle column');
    }
    
    if (!columnNames.includes('link_url')) {
      await db.run('ALTER TABLE banners ADD COLUMN link_url TEXT');
      console.log('Added link_url column');
    }
    
    if (!columnNames.includes('button_text')) {
      await db.run('ALTER TABLE banners ADD COLUMN button_text TEXT');
      console.log('Added button_text column');
    }
    
    // Add sample banner
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

checkBannersTable();
