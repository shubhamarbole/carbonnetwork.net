/**
 * Command Center Routes (Phase 18)
 * Mounted at /api/command-center
 */

const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticateRiskUser, enforceRiskScope } = require('../../middleware/riskAuth');

router.use(authenticateRiskUser);
router.use(enforceRiskScope);

router.get('/overview', controller.getOverview);
router.get('/actions', controller.getActionQueue);
router.post('/actions/execute', controller.executeAction);
router.get('/activity', controller.getActivityFeed);
router.get('/search', controller.globalSearch);
router.get('/context/:resourceType/:id', controller.getResourceContext);
router.get('/health', controller.getHealth);
router.get('/stream', controller.streamUpdates);

module.exports = router;
