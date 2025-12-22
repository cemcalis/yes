const fs = require('fs');
const path = require('path');
const db = require('./db');

/**
 * CSV'den ürün import etme utility
 * 
 * CSV formatı:
 * name,slug,description,price,compare_price,category_slug,image_url,images,stock_status,is_featured,is_new
 * 
 * Örnek:
 * Minimal Siyah Elbise,minimal-siyah-elbise,"Şık ve zarif",1250,1650,elbiseler,https://example.com/img.jpg,"img1.jpg|img2.jpg",in_stock,1,1
 */

function importFromCSV(csvFilePath) {
  console.log('📥 CSV import başlıyor...');
  
  if (!fs.existsSync(csvFilePath)) {
    console.error('❌ CSV dosyası bulunamadı:', csvFilePath);
    return;
  }

  const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  // Header satırını atla
  const headers = lines[0].split(',');
  console.log('📋 CSV başlıkları:', headers);

  let imported = 0;
  let errors = 0;

  // Her satırı işle
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = parseCSVLine(line);
    
    if (values.length < 8) {
      console.warn(`⚠️ Satır ${i + 1} atlandı (eksik veri)`);
      errors++;
      continue;
    }

    const [name, slug, description, price, compare_price, category_slug, image_url, images, stock_status, is_featured, is_new] = values;

    // Kategori ID'sini bul
    db.get('SELECT id FROM categories WHERE slug = ?', [category_slug], (err, category) => {
      if (err || !category) {
        console.error(`❌ Kategori bulunamadı: ${category_slug} (Satır ${i + 1})`);
        errors++;
        return;
      }

      const imagesArray = images ? images.split('|').filter(img => img.trim()) : [];
      const imagesJson = JSON.stringify(imagesArray);

      const query = `
        INSERT INTO products (name, slug, description, price, compare_price, category_id, image_url, images, stock_status, is_featured, is_new)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.run(
        query,
        [
          name,
          slug,
          description,
          parseFloat(price) || 0,
          compare_price ? parseFloat(compare_price) : null,
          category.id,
          image_url,
          imagesJson,
          stock_status || 'in_stock',
          is_featured === '1' ? 1 : 0,
          is_new === '1' ? 1 : 0
        ],
        function(err) {
          if (err) {
            console.error(`❌ Ürün eklenemedi (Satır ${i + 1}):`, err.message);
            errors++;
          } else {
            imported++;
            console.log(`✅ Eklendi: ${name} (ID: ${this.lastID})`);

            // Varsayılan varyantlar ekle
            const sizes = ['XS', 'S', 'M', 'L', 'XL'];
            sizes.forEach(size => {
              db.run(
                'INSERT INTO variants (product_id, size, stock) VALUES (?, ?, ?)',
                [this.lastID, size, 10]
              );
            });
          }
        }
      );
    });
  }

  setTimeout(() => {
    console.log(`\n✅ Import tamamlandı!`);
    console.log(`   Başarılı: ${imported}`);
    console.log(`   Hatalı: ${errors}`);
  }, 2000);
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

// Komut satırından çalıştırma
if (require.main === module) {
  const csvPath = process.argv[2] || path.join(__dirname, 'products.csv');
  
  setTimeout(() => {
    importFromCSV(csvPath);
  }, 1000);
}

module.exports = { importFromCSV };
