const logger = require('./logger');

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      endpoints: {}
    };
  }

  // Middleware to track request metrics
  requestMonitor() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Increment request counter
      this.metrics.requests++;

      // Track endpoint usage
      const endpoint = `${req.method} ${req.path}`;
      if (!this.metrics.endpoints[endpoint]) {
        this.metrics.endpoints[endpoint] = {
          count: 0,
          avgResponseTime: 0,
          errors: 0
        };
      }
      this.metrics.endpoints[endpoint].count++;

      // Capture response
      const originalSend = res.send;
      res.send = function(data) {
        const duration = Date.now() - startTime;
        
        // Update metrics
        this.metrics.responseTime.push(duration);
        
        // Keep only last 1000 response times
        if (this.metrics.responseTime.length > 1000) {
          this.metrics.responseTime.shift();
        }

        // Update endpoint metrics
        const endpointMetrics = this.metrics.endpoints[endpoint];
        endpointMetrics.avgResponseTime = 
          (endpointMetrics.avgResponseTime * (endpointMetrics.count - 1) + duration) / endpointMetrics.count;

        // Log slow requests
        if (duration > 1000) {
          logger.warn(`Slow request: ${endpoint} took ${duration}ms`);
        }

        originalSend.call(res, data);
      }.bind(this);

      // Track errors
      res.on('finish', () => {
        if (res.statusCode >= 400) {
          this.metrics.errors++;
          this.metrics.endpoints[endpoint].errors++;
          
          logger.error(`Error response: ${endpoint} - Status ${res.statusCode}`);
        }
      });

      next();
    };
  }

  // Get current metrics
  getMetrics() {
    const avgResponseTime = this.metrics.responseTime.length > 0
      ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length
      : 0;

    return {
      totalRequests: this.metrics.requests,
      totalErrors: this.metrics.errors,
      errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests * 100).toFixed(2) : 0,
      avgResponseTime: Math.round(avgResponseTime),
      topEndpoints: this.getTopEndpoints(10),
      slowestEndpoints: this.getSlowestEndpoints(10)
    };
  }

  // Get top used endpoints
  getTopEndpoints(limit = 10) {
    return Object.entries(this.metrics.endpoints)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, limit)
      .map(([endpoint, data]) => ({
        endpoint,
        count: data.count,
        avgResponseTime: Math.round(data.avgResponseTime),
        errors: data.errors
      }));
  }

  // Get slowest endpoints
  getSlowestEndpoints(limit = 10) {
    return Object.entries(this.metrics.endpoints)
      .sort(([, a], [, b]) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, limit)
      .map(([endpoint, data]) => ({
        endpoint,
        avgResponseTime: Math.round(data.avgResponseTime),
        count: data.count
      }));
  }

  // Reset metrics
  reset() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      endpoints: {}
    };
  }
}

// Health check utility
class HealthCheck {
  constructor() {
    this.checks = [];
  }

  // Add a health check
  addCheck(name, checkFn) {
    this.checks.push({ name, checkFn });
  }

  // Run all health checks
  async runChecks() {
    const results = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {}
    };

    for (const check of this.checks) {
      try {
        const result = await check.checkFn();
        results.checks[check.name] = {
          status: result ? 'healthy' : 'unhealthy',
          ...result
        };
        
        if (!result || result.status === 'unhealthy') {
          results.status = 'degraded';
        }
      } catch (error) {
        results.checks[check.name] = {
          status: 'unhealthy',
          error: error.message
        };
        results.status = 'unhealthy';
      }
    }

    return results;
  }
}

// Database health check
async function checkDatabase(db) {
  try {
    if (db && typeof db.query === 'function') {
      await db.query('SELECT 1');
      return { status: 'healthy', message: 'Database connection OK' };
    }

    if (db && typeof db.connect === 'function') {
      let client;
      try {
        client = await db.connect();
        await client.query('SELECT 1');
        return { status: 'healthy', message: 'Database connection OK' };
      } finally {
        if (client && typeof client.release === 'function') client.release();
      }
    }

    return { status: 'unhealthy', error: 'Database adapter missing query method' };
  } catch (err) {
    return { status: 'unhealthy', error: err.message };
  }
}

// Memory usage check
function checkMemory() {
  const used = process.memoryUsage();
  const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
  const usagePercent = ((used.heapUsed / used.heapTotal) * 100).toFixed(2);

  return {
    status: usagePercent < 90 ? 'healthy' : 'warning',
    heapUsed: `${heapUsedMB}MB`,
    heapTotal: `${heapTotalMB}MB`,
    usage: `${usagePercent}%`
  };
}

// Uptime check
function checkUptime() {
  const uptime = process.uptime();
  const days = Math.floor(uptime / 86400);
  const hours = Math.floor((uptime % 86400) / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);

  return {
    status: 'healthy',
    uptime: `${days}d ${hours}h ${minutes}m`,
    uptimeSeconds: Math.floor(uptime)
  };
}

module.exports = {
  PerformanceMonitor,
  HealthCheck,
  checkDatabase,
  checkMemory,
  checkUptime
};
