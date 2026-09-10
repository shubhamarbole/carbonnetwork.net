/**
 * In-Memory Sliding Window Rate Limiter Middleware
 * Enforces request frequency limits per IP while allowing bypass for tests.
 */
class InMemoryRateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
    this.maxRequests = options.maxRequests || 600; // general API limit
    this.hits = new Map();
  }

  middleware() {
    return (req, res, next) => {
      // Bypass for automated verification / test suites
      if (req.headers['x-test-bypass'] === 'true' || process.env.DISABLE_RATE_LIMIT === 'true') {
        return next();
      }

      const clientKey = req.ip || req.connection.remoteAddress || '127.0.0.1';
      const now = Date.now();
      let clientRecord = this.hits.get(clientKey);

      if (!clientRecord || now > clientRecord.resetTime) {
        clientRecord = {
          count: 1,
          resetTime: now + this.windowMs
        };
        this.hits.set(clientKey, clientRecord);
      } else {
        clientRecord.count += 1;
      }

      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - clientRecord.count));
      res.setHeader('X-RateLimit-Reset', Math.ceil(clientRecord.resetTime / 1000));

      if (clientRecord.count > this.maxRequests) {
        return res.status(429).json({
          success: false,
          message: 'Too Many Requests: Rate limit exceeded. Please try again later.',
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too Many Requests: Rate limit exceeded.',
            request_id: req.id || 'unknown'
          }
        });
      }

      next();
    };
  }
}

const defaultRateLimiter = new InMemoryRateLimiter();
module.exports = defaultRateLimiter.middleware();
