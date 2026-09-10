const express = require('express');
const controller = require('./controller');
const { authenticateRiskUser, enforceRiskScope } = require('../../middleware/riskAuth');

// Workspaces router
const workspacesRouter = express.Router();
workspacesRouter.use(authenticateRiskUser);
workspacesRouter.use(enforceRiskScope);
workspacesRouter.get('/', controller.listWorkspaces);
workspacesRouter.get('/:id', controller.getWorkspace);

// Comments standalone router (for PATCH / DELETE /api/comments/:id)
const commentsRouter = express.Router();
commentsRouter.use(authenticateRiskUser);
commentsRouter.use(enforceRiskScope);
commentsRouter.patch('/:id', controller.updateComment);
commentsRouter.delete('/:id', controller.deleteComment);

// Risk Graph router (/api/risk-graph)
const riskGraphRouter = express.Router();
riskGraphRouter.use(authenticateRiskUser);
riskGraphRouter.use(enforceRiskScope);
riskGraphRouter.get('/', controller.getRiskGraph);
riskGraphRouter.get('/:resourceType/:id', controller.getEntityImpact);

module.exports = {
  workspacesRouter,
  commentsRouter,
  riskGraphRouter,
  controller
};
