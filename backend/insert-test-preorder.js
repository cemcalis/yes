const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fetch = require('node-fetch');

const dbFile = process.env.SQLITE_PATH || path.join(__dirname, '..', 'data', 'dev.sqlite');
const db = new sqlite3.Database(dbFile);

async function runAsync(sql, params=[]) {
  return new Promise((res, rej) => db.run(sql, params, function(err){ if(err) return rej(err); res(this);}));
}
async function getAsync(sql, params=[]) {
  return new Promise((res, rej) => db.get(sql, params, (err,row)=> err?rej(err):res(row)));
}

(async ()=>{
  try {
    const slug = 'test-preorder-product';
    const existing = await getAsync('SELECT id FROM products WHERE slug = ?', [slug]);
    let productId = null;
    if(existing) {
      console.log('Test product already exists with id', existing.id);
      productId = existing.id;
    }

    const name = 'Test Ön Sipariş Ürünü';
    const description = 'Test açıklama';
    const admin_description = 'Admin görünümü için\nÇok satırlı açıklama örneği';
    const slogan = 'Kısa slogan örneği';
    const price = 199.9;
    const images = null;
    const category_id = null;
    const stock = 0;
    const pre_order = 1;
    const pre_order_sizes = ['XS','M','L'].join(',');

    const insertSql = `INSERT INTO products (name, slug, description, price, compare_price, category_id, image_url, images, stock, stock_status, pre_order, is_featured, is_new, is_active, admin_description, slogan, pre_order_sizes)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

    if(!productId){
      const res = await runAsync(insertSql, [name, slug, description, price, null, category_id, null, images, stock, 'in_stock', pre_order, 0, 0, 1, admin_description, slogan, pre_order_sizes]);
      productId = res.lastID || res.id || null;
      console.log('Inserted product id', productId || '(unknown, check DB)');
    }

    // insert variants: S (in stock), XS (out of stock - pre-order), M (out of stock - pre-order)
    const variants = [
      {size: 'S', color: null, stock: 10},
      {size: 'XS', color: null, stock: 0},
      {size: 'M', color: null, stock: 0},
      {size: 'L', color: null, stock: 0}
    ];

    for(const v of variants){
      await runAsync('INSERT INTO variants (product_id, size, color, sku, stock, price, created_at) VALUES (?,?,?,?,?,?,datetime(\'now\'))', [productId, v.size, v.color, null, v.stock, null]);
    }

    console.log('Inserted variants.');

    // Try fetching via API
    const base = process.env.BACKEND_URL || 'http://localhost:5000';
    const resp = await fetch(`${base}/api/products/${slug}`);
    if(resp.ok){
      const data = await resp.json();
      console.log('Fetched product from API:');
      console.log(JSON.stringify({id: data.id, name: data.name, pre_order: data.pre_order, pre_order_sizes: data.pre_order_sizes, variants: data.variants && data.variants.map(v=>({size:v.size,stock:v.stock}))}, null, 2));
    } else {
      console.error('API fetch failed', resp.status, await resp.text());
    }

    process.exit(0);
  } catch(err){
    console.error('Error', err);
    process.exit(1);
  } finally{
    db.close();
  }
})();
