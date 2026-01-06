#!/usr/bin/env node
"use strict";

const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const amount = process.argv[2] || '100';
const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '..', 'data', 'dev.sqlite');

console.log('Using DB:', dbPath);
const db = new sqlite3.Database(dbPath);

function runAsync(sql, params=[]) {
  return new Promise((res, rej) => db.run(sql, params, function(err){ if (err) rej(err); else res({ lastID: this.lastID, changes: this.changes }); }));
}

function allAsync(sql, params=[]) {
  return new Promise((res, rej) => db.all(sql, params, (err, rows) => { if (err) rej(err); else res(rows); }));
}

(async ()=>{
  try {
    const cols = await allAsync("PRAGMA table_info('orders')");
    if (!cols || cols.length === 0) {
      console.error('No orders table found in DB');
      process.exit(2);
    }

    const colNames = cols.map(c=>c.name);
    const toInsert = {};
    if (colNames.includes('status')) toInsert.status = 'pending';
    // support both `total_amount` and legacy `total` column names
    if (colNames.includes('total_amount')) toInsert.total_amount = amount;
    if (colNames.includes('total')) toInsert.total = amount;
    if (colNames.includes('created_at')) toInsert.created_at = new Date().toISOString();
    if (colNames.includes('updated_at')) toInsert.updated_at = new Date().toISOString();

    const keys = Object.keys(toInsert);
    if (keys.length === 0) {
      // fallback: insert a minimal row using DEFAULT VALUES
      const r = await runAsync('INSERT INTO orders DEFAULT VALUES');
      console.log('Inserted order id:', r.lastID);
      process.exit(0);
    }

    const placeholders = keys.map(()=>'?').join(',');
    const sql = `INSERT INTO orders (${keys.join(',')}) VALUES (${placeholders})`;
    const vals = keys.map(k=>toInsert[k]);
    const r = await runAsync(sql, vals);
    console.log('Inserted order id:', r.lastID);
    process.exit(0);
  } catch (e) {
    console.error('Error creating test order', e);
    process.exit(3);
  }
})();
