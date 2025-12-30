const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbFile = path.join(__dirname, 'data', 'dev.sqlite');
const db = new sqlite3.Database(dbFile);

function run(sql, params=[]) {
  return new Promise((res, rej) => db.run(sql, params, function(err){ if(err) return rej(err); res(this); }));
}
function get(sql, params=[]) {
  return new Promise((res, rej) => db.get(sql, params, (err,row)=> err?rej(err):res(row)));
}
function all(sql, params=[]) {
  return new Promise((res, rej) => db.all(sql, params, (err,rows)=> err?rej(err):res(rows)));
}

(async ()=>{
  try {
    const before = await get(`SELECT COUNT(*) as cnt FROM variants`);
    const dupGroups = await all(`SELECT product_id,size,COALESCE(color,'') as color, COUNT(*) as cnt FROM variants GROUP BY product_id,size,COALESCE(color,'') HAVING COUNT(*)>1`);
    console.log('Total variants before:', before.cnt);
    console.log('Duplicate groups found:', dupGroups.length);
    if(dupGroups.length === 0){
      console.log('No duplicates to remove.');
      return process.exit(0);
    }
    // Delete duplicates keeping smallest id
    await run(`DELETE FROM variants WHERE id NOT IN (SELECT MIN(id) FROM variants GROUP BY product_id,size,COALESCE(color,''))`);
    const after = await get(`SELECT COUNT(*) as cnt FROM variants`);
    console.log('Total variants after:', after.cnt);
    console.log('Removed:', before.cnt - after.cnt);
    // show sample remaining variants for affected products
    const affectedProducts = dupGroups.map(g=>g.product_id);
    const sample = await all(`SELECT id,product_id,size,color,stock FROM variants WHERE product_id IN (${affectedProducts.join(',')}) ORDER BY product_id,id LIMIT 50`);
    console.log('Sample remaining variants (up to 50):');
    console.log(sample);
    process.exit(0);
  } catch (err){
    console.error('Error during dedupe:', err);
    process.exit(1);
  } finally {
    db.close();
  }
})();
