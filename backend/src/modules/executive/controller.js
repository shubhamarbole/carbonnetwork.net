/**
 * Executive Risk Controller
 * Phase 11: HTTP handlers for Executive Risk Intelligence endpoints.
 * Provides RBAC, Audit Logging, and Tenant Isolation.
 */
const executiveService = require('./service');
const { AuditLog } = require('../../../models/models');

class ExecutiveController {
  async getOverview(req, res) {
    try {
      const organizationId = req.user.organizationId;
      const projectId = req.query.projectId || null;

      const overview = await executiveService.getExecutiveOverview({ organizationId, projectId });

      // Audit logging
      await AuditLog.create({
        organizationId,
        userId: req.user._id || req.user.id || 'system',
        action: 'EXECUTIVE_OVERVIEW_VIEWED',
        details: {
          executiveIndex: overview.executiveRiskIndex.index,
          severity: overview.executiveRiskIndex.severity,
          decisionsRequired: overview.decisionCenter.totalDecisions
        },
        timestamp: new Date().toISOString()
      }).catch(() => {});

      return res.status(200).json({ success: true, data: overview });
    } catch (err) {
      return res.status(500).json({ success: false, message: `Overview retrieval error: ${err.message}` });
    }
  }

  async getTopRisks(req, res) {
    try {
      const organizationId = req.user.organizationId;
      const projectId = req.query.projectId || null;
      const limit = req.query.limit || 10;

      const topRisks = await executiveService.getTopRisks({ organizationId, projectId, limit });
      return res.status(200).json({ success: true, count: topRisks.length, data: topRisks });
    } catch (err) {
      return res.status(500).json({ success: false, message: `Top risks retrieval error: ${err.message}` });
    }
  }

  async getEmergingRisks(req, res) {
    try {
      const organizationId = req.user.organizationId;
      const projectId = req.query.projectId || null;
      const limit = req.query.limit || 10;

      const emergingRisks = await executiveService.getEmergingRisks({ organizationId, projectId, limit });
      return res.status(200).json({ success: true, count: emergingRisks.length, data: emergingRisks });
    } catch (err) {
      return res.status(500).json({ success: false, message: `Emerging risks retrieval error: ${err.message}` });
    }
  }

  async getDecisions(req, res) {
    try {
      const organizationId = req.user.organizationId;
      const projectId = req.query.projectId || null;

      const overview = await executiveService.getExecutiveOverview({ organizationId, projectId });

      await AuditLog.create({
        organizationId,
        userId: req.user._id || req.user.id || 'system',
        action: 'EXECUTIVE_DECISION_VIEWED',
        details: { count: overview.decisionCenter.totalDecisions },
        timestamp: new Date().toISOString()
      }).catch(() => {});

      return res.status(200).json({
        success: true,
        count: overview.decisionCenter.totalDecisions,
        data: overview.decisionCenter.items
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: `Decisions retrieval error: ${err.message}` });
    }
  }

  async getTrends(req, res) {
    try {
      const organizationId = req.user.organizationId;
      const projectId = req.query.projectId || null;
      const limit = req.query.limit || 30;

      const trends = await executiveService.getTrendHistory({ organizationId, projectId, limit });
      return res.status(200).json({ success: true, count: trends.length, data: trends });
    } catch (err) {
      return res.status(500).json({ success: false, message: `Trends retrieval error: ${err.message}` });
    }
  }

  async generateBriefing(req, res) {
    try {
      const organizationId = req.user.organizationId;
      const projectId = req.body.projectId || req.query.projectId || null;
      const createdBy = req.user.email || req.user.name || 'Executive AI Assistant';

      const briefing = await executiveService.generateBriefing({ organizationId, projectId, createdBy });

      await AuditLog.create({
        organizationId,
        userId: req.user._id || req.user.id || 'system',
        action: 'EXECUTIVE_BRIEFING_CREATED',
        details: {
          briefingId: briefing.briefingId,
          executiveIndex: briefing.executiveIndex,
          severity: briefing.executiveSeverity
        },
        timestamp: new Date().toISOString()
      }).catch(() => {});

      return res.status(201).json({ success: true, data: briefing });
    } catch (err) {
      return res.status(500).json({ success: false, message: `Briefing generation error: ${err.message}` });
    }
  }

  async getBriefings(req, res) {
    try {
      const organizationId = req.user.organizationId;
      const projectId = req.query.projectId || null;
      const limit = req.query.limit || 20;

      const briefings = await executiveService.getBriefings({ organizationId, projectId, limit });
      return res.status(200).json({ success: true, count: briefings.length, data: briefings });
    } catch (err) {
      return res.status(500).json({ success: false, message: `Briefings list error: ${err.message}` });
    }
  }

  async getBriefingById(req, res) {
    try {
      const organizationId = req.user.organizationId;
      const { id } = req.params;

      const briefing = await executiveService.getBriefingById({ organizationId, briefingId: id });
      if (!briefing) {
        return res.status(404).json({ success: false, message: 'Executive briefing not found.' });
      }
      return res.status(200).json({ success: true, data: briefing });
    } catch (err) {
      return res.status(500).json({ success: false, message: `Briefing fetch error: ${err.message}` });
    }
  }

  async exportReport(req, res) {
    try {
      const organizationId = req.user.organizationId;
      const projectId = req.query.projectId || null;
      const format = req.query.format || 'json';

      const report = await executiveService.exportReport({ organizationId, projectId, format });

      await AuditLog.create({
        organizationId,
        userId: req.user._id || req.user.id || 'system',
        action: 'EXECUTIVE_EXPORT_CREATED',
        details: { format },
        timestamp: new Date().toISOString()
      }).catch(() => {});

      if (format.toLowerCase() === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="executive_risk_report_${organizationId}.csv"`);
        return res.status(200).send(report);
      }

      return res.status(200).json({ success: true, data: report });
    } catch (err) {
      return res.status(500).json({ success: false, message: `Export error: ${err.message}` });
    }
  }
}

module.exports = new ExecutiveController();
