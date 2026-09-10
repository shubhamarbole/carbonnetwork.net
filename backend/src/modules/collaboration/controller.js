const commentService = require('./commentService');
const graphService = require('./graphService');
const { WorkspaceItem, Risk } = require('../../../models/models');

class CollaborationController {
  // Comments
  async listRiskComments(req, res, next) {
    try {
      const comments = await commentService.listComments(req.user, req.params.id);
      res.json({ success: true, data: comments });
    } catch (err) {
      if (err.status) return res.status(err.status).json({ success: false, message: err.message });
      next(err);
    }
  }

  async createRiskComment(req, res, next) {
    try {
      const comment = await commentService.createComment(req.user, req.params.id, req.body);
      res.status(201).json({ success: true, data: comment });
    } catch (err) {
      if (err.status) return res.status(err.status).json({ success: false, message: err.message });
      next(err);
    }
  }

  async updateComment(req, res, next) {
    try {
      const comment = await commentService.updateComment(req.user, req.params.id, req.body);
      res.json({ success: true, data: comment });
    } catch (err) {
      if (err.status) return res.status(err.status).json({ success: false, message: err.message });
      next(err);
    }
  }

  async deleteComment(req, res, next) {
    try {
      const result = await commentService.deleteComment(req.user, req.params.id);
      res.json({ success: true, data: result });
    } catch (err) {
      if (err.status) return res.status(err.status).json({ success: false, message: err.message });
      next(err);
    }
  }

  async createMention(req, res, next) {
    try {
      const { user: targetUser, message = '' } = req.body;
      const content = `@${targetUser} ${message}`.trim();
      const comment = await commentService.createComment(req.user, req.params.id, { content });
      res.status(201).json({ success: true, data: comment });
    } catch (err) {
      if (err.status) return res.status(err.status).json({ success: false, message: err.message });
      next(err);
    }
  }

  // Workspaces
  async listWorkspaces(req, res, next) {
    try {
      let workspaces = await WorkspaceItem.find({ organizationId: req.user.organizationId });
      if (workspaces.length === 0) {
        // Create default workspace for tenant if none exists
        const defaultWs = await WorkspaceItem.create({
          workspaceId: `ws_default_${req.user.organizationId.slice(0, 6)}`,
          organizationId: req.user.organizationId,
          name: 'Primary Enterprise Risk & Sustainability Workspace',
          description: 'Collaborative team workspace for cross-domain risk management, ESG oversight, and mitigation execution.',
          members: [req.user.email],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        workspaces = [defaultWs];
      }
      res.json({ success: true, data: workspaces });
    } catch (err) {
      next(err);
    }
  }

  async getWorkspace(req, res, next) {
    try {
      const ws = await WorkspaceItem.findOne({ 
        workspaceId: req.params.id, 
        organizationId: req.user.organizationId 
      });
      if (!ws) {
        return res.status(404).json({ success: false, message: `Workspace ${req.params.id} not found` });
      }
      res.json({ success: true, data: ws });
    } catch (err) {
      next(err);
    }
  }

  // Risk Graph
  async getRiskGraph(req, res, next) {
    try {
      const graph = await graphService.buildTenantGraph(req.user, req.query);
      res.json({ success: true, data: graph });
    } catch (err) {
      next(err);
    }
  }

  async getEntityImpact(req, res, next) {
    try {
      const { resourceType, id } = req.params;
      const impact = await graphService.traverseEntityImpact(req.user, resourceType, id);
      res.json({ success: true, data: impact });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CollaborationController();
