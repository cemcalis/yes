#!/usr/bin/env node
"use strict";

const crypto = require('crypto');
const fetch = globalThis.fetch || require('node-fetch');

const argv = process.argv.slice(2);
if (argv.length < 1) {
  console.error('Usage: node paytr_test.js <merchant_oid> [total_amount] [status]');
  console.error('Example: node paytr_test.js 123 100 success');
  process.exit(1);
}

const merchant_oid = argv[0];
const total_amount = argv[1] || '100'; // amount as string (e.g. 100)
const status = argv[2] || 'success';

const { PAYTR_MERCHANT_KEY, PAYTR_MERCHANT_SALT } = process.env;
if (!PAYTR_MERCHANT_KEY || !PAYTR_MERCHANT_SALT) {
  console.error('Environment variables PAYTR_MERCHANT_KEY and PAYTR_MERCHANT_SALT must be set');
  process.exit(2);
}

const hashStr = `${merchant_oid}${PAYTR_MERCHANT_SALT}${status}${total_amount}`;
const hash = crypto.createHmac('sha256', PAYTR_MERCHANT_KEY).update(hashStr).digest('base64');

(async () => {
  const url = 'http://localhost:5000/api/payments/paytr/callback';
  console.log('Posting callback to', url);
  console.log({ merchant_oid, status, total_amount, hash });

  const params = new URLSearchParams({ merchant_oid, status, total_amount, hash });
  const resp = await fetch(url, {
    method: 'POST',
    body: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const text = await resp.text();
  console.log('Response status:', resp.status);
  console.log('Response body:', text);
})();
