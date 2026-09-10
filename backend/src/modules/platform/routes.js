const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticateRiskUser, enforceRiskScope } = require('../../middleware/riskAuth');

router.use(authenticateRiskUser);
router.use(enforceRiskScope);

// Industry Templates
router.get('/templates', controller.listTemplates);
router.get('/templates/:industry', controller.getTemplate);
router.post('/templates/:industry/apply', controller.applyTemplate);

// API Keys
router.get('/api-keys', controller.listApiKeys);
router.post('/api-keys', controller.createApiKey);
router.delete('/api-keys/:id', controller.revokeApiKey);

// Platform Usage & Cost Accounting
router.get('/usage', controller.getUsageAndCosts);

// Platform Operations Control Center
router.get('/operations', controller.getPlatformOperations);

// Tool Registry
router.get('/tools', controller.listTools);
router.patch('/tools/:name', controller.toggleTool);

// AI Model Gateway
router.post('/gateway/route', controller.routeGateway);
router.get('/gateway/status', controller.getGatewayStatus);

module.exports = router;
