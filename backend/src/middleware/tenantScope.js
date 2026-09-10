const mongoose = require('mongoose');
const User = require('../modules/users/model');

async function enforceTenantScope(req, res, next) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Unauthenticated.' });
    }

    const { roles, organizationId, userId } = user;

    // 1. Bypass tenant scope checks for SaaS system global roles
    if (roles.includes('SUPER_ADMIN') || roles.includes('PLATFORM_ADMIN')) {
      req.tenantFilter = {}; // Global access
      
      // If a global admin passes organizationId query param, apply it
      if (req.query.organizationId) {
        req.tenantFilter.organizationId = req.query.organizationId;
      }
      if (req.query.facilityId) {
        req.tenantFilter.facilityId = req.query.facilityId;
      }
      return next();
    }

    // 2. Strict tenant organization containment for standard users
    req.tenantFilter = {
      organizationId: organizationId
    };

    // 3. Resolve user facility scopes from the db User record to get latest state
    const dbUser = await User.findById(userId);
    if (!dbUser) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    if (dbUser.facilitiesScope && dbUser.facilitiesScope.length > 0) {
      const allowedFacilities = dbUser.facilitiesScope.map(id => id.toString());
      req.tenantFilter.facilityId = { $in: allowedFacilities };

      // If client requests a specific facility, verify it fits in scope
      if (req.query.facilityId || req.body.facilityId) {
        const reqFacility = req.query.facilityId || req.body.facilityId;
        if (!allowedFacilities.includes(reqFacility)) {
          return res.status(403).json({
            error: 'Forbidden: Request is outside of your assigned facility scope.'
          });
        }
      }
    } else {
      // User has access to all organization facilities. If they pass a specific one, enforce it belongs to the tenant
      if (req.query.facilityId) {
        req.tenantFilter.facilityId = req.query.facilityId;
      }
    }

    // 4. Force inject tenant identifiers on write actions (POST/PUT)
    if (req.method === 'POST' || req.method === 'PUT') {
      req.body.organizationId = organizationId;
    }

    next();
  } catch (err) {
    res.status(500).json({ error: 'Tenant scope verification failure.' });
  }
}

module.exports = enforceTenantScope;
