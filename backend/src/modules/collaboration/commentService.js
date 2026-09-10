const crypto = require('crypto');
const { 
  RiskComment, 
  Risk, 
  User, 
  Notification, 
  AuditLog 
} = require('../../../models/models');

class CommentService {
  async listComments(user, riskId) {
    // Verify risk belongs to user's tenant
    const risk = await Risk.findOne({ _id: riskId, organizationId: user.organizationId });
    if (!risk) {
      const err = new Error(`Risk ${riskId} not found`);
      err.status = 404;
      throw err;
    }

    return await RiskComment.find({
      riskId,
      organizationId: user.organizationId,
      deletedAt: null
    }).sort({ createdAt: 1 });
  }

  async createComment(user, riskId, data = {}) {
    if (!data.content || !data.content.trim()) {
      const err = new Error('Comment content cannot be empty');
      err.status = 400;
      throw err;
    }

    const risk = await Risk.findOne({ _id: riskId, organizationId: user.organizationId });
    if (!risk) {
      const err = new Error(`Risk ${riskId} not found`);
      err.status = 404;
      throw err;
    }

    const now = new Date().toISOString();
    const commentId = `cmt_${crypto.randomBytes(6).toString('hex')}`;

    // Extract @mentions
    const rawMentions = [];
    const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
    let match;
    while ((match = mentionRegex.exec(data.content)) !== null) {
      rawMentions.push(match[1].replace(/[.,!?:;]+$/, ''));
    }

    const resolvedMentions = [];
    const notifyUserIds = new Set();

    if (rawMentions.length > 0) {
      // Find tenant users matching email/name
      const tenantUsers = await User.find({ 
        organizationId: user.organizationId,
        isActive: { $ne: false }
      }).catch(() => []);

      const roleAliases = {
        'admin': 'ADMIN',
        'super_admin': 'SUPER_ADMIN',
        'platform_admin': 'PLATFORM_ADMIN',
        'esg_mgr': 'ESG_MANAGER',
        'esg_manager': 'ESG_MANAGER',
        'compliance_mgr': 'COMPLIANCE_MANAGER',
        'compliance_manager': 'COMPLIANCE_MANAGER',
        'viewer': 'VIEWER'
      };

      for (const m of rawMentions) {
        const cleanM = m.toLowerCase();
        const matchedRole = roleAliases[cleanM] || null;

        if (matchedRole) {
          resolvedMentions.push({ 
            type: 'role', 
            id: matchedRole, 
            name: matchedRole, 
            tag: cleanM 
          });
          tenantUsers.filter(u => (u.role || '').toUpperCase() === matchedRole).forEach(u => {
            if (u._id.toString() !== user.id) notifyUserIds.add(u._id.toString());
          });
        } else {
          const matchedUser = tenantUsers.find(u => 
            u.email?.toLowerCase().includes(cleanM) || 
            u.name?.toLowerCase().includes(cleanM)
          );
          if (matchedUser) {
            resolvedMentions.push({ 
              type: 'user', 
              id: matchedUser._id.toString(), 
              name: matchedUser.name || matchedUser.email,
              tag: cleanM
            });
            if (matchedUser._id.toString() !== user.id) {
              notifyUserIds.add(matchedUser._id.toString());
            }
          } else {
            // General tag fallback
            resolvedMentions.push({
              type: 'role',
              id: cleanM.toUpperCase(),
              name: `@${cleanM}`,
              tag: cleanM
            });
          }
        }
      }
    }

    const comment = await RiskComment.create({
      commentId,
      riskId,
      organizationId: user.organizationId,
      projectId: risk.projectId ? risk.projectId.toString() : null,
      userId: user.id || user._id?.toString() || 'usr_unknown',
      userEmail: user.email || 'user@example.com',
      userName: user.name || user.email || 'Collaborator',
      content: data.content.trim(),
      mentions: resolvedMentions,
      attachments: data.attachments || [],
      deletedAt: null,
      createdAt: now,
      updatedAt: now
    });

    // Create notifications for mentioned users
    for (const targetUserId of notifyUserIds) {
      const notifId = `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      await Notification.create({
        notificationId: notifId,
        userId: targetUserId,
        organizationId: user.organizationId,
        title: `Mentioned in ${risk.title}`,
        message: `${user.name || user.email} mentioned you in risk comment: "${data.content.slice(0, 100)}..."`,
        type: 'MENTION',
        severity: 'INFO',
        link: `/risk-workspace?riskId=${riskId}`,
        isRead: false,
        read: false,
        createdAt: now
      });
    }

    // Record audit log
    await AuditLog.create({
      organizationId: user.organizationId,
      user: user.email || user.name,
      userId: user.id || user._id?.toString(),
      action: 'COMMENT_CREATED',
      module: 'RiskCollaboration',
      recordId: commentId,
      newValue: 'CREATED',
      metadata: { riskId, mentionsCount: resolvedMentions.length },
      timestamp: now
    });

    if (resolvedMentions.length > 0) {
      await AuditLog.create({
        organizationId: user.organizationId,
        user: user.email || user.name,
        userId: user.id || user._id?.toString(),
        action: 'MENTION_CREATED',
        module: 'RiskCollaboration',
        recordId: commentId,
        newValue: JSON.stringify(resolvedMentions),
        metadata: { riskId, notifiedCount: notifyUserIds.size },
        timestamp: now
      });
    }

    return comment;
  }

  async updateComment(user, commentId, data = {}) {
    const comment = await RiskComment.findOne({ 
      commentId, 
      organizationId: user.organizationId,
      deletedAt: null
    });
    if (!comment) {
      const err = new Error(`Comment ${commentId} not found`);
      err.status = 404;
      throw err;
    }

    const isAuthor = comment.userId === (user.id || user._id?.toString());
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'PLATFORM_ADMIN'].includes((user.role || '').toUpperCase());

    if (!isAuthor && !isAdmin) {
      const err = new Error('You do not have permission to edit this comment');
      err.status = 403;
      throw err;
    }

    const now = new Date().toISOString();
    comment.content = data.content ? data.content.trim() : comment.content;
    comment.updatedAt = now;
    await comment.save();

    await AuditLog.create({
      organizationId: user.organizationId,
      user: user.email || user.name,
      userId: user.id || user._id?.toString(),
      action: 'COMMENT_UPDATED',
      module: 'RiskCollaboration',
      recordId: commentId,
      newValue: 'UPDATED',
      timestamp: now
    });

    return comment;
  }

  async deleteComment(user, commentId) {
    const comment = await RiskComment.findOne({ 
      commentId, 
      organizationId: user.organizationId,
      deletedAt: null
    });
    if (!comment) {
      const err = new Error(`Comment ${commentId} not found`);
      err.status = 404;
      throw err;
    }

    const isAuthor = comment.userId === (user.id || user._id?.toString());
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'PLATFORM_ADMIN'].includes((user.role || '').toUpperCase());

    if (!isAuthor && !isAdmin) {
      const err = new Error('You do not have permission to delete this comment');
      err.status = 403;
      throw err;
    }

    const now = new Date().toISOString();
    comment.deletedAt = now;
    comment.updatedAt = now;
    await comment.save();

    await AuditLog.create({
      organizationId: user.organizationId,
      user: user.email || user.name,
      userId: user.id || user._id?.toString(),
      action: 'COMMENT_DELETED',
      module: 'RiskCollaboration',
      recordId: commentId,
      newValue: 'DELETED',
      timestamp: now
    });

    return { success: true, message: `Comment ${commentId} deleted` };
  }
}

module.exports = new CommentService();
