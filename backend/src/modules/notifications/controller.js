/**
 * Centralized Notifications Controller
 * Phase 7: Alerts + Workflow Automation
 */

const crypto = require('crypto');
const { Notification, AuditLog } = require('../../../models/models');

function buildIdFilter(id, customField) {
  const isHexObjectId = typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
  if (isHexObjectId) {
    return { $or: [{ [customField]: id }, { _id: id }] };
  }
  return { [customField]: id };
}

/**
 * GET /api/notifications
 */
async function listNotifications(req, res) {
  try {
    const role = req.user?.role || 'VIEWER';
    const userOrg = req.user?.organizationId?.toString();
    const userId = req.user?.id || req.user?._id?.toString() || req.user?.email;
    const { unreadOnly = false, limit = 50 } = req.query;

    const query = {};
    if (role !== 'SUPER_ADMIN' && role !== 'PLATFORM_ADMIN') {
      query.organizationId = userOrg;
      if (userId) {
        query.$or = [
          { userId: userId },
          { userId: null },
          { userId: '' },
          { user_id: userId },
          { user_id: null },
          { user_id: '' }
        ];
      }
    }

    if (unreadOnly === 'true' || unreadOnly === true) {
      query.$and = [
        { isRead: { $ne: true } },
        { read: { $ne: true } }
      ];
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    const allUnread = await Notification.countDocuments({
      ...query,
      isRead: { $ne: true },
      read: { $ne: true }
    });

    const formatted = notifications.map(n => {
      const doc = n.toObject ? n.toObject() : n;
      const isReadVal = Boolean(doc.isRead || doc.read);
      return {
        ...doc,
        notification_id: doc.notificationId || doc._id?.toString(),
        user_id: doc.userId,
        organization_id: doc.organizationId,
        resource_type: doc.resourceType,
        resource_id: doc.resourceId,
        read: isReadVal,
        isRead: isReadVal,
        created_at: doc.createdAt
      };
    });

    res.json({
      success: true,
      data: formatted,
      unreadCount: allUnread
    });
  } catch (err) {
    console.error('Failed to list notifications:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve notifications' });
  }
}

/**
 * POST /api/notifications
 */
async function createNotification(req, res) {
  try {
    const orgId = req.user?.organizationId?.toString() || req.body.organizationId || req.body.organization_id;
    const {
      userId,
      user_id,
      type = 'INFO',
      title,
      message,
      resourceType,
      resource_type,
      resourceId,
      resource_id,
      link = ''
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    const notificationId = `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const nowIso = new Date().toISOString();

    const notif = await Notification.create({
      notificationId,
      organizationId: orgId,
      userId: userId || user_id || null,
      type: type.toUpperCase(),
      title,
      message,
      resourceType: resourceType || resource_type || '',
      resourceId: resourceId || resource_id || '',
      link,
      isRead: false,
      read: false,
      createdAt: nowIso
    });

    await AuditLog.create({
      organizationId: orgId,
      user: req.user?.email || 'System',
      userId: req.user?.id || req.user?._id || 'System',
      action: 'NOTIFICATION_CREATED',
      recordId: notificationId,
      module: 'NotificationCenter',
      newValue: JSON.stringify({ notificationId, title, type }),
      timestamp: nowIso
    });

    res.status(201).json({ success: true, data: notif });
  } catch (err) {
    console.error('Failed to create notification:', err);
    res.status(500).json({ success: false, message: 'Failed to create notification' });
  }
}

/**
 * POST /api/notifications/:id/read (also supports PUT)
 */
async function markNotificationAsRead(req, res) {
  try {
    const { id } = req.params;
    const filter = buildIdFilter(id, 'notificationId');
    const notif = await Notification.findOne(filter);

    if (!notif) {
      return res.status(404).json({ success: false, message: `Notification ${id} not found` });
    }

    notif.isRead = true;
    notif.read = true;
    await notif.save();

    await AuditLog.create({
      organizationId: notif.organizationId,
      user: req.user?.email || 'User',
      userId: req.user?.id || req.user?._id || 'User',
      action: 'NOTIFICATION_READ',
      recordId: notif.notificationId || notif._id?.toString(),
      module: 'NotificationCenter',
      newValue: 'READ',
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, message: 'Notification marked as read', data: notif });
  } catch (err) {
    console.error('Failed to mark notification as read:', err);
    res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
}

/**
 * POST /api/notifications/read-all (also supports /mark-all-read)
 */
async function markAllNotificationsRead(req, res) {
  try {
    const orgId = req.user?.organizationId?.toString();
    const userId = req.user?.id || req.user?._id?.toString();

    const query = {
      isRead: false
    };
    if (orgId) {
      query.organizationId = orgId;
    }
    if (userId) {
      query.$or = [{ userId }, { userId: null }, { userId: '' }];
    }

    await Notification.updateMany(query, { $set: { isRead: true, read: true } });

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Failed to mark all notifications read:', err);
    res.status(500).json({ success: false, message: 'Failed to mark notifications read' });
  }
}

module.exports = {
  listNotifications,
  createNotification,
  markNotificationAsRead,
  markAllNotificationsRead
};
