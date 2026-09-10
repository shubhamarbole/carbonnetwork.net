/**
 * Executive Risk API Routes
 * Phase 11: Endpoints for Executive Risk Center, Decisions, Briefings, and Exports.
 * Protected by RBAC and Tenant Isolation.
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticateRiskUser, enforceRiskScope } = require('../../middleware/riskAuth');

router.use(authenticateRiskUser);
router.use(enforceRiskScope);

// Core Executive Dashboard Endpoints
router.get('/overview', controller.getOverview);
router.get('/top-risks', controller.getTopRisks);
router.get('/emerging-risks', controller.getEmergingRisks);
router.get('/decisions', controller.getDecisions);
router.get('/trends', controller.getTrends);

// AI Executive Briefings
router.post('/briefing', controller.generateBriefing);
router.get('/briefings', controller.getBriefings);
router.get('/briefings/:id', controller.getBriefingById);

// Executive Export
router.get('/export', controller.exportReport);

module.exports = router;
