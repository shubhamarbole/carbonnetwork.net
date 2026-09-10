const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticateRiskUser, enforceRiskScope } = require('../../middleware/riskAuth');

// All predictive routes require authentication and tenant scoping
router.use(authenticateRiskUser);
router.use(enforceRiskScope);

// Predictive Analytics & Overview Endpoints
router.get('/overview', controller.getOverview);
router.get('/emerging-risks', controller.getEmergingRisks);
router.get('/trends', controller.getTrends);
router.get('/models', controller.getModelInfo);

// Batch & Feedback Operations
router.post('/batch', controller.batchPredict);
router.post('/feedback/:predictionId', controller.submitFeedback);

// Direct Prediction by Risk ID
router.post('/predict/:id', controller.predictRisk);
router.get('/predictions/:id', controller.getRiskPredictions);

module.exports = router;
