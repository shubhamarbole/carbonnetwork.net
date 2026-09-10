const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticateRiskUser, enforceRiskScope } = require('../../middleware/riskAuth');

// All AI Risk routes require authentication and tenant scoping
router.use(authenticateRiskUser);
router.use(enforceRiskScope);

// GET /api/ai-risk/analyses/:analysisId
router.get('/analyses/:analysisId', controller.getAnalysisById);

module.exports = router;
