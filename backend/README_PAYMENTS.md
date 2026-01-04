## PayTR Entegrasyonu - Hızlı Kurulum ve Test

Bu dosya PayTR ödeme entegrasyonu için gerekli ortam değişkenlerini, test ve doğrulama adımlarını içerir.

Gerekli ortam değişkenleri (örnek):

- `PAYTR_MERCHANT_ID` = REPLACE_WITH_MERCHANT_ID
- `PAYTR_MERCHANT_KEY` = REPLACE_WITH_MERCHANT_KEY
- `PAYTR_MERCHANT_SALT` = REPLACE_WITH_MERCHANT_SALT
- `PAYTR_SUCCESS_URL` = https://ravorcollection.com/odeme-basarili
- `PAYTR_FAIL_URL` = https://ravorcollection.com/odeme-basarisiz

Bu proje `backend/routes/payments.js` içinde PayTR token init (`POST /api/payments/paytr/init`) ve
callback (`POST /api/payments/paytr/callback`) zaten uygulanmıştır.

1. Ortam değişkenlerini uygulayın (örneğin sunucuda veya deploy panelinde):

```bash
# set these in your deployment/CI secrets instead of committing them
export PAYTR_MERCHANT_ID=REPLACE_WITH_MERCHANT_ID
export PAYTR_MERCHANT_KEY=REPLACE_WITH_MERCHANT_KEY
export PAYTR_MERCHANT_SALT=REPLACE_WITH_MERCHANT_SALT
export PAYTR_SUCCESS_URL=https://ravorcollection.com/odeme-basarili
export PAYTR_FAIL_URL=https://ravorcollection.com/odeme-basarisiz

# sonra backend'i yeniden başlatın
docker compose restart backend
```

2. `paytr/init` endpoint test (sandbox):

```bash
curl -s -X POST http://127.0.0.1:5000/api/payments/paytr/init \
  -H "Content-Type: application/json" \
  -d '{"order_id":"12345","email":"test@example.com","amount":10000,"basket":[["urun","100.00","1"]]}'

# yanıtta { token, iframe_url } bekleyin
```

3. Webhook (callback) test - basit simülasyon:

```js
# Node REPL veya küçük script ile hesapla:
const crypto = require('crypto');
const merchant_oid = '12345';
const status = 'success';
const total_amount = '10000';
const hash = crypto.createHmac('sha256', process.env.PAYTR_MERCHANT_KEY)
  .update(`${merchant_oid}${process.env.PAYTR_MERCHANT_SALT}${status}${total_amount}`)
  .digest('base64');
console.log(hash);

# sonra POST simülasyonu:
curl -X POST https://your-backend-domain/api/payments/paytr/callback \
  -d "merchant_oid=12345&status=success&total_amount=10000&hash=THE_COMPUTED_HASH"
```

4. Doğrulama:

- `orders` tablosunda ilgili sipariş `completed` olmalı.
- `variants` / `products` stokları güncellenmiş olmalı.

Güvenlik notları:

- Merchant key/salt gibi gizli anahtarları sadece deploy ortamınızda saklayın (CI secrets / hosting env). `env.json` sadece deploy araçları için örnektir.
- Webhook endpoint'ini herkese açık bırakmayın; doğrulama zaten HMAC ile yapılmaktadır.

İhtiyaç varsa Stripe gibi alternatif sağlayıcı için örnek endpoint de ekleyebilirim.
