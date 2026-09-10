import { Response, NextFunction } from 'express';
import { db } from '../../prisma/db';

export class ApprovalsController {
  async listRequests(req: any, res: Response, next: NextFunction) {
    try {
      const requests = await db.orm.approval_requests.all();
      res.json({ success: true, data: requests });
    } catch (err) {
      next(err);
    }
  }

  async resolveRequest(req: any, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, comments } = req.body; // APPROVED, REJECTED, CHANGES_REQUESTED

      if (!status) {
        return res.status(400).json({ success: false, message: 'Status is required.' });
      }

      // Find approval request
      const request = await db.orm.approval_requests.where({ _id: id } as any).first();
      if (!request) {
        return res.status(404).json({ success: false, message: 'Approval request not found.' });
      }

      const previousStatus = request.status;
      
      // Update request state
      await db.orm.approval_requests.where({ _id: id } as any).update({
        status,
        comments: comments || request.comments
      });

      // Apply side-effects depending on request types
      if (status === 'APPROVED') {
        if (request.type === 'ORGANIZATION') {
          await db.orm.organizations.where({ _id: request.referenceId } as any).update({
            status: 'ACTIVE'
          });
        } else if (request.type === 'PROJECT') {
          await db.orm.projects.where({ _id: request.referenceId } as any).update({
            status: 'APPROVED'
          });
        } else if (request.type === 'CREDIT_ISSUANCE') {
          await db.orm.credit_batches.where({ _id: request.referenceId } as any).update({
            status: 'ISSUED'
          });
        } else if (request.type === 'TRANSACTION') {
          const tx = await db.orm.transactions.where({ _id: request.referenceId } as any).first();
          if (tx) {
            await db.orm.transactions.where({ _id: request.referenceId } as any).update({
              status: 'COMPLETED'
            });
            // Update credit batch balances
            const batch = await db.orm.credit_batches.where({ _id: tx.creditBatchId } as any).first();
            if (batch) {
              const newAvailable = Math.max(0, batch.creditsAvailable - tx.quantity);
              await db.orm.credit_batches.where({ _id: tx.creditBatchId } as any).update({
                creditsAvailable: newAvailable
              });
            }
          }
        }
      } else if (status === 'REJECTED') {
        if (request.type === 'ORGANIZATION') {
          await db.orm.organizations.where({ _id: request.referenceId } as any).update({
            status: 'SUSPENDED'
          });
        } else if (request.type === 'PROJECT') {
          await db.orm.projects.where({ _id: request.referenceId } as any).update({
            status: 'REJECTED'
          });
        } else if (request.type === 'TRANSACTION') {
          await db.orm.transactions.where({ _id: request.referenceId } as any).update({
            status: 'REJECTED'
          });
        }
      }

      // Log append-only audit trail
      const actor = await db.orm.users.where({ _id: req.user.userId } as any).first();
      await db.orm.audit_logs.create({
        timestamp: new Date().toISOString(),
        actorId: req.user.userId,
        action: `RESOLVE_${request.type}`,
        module: 'REGISTRY_APPROVALS',
        entityType: request.type,
        entityId: request.referenceId,
        organizationId: actor ? actor.organizationId.toString() : 'system',
        ipAddress: req.ip || '127.0.0.1',
        status: 'SUCCESS',
        previousValue: previousStatus,
        newValue: status
      });

      res.json({
        success: true,
        message: `Request status updated to ${status} successfully.`,
        data: { id, status }
      });
    } catch (err) {
      next(err);
    }
  }
}

export const approvalsController = new ApprovalsController();
