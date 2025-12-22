const fs = require('fs');
const path = require('path');
const db = require('./db');

// Mevcut /urunler/... yollarını güvenli isimlerle /uploads/urunler altına kopyalar
// ve products tablosundaki image_url / images alanlarını günceller.
// Kullanım: node migrate-images.js

const uploadsDir = path.join(__dirname, 'public', 'uploads', 'urunler');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function slugify(str) {
  return (str || '')
    .toString()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ç/gi, 'c').replace(/ğ/gi, 'g').replace(/ş/gi, 's').replace(/ı/gi, 'i').replace(/ö/gi, 'o').replace(/ü/gi, 'u')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'urun';
}

async function run() {
  const rows = await db.query('SELECT id, slug, image_url, images FROM products', []);
  let updated = 0;
  for (const p of rows.rows || []) {
    const slug = p.slug || slugify(p.name || `urun-${p.id}`);
    let images = [];
    try {
      images = p.images ? JSON.parse(p.images) : [];
    } catch {
      images = [];
    }
    const oldPaths = [p.image_url, ...images].filter(Boolean);
    if (!oldPaths.some((u) => u.startsWith('/urunler/'))) {
      continue; // bu ürün zaten /uploads kullanıyor
    }

    const newImages = [];
    let newMain = null;

    for (let i = 0; i < oldPaths.length; i++) {
      const rel = oldPaths[i];
      if (!rel.startsWith('/urunler/')) {
        // mevcut uploads yoluysa aynen taşı
        if (!newMain) newMain = rel;
        newImages.push(rel);
        continue;
      }
      const src = path.join(__dirname, 'public', rel);
      const ext = path.extname(src) || '.png';
      const safeName = `${slug}-${i + 1}${ext.toLowerCase()}`;
      const destRel = `/uploads/urunler/${safeName}`;
      const dest = path.join(uploadsDir, safeName);
      try {
        fs.copyFileSync(src, dest);
        if (!newMain) newMain = destRel;
        newImages.push(destRel);
        console.log(`[migrate] ${rel} -> ${destRel}`);
      } catch (err) {
        console.error(`[migrate] kopyalanamadı ${rel}:`, err.message);
      }
    }

    await db.run('UPDATE products SET image_url = ?, images = ? WHERE id = ?', [
      newMain,
      JSON.stringify(newImages),
      p.id,
    ]);
    updated++;
  }
  console.log(`Tamamlandı. Güncellenen ürün: ${updated}`);
}

run().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
