const fs = require('fs');
const path = require('path');
const db = require('./db');

// Kullanım:
// node migrate-folder-images.js "./public/urunler/ürün18/Ürün Fotoğrafları"
// Eğer arg vermezseniz default olarak yukarıdaki yol kullanılır.

const srcArg = process.argv[2];
const srcRoot = srcArg
  ? path.resolve(process.cwd(), srcArg)
  : path.join(__dirname, 'public', 'urunler', 'ürün18', 'Ürün Fotoğrafları');

const uploadsDir = path.join(__dirname, 'public', 'uploads', 'urunler');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

function slugify(str) {
  return (str || '')
    .toString()
    .normalize('NFD')
    if (!str) return '';
    return str
      .toString()
      .normalize('NFD')
      // remove diacritic marks
      .replace(/\p{Diacritic}/gu, '')
      // map common Turkish characters to ascii equivalents
      .replace(/ç/g, 'c')
      .replace(/Ç/g, 'C')
      .replace(/ğ/g, 'g')
      .replace(/Ğ/g, 'G')
      .replace(/ı/g, 'i')
      .replace(/İ/g, 'I')
      .replace(/ö/g, 'o')
      .replace(/Ö/g, 'O')
      .replace(/ü/g, 'u')
      .replace(/Ü/g, 'U')
      .replace(/ş/g, 's')
      .replace(/Ş/g, 'S')
      // remove invalid characters (keep letters, numbers, spaces and hyphens)
      .replace(/[^A-Za-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();
}

function safeFilename(base, idx, original) {
  const ext = path.extname(original) || '.jpg';
  return `${base}-${idx}${ext.toLowerCase()}`;
}

async function run() {
  if (!fs.existsSync(srcRoot)) {
    console.error('Kaynak klasör bulunamadı:', srcRoot);
    process.exit(1);
  }

  const entries = fs.readdirSync(srcRoot, { withFileTypes: true });
  const folders = entries.filter((d) => d.isDirectory()).map((d) => d.name);

  const report = [];

  for (const folder of folders) {
    const folderPath = path.join(srcRoot, folder);
    const files = fs.readdirSync(folderPath).filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'].includes(ext);
    });

    if (files.length === 0) continue;

    const baseSlug = slugify(folder) || `urun-${Date.now()}`;
    const copied = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const src = path.join(folderPath, file);
      const destName = safeFilename(baseSlug, i + 1, file);
      const destRel = `/uploads/urunler/${destName}`;
      const dest = path.join(uploadsDir, destName);
      try {
        fs.copyFileSync(src, dest);
        copied.push(destRel);
        console.log(`[migrate-folder] ${folder}/${file} -> ${destRel}`);
      } catch (err) {
        console.error(`[migrate-folder] kopyalanamadı ${folder}/${file}:`, err.message);
      }
    }

    // DB eşleştirmesi: önce slug ile, sonra isim ile (case-insensitive)
    let product = await db.query('SELECT id, name, slug, image_url, images FROM products WHERE slug = $1 LIMIT 1', [baseSlug]);
    if ((!product || !product.rows || product.rows.length === 0) && folder) {
      product = await db.query('SELECT id, name, slug, image_url, images FROM products WHERE LOWER(name) = LOWER($1) LIMIT 1', [folder]);
    }

    if (product && product.rows && product.rows.length > 0) {
      const p = product.rows[0];
      const main = copied[0] || p.image_url || null;
      const imagesJson = JSON.stringify(copied);
      await db.run('UPDATE products SET image_url = ?, images = ? WHERE id = ?', [main, imagesJson, p.id]);
      report.push({ folder, product_id: p.id, updated: copied.length });
      console.log(`[migrate-folder] products.id=${p.id} güncellendi (${copied.length} resim)`);
    } else {
      // Ürün bulunamadı -> yeni ürün oluştur
      const slug = baseSlug;
      const main = copied[0] || null;
      const imagesJson = JSON.stringify(copied);
      try {
        const insertSql = `INSERT INTO products (name, slug, price, image_url, images, stock, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7)`;
        const res = await db.run(insertSql, [folder, slug, 0, main, imagesJson, 0, 0]);
        const newId = res.lastID || (res.rows && res.rows[0] && res.rows[0].id) || null;
        report.push({ folder, product_id: newId, created: copied.length });
        console.log(`[migrate-folder] yeni ürün oluşturuldu id=${newId} (${copied.length} resim)`);
      } catch (err) {
        report.push({ folder, product_id: null, copied: copied.length });
        console.error(`[migrate-folder] ürün oluşturulamadı: ${folder}:`, err.message || err);
      }
    }
  }

  console.log('İşlem tamamlandı. Özet:');
  console.table(report);
}

run().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
