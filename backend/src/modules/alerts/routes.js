/**
 * Alerts Routes
 * Phase 7: Alerts + Workflow Automation
 */

const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticateRiskUser, enforceRiskScope } = require('../../middleware/riskAuth');

router.get('/', authenticateRiskUser, enforceRiskScope, controller.listAlerts);
router.post('/', authenticateRiskUser, enforceRiskScope, controller.createAlert);
router.get('/:id', authenticateRiskUser, enforceRiskScope, controller.getAlertById);

router.post('/:id/acknowledge', authenticateRiskUser, enforceRiskScope, controller.acknowledgeAlert);
router.post('/:id/resolve', authenticateRiskUser, enforceRiskScope, controller.resolveAlert);
router.post('/:id/dismiss', authenticateRiskUser, enforceRiskScope, controller.dismissAlert);
router.patch('/:id/assign', authenticateRiskUser, enforceRiskScope, controller.assignAlert);

module.exports = router;
