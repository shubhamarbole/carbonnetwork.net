const express = require('express');
const router = express.Router();
const controller = require('./controller');

const authenticateToken = require('../../middleware/authenticate');
const authorizePermission = require('../../middleware/authorize');
const enforceTenantScope = require('../../middleware/tenantScope');

router.use(authenticateToken);
router.use(enforceTenantScope);

router.get('/queue', authorizePermission('verification.read'), controller.listQueue);
router.put('/:id/assign', authorizePermission('verification.assign'), controller.assignVerifier);
router.put('/:id/transition', authorizePermission('verification.review'), controller.transitionStatus);

module.exports = router;
