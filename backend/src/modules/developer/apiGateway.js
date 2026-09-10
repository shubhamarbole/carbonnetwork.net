const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { 
  DeveloperApplication, 
  ApiCredential, 
  ApiRequestLog, 
  IdempotencyRecord 
} = require('../../../models/models');

const JWT_SECRET = process.env.JWT_SECRET || 'environmental-esg-secret-key-98765';

// In-memory sliding window rate limiter stores
const rateLimitWindows = new Map();

const RATE_TIERS = {
  STANDARD: { general: 60, ai: 10 },
  PROFESSIONAL: { general: 180, ai: 30 },
  ENTERPRISE: { general: 600, ai: 100 }
};

/**
 * Standardized Request/Response Helper
 */
function sendSuccess(req, res, data, status = 200) {
  if (req.isSandbox) {
    res.setHeader('X-Sandbox', 'true');
  }
  return res.status(status).json({
    data,
    meta: {
      request_id: req.requestId
    }
  });
}

function sendCollection(req, res, data, pagination, status = 200) {
  if (req.isSandbox) {
    res.setHeader('X-Sandbox', 'true');
  }
  return res.status(status).json({
    data,
    pagination: {
      page: Number(pagination.page) || 1,
      page_size: Number(pagination.page_size) || data.length,
      total: Number(pagination.total) || data.length
    },
    meta: {
      request_id: req.requestId
    }
  });
}

function sendError(req, res, code, message, httpStatus = 400) {
  if (req.isSandbox) {
    res.setHeader('X-Sandbox', 'true');
  }
  return res.status(httpStatus).json({
    error: {
      code,
      message,
      request_id: req.requestId
    }
  });
}

/**
 * Step 1: Request Correlation ID Middleware
 */
function correlationIdMiddleware(req, res, next) {
  req.requestId = req.headers['x-request-id'] || `REQ-${crypto.randomBytes(6).toString('hex')}`;
  res.setHeader('X-Request-ID', req.requestId);
  req._startTime = Date.now();
  next();
}

/**
 * Step 2: Authentication & Credential Verification
 */
async function authenticateDeveloper(req, res, next) {
  try {
    const apiKeyHeader = req.headers['x-api-key'];
    const authHeader = req.headers['authorization'];
    let rawToken = apiKeyHeader;

    if (!rawToken && authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        rawToken = authHeader.slice(7).trim();
      } else {
        rawToken = authHeader.trim();
      }
    }

    if (!rawToken) {
      return sendError(req, res, 'UNAUTHENTICATED', 'Missing API key or OAuth Bearer token in request headers.', 401);
    }

    // Check if OAuth 2.0 JWT Token
    if (rawToken.split('.').length === 3) {
      try {
        const decoded = jwt.verify(rawToken, JWT_SECRET);
        const app = await DeveloperApplication.findOne({ application_id: decoded.application_id });
        if (!app || app.status !== 'ACTIVE') {
          return sendError(req, res, 'UNAUTHENTICATED', 'Associated developer application is not active.', 401);
        }

        req.isSandbox = !!app.is_sandbox || !!decoded.is_sandbox;
        req.user = {
          organizationId: app.organization_id,
          role: 'API_DEVELOPER',
          applicationId: app.application_id,
          credentialId: decoded.credential_id || 'oauth',
          scopes: decoded.scopes || app.scopes || [],
          rateLimitTier: app.rate_limit_tier || 'STANDARD',
          isSandbox: req.isSandbox
        };
        return next();
      } catch (jwtErr) {
        // Fallthrough if not a valid JWT, try raw API key
      }
    }

    // API Key authentication (esg_live_... or esg_test_...)
    const isSandbox = rawToken.startsWith('esg_test_');
    const secretHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const cred = await ApiCredential.findOne({ secret_hash: secretHash });
    if (!cred) {
      return sendError(req, res, 'UNAUTHENTICATED', 'Invalid or unrecognized API key secret.', 401);
    }

    if (cred.status !== 'ACTIVE') {
      return sendError(req, res, 'UNAUTHENTICATED', `API credential has been ${cred.status.toLowerCase()}.`, 401);
    }

    if (cred.expires_at && new Date(cred.expires_at) < new Date()) {
      cred.status = 'EXPIRED';
      await cred.save();
      return sendError(req, res, 'UNAUTHENTICATED', 'API credential has expired.', 401);
    }

    const app = await DeveloperApplication.findOne({ application_id: cred.application_id });
    if (!app || app.status !== 'ACTIVE') {
      return sendError(req, res, 'UNAUTHENTICATED', 'Associated developer application is not active.', 401);
    }

    // Update last used timestamp non-blockingly
    cred.last_used_at = new Date().toISOString();
    cred.save().catch(() => {});

    req.isSandbox = isSandbox || !!app.is_sandbox;
    req.user = {
      organizationId: app.organization_id,
      role: 'API_DEVELOPER',
      applicationId: app.application_id,
      credentialId: cred.credential_id,
      scopes: cred.scopes && cred.scopes.length > 0 ? cred.scopes : app.scopes,
      rateLimitTier: app.rate_limit_tier || 'STANDARD',
      isSandbox: req.isSandbox
    };

    next();
  } catch (err) {
    return sendError(req, res, 'INTERNAL_ERROR', 'Authentication validation failed.', 500);
  }
}

/**
 * Step 3: Scope Validation Middleware Factory
 */
function requireScope(requiredScope) {
  return (req, res, next) => {
    if (!req.user || !req.user.scopes) {
      return sendError(req, res, 'FORBIDDEN', 'Access forbidden: Missing authenticated scope context.', 403);
    }

    const userScopes = req.user.scopes;
    const hasScope = userScopes.includes(requiredScope) || 
                     userScopes.includes('*') || 
                     userScopes.includes(requiredScope.split(':')[0] + ':*');

    if (!hasScope) {
      return sendError(req, res, 'FORBIDDEN', `You do not have permission to access this resource. Required scope: [${requiredScope}]`, 403);
    }

    next();
  };
}

/**
 * Step 4: Tiered & Dedicated AI Rate Limiter
 */
function rateLimiter(isAiEndpoint = false) {
  return (req, res, next) => {
    const tier = req.user?.rateLimitTier || 'STANDARD';
    const limits = RATE_TIERS[tier] || RATE_TIERS.STANDARD;
    const maxReqs = isAiEndpoint ? limits.ai : limits.general;
    const windowSecs = 60;
    const now = Math.floor(Date.now() / 1000);

    const appId = req.user?.applicationId || req.ip || 'anonymous';
    const key = `${appId}:${isAiEndpoint ? 'ai' : 'gen'}`;

    let record = rateLimitWindows.get(key);
    if (!record || now - record.windowStart >= windowSecs) {
      record = { windowStart: now, count: 1 };
      rateLimitWindows.set(key, record);
    } else {
      record.count += 1;
    }

    res.setHeader('X-RateLimit-Limit', maxReqs);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxReqs - record.count));
    res.setHeader('X-RateLimit-Reset', record.windowStart + windowSecs);

    if (record.count > maxReqs) {
      const retryAfter = (record.windowStart + windowSecs) - now;
      res.setHeader('Retry-After', Math.max(1, retryAfter));
      return sendError(
        req, 
        res, 
        'RATE_LIMITED', 
        `Rate limit exceeded for tier [${tier}]. Maximum ${maxReqs} requests per minute. Retry in ${retryAfter}s.`, 
        429
      );
    }

    next();
  };
}

/**
 * Step 5: Idempotency Protection Middleware
 */
async function idempotencyGuard(req, res, next) {
  const idempKey = req.headers['idempotency-key'];
  if (!idempKey || req.method !== 'POST') {
    return next();
  }

  try {
    const orgId = req.user?.organizationId || 'global';
    const existing = await IdempotencyRecord.findOne({
      key: idempKey,
      organization_id: orgId
    });

    if (existing) {
      res.setHeader('X-Idempotent-Replay', 'true');
      return res.status(existing.response_status).json(existing.response_body);
    }

    // Intercept res.json to capture response
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        IdempotencyRecord.create({
          key: idempKey,
          organization_id: orgId,
          application_id: req.user?.applicationId || '',
          endpoint: req.originalUrl,
          response_status: res.statusCode,
          response_body: body,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }).catch(() => {});
      }
      return originalJson(body);
    };

    next();
  } catch (err) {
    next();
  }
}

/**
 * Step 6: Usage Tracking & AI Metrics Logging
 */
function usageLogger(req, res, next) {
  res.on('finish', () => {
    try {
      const latency = Date.now() - (req._startTime || Date.now());
      const reqSize = parseInt(req.headers['content-length'] || '0', 10);
      const resSize = parseInt(res.getHeader('content-length') || '0', 10);

      ApiRequestLog.create({
        log_id: `log_${crypto.randomBytes(8).toString('hex')}`,
        application_id: req.user?.applicationId || '',
        organization_id: req.user?.organizationId || 'unassigned',
        credential_id: req.user?.credentialId || '',
        endpoint: req.originalUrl.split('?')[0],
        method: req.method,
        status_code: res.statusCode,
        latency_ms: latency,
        request_id: req.requestId || '',
        request_size: reqSize,
        response_size: resSize,
        is_sandbox: !!req.isSandbox,
        ai_metrics: req.aiMetrics || null,
        timestamp: new Date().toISOString()
      }).catch(() => {});
    } catch {}
  });

  next();
}

module.exports = {
  correlationIdMiddleware,
  authenticateDeveloper,
  requireScope,
  rateLimiter,
  idempotencyGuard,
  usageLogger,
  sendSuccess,
  sendCollection,
  sendError
};
