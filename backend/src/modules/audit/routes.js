const express = require('express');
const router = express.Router();
const controller = require('./controller');

const authenticateToken = require('../../middleware/authenticate');
const enforceTenantScope = require('../../middleware/tenantScope');
const authorizePermission = require('../../middleware/authorize');

router.use(authenticateToken);
router.use(enforceTenantScope);

router.get('/', authorizePermission('audit.read'), controller.list);

module.exports = router;
