const db = require('./db');

const categories = [
  { name: 'Elektronik', slug: 'elektronik' },
  { name: 'Giyim', slug: 'giyim' },
  { name: 'Ev & Yaşam', slug: 'ev-yasam' },
  { name: 'Spor & Outdoor', slug: 'spor-outdoor' },
  { name: 'Kitap & Kırtasiye', slug: 'kitap-kirtasiye' }
];

async function addCategories() {
  try {
    for (const cat of categories) {
      await db.run('INSERT OR IGNORE INTO categories (name, slug, created_at) VALUES (?, ?, datetime("now"))', [cat.name, cat.slug]);
      console.log(`Added: ${cat.name}`);
    }
    console.log('All categories added successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addCategories();
