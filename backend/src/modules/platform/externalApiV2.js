const express = require('express');
const apiKeyService = require('./apiKeyService');
const { Risk, Scenario, Decision } = require('../../../models/models');
const executiveService = require('../executive/service');
const optimizationService = require('../optimization/service');

const router = express.Router();

// Middleware to enforce API Key authentication and scope
const requireScope = (requiredScope) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers['x-api-key'] || req.headers['authorization'];
      if (!authHeader) {
        return res.status(401).json({ 
          success: false, 
          error: { code: 'UNAUTHORIZED', message: 'API key is required via X-API-Key or Bearer token' } 
        });
      }

      const keyRecord = await apiKeyService.verifyApiKey(authHeader, requiredScope);
      if (!keyRecord) {
        return res.status(401).json({ 
          success: false, 
          error: { code: 'INVALID_API_KEY', message: 'Invalid or revoked API key' } 
        });
      }

      req.apiKey = keyRecord;
      req.user = {
        organizationId: keyRecord.organizationId,
        role: 'API_DEVELOPER',
        name: keyRecord.name
      };
      next();
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, error: { code: 'FORBIDDEN', message: err.message } });
      }
      next(err);
    }
  };
};

// 1. GET /api/v2/risks
router.get('/risks', requireScope('risks:read'), async (req, res, next) => {
  try {
    const risks = await Risk.find({ organizationId: req.user.organizationId }).limit(50);
    res.json({ success: true, count: risks.length, data: risks });
  } catch (err) {
    next(err);
  }
});

// 2. POST /api/v2/risks
router.post('/risks', requireScope('risks:write'), async (req, res, next) => {
  try {
    const risk = await Risk.create({
      ...req.body,
      organizationId: req.user.organizationId,
      createdAt: new Date().toISOString()
    });
    res.status(201).json({ success: true, data: risk });
  } catch (err) {
    next(err);
  }
});

// 3. GET /api/v2/predictions/:riskId
router.get('/predictions/:riskId', requireScope('predictions:read'), async (req, res, next) => {
  try {
    const { PredictionHistory } = require('../../../models/models');
    const preds = await PredictionHistory.find({
      risk_id: req.params.riskId,
      organizationId: req.user.organizationId
    }).sort({ prediction_timestamp: -1 }).limit(10);
    res.json({ success: true, count: preds.length, data: preds });
  } catch (err) {
    next(err);
  }
});

// 4. GET /api/v2/scenarios
router.get('/scenarios', requireScope('scenarios:read'), async (req, res, next) => {
  try {
    const scenarios = await Scenario.find({ organizationId: req.user.organizationId });
    res.json({ success: true, count: scenarios.length, data: scenarios });
  } catch (err) {
    next(err);
  }
});

// 5. GET /api/v2/decisions
router.get('/decisions', requireScope('decisions:read'), async (req, res, next) => {
  try {
    const decisions = await Decision.find({ organizationId: req.user.organizationId }).limit(20);
    res.json({ success: true, count: decisions.length, data: decisions });
  } catch (err) {
    next(err);
  }
});

// 6. POST /api/v2/optimization/run
router.post('/optimization/run', requireScope('optimization:run'), async (req, res, next) => {
  try {
    const optRun = await optimizationService.runOptimization(req.user, req.body);
    res.status(201).json({ success: true, data: optRun });
  } catch (err) {
    next(err);
  }
});

// 7. GET /api/v2/executive/summary
router.get('/executive/summary', requireScope('executive:read'), async (req, res, next) => {
  try {
    const summary = await executiveService.getOverview(req.user.organizationId);
    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
});

// 8. GET /api/v2/graph
router.get('/graph', requireScope('risks:read'), async (req, res, next) => {
  try {
    const graphService = require('../collaboration/graphService');
    const graph = await graphService.buildTenantGraph(req.user);
    res.json({ success: true, data: graph });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
