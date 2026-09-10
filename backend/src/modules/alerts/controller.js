/**
 * Alerts Controller
 * Phase 7: Alerts + Workflow Automation
 * Handles alert triage, assignment, resolution, and audit logging.
 */

const crypto = require('crypto');
const { Alert, MonitoringAlert, Risk, MonitoringEvent, Notification, AuditLog } = require('../../../models/models');

function buildIdFilter(id, customField) {
  const isHexObjectId = typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
  if (isHexObjectId) {
    return { $or: [{ [customField]: id }, { _id: id }] };
  }
  return { [customField]: id };
}

function canManageAlerts(role) {
  const privileged = [
    'SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN', 'ORGANIZATION_ADMIN',
    'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'COMPLIANCE_MANAGER', 'PROJECT_MANAGER'
  ];
  return privileged.includes((role || '').toUpperCase());
}

/**
 * GET /api/alerts
 */
async function listAlerts(req, res) {
  try {
    const query = { ...(req.riskQuery || {}) };
    const {
      type,
      severity,
      status,
      assignedTo,
      assigned_to,
      projectId,
      search,
      page = 1,
      limit = 50
    } = req.query;

    if (type) query.type = type;
    if (severity) query.severity = severity.toUpperCase();
    if (status) query.status = status.toUpperCase();
    if (assignedTo || assigned_to) query.assignedTo = assignedTo || assigned_to;
    if (projectId) query.projectId = projectId;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
    const alerts = await Alert.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Alert.countDocuments(query);

    // Format alerts with snake_case and camelCase compatibility
    const formatted = alerts.map(a => {
      const doc = a.toObject ? a.toObject() : a;
      return {
        ...doc,
        alert_id: doc.alertId || doc._id?.toString(),
        event_id: doc.eventId,
        risk_id: doc.riskId,
        organization_id: doc.organizationId,
        project_id: doc.projectId,
        assigned_to: doc.assignedTo,
        created_at: doc.createdAt,
        acknowledged_at: doc.acknowledgedAt,
        resolved_at: doc.resolvedAt,
        updated_at: doc.updatedAt
      };
    });

    res.json({
      success: true,
      data: formatted,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Failed to list alerts:', err);
    res.status(500).json({ success: false, message: 'Internal server error while fetching alerts' });
  }
}

/**
 * GET /api/alerts/:id
 */
async function getAlertById(req, res) {
  try {
    const { id } = req.params;
    const filter = buildIdFilter(id, 'alertId');
    const alert = await Alert.findOne(filter);

    if (!alert) {
      return res.status(404).json({ success: false, message: `Alert ${id} not found` });
    }

    const role = req.user?.role || 'VIEWER';
    const userOrg = req.user?.organizationId?.toString();
    if (role !== 'SUPER_ADMIN' && role !== 'PLATFORM_ADMIN' && alert.organizationId !== userOrg) {
      return res.status(403).json({ success: false, message: 'Unauthorized: Cross-tenant access denied' });
    }

    const doc = alert.toObject ? alert.toObject() : alert;
    const formatted = {
      ...doc,
      alert_id: doc.alertId || doc._id?.toString(),
      event_id: doc.eventId,
      risk_id: doc.riskId,
      organization_id: doc.organizationId,
      project_id: doc.projectId,
      assigned_to: doc.assignedTo,
      created_at: doc.createdAt,
      acknowledged_at: doc.acknowledgedAt,
      resolved_at: doc.resolvedAt,
      updated_at: doc.updatedAt
    };

    // Optionally retrieve linked risk
    let linkedRisk = null;
    if (doc.riskId) {
      linkedRisk = await Risk.findOne(buildIdFilter(doc.riskId, 'risk_id'));
    }

    res.json({
      success: true,
      data: {
        ...formatted,
        linked_risk: linkedRisk
      }
    });
  } catch (err) {
    console.error('Failed to get alert by id:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve alert details' });
  }
}

/**
 * POST /api/alerts
 */
async function createAlert(req, res) {
  try {
    const user = req.user;
    const orgId = user?.organizationId?.toString() || req.body.organizationId || req.body.organization_id;
    if (!orgId) {
      return res.status(400).json({ success: false, message: 'Organization ID is required' });
    }

    const role = user?.role || 'VIEWER';
    if (role !== 'SUPER_ADMIN' && role !== 'PLATFORM_ADMIN' && !canManageAlerts(role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges to create alerts' });
    }

    const {
      title,
      description = '',
      type = 'MONITORING',
      severity = 'MEDIUM',
      riskId,
      risk_id,
      eventId,
      event_id,
      projectId,
      project_id,
      assignedTo,
      assigned_to,
      metadata = {}
    } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const cleanRiskId = riskId || risk_id || null;
    const cleanEventId = eventId || event_id || null;
    const cleanProjectId = projectId || project_id || null;
    const cleanAssignedTo = assignedTo || assigned_to || null;

    // Deduplication check: duplicate alert for same event/type in NEW/IN_PROGRESS state
    if (cleanEventId) {
      const existing = await Alert.findOne({
        organizationId: orgId,
        eventId: cleanEventId,
        type: type,
        status: { $in: ['NEW', 'IN_PROGRESS', 'ACKNOWLEDGED'] }
      });
      if (existing) {
        return res.status(200).json({
          success: true,
          message: 'Existing active alert returned (duplicate prevented)',
          data: existing
        });
      }
    }

    const alertId = `alt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const nowIso = new Date().toISOString();

    const alert = await Alert.create({
      alertId,
      eventId: cleanEventId,
      riskId: cleanRiskId,
      organizationId: orgId,
      projectId: cleanProjectId,
      type: type.toUpperCase(),
      severity: severity.toUpperCase(),
      title,
      description,
      status: 'NEW',
      assignedTo: cleanAssignedTo,
      metadata,
      createdAt: nowIso,
      updatedAt: nowIso
    });

    // Write audit log
    await AuditLog.create({
      organizationId: orgId,
      user: user?.email || 'System',
      userId: user?.id || user?._id || 'System',
      action: 'ALERT_CREATED',
      recordId: alertId,
      riskId: cleanRiskId || '',
      module: 'AlertCenter',
      newValue: JSON.stringify({ alertId, title, severity, type }),
      timestamp: nowIso
    });

    // Optionally notify assigned user
    if (cleanAssignedTo) {
      await Notification.create({
        notificationId: `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
        organizationId: orgId,
        userId: cleanAssignedTo,
        type: severity === 'CRITICAL' ? 'CRITICAL_RISK' : 'WORKFLOW_ASSIGNED',
        title: `Alert Assigned: ${title}`,
        message: `You have been assigned to alert ${alertId} (${severity}).`,
        resourceType: 'Alert',
        resourceId: alertId,
        createdAt: nowIso
      });
    }

    res.status(201).json({ success: true, data: alert });
  } catch (err) {
    console.error('Failed to create alert:', err);
    res.status(500).json({ success: false, message: 'Failed to create alert' });
  }
}

/**
 * POST /api/alerts/:id/acknowledge
 */
async function acknowledgeAlert(req, res) {
  try {
    const { id } = req.params;
    const filter = buildIdFilter(id, 'alertId');
    const alert = await Alert.findOne(filter);

    if (!alert) {
      return res.status(404).json({ success: false, message: `Alert ${id} not found` });
    }

    const role = req.user?.role || 'VIEWER';
    const userOrg = req.user?.organizationId?.toString();
    if (role !== 'SUPER_ADMIN' && role !== 'PLATFORM_ADMIN' && alert.organizationId !== userOrg) {
      return res.status(403).json({ success: false, message: 'Unauthorized: Cross-tenant access denied' });
    }

    const nowIso = new Date().toISOString();
    const oldStatus = alert.status;
    alert.status = 'ACKNOWLEDGED';
    alert.acknowledgedAt = nowIso;
    alert.updatedAt = nowIso;
    await alert.save();

    await AuditLog.create({
      organizationId: alert.organizationId,
      user: req.user?.email || 'User',
      userId: req.user?.id || req.user?._id || 'User',
      action: 'ALERT_ACKNOWLEDGED',
      recordId: alert.alertId,
      riskId: alert.riskId || '',
      module: 'AlertCenter',
      oldValue: oldStatus,
      newValue: 'ACKNOWLEDGED',
      timestamp: nowIso
    });

    res.json({ success: true, message: 'Alert acknowledged', data: alert });
  } catch (err) {
    console.error('Failed to acknowledge alert:', err);
    res.status(500).json({ success: false, message: 'Failed to acknowledge alert' });
  }
}

/**
 * POST /api/alerts/:id/resolve
 */
async function resolveAlert(req, res) {
  try {
    const { id } = req.params;
    const filter = buildIdFilter(id, 'alertId');
    const alert = await Alert.findOne(filter);

    if (!alert) {
      return res.status(404).json({ success: false, message: `Alert ${id} not found` });
    }

    const role = req.user?.role || 'VIEWER';
    const userOrg = req.user?.organizationId?.toString();
    if (role !== 'SUPER_ADMIN' && role !== 'PLATFORM_ADMIN' && alert.organizationId !== userOrg) {
      return res.status(403).json({ success: false, message: 'Unauthorized: Cross-tenant access denied' });
    }

    const nowIso = new Date().toISOString();
    const oldStatus = alert.status;
    alert.status = 'RESOLVED';
    alert.resolvedAt = nowIso;
    alert.updatedAt = nowIso;
    await alert.save();

    await AuditLog.create({
      organizationId: alert.organizationId,
      user: req.user?.email || 'User',
      userId: req.user?.id || req.user?._id || 'User',
      action: 'ALERT_RESOLVED',
      recordId: alert.alertId,
      riskId: alert.riskId || '',
      module: 'AlertCenter',
      oldValue: oldStatus,
      newValue: 'RESOLVED',
      timestamp: nowIso
    });

    res.json({ success: true, message: 'Alert resolved', data: alert });
  } catch (err) {
    console.error('Failed to resolve alert:', err);
    res.status(500).json({ success: false, message: 'Failed to resolve alert' });
  }
}

/**
 * POST /api/alerts/:id/dismiss
 */
async function dismissAlert(req, res) {
  try {
    const { id } = req.params;
    const filter = buildIdFilter(id, 'alertId');
    const alert = await Alert.findOne(filter);

    if (!alert) {
      return res.status(404).json({ success: false, message: `Alert ${id} not found` });
    }

    const role = req.user?.role || 'VIEWER';
    const userOrg = req.user?.organizationId?.toString();
    if (role !== 'SUPER_ADMIN' && role !== 'PLATFORM_ADMIN' && alert.organizationId !== userOrg) {
      return res.status(403).json({ success: false, message: 'Unauthorized: Cross-tenant access denied' });
    }

    const nowIso = new Date().toISOString();
    const oldStatus = alert.status;
    alert.status = 'DISMISSED';
    alert.updatedAt = nowIso;
    await alert.save();

    await AuditLog.create({
      organizationId: alert.organizationId,
      user: req.user?.email || 'User',
      userId: req.user?.id || req.user?._id || 'User',
      action: 'ALERT_DISMISSED',
      recordId: alert.alertId,
      riskId: alert.riskId || '',
      module: 'AlertCenter',
      oldValue: oldStatus,
      newValue: 'DISMISSED',
      timestamp: nowIso
    });

    res.json({ success: true, message: 'Alert dismissed', data: alert });
  } catch (err) {
    console.error('Failed to dismiss alert:', err);
    res.status(500).json({ success: false, message: 'Failed to dismiss alert' });
  }
}

/**
 * PATCH /api/alerts/:id/assign
 */
async function assignAlert(req, res) {
  try {
    const { id } = req.params;
    const { assignedTo, assigned_to } = req.body;
    const targetAssignee = assignedTo || assigned_to;

    if (!targetAssignee) {
      return res.status(400).json({ success: false, message: 'Assignee is required' });
    }

    const filter = buildIdFilter(id, 'alertId');
    const alert = await Alert.findOne(filter);

    if (!alert) {
      return res.status(404).json({ success: false, message: `Alert ${id} not found` });
    }

    const role = req.user?.role || 'VIEWER';
    const userOrg = req.user?.organizationId?.toString();
    if (role !== 'SUPER_ADMIN' && role !== 'PLATFORM_ADMIN' && alert.organizationId !== userOrg) {
      return res.status(403).json({ success: false, message: 'Unauthorized: Cross-tenant access denied' });
    }

    const nowIso = new Date().toISOString();
    const oldAssignee = alert.assignedTo || 'Unassigned';
    alert.assignedTo = targetAssignee;
    if (alert.status === 'NEW') {
      alert.status = 'IN_PROGRESS';
    }
    alert.updatedAt = nowIso;
    await alert.save();

    await AuditLog.create({
      organizationId: alert.organizationId,
      user: req.user?.email || 'User',
      userId: req.user?.id || req.user?._id || 'User',
      action: 'ALERT_ASSIGNED',
      recordId: alert.alertId,
      riskId: alert.riskId || '',
      module: 'AlertCenter',
      oldValue: oldAssignee,
      newValue: targetAssignee,
      timestamp: nowIso
    });

    // Create notification
    await Notification.create({
      notificationId: `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      organizationId: alert.organizationId,
      userId: targetAssignee,
      type: 'WORKFLOW_ASSIGNED',
      title: `Alert Assigned: ${alert.title}`,
      message: `You have been assigned to alert ${alert.alertId} (${alert.severity}).`,
      resourceType: 'Alert',
      resourceId: alert.alertId,
      createdAt: nowIso
    });

    res.json({ success: true, message: 'Alert assigned successfully', data: alert });
  } catch (err) {
    console.error('Failed to assign alert:', err);
    res.status(500).json({ success: false, message: 'Failed to assign alert' });
  }
}

module.exports = {
  listAlerts,
  getAlertById,
  createAlert,
  acknowledgeAlert,
  resolveAlert,
  dismissAlert,
  assignAlert
};
