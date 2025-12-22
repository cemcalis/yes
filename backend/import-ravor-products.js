const fs = require('fs');
const path = require('path');
const db = require('./db');

// Path to the sibling folder that contains product folders
const ravorRoot = path.join(__dirname, '..', '..', 'ravor ürün');
const uploadsDir = path.join(__dirname, 'public', 'uploads');

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function copyFile(src, dest) {
  return new Promise((res, rej) => {
    fs.copyFile(src, dest, (err) => err ? rej(err) : res());
  });
}

async function run() {
  try {
    if (!fs.existsSync(ravorRoot)) {
      console.error('ravor ürün folder not found at', ravorRoot);
      process.exit(1);
    }

    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

    const entries = fs.readdirSync(ravorRoot, { withFileTypes: true });
    const folders = entries.filter(e => e.isDirectory()).map(d => d.name).sort();

    console.log('Found', folders.length, 'product folders');

    for (const folder of folders) {
      const folderPath = path.join(ravorRoot, folder);
      const files = fs.readdirSync(folderPath).filter(f => !f.startsWith('.'));
      const imageFiles = files.filter(f => /\.(jpe?g|png|webp|gif|svg)$/i.test(f));

      if (imageFiles.length === 0) {
        console.log('Skipping', folder, '- no images');
        continue;
      }

      const name = folder.replace(/[-_]/g, ' ').trim();
      const slugBase = slugify(name) || slugify(folder);
      let slug = slugBase;

      // ensure unique slug by checking DB
      let exists = await db.get('SELECT id FROM products WHERE slug = ?', [slug]);
      let i = 1;
      while (exists) {
        slug = `${slugBase}-${i++}`;
        // eslint-disable-next-line no-await-in-loop
        exists = await db.get('SELECT id FROM products WHERE slug = ?', [slug]);
      }

      // copy images
      const copied = [];
      for (const img of imageFiles) {
        const src = path.join(folderPath, img);
        const ext = path.extname(img).toLowerCase();
        const destName = `${slug}-${Date.now()}-${Math.floor(Math.random()*1000)}${ext}`;
        const dest = path.join(uploadsDir, destName);
        // eslint-disable-next-line no-await-in-loop
        await copyFile(src, dest);
        copied.push(`/uploads/${destName}`);
      }

      const mainImage = copied[0] || null;
      const imagesJson = JSON.stringify(copied);

      // Insert product with minimal fields
      const price = 199.99; // placeholder price; adjust later
      const insertSql = `INSERT INTO products (name, slug, description, price, compare_price, category_id, image_url, images, stock_status, pre_order, is_featured, is_new, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'in_stock', 0, 0, 0, 1, datetime('now'), datetime('now'))`;
      const params = [name, slug, null, price, null, null, mainImage, imagesJson];

      // eslint-disable-next-line no-await-in-loop
      const res = await db.run(insertSql, params);
      console.log('Inserted product:', name, 'id=', res.lastID);
    }

    console.log('Import complete');
    process.exit(0);
  } catch (err) {
    console.error('Import failed:', err);
    process.exit(1);
  }
}

run();
