require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const logger = require('./lib/logger');
const cookieParser = require('cookie-parser');
const { helmetConfig, sanitizeInput, apiLimiter, generateCsrfToken } = require('./middleware/security');
const { apiVersioning, getVersionInfo } = require('./middleware/apiVersion');
const { PerformanceMonitor, HealthCheck, checkDatabase, checkMemory, checkUptime } = require('./lib/monitoring');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for Railway/Render deployment
app.set('trust proxy', 1);
app.disable('x-powered-by');

// Initialize monitoring
const performanceMonitor = new PerformanceMonitor();
const healthCheck = new HealthCheck();

// Add health checks
healthCheck.addCheck('database', () => checkDatabase(db));
healthCheck.addCheck('memory', checkMemory);
healthCheck.addCheck('uptime', checkUptime);

// Performance monitoring middleware (before other middleware)
app.use(performanceMonitor.requestMonitor());

// Security middleware
app.use(helmetConfig);

// Allowed origins for CORS
const allowedOrigins = Array.from(new Set([
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  process.env.FRONTEND_URL,
  process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : null,
  'https://aura-frontend-zeta.vercel.app',
  'https://aura-frontend-cemcaliss-projects.vercel.app',
  'https://aura-frontend-jk4xew9un-cemcalis-projects.vercel.app',
  'https://frontend-mocha-iota.vercel.app',
  'https://www.ravorcollection.com',
  'https://ravorcollection.com'
].filter(Boolean)))

console.log('CORS allowed origins:', allowedOrigins);

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin) return callback(null, true);

    // Exact match or startsWith for subpaths
    if (allowedOrigins.some(allowed => origin === allowed || origin.startsWith(allowed.replace(/\/$/, '')))) {
      return callback(null, true);
    }

    // otherwise fail CORS
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Input sanitization
app.use(sanitizeInput);

// CSRF token generation
app.use(generateCsrfToken);

// Rate limiting for all API routes
app.use('/api', apiLimiter);

// API versioning
app.use('/api', apiVersioning);

// Routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const adminMgmtRoutes = require('./routes/admin-management');
const favoritesRoutes = require('./routes/favorites');
const reviewRoutes = require('./routes/reviews');
const stockAlertsRoutes = require('./routes/stock-alerts');
// const analyticsRoutes = require('./routes/analytics'); // Temporarily disabled
const profileRoutes = require('./routes/profile');
const addressesRoutes = require('./routes/addresses');
const productFeaturesRoutes = require('./routes/product-features');
const searchRoutes = require('./routes/search');
const couponsRoutes = require('./routes/coupons');
const cmsRoutes = require('./routes/cms');
const bannersRoutes = require('./routes/banners');
const gdprRoutes = require('./routes/gdpr');
const twoFactorRoutes = require('./routes/two-factor');
const seedRoutes = require('./routes/seed');
const sizeRequestsRoutes = require('./routes/size-requests');

app.use('/api/auth', authRoutes);
app.use('/api/seed', seedRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin-management', adminMgmtRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/stock-alerts', stockAlertsRoutes);
// app.use('/api/analytics', analyticsRoutes); // Temporarily disabled
app.use('/api/profile', profileRoutes);
app.use('/api/addresses', addressesRoutes);
app.use('/api/product-features', productFeaturesRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/coupons', couponsRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/banners', bannersRoutes);
app.use('/api/gdpr', gdprRoutes);
app.use('/api/2fa', twoFactorRoutes);
app.use('/api/size-requests', sizeRequestsRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  const health = await healthCheck.runChecks();
  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 207 : 503;
  res.status(statusCode).json(health);
});

// API version info
app.get('/api/version', getVersionInfo);

// Performance metrics (admin only)
app.get('/api/metrics', (req, res) => {
  // Simple auth check - in production use proper auth middleware
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const metrics = performanceMonitor.getMetrics();
  res.json(metrics);
});

// Reset metrics (admin only)
app.post('/api/metrics/reset', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  performanceMonitor.reset();
  res.json({ success: true, message: 'Metrics reset' });
});

// Serve uploaded files (make sure uploads are saved to backend/public/uploads)
const path = require('path');
const uploadsPath = path.join(__dirname, 'public', 'uploads');
app.use('/uploads', express.static(uploadsPath, {
  dotfiles: 'deny',
  maxAge: '1d',
  etag: true,
  index: false,
  fallthrough: false
}));
// Serve other public assets (e.g. /urunler/...)
app.use(express.static(path.join(__dirname, 'public'), {
  dotfiles: 'deny',
  maxAge: '1d',
  etag: true
}));

// Error handling
app.use((err, req, res, next) => {
  logger.error(err && err.stack ? err.stack : String(err));
  res.status(500).json({ error: 'Bir hata oluştu!' });
});

// Start server only when run directly
if (require.main === module) {
  // Wait for database initialization before starting server
  const startServer = async () => {
    try {
      app.listen(PORT, () => {
        logger.info(`🚀 Server çalışıyor: http://localhost:${PORT}`);
        logger.info(`📊 API endpoint: http://localhost:${PORT}/api`);
      });
    } catch (error) {
      console.error('❌ Server başlatma hatası:', error);
      process.exit(1);
    }
  };
  
  startServer();
}

module.exports = app;
