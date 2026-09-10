const express = require('express');
const router = express.Router();
const controller = require('./controller');
const authenticateToken = require('../../middleware/authenticate');

router.use(authenticateToken);

router.get('/super-admin', controller.superAdmin);
router.get('/platform-admin', controller.platformAdmin);
router.get('/msme-user', controller.msme);
router.get('/enterprise-user', controller.enterprise);
router.get('/investor', controller.investor);
router.get('/credit-buyer', controller.creditBuyer);
router.get('/verifier', controller.verifier);
router.get('/assurance-auditor', controller.auditor);
router.get('/regulator', controller.regulator);
router.get('/carbon-registry', controller.registry);
router.get('/advisor', controller.advisor);
router.get('/industry-association', controller.association);
router.get('/technology-provider', controller.technologyProvider);
router.get('/insurer', controller.insurer);
router.get('/researcher', controller.researcher);

module.exports = router;
