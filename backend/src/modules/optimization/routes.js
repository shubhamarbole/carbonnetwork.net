const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticateRiskUser, enforceRiskScope } = require('../../middleware/riskAuth');

router.use(authenticateRiskUser);
router.use(enforceRiskScope);

router.post('/run', controller.runOptimization);
router.post('/simulate', controller.simulateOptimization);
router.get('/runs', controller.listRuns);
router.get('/runs/:id', controller.getRun);
router.post('/runs/:id/approve', controller.approveRun);
router.post('/runs/:id/execute', controller.executeRun);

module.exports = router;
