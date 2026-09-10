const express = require('express');
const router = express.Router();
const controller = require('./controller');

const authenticateToken = require('../../middleware/authenticate');
const enforceTenantScope = require('../../middleware/tenantScope');

// Helper middleware to resolve permission code dynamically from moduleType
function authorizeModule(action) {
  return (req, res, next) => {
    // action: 'read', 'create', 'update', 'delete'
    const moduleType = req.body.moduleType || req.query.moduleType || (req.params.moduleType);
    
    // Bypass checks for system administrators
    if (req.user.roles.includes('SUPER_ADMIN') || req.user.roles.includes('PLATFORM_ADMIN')) {
      return next();
    }

    if (!moduleType) {
      // If listing globally, verify they have at least one environmental read permission
      const hasAnyRead = req.user.permissions.some(p => p.endsWith('.read'));
      if (hasAnyRead) {
        return next();
      }
      return res.status(403).json({ error: 'Forbidden: Missing ESG read permissions.' });
    }

    const requiredCode = `${moduleType.toLowerCase()}.${action}`;
    const hasPerm = req.user.permissions.includes(requiredCode);
    if (!hasPerm) {
      return res.status(403).json({ error: `Forbidden: Requires permission [${requiredCode}].` });
    }
    next();
  };
}

router.use(authenticateToken);
router.use(enforceTenantScope);

router.get('/', authorizeModule('read'), controller.list);
router.get('/:id', authorizeModule('read'), controller.retrieve);
router.post('/', authorizeModule('create'), controller.create);
router.put('/:id', authorizeModule('update'), controller.update);
router.delete('/:id', authorizeModule('delete'), controller.archive);

module.exports = router;
