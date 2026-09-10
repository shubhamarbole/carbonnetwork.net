const AuditLog = require('./model');

class AuditController {
  async list(req, res, next) {
    try {
      // Standard tenants only see audits of their own organizationId
      const logs = await AuditLog.find(req.tenantFilter)
        .populate('actorId', 'name email')
        .sort({ createdAt: -1 })
        .limit(100);
      res.json(logs);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuditController();
