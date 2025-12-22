const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');

// Rate limiting configurations
const createAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 accounts per hour per IP
  message: 'Bu IP adresinden çok fazla hesap oluşturuldu. Lütfen daha sonra tekrar deneyin.',
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 minutes
  message: 'Çok fazla giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.',
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: 'Çok fazla istek. Lütfen bir dakika bekleyin.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Helmet configuration for security headers
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

// Input validation middleware
const validateRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Geçerli bir email adresi girin'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Şifre en az 6 karakter olmalıdır'),
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('İsim 2-100 karakter arasında olmalıdır'),
  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^[0-9\s\-\(\)]+$/)
    .isLength({ min: 10, max: 20 })
    .withMessage('Geçerli bir telefon numarası girin'),
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Geçerli bir email adresi girin'),
  body('password')
    .notEmpty()
    .withMessage('Şifre gereklidir'),
];

const validateProduct = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Ürün adı 3-200 karakter arasında olmalıdır'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Fiyat geçerli bir sayı olmalıdır'),
  body('slug')
    .trim()
    .matches(/^[a-z0-9-]+$/)
    .withMessage('Slug sadece küçük harf, rakam ve tire içerebilir'),
];

const validateOrder = [
  body('customer_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Müşteri adı 2-100 karakter arasında olmalıdır'),
  body('customer_email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Geçerli bir email adresi girin'),
  body('customer_phone')
    .optional()
    .matches(/^[0-9]{10}$/)
    .withMessage('Telefon numarası 10 haneli olmalıdır'),
  body('shipping_address')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Teslimat adresi 10-500 karakter arasında olmalıdır'),
  body('total_amount')
    .isFloat({ min: 0 })
    .withMessage('Toplam tutar geçerli bir sayı olmalıdır'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('En az bir ürün gereklidir'),
];

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Geçersiz veriler',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Sanitize user input (basic XSS prevention)
const sanitizeInput = (req, res, next) => {
  const sanitize = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Remove potential XSS patterns
        obj[key] = obj[key]
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  
  next();
};

// CSRF token generation and validation (simplified - for full app use csurf package)
const csrfProtection = (req, res, next) => {
  // Skip CSRF for API endpoints that use Bearer token auth
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }

  // For cookie-based sessions, verify CSRF token
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.cookies.csrf_token;

  if (!token || token !== sessionToken) {
    return res.status(403).json({ error: 'Geçersiz CSRF token' });
  }

  next();
};

// Generate CSRF token
const generateCsrfToken = (req, res, next) => {
  if (!req.cookies.csrf_token) {
    const token = require('crypto').randomBytes(32).toString('hex');
    res.cookie('csrf_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    req.csrfToken = token;
  } else {
    req.csrfToken = req.cookies.csrf_token;
  }
  next();
};

module.exports = {
  createAccountLimiter,
  loginLimiter,
  apiLimiter,
  strictLimiter,
  helmetConfig,
  validateRegistration,
  validateLogin,
  validateProduct,
  validateOrder,
  handleValidationErrors,
  sanitizeInput,
  csrfProtection,
  generateCsrfToken,
};
