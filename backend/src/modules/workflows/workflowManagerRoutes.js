/**
 * Workflow Manager Dashboard Routes
 * Phase 7: Alerts + Workflow Automation
 */

const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticateRiskUser, enforceRiskScope } = require('../../middleware/riskAuth');

router.get('/overview', authenticateRiskUser, enforceRiskScope, controller.getWorkflowOverview);

module.exports = router;
