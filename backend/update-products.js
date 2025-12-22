const db = require('./db');

async function updateProducts() {
  try {
    await db.run('UPDATE products SET is_new = 1 WHERE id IN (1,2)');
    console.log('Products updated successfully');
    
    const result = await db.all('SELECT id, name, is_new FROM products WHERE id IN (1,2)');
    console.log('Updated products:', result);
  } catch (error) {
    console.error('Error updating products:', error);
  }
}

updateProducts();
