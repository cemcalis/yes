const db = require('./db');

(async () => {
  try {
    await db.run("INSERT INTO banners (title,image_url,link_url,position,display_order,is_active,created_at) VALUES (?,?,?,?,?,?,datetime('now'))", ['Smoke Banner','/uploads/sample.jpg','/products','home',0,1]);
    const rows = await db.dbAll("SELECT id,title,image_url,position,is_active FROM banners ORDER BY id DESC LIMIT 5");
    console.log(rows);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
