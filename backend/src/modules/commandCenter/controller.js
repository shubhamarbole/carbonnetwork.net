/**
 * Command Center Controller (Phase 18)
 * 
 * Handles HTTP endpoints and SSE streams for Unified Enterprise Command Center
 */

const service = require('./service');

class CommandCenterController {
  async getOverview(req, res, next) {
    try {
      const data = await service.getOverview(req.user, req.query);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getActionQueue(req, res, next) {
    try {
      const data = await service.getActionQueue(req.user, req.query);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async executeAction(req, res, next) {
    try {
      const result = await service.executeAction(req.user, req.body);
      res.json({ success: true, data: result });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async getActivityFeed(req, res, next) {
    try {
      const data = await service.getActivityFeed(req.user, req.query);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async globalSearch(req, res, next) {
    try {
      const data = await service.globalSearch(req.user, req.query);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getResourceContext(req, res, next) {
    try {
      const { resourceType, id } = req.params;
      const data = await service.getResourceContext(req.user, resourceType, id);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getHealth(req, res, next) {
    try {
      const data = await service.getPlatformHealth();
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  /**
   * SSE Stream for real-time updates without page reloads
   * GET /api/command-center/stream
   */
  async streamUpdates(req, res, next) {
    try {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      // Send initial connection packet
      res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

      // Heartbeat & periodic state broadcast
      const interval = setInterval(async () => {
        try {
          const overview = await service.getOverview(req.user, { limit: 5 });
          res.write(`data: ${JSON.stringify({ type: 'UPDATE', data: overview })}\n\n`);
        } catch (e) {
          res.write(`data: ${JSON.stringify({ type: 'PING', timestamp: new Date().toISOString() })}\n\n`);
        }
      }, 15000);

      req.on('close', () => {
        clearInterval(interval);
        res.end();
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CommandCenterController();
