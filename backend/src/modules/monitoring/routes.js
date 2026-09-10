/**
 * Proactive Monitoring Routes
 * Exposes endpoints for monitoring health, overview, events, rules CRUD, and AI investigations.
 * Phase 6: Proactive Monitoring & Event Detection
 */

const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticateRiskUser, enforceRiskScope } = require('../../middleware/riskAuth');

// Health & Overview
router.get('/health', authenticateRiskUser, controller.getHealth);
router.get('/overview', authenticateRiskUser, enforceRiskScope, controller.getOverview);

// Events
router.get('/events', authenticateRiskUser, enforceRiskScope, controller.listEvents);
router.get('/events/:id', authenticateRiskUser, enforceRiskScope, controller.getEventById);
router.post('/events/:id/investigate', authenticateRiskUser, enforceRiskScope, controller.investigateEvent);

// Rules CRUD
router.get('/rules', authenticateRiskUser, enforceRiskScope, controller.listRules);
router.post('/rules', authenticateRiskUser, enforceRiskScope, controller.createRule);
router.patch('/rules/:id', authenticateRiskUser, enforceRiskScope, controller.updateRule);
router.delete('/rules/:id', authenticateRiskUser, enforceRiskScope, controller.deleteRule);

// On-demand monitoring sweep
router.post('/sweep', authenticateRiskUser, enforceRiskScope, controller.runSweep);

// Alerts
router.get('/alerts', authenticateRiskUser, enforceRiskScope, controller.listAlerts);

module.exports = router;
