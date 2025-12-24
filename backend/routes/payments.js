"use strict";

const express = require("express");
const crypto = require("crypto");

const router = express.Router();

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
    } = req.body || {};

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

    const response = await fetch("https://www.paytr.com/odeme/api/get-token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });

    const data = await response.json().catch(() => null);
    if (!data || data.status !== "success") {
      return res
        .status(400)
        .json({ error: "paytr_init_failed", detail: data || "unknown" });
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

      // TODO: sipariş durumunu merchant_oid üzerinden güncelle (success / failed)
      // status === "success" -> ödemeyi onayla
      // status === "failed"  -> başarısız kaydet

      return res.send("OK");
    } catch (err) {
      console.error("paytr callback error", err);
      return res.status(500).send("ERROR");
    }
  }
);

module.exports = router;
