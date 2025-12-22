const puppeteer = require('puppeteer');
const fs = require('fs');

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';

async function run() {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.setDefaultTimeout(20000);

  const results = {};

  // helper to run fetch in page context to leverage Next rewrites
  async function fetchApi(method, path, body, extraHeaders = {}) {
    return await page.evaluate(async (method, path, body, extraHeaders) => {
      const opts = { method, headers: { 'Content-Type': 'application/json', ...extraHeaders } };
      if (body) opts.body = JSON.stringify(body);
      const res = await fetch(path, opts);
      const text = await res.text().catch(() => null);
      let parsed = null;
      try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
      return { status: res.status, ok: res.ok, body: parsed };
    }, method, path, body, extraHeaders);
  }

  try {
    await page.goto(FRONTEND, { waitUntil: 'networkidle2' });

    results.health = await fetchApi('GET', '/api/health');
    results.products = await fetchApi('GET', '/api/products');
    results.product_detail = await fetchApi('GET', '/api/products/smoke-product');

    // cart flow
    const sessionResp = await fetchApi('POST', '/api/cart/session', {});
    results.createSession = sessionResp;
    const sessionId = sessionResp.body && sessionResp.body.sessionId;
    if (sessionId) results.getCart = await fetchApi('GET', `/api/cart/${sessionId}`);

    // Admin login
    const adminLogin = await fetchApi('POST', '/api/admin/auth/login', { email: 'admin@ravor.com', password: 'admin123' });
    results.adminLogin = adminLogin;
    const adminToken = adminLogin.body && adminLogin.body.token;
    if (adminToken) {
      results.adminStats = await fetchApi('GET', '/api/admin/stats', null, { Authorization: `Bearer ${adminToken}` });
      results.adminBanners = await fetchApi('GET', '/api/admin/banners', null, { Authorization: `Bearer ${adminToken}` });
      results.adminUsers = await fetchApi('GET', '/api/admin/users?page=1&limit=5', null, { Authorization: `Bearer ${adminToken}` });
    }

    // Register + login flow for normal user
    const rnd = Math.floor(Math.random() * 100000);
    const email = `puppeteer+${rnd}@example.com`;
    results.register = await fetchApi('POST', '/api/auth/register', { email, password: 'pass123', name: 'Puppeteer' });
    const userToken = results.register.body && results.register.body.token;
    if (userToken) {
      results.userOrders = await fetchApi('GET', '/api/orders', null, { Authorization: `Bearer ${userToken}` });
    }

    // favorites (if user token present)
    if (userToken) {
      const addFav = await fetchApi('POST', `/api/favorites/${results.register.body.user.id}/1`, null, { Authorization: `Bearer ${userToken}` });
      results.addFavorite = addFav;
      const listFav = await fetchApi('GET', `/api/favorites/${results.register.body.user.id}`, null, { Authorization: `Bearer ${userToken}` });
      results.listFavorites = listFav;
    }

  } catch (err) {
    results.error = String(err && err.stack ? err.stack : err);
  } finally {
    await browser.close();
    const outPath = require('path').join(__dirname, '..', 'e2e-results.json');
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
    console.log('E2E results written to', outPath);
    console.log(JSON.stringify(results, null, 2));
  }
}

run().catch(e => { console.error(e); process.exit(1); });
