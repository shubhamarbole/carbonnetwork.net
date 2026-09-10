/**
 * Decision Intelligence Express Controller
 * Phase 13: Request handling, validation, tenant scoping, and RBAC enforcement.
 */
const decisionsService = require('./service');

class DecisionsController {
  async listDecisions(req, res) {
    try {
      const orgId = req.user.organizationId;
      const decisions = await decisionsService.listDecisions(orgId, req.query);
      return res.status(200).json({ success: true, data: decisions });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getDecision(req, res) {
    try {
      const orgId = req.user.organizationId;
      const decision = await decisionsService.getDecision(orgId, req.params.id);
      if (!decision) {
        return res.status(404).json({ success: false, message: 'Decision not found.' });
      }
      return res.status(200).json({ success: true, data: decision });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async createDecision(req, res) {
    try {
      const orgId = req.user.organizationId;
      const { title, description, objective, constraints, riskId, projectId, options, weightConfiguration } = req.body;

      if (!title) {
        return res.status(400).json({ success: false, message: 'Title is required for a decision.' });
      }

      const decision = await decisionsService.createDecision(
        orgId,
        req.user.userId || req.user._id,
        req.user.email,
        { title, description, objective, constraints, riskId, projectId, options, weightConfiguration }
      );

      return res.status(201).json({ success: true, data: decision });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async updateDecision(req, res) {
    try {
      const orgId = req.user.organizationId;
      const updated = await decisionsService.updateDecision(
        orgId,
        req.params.id,
        req.body,
        req.user.email,
        req.user.userId || req.user._id
      );
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Decision not found.' });
      }
      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async deleteDecision(req, res) {
    try {
      const orgId = req.user.organizationId;
      const deleted = await decisionsService.deleteDecision(
        orgId,
        req.params.id,
        req.user.email,
        req.user.userId || req.user._id
      );
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Decision not found.' });
      }
      return res.status(200).json({ success: true, message: 'Decision deleted successfully.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async createOption(req, res) {
    try {
      const orgId = req.user.organizationId;
      const decision = await decisionsService.getDecision(orgId, req.params.id);
      if (!decision) {
        return res.status(404).json({ success: false, message: 'Decision not found.' });
      }

      const option = await decisionsService.createOption(orgId, req.params.id, req.body);
      return res.status(201).json({ success: true, data: option });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async listOptions(req, res) {
    try {
      const orgId = req.user.organizationId;
      const options = await decisionsService.listOptions(orgId, req.params.id);
      return res.status(200).json({ success: true, data: options });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async analyzeDecision(req, res) {
    try {
      const orgId = req.user.organizationId;
      const result = await decisionsService.analyzeDecision(
        orgId,
        req.params.id,
        req.user.email,
        req.user.userId || req.user._id
      );
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async compareDecision(req, res) {
    try {
      const orgId = req.user.organizationId;
      const comparison = await decisionsService.compareDecision(orgId, req.params.id);
      return res.status(200).json({ success: true, data: comparison });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async recommendDecision(req, res) {
    try {
      const orgId = req.user.organizationId;
      const result = await decisionsService.recommendDecision(
        orgId,
        req.params.id,
        req.user.email,
        req.user.userId || req.user._id
      );
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async approveDecision(req, res) {
    try {
      if (req.user.role === 'VIEWER') {
        return res.status(403).json({ success: false, message: 'VIEWER role cannot approve decisions.' });
      }
      const orgId = req.user.organizationId;
      const result = await decisionsService.approveDecision(
        orgId,
        req.params.id,
        req.user.email,
        req.user.userId || req.user._id,
        req.body?.notes
      );
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async rejectDecision(req, res) {
    try {
      if (req.user.role === 'VIEWER') {
        return res.status(403).json({ success: false, message: 'VIEWER role cannot reject decisions.' });
      }
      const orgId = req.user.organizationId;
      const result = await decisionsService.rejectDecision(
        orgId,
        req.params.id,
        req.user.email,
        req.user.userId || req.user._id,
        req.body?.reason
      );
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async executeDecision(req, res) {
    try {
      if (req.user.role === 'VIEWER') {
        return res.status(403).json({ success: false, message: 'VIEWER role cannot execute decisions.' });
      }
      const orgId = req.user.organizationId;
      const result = await decisionsService.executeDecision(
        orgId,
        req.params.id,
        req.user.email,
        req.user.userId || req.user._id
      );
      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async recordOutcome(req, res) {
    try {
      if (req.user.role === 'VIEWER') {
        return res.status(403).json({ success: false, message: 'VIEWER role cannot record outcomes.' });
      }
      const orgId = req.user.organizationId;
      const result = await decisionsService.recordOutcome(
        orgId,
        req.params.id,
        req.body,
        req.user.email,
        req.user.userId || req.user._id
      );
      return res.status(201).json({ success: true, data: result });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getOutcomes(req, res) {
    try {
      const orgId = req.user.organizationId;
      const outcomes = await decisionsService.getOutcomes(orgId, req.params.id);
      return res.status(200).json({ success: true, data: outcomes });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new DecisionsController();
