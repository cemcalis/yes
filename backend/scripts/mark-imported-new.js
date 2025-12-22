const db = require('../db');

async function run() {
  try {
    console.log('Setting is_new=1 for imported products (slug LIKE "u-ru-n%")');
    const res = await db.run("UPDATE products SET is_new = 1 WHERE slug LIKE 'u-ru-n%'");
    console.log('Update result:', res);
  } catch (err) {
    console.error('Failed to update products:', err && err.message);
    process.exitCode = 1;
  }
}

run();
