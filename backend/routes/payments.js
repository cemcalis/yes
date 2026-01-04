"use strict";

const express = require("express");
const crypto = require("crypto");

const router = express.Router();
const { dbGet, dbAll, dbRun } = require('../db');
const logger = require('../lib/logger');

const {
  PAYTR_MERCHANT_ID,
  PAYTR_MERCHANT_KEY,
  PAYTR_MERCHANT_SALT,
  PAYTR_SUCCESS_URL,
  PAYTR_FAIL_URL,
} = process.env;

const ensureEnv = () => {
  const missing = [
    PAYTR_MERCHANT_ID ? null : "PAYTR_MERCHANT_ID",
    PAYTR_MERCHANT_KEY ? null : "PAYTR_MERCHANT_KEY",
    PAYTR_MERCHANT_SALT ? null : "PAYTR_MERCHANT_SALT",
    PAYTR_SUCCESS_URL ? null : "PAYTR_SUCCESS_URL",
    PAYTR_FAIL_URL ? null : "PAYTR_FAIL_URL",
  ].filter(Boolean);
  return missing;
};

// PayTR iframe token oluşturma
router.post("/paytr/init", async (req, res) => {
  try {
    const missing = ensureEnv();
    if (missing.length) {
      return res
        .status(500)
        .json({ error: "paytr_env_missing", detail: missing.join(",") });
    }

    const {
      order_id,
      email,
      amount, // kuruş cinsinden (199 TL => 19900)
      basket = [], // [[urunAd, "199.00", "1"], ...]
      installment = 0, // max_installment
      user_ip,
      user_name,
      user_phone,
      user_address,
      user_city,
      user_country,
      user_zip,
    } = req.body || {};

    // Log received user/address fields to help debug missing params (no secrets)
    try {
      console.log(
        'paytr:received',
        JSON.stringify({ order_id, email, amount, user_name, user_phone, user_address, user_city, user_country, user_zip })
      );
    } catch (e) {
      // ignore
    }

    if (!order_id || !email || !amount) {
      return res
        .status(400)
        .json({ error: "missing_fields", detail: "order_id, email, amount" });
    }

    const payment_amount = parseInt(amount, 10);
    if (Number.isNaN(payment_amount) || payment_amount <= 0) {
      return res
        .status(400)
        .json({ error: "invalid_amount", detail: "amount must be > 0 in kuruş" });
    }

    const basketArr = Array.isArray(basket) ? basket : [];
    const basketStr = JSON.stringify(basketArr);

    const currency = "TL";
    const no_installment = 0; // taksit kapama: 1 => kapat, 0 => açık
    const max_installment = Number.isInteger(installment) ? installment : 0;
    const test_mode = process.env.NODE_ENV === "production" ? 0 : 1;
    const non_3d = 0; // 0 => 3D Secure açık

    const clientIp =
      user_ip ||
      req.headers["x-forwarded-for"]?.toString().split(",")[0].trim() ||
      req.connection?.remoteAddress ||
      req.ip ||
      "127.0.0.1";

    // Hash hesaplama (PayTR dokümantasyonu)
    const hashStr = `${PAYTR_MERCHANT_ID}${clientIp}${order_id}${email}${payment_amount}${basketStr}${no_installment}${max_installment}${currency}${test_mode}${non_3d}${PAYTR_MERCHANT_SALT}`;
    const paytr_token = crypto
      .createHmac("sha256", PAYTR_MERCHANT_KEY)
      .update(hashStr)
      .digest("base64");

    const params = new URLSearchParams({
      merchant_id: PAYTR_MERCHANT_ID,
      user_ip: clientIp,
      merchant_oid: order_id,
      email,
      user_email: email,
      user_name: user_name || email,
      user_phone: user_phone || "",
      user_address: user_address || "",
      user_city: user_city || "",
      user_country: user_country || "",
      user_zip: user_zip || "",
      payment_amount: String(payment_amount),
      currency,
      installment: "0", // deprecated, ama bazı örneklerde var
      no_installment: String(no_installment),
      max_installment: String(max_installment),
      test_mode: String(test_mode),
      non_3d: String(non_3d),
      merchant_ok_url: PAYTR_SUCCESS_URL,
      merchant_fail_url: PAYTR_FAIL_URL,
      user_basket: basketStr,
      paytr_token,
      lang: "tr",
      payment_type: "card",
    });

    if (process.env.NODE_ENV !== 'production') {
      try {
        const debugParams = Object.fromEntries(params.entries());
        console.log('paytr:init params:', JSON.stringify(debugParams));
      } catch (e) {
        // ignore
      }
    }

    const response = await fetch("https://www.paytr.com/odeme/api/get-token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    // Read raw response text from PayTR, attempt to parse JSON, and always log status/body (no secrets)
    const raw = await response.text().catch(() => null);
    let data = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch (e) {
      data = null;
    }

    try {
      // always log provider response for debugging (avoid logging request secrets)
      console.log('paytr:response', { status: response.status, body: raw });
    } catch (e) {
      // ignore logging errors
    }

    if (!data || data.status !== "success") {
      return res
        .status(400)
        .json({ error: "paytr_init_failed", detail: data || raw || "unknown" });
    }

    return res.json({
      token: data.token,
      iframe_url: `https://www.paytr.com/odeme/guvenli/${data.token}`,
    });
  } catch (err) {
    console.error("paytr init error", err);
    return res.status(500).json({ error: "paytr_init_error" });
  }
});

// PayTR callback (webhook)
router.post(
  "/paytr/callback",
  express.urlencoded({ extended: false }),
  (req, res) => {
    try {
      const missing = ensureEnv();
      if (missing.length) {
        return res.status(500).send("ENV_MISSING");
      }

      const { merchant_oid, status, total_amount, hash } = req.body || {};
      if (!merchant_oid || !status || !total_amount || !hash) {
        return res.status(400).send("MISSING_PARAMS");
      }

      const hashStr = `${merchant_oid}${PAYTR_MERCHANT_SALT}${status}${total_amount}`;
      const calcHash = crypto
        .createHmac("sha256", PAYTR_MERCHANT_KEY)
        .update(hashStr)
        .digest("base64");

      if (calcHash !== hash) {
        return res.status(400).send("INVALID_HASH");
      }

      // merchant_oid should match our order id
      (async () => {
        try {
          const orderId = Number(merchant_oid);
          const order = await dbGet('SELECT * FROM orders WHERE id = $1', [orderId]);
          if (!order) {
            logger.error('PayTR callback: order not found', { orderId });
            return res.status(404).send('ORDER_NOT_FOUND');
          }

          if (status === 'success') {
            // finalize order: decrement stocks and mark completed
            await dbRun('BEGIN TRANSACTION');

            const items = await dbAll('SELECT * FROM order_items WHERE order_id = $1', [orderId]);

            // Check stocks first
            for (const item of items) {
              if (item.variant_id) {
                const v = await dbGet('SELECT id, stock FROM variants WHERE id = $1', [item.variant_id]);
                if (!v || v.stock == null || v.stock < item.quantity) {
                  await dbRun('ROLLBACK');
                  logger.error('PayTR callback: insufficient variant stock', { orderId, variant_id: item.variant_id });
                  await dbRun('UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['failed', orderId]);
                  return res.status(400).send('INSUFFICIENT_STOCK');
                }
              } else if (item.product_id) {
                const p = await dbGet('SELECT id, stock FROM products WHERE id = $1', [item.product_id]);
                if (!p || p.stock == null || p.stock < item.quantity) {
                  await dbRun('ROLLBACK');
                  logger.error('PayTR callback: insufficient product stock', { orderId, product_id: item.product_id });
                  await dbRun('UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['failed', orderId]);
                  return res.status(400).send('INSUFFICIENT_STOCK');
                }
              }
            }

            // Decrement stocks
            for (const item of items) {
              if (item.variant_id) {
                await dbRun('UPDATE variants SET stock = stock - $1 WHERE id = $2', [item.quantity, item.variant_id]);
                // Update active flag based on new stock if setting enabled
                try {
                  const s = await dbGet("SELECT value FROM settings WHERE key = 'autoDeactivateZeroStockVariant'");
                  const enabled = s && (s.value === 'true' || s.value === '1' || s.value === 1);
                  if (enabled) {
                    await dbRun('UPDATE variants SET is_active = CASE WHEN stock <= 0 THEN 0 ELSE 1 END WHERE id = $1', [item.variant_id]);
                  }
                } catch (e) {
                  // ignore settings errors
                }
                logger.info(`PayTR: decremented variant ${item.variant_id} by ${item.quantity} for order ${orderId}`);
              } else if (item.product_id) {
                await dbRun('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.product_id]);
                logger.info(`PayTR: decremented product ${item.product_id} by ${item.quantity} for order ${orderId}`);
              }
            }

            await dbRun('UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['completed', orderId]);
            await dbRun('COMMIT');
            logger.info('PayTR callback: order completed', { orderId });
            return res.send('OK');
          } else {
            // payment failed
            await dbRun('UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', ['failed', orderId]);
            logger.warn('PayTR callback: payment failed', { orderId });
            return res.send('OK');
          }
        } catch (err) {
          try { await dbRun('ROLLBACK'); } catch (e) {}
          console.error('paytr callback processing error', err);
          return res.status(500).send('ERROR');
        }
      })();
    } catch (err) {
      console.error("paytr callback error", err);
      return res.status(500).send("ERROR");
    }
  }
);

module.exports = router;
