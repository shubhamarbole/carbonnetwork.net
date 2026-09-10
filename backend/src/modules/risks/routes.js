const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { 
  authenticateRiskUser, 
  enforceRiskScope, 
  authorizeRiskDelete, 
  authorizeRiskModify 
} = require('../../middleware/riskAuth');

// All risk routes require authentication and tenant/role scope enforcement
router.use(authenticateRiskUser);
router.use(enforceRiskScope);

// Metadata & Audit logs (mounted before /:id parameter to avoid matching conflicts)
router.get('/audit-logs', controller.getAuditLogs);
router.get('/audit/logs', controller.getAuditLogs);
router.get('/meta/assignable-users', controller.getAssignableUsers);
router.get('/meta/projects', controller.getProjects);
router.get('/meta/organizations', controller.getOrganizations);

// Core CRUD Endpoints
router.get('/', controller.list);
router.post('/', controller.create);
router.get('/:id', controller.getById);
router.patch('/:id', controller.update);
router.delete('/:id', authorizeRiskDelete, controller.delete);

// Status and Owner Management
router.patch('/:id/status', authorizeRiskModify, controller.updateStatus);
router.patch('/:id/owner', authorizeRiskModify, controller.updateOwner);

// Authoritative Score Recalculation & Score History (Phase 2)
router.post('/:id/score', authorizeRiskModify, controller.recalculateScore);
router.get('/:id/score-history', controller.getScoreHistory);

// LLM-Powered AI Risk Analysis (Phase 3)
router.post('/:id/analyze', authorizeRiskModify, controller.analyzeRisk);
router.get('/:id/ai-analyses', controller.getRiskAnalyses);

// Predictive Risk Intelligence (Phase 9)
const predictiveController = require('../predictive/controller');
router.post('/:id/predict', predictiveController.predictRisk);
router.get('/:id/predictions', predictiveController.getRiskPredictions);

// Enterprise Intelligence & Collaboration (Phase 16)
const collaboration = require('../collaboration/routes');
router.get('/:id/comments', collaboration.controller.listRiskComments);
router.post('/:id/comments', collaboration.controller.createRiskComment);
router.post('/:id/mentions', collaboration.controller.createMention);

module.exports = router;
