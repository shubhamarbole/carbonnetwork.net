import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../../prisma/db';
import { authenticateToken } from '../../common/middleware/auth';

const router = Router();

// Platform Admin Auth gate (backward compatible check)
function authorizePlatformOrSuperAdmin(req: any, res: Response, next: NextFunction) {
  if (!req.user || (req.user.role !== 'PLATFORM_ADMIN' && req.user.role !== 'SUPER_ADMIN')) {
    return res.status(403).json({ error: 'Access Denied: Platform Admin role required.' });
  }
  next();
}

router.use(authenticateToken as any);
router.use(authorizePlatformOrSuperAdmin as any);

// 1. Dashboard summary stats
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgs = await db.orm.organizations.all();
    const users = await db.orm.users.all();
    const approvals = await db.orm.approval_requests.all();
    const alerts = await db.orm.system_alerts.all();
    const activity = await db.orm.audit_logs.all();

    res.json({
      totalOrganizations: orgs.length,
      totalUsers: users.length,
      approvalsPending: approvals.filter(a => a.status === 'PENDING').length,
      verificationQueueSize: approvals.filter(a => a.type === 'VERIFICATION' && a.status === 'PENDING').length,
      alerts: {
        critical: alerts.filter(a => a.priority === 'CRITICAL' && a.status === 'Active').length,
        warning: alerts.filter(a => a.priority === 'HIGH' && a.status === 'Active').length
      },
      recentActivity: activity.slice(0, 10).map(l => ({
        timestamp: l.timestamp,
        user: l.actorId.toString(),
        action: l.action,
        module: l.module
      }))
    });
  } catch (err) { next(err); }
});

// 2. Organizations roster & 360° View
router.get('/organizations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orgs = await db.orm.organizations.all();
    res.json(orgs.map(o => ({
      _id: o._id.toString(),
      name: o.name,
      createdAt: o.createdAt,
      facilitiesCount: 0,
      locations: []
    })));
  } catch (err) { next(err); }
});

router.post('/organizations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Organization name is required' });
    const dateStr = new Date().toISOString();
    const newOrg = await db.orm.organizations.create({
      name,
      type: 'ENTERPRISE',
      status: 'PENDING',
      subscriptionPlan: 'FREE',
      createdAt: dateStr,
      updatedAt: dateStr
    });
    res.status(201).json(newOrg);
  } catch (err) { next(err); }
});

router.get('/organizations/:id/360', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const org = await db.orm.organizations.where({ id } as any).first();
    if (!org) return res.status(404).json({ error: 'Organization not found' });

    const users = await db.orm.users.all();
    const orgUsers = users.filter(u => u.organizationId.toString() === id);

    const projects = await db.orm.projects.all();
    const orgProjects = projects.filter(p => p.organizationId.toString() === id);

    const approvals = await db.orm.approval_requests.all();
    const orgApprovals = approvals.filter(a => a.organization === org.name);

    res.json({
      organization: org,
      users: orgUsers,
      projects: orgProjects,
      approvals: orgApprovals,
      metrics: {
        totalEmissions: 1450,
        creditsGenerated: 4200,
        complianceScore: '92%'
      }
    });
  } catch (err) { next(err); }
});

// 3. Users management
router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await db.orm.users.all();
    res.json(users.map(u => ({
      _id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.status === 'ACTIVE' ? 'SUPER_ADMIN' : 'USER',
      organizationId: u.organizationId.toString()
    })));
  } catch (err) { next(err); }
});

router.post('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role, organizationId } = req.body;
    const dateStr = new Date().toISOString();
    const passwordHash = await bcrypt.hash(password || 'password123', 10);
    const newUser = await db.orm.users.create({
      name,
      email,
      passwordHash,
      organizationId: organizationId as any,
      status: 'ACTIVE',
      role: role || 'MSME_USER',
      refreshToken: null,
      createdAt: dateStr,
      updatedAt: dateStr
    });
    res.status(201).json(newUser);
  } catch (err) { next(err); }
});

// 4. Approvals
router.get('/approvals', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await db.orm.approval_requests.all();
    res.json(list.filter(a => a.type !== 'VERIFICATION'));
  } catch (err) { next(err); }
});

router.get('/approvals/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const item = await db.orm.approval_requests.where({ id } as any).first();
    if (!item) return res.status(404).json({ error: 'Approval request not found' });
    res.json(item);
  } catch (err) { next(err); }
});

router.put('/approvals/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await db.orm.approval_requests.where({ id } as any).update({ status });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// 5. Verification Queue (Mapped to ApprovalRequest type 'VERIFICATION')
router.get('/verification', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await db.orm.approval_requests.all();
    res.json(list.filter(a => a.type === 'VERIFICATION').map(v => ({
      _id: v._id.toString(),
      title: `Evidence review: ${v.organization}`,
      description: `Project verification submitted by ${v.submittedBy}`,
      verificationStatus: v.status,
      assignedTo: v.assignedTo || 'Unassigned',
      dueDate: v.dueDate || 'No Due Date',
      slaStatus: v.slaStatus || 'ON TRACK'
    })));
  } catch (err) { next(err); }
});

router.put('/verification/:id/assign', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { verifierEmail } = req.body;
    await db.orm.approval_requests.where({ id } as any).update({
      assignedTo: verifierEmail
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.put('/verification/:id/review', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await db.orm.approval_requests.where({ id } as any).update({
      status
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// 6. Data Quality
router.get('/data-quality', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      score: '96.2%',
      anomalies: 0,
      lastChecked: new Date().toISOString()
    });
  } catch (err) { next(err); }
});

// 7. Environmental Alerts
router.get('/alerts', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await db.orm.system_alerts.all();
    res.json(list);
  } catch (err) { next(err); }
});

router.put('/alerts/:id/resolve', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await db.orm.system_alerts.where({ id } as any).update({ status: 'Resolved' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// 8. Reports
router.get('/reports', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json([]);
  } catch (err) { next(err); }
});

router.post('/reports', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(201).json({ success: true });
  } catch (err) { next(err); }
});

// 9. Activity Feed
router.get('/activity', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const logs = await db.orm.audit_logs.all();
    res.json(logs.map(l => ({
      timestamp: l.timestamp,
      user: l.actorId.toString(),
      action: l.action,
      module: l.module
    })));
  } catch (err) { next(err); }
});

// ----------------------------------------------------
// 10. UNIFIED WORK QUEUE OPERATIONS [NEW]
// ----------------------------------------------------
router.get('/work-queue', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requests = await db.orm.approval_requests.all();
    
    // Automatically calculate SLA status on the fly based on dueDates
    const mapped = requests.map(r => {
      let currentSla = r.slaStatus || 'ON TRACK';
      if (r.dueDate && r.status === 'PENDING') {
        const due = new Date(r.dueDate).getTime();
        const now = Date.now();
        if (now > due) {
          currentSla = 'OVERDUE';
        } else if (due - now < 86400000 * 2) {
          currentSla = 'AT RISK';
        }
      }
      return {
        ...r,
        slaStatus: currentSla
      };
    });

    res.json(mapped);
  } catch (err) { next(err); }
});

router.put('/work-queue/:id/assign', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { assignedTo, dueDate } = req.body;

    const dataToUpdate: any = {};
    if (assignedTo !== undefined) dataToUpdate.assignedTo = assignedTo;
    if (dueDate !== undefined) {
      dataToUpdate.dueDate = dueDate;
      // Calculate active SLA status
      const due = new Date(dueDate).getTime();
      const now = Date.now();
      dataToUpdate.slaStatus = now > due ? 'OVERDUE' : (due - now < 86400000 * 2 ? 'AT RISK' : 'ON TRACK');
    }

    await db.orm.approval_requests.where({ id } as any).update(dataToUpdate);
    res.json({ success: true, message: 'Task assignments updated.' });
  } catch (err) { next(err); }
});

router.post('/work-queue/:id/notes', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    if (!note) return res.status(400).json({ error: 'Note content is required' });

    const request = await db.orm.approval_requests.where({ id } as any).first();
    if (!request) return res.status(404).json({ error: 'Task request not found' });

    let notesList = [];
    if (request.internalNotes) {
      try {
        notesList = JSON.parse(request.internalNotes);
      } catch {
        notesList = [];
      }
    }

    // Append new note entry
    notesList.push({
      author: req.user.email,
      content: note,
      timestamp: new Date().toISOString()
    });

    await db.orm.approval_requests.where({ id } as any).update({
      internalNotes: JSON.stringify(notesList)
    });

    res.status(201).json({ success: true, notes: notesList });
  } catch (err) { next(err); }
});

router.post('/work-queue/:id/escalate', async (req: any, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason, priority, description } = req.body;

    if (!reason || !priority) {
      return res.status(400).json({ error: 'Reason and priority are required for escalation.' });
    }

    const escalationDetails = JSON.stringify({
      escalatedBy: req.user.email,
      reason,
      description,
      priority,
      timestamp: new Date().toISOString()
    });

    await db.orm.approval_requests.where({ id } as any).update({
      escalationStatus: 'PENDING',
      escalationDetails
    });

    res.json({ success: true, message: 'Task escalated to Super Admin successfully.' });
  } catch (err) { next(err); }
});

export default router;
