const express = require('express');
const router = express.Router();
const controller = require('./controller');
const authenticateToken = require('../../middleware/authenticate');

router.use(authenticateToken);

router.get('/projects', controller.listProjects);
router.post('/purchase-request', controller.requestPurchase);
router.put('/transactions/:id/approve', controller.approveTransaction);

module.exports = router;
