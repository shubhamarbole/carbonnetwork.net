/**
 * AI Agent Routes
 * Exposes public API for agent runs, steps, and approvals,
 * along with the internal tool execution bridge.
 * Phase 5: AI Agent + Tool Calling
 */

const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticateRiskUser, enforceRiskScope } = require('../../middleware/riskAuth');

// Simple sliding window rate limiter for agent run submissions
const rateLimitMap = new Map();
const MAX_RUNS_PER_MINUTE = 30;

function agentRateLimiter(req, res, next) {
  const identifier = req.user?.organizationId || req.ip || 'anonymous';
  const now = Date.now();
  const windowStart = now - 60000;

  let timestamps = rateLimitMap.get(identifier) || [];
  timestamps = timestamps.filter(t => t > windowStart);

  if (timestamps.length >= MAX_RUNS_PER_MINUTE) {
    return res.status(429).json({
      success: false,
      message: 'Rate limit exceeded: Too many agent requests. Please wait a minute before retrying.'
    });
  }

  timestamps.push(now);
  rateLimitMap.set(identifier, timestamps);
  next();
}

// Public authenticated agent routes
router.post('/run', authenticateRiskUser, enforceRiskScope, agentRateLimiter, controller.runAgent);
router.get('/runs', authenticateRiskUser, enforceRiskScope, controller.listAgentRuns);
router.get('/runs/:id', authenticateRiskUser, enforceRiskScope, controller.getAgentRunById);
router.get('/runs/:id/steps', authenticateRiskUser, enforceRiskScope, controller.getAgentRunSteps);
router.post('/approvals/:id/approve', authenticateRiskUser, enforceRiskScope, controller.approveAction);
router.post('/approvals/:id/reject', authenticateRiskUser, enforceRiskScope, controller.rejectAction);

module.exports = {
  agentRouter: router,
  executeInternalTool: controller.executeInternalTool
};
