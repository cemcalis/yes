const fs = require('fs');
const path = require('path');
const { dbRun } = require('../db');

// `ravor ürün` directory is located next to the workspace root on the Desktop
const SOURCE_DIR = path.resolve(__dirname, '..', '..', '..', 'ravor ürün');
const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function slugify(s) {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function run() {
  const items = fs.readdirSync(SOURCE_DIR, { withFileTypes: true }).filter(d => d.isDirectory());
  console.log('Found', items.length, 'product folders');
  let order = 1;

  for (const dirent of items) {
    const folder = path.join(SOURCE_DIR, dirent.name);
    const files = fs.readdirSync(folder).filter(f => /\.(jpe?g|png|webp|svg)$/i.test(f));
    const mainImage = files[0];

    let imageUrl = null;
    const images = [];
    if (mainImage) {
      const src = path.join(folder, mainImage);
      const destName = `${Date.now()}-${order}-${mainImage.replace(/\s+/g,'-')}`;
      const dest = path.join(UPLOADS_DIR, destName);
      fs.copyFileSync(src, dest);
      imageUrl = `/uploads/${destName}`;
      images.push(imageUrl);
    }

    const name = dirent.name;
    const slug = slugify(name) || `ravor-${Date.now()}-${order}`;
    const price = Number(process.env.DEFAULT_PRICE) || 199.99;

    console.log('Inserting product:', name, slug, imageUrl);

    try {
      const res = await dbRun(
        `INSERT INTO products (name, slug, description, price, image_url, images, stock_status, is_active, is_featured, is_new, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,1,0,0,CURRENT_TIMESTAMP)`,
        [name, slug, null, price, imageUrl, JSON.stringify(images), 'in_stock']
      );
      console.log('Inserted id:', res.lastID || res);
    } catch (err) {
      console.error('Insert failed for', name, err && err.message);
    }

    order++;
  }

  console.log('Import complete');
  process.exit(0);
}

run();
