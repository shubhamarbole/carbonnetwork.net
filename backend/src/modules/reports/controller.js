const AuditLog = require('../audit/model');

// In-memory reports compilation database
let reportsList = [
  { id: 'rep-1', name: 'Pune Plant Q1 Energy Efficiency Report', format: 'PDF', generatedAt: '2026-03-31', size: '1.4 MB', organizationId: '603dacf9e7e1a32948c26f01' },
  { id: 'rep-2', name: 'Standard Scope 2 Emissions Inventory 2025', format: 'CSV', generatedAt: '2026-04-02', size: '280 KB', organizationId: '603dacf9e7e1a32948c26f01' }
];

class ReportsController {
  async list(req, res, next) {
    try {
      // Standard tenants only see reports under their orgId
      const orgId = req.user.organizationId;
      const list = reportsList.filter(r => r.organizationId === orgId || req.user.roles.includes('SUPER_ADMIN'));
      res.json(list);
    } catch (err) {
      next(err);
    }
  }

  async generate(req, res, next) {
    try {
      const { name, format } = req.body;
      if (!name || !format) {
        return res.status(400).json({ error: 'Report name and format are required.' });
      }

      const newReport = {
        id: `rep-${Date.now()}`,
        name,
        format,
        generatedAt: new Date().toISOString().split('T')[0],
        size: '120 KB',
        organizationId: req.user.organizationId
      };

      reportsList.push(newReport);

      // Write Audit Log
      await AuditLog.create({
        actorId: req.user.userId,
        organizationId: req.user.organizationId,
        action: 'report.generate',
        resourceType: 'Report',
        resourceId: new mongoose.Types.ObjectId(), // mock report ID
        newValue: JSON.stringify(newReport),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.status(201).json(newReport);
    } catch (err) {
      next(err);
    }
  }
}

// Import mongoose to support Typecasting in mock ObjectId instantiation
const mongoose = require('mongoose');

module.exports = new ReportsController();
