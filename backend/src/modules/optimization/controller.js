const service = require('./service');

class OptimizationController {
  async runOptimization(req, res, next) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });

      // Enforce authorization: VIEWER cannot trigger optimization runs
      const role = (user.role || '').toUpperCase();
      if (role === 'VIEWER') {
        return res.status(403).json({ success: false, message: 'VIEWER role cannot run optimization' });
      }

      const run = await service.runOptimization(user, req.body);
      res.status(201).json({ success: true, data: run });
    } catch (err) {
      next(err);
    }
  }

  async simulateOptimization(req, res, next) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });

      const simResult = await service.simulateOptimization(user, req.body);
      res.json({ success: true, data: simResult });
    } catch (err) {
      next(err);
    }
  }

  async listRuns(req, res, next) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });

      const runs = await service.listRuns(user);
      res.json({ success: true, data: runs });
    } catch (err) {
      next(err);
    }
  }

  async getRun(req, res, next) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });

      const run = await service.getRun(user, req.params.id);
      res.json({ success: true, data: run });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async approveRun(req, res, next) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });

      const role = (user.role || '').toUpperCase();
      if (role === 'VIEWER') {
        return res.status(403).json({ success: false, message: 'VIEWER role cannot approve optimization runs' });
      }

      const notes = req.body?.notes || '';
      const run = await service.approveRun(user, req.params.id, notes);
      res.json({ success: true, data: run });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      next(err);
    }
  }

  async executeRun(req, res, next) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ success: false, message: 'Authentication required' });

      const role = (user.role || '').toUpperCase();
      if (role === 'VIEWER') {
        return res.status(403).json({ success: false, message: 'VIEWER role cannot execute optimization runs' });
      }

      const run = await service.executeRun(user, req.params.id);
      res.json({ success: true, data: run });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ success: false, message: err.message });
      }
      next(err);
    }
  }
}

module.exports = new OptimizationController();
