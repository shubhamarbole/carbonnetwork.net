const crypto = require('crypto');

/**
 * Correlation ID Middleware
 * Injects and propagates X-Correlation-ID / X-Request-ID across microservices.
 */
function correlationId(req, res, next) {
  const existingId = req.headers['x-correlation-id'] || req.headers['x-request-id'];
  const id = existingId || `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  req.id = id;
  req.correlationId = id;
  res.setHeader('X-Request-ID', id);
  res.setHeader('X-Correlation-ID', id);
  next();
}

module.exports = correlationId;
