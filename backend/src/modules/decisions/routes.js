/**
 * Advanced Decision Intelligence API Routes
 * Phase 13: Endpoints for Decisions CRUD, Options, Analysis, Comparison,
 * Recommendation, Approvals, Execution, and Outcome Tracking.
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticateRiskUser, enforceRiskScope } = require('../../middleware/riskAuth');

router.use(authenticateRiskUser);
router.use(enforceRiskScope);

// Decisions CRUD
router.get('/', controller.listDecisions.bind(controller));
router.post('/', controller.createDecision.bind(controller));
router.get('/:id', controller.getDecision.bind(controller));
router.patch('/:id', controller.updateDecision.bind(controller));
router.delete('/:id', controller.deleteDecision.bind(controller));

// Decision Options
router.get('/:id/options', controller.listOptions.bind(controller));
router.post('/:id/options', controller.createOption.bind(controller));

// Decision Intelligence Operations
router.post('/:id/analyze', controller.analyzeDecision.bind(controller));
router.post('/:id/compare', controller.compareDecision.bind(controller));
router.post('/:id/recommend', controller.recommendDecision.bind(controller));

// Governance & Execution
router.post('/:id/approve', controller.approveDecision.bind(controller));
router.post('/:id/reject', controller.rejectDecision.bind(controller));
router.post('/:id/execute', controller.executeDecision.bind(controller));

// Outcome Tracking & Quality
router.get('/:id/outcomes', controller.getOutcomes.bind(controller));
router.post('/:id/outcomes', controller.recordOutcome.bind(controller));

module.exports = router;
