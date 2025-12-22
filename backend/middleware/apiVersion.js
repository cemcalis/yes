// API Versioning middleware
const API_VERSION = '1.0';

function apiVersioning(req, res, next) {
  // Get version from header or query param
  const requestedVersion = req.headers['api-version'] || req.query.api_version || API_VERSION;

  // Set current API version in response headers
  res.setHeader('X-API-Version', API_VERSION);
  res.setHeader('X-Requested-API-Version', requestedVersion);

  // Version compatibility check
  if (!isVersionCompatible(requestedVersion, API_VERSION)) {
    return res.status(400).json({
      error: 'API version mismatch',
      current_version: API_VERSION,
      requested_version: requestedVersion,
      message: 'Lütfen uygulamanızı güncelleyin'
    });
  }

  // Attach version info to request
  req.apiVersion = {
    current: API_VERSION,
    requested: requestedVersion
  };

  next();
}

function isVersionCompatible(requested, current) {
  const [reqMajor] = requested.split('.').map(Number);
  const [currMajor] = current.split('.').map(Number);

  // Only check major version compatibility
  return reqMajor === currMajor;
}

// Get API version info
function getVersionInfo(req, res) {
  res.json({
    version: API_VERSION,
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      orders: '/api/orders',
      cart: '/api/cart',
      profile: '/api/profile',
      analytics: '/api/analytics',
      search: '/api/search'
    },
    features: {
      two_factor_auth: true,
      gdpr_compliance: true,
      coupons: true,
      cms: true,
      advanced_search: true,
      product_comparison: true
    },
    deprecations: [],
    breaking_changes: []
  });
}

module.exports = {
  apiVersioning,
  getVersionInfo,
  API_VERSION
};
