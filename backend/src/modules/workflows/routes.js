/**
 * Workflows Routes
 * Phase 7: Alerts + Workflow Automation
 */

const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticateRiskUser, enforceRiskScope } = require('../../middleware/riskAuth');

// Definitions CRUD
router.get('/', authenticateRiskUser, enforceRiskScope, controller.listDefinitions);
router.post('/', authenticateRiskUser, enforceRiskScope, controller.createDefinition);

// Instances endpoints - Place specific sub-routes before `/:id`
router.get('/instances', authenticateRiskUser, enforceRiskScope, controller.listInstances);
router.get('/instances/:id', authenticateRiskUser, enforceRiskScope, controller.getInstanceById);
router.get('/instances/:id/steps', authenticateRiskUser, enforceRiskScope, controller.getStepsByInstanceId);
router.post('/instances/:id/approve', authenticateRiskUser, enforceRiskScope, controller.approveInstanceStep);
router.post('/instances/:id/reject', authenticateRiskUser, enforceRiskScope, controller.rejectInstanceStep);
router.post('/instances/:id/cancel', authenticateRiskUser, enforceRiskScope, controller.cancelInstance);
router.post('/instances/:id/retry', authenticateRiskUser, enforceRiskScope, controller.retryInstance);

router.post('/execute', authenticateRiskUser, enforceRiskScope, controller.executeWorkflow);

// Definition details by ID
router.get('/:id', authenticateRiskUser, enforceRiskScope, controller.getDefinitionById);
router.patch('/:id', authenticateRiskUser, enforceRiskScope, controller.updateDefinition);
router.delete('/:id', authenticateRiskUser, enforceRiskScope, controller.deleteDefinition);

module.exports = router;
