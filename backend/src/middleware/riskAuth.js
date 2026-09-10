const jwt = require('jsonwebtoken');
const { User, Project, Organization } = require('../../models/models');

const JWT_SECRET = process.env.JWT_SECRET || 'environmental-esg-secret-key-98765';

/**
 * Authentication middleware: verifies bearer JWT token
 */
function authenticateRiskUser(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access Denied: Authentication token required.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ success: false, message: 'Access Denied: Token invalid or expired.' });
    }
    req.user = decoded;
    next();
  });
}

/**
 * Role-Based Access Control and Tenant Scoping for Risk operations
 */
async function enforceRiskScope(req, res, next) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }

    const role = user.role || 'VIEWER';
    const userOrgId = user.organizationId ? user.organizationId.toString() : null;

    // Reject all state-modifying requests from VIEWER
    if (role === 'VIEWER' && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Viewers have read-only access to Risk Manager records.'
      });
    }

    // Role-based scope building for read queries
    req.riskQuery = {};

    if (role === 'SUPER_ADMIN' || role === 'PLATFORM_ADMIN') {
      // Global authority: can optionally filter by requested organizationId or projectId
      if (req.query.organizationId) {
        req.riskQuery.organizationId = req.query.organizationId;
      }
      if (req.query.projectId) {
        req.riskQuery.projectId = req.query.projectId;
      }
    } else {
      // Tenant-restricted authority: strictly bind to user's organizationId
      if (!userOrgId) {
        return res.status(403).json({ success: false, message: 'Forbidden: User is not linked to any organization.' });
      }
      req.riskQuery.organizationId = userOrgId;

      if (req.query.projectId) {
        req.riskQuery.projectId = req.query.projectId;
      }

      // If PROJECT_MANAGER, ensure they only access project-relevant risks
      if (role === 'PROJECT_MANAGER' && user.projectId) {
        req.riskQuery.projectId = user.projectId;
      }
    }

    // Write enforcement: enforce tenant containment on creation
    if (req.method === 'POST') {
      if (role !== 'SUPER_ADMIN' && role !== 'PLATFORM_ADMIN') {
        // Never trust client-supplied organizationId
        req.body.organizationId = userOrgId;
      } else if (!req.body.organizationId) {
        req.body.organizationId = userOrgId || 'org-system-1';
      }

      req.body.createdBy = user.userId;
    }

    next();
  } catch (err) {
    console.error('Risk scope verification error:', err);
    res.status(500).json({ success: false, message: 'Security authorization check failed.' });
  }
}

/**
 * Specific permission check for deleting risks
 */
function authorizeRiskDelete(req, res, next) {
  const role = req.user?.role;
  const allowedRoles = ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ORGANIZATION_ADMIN', 'ADMIN'];
  
  if (!allowedRoles.includes(role)) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: You do not have permission to delete risks. Only Administrators may delete records.'
    });
  }
  next();
}

/**
 * Specific permission check for modifying risk owner or status
 */
function authorizeRiskModify(req, res, next) {
  const role = req.user?.role;
  if (role === 'VIEWER') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Viewers are not authorized to modify risk records.'
    });
  }
  next();
}

module.exports = {
  authenticateRiskUser,
  enforceRiskScope,
  authorizeRiskDelete,
  authorizeRiskModify
};
