require('dotenv').config();
const bcrypt = require('bcrypt');
const { dbGet, dbRun } = require('./db');

async function seed() {
  console.log('[seed] SQLite seed başlıyor...');

  // Çoklu çağrıyı engellemek için tablo dolu mu kontrol et
  const existing = await dbGet('SELECT COUNT(*) as count FROM products');
  const existingCount = parseInt(existing?.count || 0, 10);
  if (existingCount > 0) {
    console.log(`[seed] ${existingCount} ürün zaten var, seed atlandı.`);
    return;
  }

  await dbRun('BEGIN');
  try {
    // Admin kullanıcı
    const adminPassword = await bcrypt.hash('admin123', 10);
    await dbRun(
      `INSERT OR IGNORE INTO users (email, password, name, is_admin, email_verified, role) 
       VALUES (?, ?, ?, 1, 1, 'admin')`,
      ['admin@ravor.com', adminPassword, 'Admin']
    );
    console.log('[seed] Admin oluşturuldu (yoksa).');

    // Kategoriler
    const categories = [
      { name: 'Erkek Giyim', slug: 'erkek-giyim', description: 'Erkekler için şık ve modern kıyafetler' },
      { name: 'Kadın Giyim', slug: 'kadin-giyim', description: 'Kadınlar için trend kıyafetler' },
      { name: 'Aksesuar', slug: 'aksesuar', description: 'Tarzınızı tamamlayan aksesuarlar' },
      { name: 'Ayakkabı', slug: 'ayakkabi', description: 'Konforlu ve şık ayakkabılar' }
    ];

    const categoryIds = {};
    for (const cat of categories) {
      const res = await dbRun(
        'INSERT OR IGNORE INTO categories (name, slug, description) VALUES (?, ?, ?)',
        [cat.name, cat.slug, cat.description]
      );
      if (res.lastID) categoryIds[cat.slug] = res.lastID;
      // Eğer önceden varsa tekrar çek
      if (!categoryIds[cat.slug]) {
        const row = await dbGet('SELECT id FROM categories WHERE slug = ?', [cat.slug]);
        categoryIds[cat.slug] = row?.id;
      }
    }
    console.log('[seed] Kategoriler eklendi.');

    // Ürünler
    const products = [
      {
        name: 'Slim Fit Erkek Kot Pantolon',
        slug: 'slim-fit-erkek-kot-pantolon',
        description: 'Modern kesim, yüksek kaliteli kot kumaş. Günlük kullanım için ideal.',
        price: 299.99,
        compare_price: 399.99,
        category_id: categoryIds['erkek-giyim'],
        image_url: '/uploads/products/erkek-kot.jpg',
        is_featured: 1,
        is_new: 1
      },
      {
        name: 'Oversize Kadın Sweatshirt',
        slug: 'oversize-kadin-sweatshirt',
        description: 'Rahat kesim, %100 pamuklu kumaş. Tüm mevsim kullanılabilir.',
        price: 199.99,
        compare_price: 279.99,
        category_id: categoryIds['kadin-giyim'],
        image_url: '/uploads/products/kadin-sweatshirt.jpg',
        is_featured: 1
      },
      {
        name: 'Spor Ayakkabı - Beyaz',
        slug: 'spor-ayakkabi-beyaz',
        description: 'Hafif, rahat, nefes alan kumaş. Her ortama uygun.',
        price: 349.99,
        compare_price: 449.99,
        category_id: categoryIds['ayakkabi'],
        image_url: '/uploads/products/spor-ayakkabi.jpg',
        is_featured: 1
      },
      {
        name: 'Klasik Erkek Gömlek',
        slug: 'klasik-erkek-gomlek',
        description: 'Şık ve özel günler için gömlek. Ütü gerektirmez.',
        price: 179.99,
        category_id: categoryIds['erkek-giyim'],
        image_url: '/uploads/products/gomlek.jpg'
      },
      {
        name: 'Kadın Kot Ceket',
        slug: 'kadin-kot-ceket',
        description: 'Vintage stil kot ceket. Oversize kesim.',
        price: 279.99,
        compare_price: 349.99,
        category_id: categoryIds['kadin-giyim'],
        image_url: '/uploads/products/kot-ceket.jpg',
        is_new: 1
      },
      {
        name: 'Güneş Gözlüğü',
        slug: 'gunes-gozlugu',
        description: 'UV korumalı, polarize cam, şık tasarım.',
        price: 129.99,
        category_id: categoryIds['aksesuar'],
        image_url: '/uploads/products/gunes-gozlugu.jpg'
      },
      {
        name: 'Kadın Topuklu Ayakkabı',
        slug: 'kadin-topuklu-ayakkabi',
        description: '7cm topuk, rahat taban, şık tasarım.',
        price: 249.99,
        category_id: categoryIds['ayakkabi'],
        image_url: '/uploads/products/topuklu.jpg',
        is_featured: 1
      }
    ];

    for (const product of products) {
      await dbRun(
        `INSERT OR IGNORE INTO products 
        (name, slug, description, price, compare_price, category_id, image_url, is_featured, is_new, stock, stock_status, is_active) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 100, 'in_stock', 1)`,
        [
          product.name,
          product.slug,
          product.description,
          product.price,
          product.compare_price || null,
          product.category_id,
          product.image_url || null,
          product.is_featured || 0,
          product.is_new || 0
        ]
      );
    }
    console.log('[seed] Ürünler eklendi.');

    // Örnek kupon
    await dbRun(
      `INSERT OR IGNORE INTO coupons 
      (code, discount_type, discount_value, min_purchase, valid_until, usage_limit, is_active) 
      VALUES (?, ?, ?, ?, ?, ?, 1)`,
      ['WELCOME10', 'percentage', 10, 100, '2025-12-31', 100]
    );
    console.log('[seed] Örnek kupon eklendi.');

    await dbRun('COMMIT');
    console.log('[seed] Tamamlandı.');
  } catch (err) {
    await dbRun('ROLLBACK');
    console.error('[seed] Hata:', err);
    throw err;
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
