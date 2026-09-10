const express = require('express');
const router = express.Router();
const analyticsController = require('./analyticsController');
const { authenticateRiskUser, enforceRiskScope } = require('../../middleware/riskAuth');

router.use(authenticateRiskUser);
router.use(enforceRiskScope);

router.get('/overview', analyticsController.overview);
router.get('/severity', analyticsController.severity);
router.get('/categories', analyticsController.categories);
router.get('/trends', analyticsController.trends);
router.get('/heatmap', analyticsController.heatmap);

module.exports = router;
