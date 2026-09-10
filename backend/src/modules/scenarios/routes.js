const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticateRiskUser, enforceRiskScope } = require('../../middleware/riskAuth');

router.use(authenticateRiskUser);
router.use(enforceRiskScope);

router.get('/', controller.listScenarios);
router.post('/', controller.createScenario);
router.post('/compare', controller.compareScenarios);
router.get('/:id', controller.getScenario);
router.patch('/:id', controller.updateScenario);
router.delete('/:id', controller.deleteScenario);
router.post('/:id/run', controller.runScenario);
router.get('/:id/results', controller.getScenarioResults);

module.exports = router;
