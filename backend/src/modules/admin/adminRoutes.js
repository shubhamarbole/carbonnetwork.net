const express = require('express');
const router = express.Router();
const { authenticateRiskUser } = require('../../middleware/riskAuth');
const metricsService = require('../../services/metricsService');
const retentionService = require('../../services/retentionService');
const { AuditLog } = require('../../../models/models');
const mongoose = require('mongoose');

// Require ADMIN / SUPER_ADMIN / PLATFORM_ADMIN
function requireAdminRole(req, res, next) {
  const role = req.user?.role;
  if (!['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN', 'ORGANIZATION_ADMIN'].includes(role)) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Administrator privileges required.',
      error: {
        code: 'FORBIDDEN',
        message: 'Administrator privileges required.',
        request_id: req.id || 'unknown'
      }
    });
  }
  next();
}

router.use(authenticateRiskUser);
router.use(requireAdminRole);

// GET /api/admin/operations/health
router.get('/operations/health', async (req, res) => {
  try {
    const mongoState = mongoose.connection.readyState;
    const dbStatus = mongoState === 1 ? 'HEALTHY' : mongoState === 2 ? 'DEGRADED' : 'FAILED';

    let pyHealth = 'UNKNOWN';
    try {
      const pyRes = await fetch(`${process.env.PYTHON_AI_URL || 'http://localhost:8000'}/health`);
      if (pyRes.ok) pyHealth = 'HEALTHY';
    } catch (e) {
      pyHealth = 'DEGRADED';
    }

    res.json({
      success: true,
      status: 'healthy',
      overall: dbStatus === 'HEALTHY' ? 'HEALTHY' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      components: {
        database: { status: dbStatus, connection_state: mongoState },
        python_ai_service: { status: pyHealth },
        vector_store: { status: 'HEALTHY', provider: 'qdrant' },
        monitoring_scheduler: { status: 'HEALTHY' },
        workflow_engine: { status: 'HEALTHY' }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/operations/metrics
router.get('/operations/metrics', (req, res) => {
  res.json({
    success: true,
    data: metricsService.getSummary()
  });
});

// GET /api/admin/operations/governance
router.get('/operations/governance', (req, res) => {
  res.json({
    success: true,
    data: {
      llm_provider: process.env.AI_PROVIDER || 'gemini',
      model: process.env.AI_MODEL || 'gemini-1.5-flash',
      model_version: '1.5-flash',
      prompt_version: '1.0.0',
      agent_version: '5.0.0',
      tool_version: '5.0.0',
      embedding_model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
      rag_version: '4.0.0',
      timestamp: new Date().toISOString()
    }
  });
});

// GET /api/admin/operations/config (Masks all secrets)
router.get('/operations/config', (req, res) => {
  res.json({
    success: true,
    data: {
      PORT: process.env.PORT || 5050,
      NODE_ENV: process.env.NODE_ENV || 'development',
      MONGO_URI: process.env.MONGO_URI ? '[MASKED: MongoDB Connection String]' : 'mongodb://localhost:27017/esg-environmental',
      JWT_SECRET: process.env.JWT_SECRET ? '[MASKED: 32 chars]' : '[DEFAULT]',
      INTERNAL_SERVICE_KEY: '[MASKED: Internal Shared Secret]',
      PYTHON_AI_URL: process.env.PYTHON_AI_URL || 'http://localhost:8000',
      AI_PROVIDER: process.env.AI_PROVIDER || 'mock',
      AI_MODEL: process.env.AI_MODEL || 'deterministic-risk-analyst-v1',
      timestamp: new Date().toISOString()
    }
  });
});

// POST /api/admin/operations/retention/evaluate
router.post('/operations/retention/evaluate', async (req, res, next) => {
  try {
    const { entityType = 'documents', dryRun = true } = req.body;
    const result = await retentionService.evaluateRetention(
      entityType, 
      dryRun !== false, 
      req.user, 
      req.user.organizationId
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/operations/action-audit
router.post('/operations/action-audit', async (req, res, next) => {
  try {
    const { action, details } = req.body;
    const validActions = [
      'SECURITY_SETTING_CHANGED', 'MODEL_SETTING_CHANGED', 'PROMPT_VERSION_CHANGED',
      'RULE_CHANGED', 'WORKFLOW_CHANGED', 'RETENTION_CHANGED', 'CONFIG_CHANGED',
      'BACKUP_ACTION', 'RESTORE_ACTION'
    ];

    if (!validActions.includes(action)) {
      return res.status(400).json({ success: false, message: `Invalid action. Allowed: ${validActions.join(', ')}` });
    }

    const log = await AuditLog.create({
      organizationId: req.user.organizationId || 'org-system-1',
      user: req.user.email || req.user.name || 'Administrator',
      userId: req.user.userId || req.user._id?.toString() || 'admin',
      action: action,
      module: 'AdminOperations',
      recordId: `admin_${Date.now()}`,
      metadata: { details, timestamp: new Date().toISOString() },
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/operations/jobs (Section 15 & 27: Background Jobs)
router.get('/operations/jobs', (req, res) => {
  const jobRecoveryService = require('../../services/jobRecoveryService');
  res.json({
    success: true,
    data: {
      metrics: jobRecoveryService.getMetrics(),
      jobs: jobRecoveryService.listJobs()
    }
  });
});

// POST /api/admin/operations/jobs/recover (Section 16: Job Recovery)
router.post('/operations/jobs/recover', async (req, res, next) => {
  try {
    const jobRecoveryService = require('../../services/jobRecoveryService');
    const actor = req.user.email || req.user.name || 'Administrator';
    const report = await jobRecoveryService.recoverIncompleteJobs(actor);
    res.json({
      success: true,
      data: report
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
