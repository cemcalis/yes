const fs = require('fs');
const path = require('path');
const db = require('./db');

// Bu script backend/public/urunler altındaki klasörleri okuyup
// her klasörü bir ürün olarak SQLite’a ekler.
// Kullanım: node import-urunler.js

const BASE_DIR = path.join(__dirname, 'public', 'urunler');
const TARGET_DIR = path.join(__dirname, 'public', 'uploads', 'urunler');
const ALLOWED = new Set(['.png', '.jpg', '.jpeg', '.webp']);
if (!fs.existsSync(TARGET_DIR)) fs.mkdirSync(TARGET_DIR, { recursive: true });

function slugify(str) {
  return str
    .toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // aksan temizle
    .replace(/ç/gi, 'c').replace(/ğ/gi, 'g').replace(/ş/gi, 's').replace(/ı/gi, 'i').replace(/ö/gi, 'o').replace(/ü/gi, 'u')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'urun';
}

async function ensureCategory() {
  const name = 'Urunler';
  const slug = 'urunler';
  await db.run('INSERT OR IGNORE INTO categories (name, slug, description) VALUES (?, ?, ?)', [name, slug, 'Otomatik eklenen ürünler']);
  const row = await db.get('SELECT id FROM categories WHERE slug = ?', [slug]);
  return row?.id;
}

async function importFolders() {
  const categoryId = await ensureCategory();
  const entries = fs.readdirSync(BASE_DIR, { withFileTypes: true }).filter(d => d.isDirectory());
  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < entries.length; i++) {
    const dir = entries[i];
    const dirPath = path.join(BASE_DIR, dir.name);
    const files = fs.readdirSync(dirPath).filter(f => ALLOWED.has(path.extname(f).toLowerCase()));
    if (!files.length) {
      skipped++;
      continue;
    }

    const name = dir.name;
    const slug = slugify(name);
    const images = [];
    files.forEach((f, idx) => {
      const ext = path.extname(f).toLowerCase() || '.png';
      const safeName = `${slug}-${idx + 1}${ext}`;
      const src = path.join(dirPath, f);
      const dest = path.join(TARGET_DIR, safeName);
      fs.copyFileSync(src, dest);
      images.push(`/uploads/urunler/${safeName}`);
    });
    const image_url = images[0];
    const price = 199 + i * 10; // basit fiyat, istersen değiştir

    await db.run(
      `INSERT OR IGNORE INTO products (name, slug, description, price, category_id, image_url, images, stock, stock_status, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'in_stock', 1)`,
      [name, slug, `${name} otomatik eklendi`, price, categoryId, image_url, JSON.stringify(images), 100]
    );

    imported++;
    console.log(`[import] ${name} eklendi (${images.length} görsel)`);
  }

  console.log(`Bitti. Eklendi: ${imported}, atlandı (görsel yok): ${skipped}`);
}

importFolders().then(() => process.exit(0)).catch(err => {
  console.error('Import hatası:', err);
  process.exit(1);
});
