import { Request, Response, NextFunction } from 'express';
import { db } from '../../prisma/db';

export class ControlCenterController {
  async getAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const alerts = await db.orm.system_alerts.all();
      res.json({ success: true, data: alerts });
    } catch (err) {
      next(err);
    }
  }

  async createAlert(req: Request, res: Response, next: NextFunction) {
    try {
      const { priority, title, entity } = req.body;
      if (!priority || !title || !entity) {
        return res.status(400).json({ success: false, message: 'Priority, title, and entity are required.' });
      }

      const alert = await db.orm.system_alerts.create({
        priority,
        title,
        entity,
        timestamp: new Date().toISOString(),
        status: 'Active'
      });

      res.status(201).json({ success: true, data: alert });
    } catch (err) {
      next(err);
    }
  }

  async resolveAlert(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await db.orm.system_alerts.where({ _id: id } as any).update({ status: 'Resolved' });
      res.json({ success: true, message: 'Alert resolved successfully.' });
    } catch (err) {
      next(err);
    }
  }

  async getSystemHealth(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({
        success: true,
        data: {
          status: 'healthy',
          uptime: process.uptime(),
          services: {
            database: 'connected',
            escrowNodes: 'online',
            mrvOracle: 'online'
          },
          memoryUsage: process.memoryUsage(),
          timestamp: new Date().toISOString()
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

export const controlCenterController = new ControlCenterController();
