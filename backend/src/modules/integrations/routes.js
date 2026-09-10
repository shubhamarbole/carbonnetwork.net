const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticateRiskUser, enforceRiskScope } = require('../../middleware/riskAuth');

router.use(authenticateRiskUser);
router.use(enforceRiskScope);

router.get('/', controller.listIntegrations);
router.post('/', controller.createIntegration);
router.get('/records', controller.listRecords);
router.get('/:id', controller.getIntegration);
router.patch('/:id', controller.updateIntegration);
router.delete('/:id', controller.deleteIntegration);
router.post('/:id/test', controller.testConnection);
router.post('/:id/sync', controller.syncIntegration);
router.get('/:id/jobs', controller.listJobs);

module.exports = router;
