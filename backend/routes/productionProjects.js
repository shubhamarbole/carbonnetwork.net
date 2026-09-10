const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { 
  Project, 
  Notification, 
  CarbonCreditBatch, 
  Evidence, 
  AuditLog, 
  Organization 
} = require('../models/models');

// Middleware to extract tenant orgId and role
const getTenantContext = (req) => {
  let user = req.user;
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token && !user) {
    try {
      user = jwt.verify(token, process.env.JWT_SECRET || 'environmental-esg-secret-key-98765');
    } catch (e) {}
  }

  const orgId = user?.organizationId || req.headers['x-organization-id'] || 'org-msme-1';
  const userEmail = user?.email || 'user@esg.com';
  const role = user?.role || 'MSME_USER';
  return { orgId, userEmail, role, user };
};

// =================================================================
// 1. PROJECTS MANAGEMENT & LIFECYCLE
// =================================================================

// GET /api/projects - List projects with search, filter, pagination
router.get('/projects', async (req, res) => {
  try {
    const { orgId, role } = getTenantContext(req);
    const { 
      status, 
      category, 
      search, 
      page = 1, 
      limit = 10, 
      includeDeleted = false 
    } = req.query;

    const query = {};
    if (role !== 'SUPER_ADMIN' && role !== 'PLATFORM_ADMIN') {
      query.organizationId = orgId;
    } else if (req.query.organizationId) {
      query.organizationId = req.query.organizationId;
    }

    if (includeDeleted !== 'true') {
      query.isDeleted = false;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    let projects = await Project.find(query);

    // In-memory search for substring match on name/description
    if (search) {
      const s = search.toLowerCase();
      projects = projects.filter(p => 
        (p.name && p.name.toLowerCase().includes(s)) ||
        (p.description && p.description.toLowerCase().includes(s))
      );
    }

    // Sort descending by createdAt or startDate
    projects.sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0));

    const total = projects.length;
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const paginated = projects.slice(startIndex, startIndex + parseInt(limit));

    res.json({
      success: true,
      data: paginated,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve projects' });
  }
});

// GET /api/projects/:id - Details with linked documents & timeline
router.get('/projects/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Fetch linked evidence documents
    const documents = await Evidence.find({ recordId: project._id.toString() });

    // Fetch audit history for this project
    const history = await AuditLog.find({ recordId: project._id.toString() });

    res.json({
      success: true,
      data: {
        ...project.toObject ? project.toObject() : project,
        documents,
        history
      }
    });
  } catch (err) {
    console.error('Error fetching project details:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve project details' });
  }
});

// POST /api/projects - Create new project (DRAFT)
router.post('/projects', async (req, res) => {
  try {
    const { orgId, userEmail } = getTenantContext(req);
    const { 
      name, 
      category, 
      description, 
      baselineCO2e, 
      targetCO2eReduction, 
      startDate, 
      completionDate, 
      standard 
    } = req.body;

    if (!name || !startDate) {
      return res.status(400).json({ success: false, message: 'Project name and start date are required' });
    }

    const project = await Project.create({
      organizationId: req.body.organizationId || orgId,
      facilityId: req.body.facilityId || null,
      name,
      category: category || 'ENERGY_EFFICIENCY',
      description: description || '',
      baselineCO2e: parseFloat(baselineCO2e || 0),
      targetCO2eReduction: parseFloat(targetCO2eReduction || 0),
      actualCO2eReduction: 0,
      startDate,
      completionDate: completionDate || '',
      standard: standard || 'VCS (Verified Carbon Standard)',
      status: 'DRAFT',
      isDeleted: false,
      createdBy: userEmail
    });

    // Record audit log
    await AuditLog.create({
      organizationId: project.organizationId,
      user: userEmail,
      action: 'Project Created',
      module: 'Projects',
      recordId: project._id.toString(),
      newValue: JSON.stringify({ name: project.name, status: 'DRAFT' }),
      timestamp: new Date().toISOString()
    });

    // Create notification
    await Notification.create({
      organizationId: project.organizationId,
      title: 'Project Created',
      message: `Project "${project.name}" has been drafted.`,
      type: 'INFO',
      link: `/projects?id=${project._id}`,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ success: true, data: project });
  } catch (err) {
    console.error('Error creating project:', err);
    res.status(500).json({ success: false, message: 'Failed to create project' });
  }
});

// PUT /api/projects/:id - Update project
router.put('/projects/:id', async (req, res) => {
  try {
    const { userEmail } = getTenantContext(req);
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const updatableFields = [
      'name', 'category', 'description', 'baselineCO2e', 
      'targetCO2eReduction', 'startDate', 'completionDate', 'standard'
    ];

    updatableFields.forEach(field => {
      if (req.body[field] !== undefined) {
        project[field] = req.body[field];
      }
    });

    await project.save();

    await AuditLog.create({
      organizationId: project.organizationId,
      user: userEmail,
      action: 'Project Updated',
      module: 'Projects',
      recordId: project._id.toString(),
      newValue: JSON.stringify(req.body),
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, data: project });
  } catch (err) {
    console.error('Error updating project:', err);
    res.status(500).json({ success: false, message: 'Failed to update project' });
  }
});

// POST /api/projects/:id/submit - Submit for review
router.post('/projects/:id/submit', async (req, res) => {
  try {
    const { userEmail } = getTenantContext(req);
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const previousStatus = project.status;
    project.status = 'SUBMITTED';
    await project.save();

    await AuditLog.create({
      organizationId: project.organizationId,
      user: userEmail,
      action: 'Project Submitted for Review',
      module: 'Projects',
      recordId: project._id.toString(),
      oldValue: previousStatus,
      newValue: 'SUBMITTED',
      timestamp: new Date().toISOString()
    });

    await Notification.create({
      organizationId: project.organizationId,
      title: 'Project Submitted',
      message: `Project "${project.name}" was submitted for review.`,
      type: 'INFO',
      link: `/projects?id=${project._id}`,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, data: project, message: 'Project submitted successfully' });
  } catch (err) {
    console.error('Error submitting project:', err);
    res.status(500).json({ success: false, message: 'Failed to submit project' });
  }
});

// POST /api/projects/:id/review - Mark under review (Platform Admin / Auditor)
router.post('/projects/:id/review', async (req, res) => {
  try {
    const { userEmail, role } = getTenantContext(req);
    if (role === 'MSME_USER' || role === 'DATA_ENTRY') {
      return res.status(403).json({ success: false, message: 'Unauthorized: Review requires reviewer privileges' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    project.status = 'UNDER_REVIEW';
    project.reviewedBy = userEmail;
    project.reviewedAt = new Date().toISOString();
    await project.save();

    await AuditLog.create({
      organizationId: project.organizationId,
      user: userEmail,
      action: 'Project Review Initiated',
      module: 'Projects',
      recordId: project._id.toString(),
      newValue: 'UNDER_REVIEW',
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, data: project });
  } catch (err) {
    console.error('Error initiating review:', err);
    res.status(500).json({ success: false, message: 'Failed to initiate review' });
  }
});

// POST /api/projects/:id/request-changes - Request revisions with comments
router.post('/projects/:id/request-changes', async (req, res) => {
  try {
    const { userEmail, role } = getTenantContext(req);
    const { comments } = req.body;

    if (role === 'MSME_USER' || role === 'DATA_ENTRY') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    project.status = 'CHANGES_REQUESTED';
    project.reviewerComments = comments || 'Changes requested by reviewer.';
    project.reviewedBy = userEmail;
    project.reviewedAt = new Date().toISOString();
    await project.save();

    await AuditLog.create({
      organizationId: project.organizationId,
      user: userEmail,
      action: 'Project Changes Requested',
      module: 'Projects',
      recordId: project._id.toString(),
      newValue: JSON.stringify({ status: 'CHANGES_REQUESTED', comments }),
      timestamp: new Date().toISOString()
    });

    await Notification.create({
      organizationId: project.organizationId,
      title: 'Action Required: Revisions Requested',
      message: `Revisions requested for project "${project.name}": ${comments || 'See comments'}`,
      type: 'WARNING',
      link: `/projects?id=${project._id}`,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, data: project, message: 'Revisions requested' });
  } catch (err) {
    console.error('Error requesting changes:', err);
    res.status(500).json({ success: false, message: 'Failed to request changes' });
  }
});

// POST /api/projects/:id/approve - Approve project
router.post('/projects/:id/approve', async (req, res) => {
  try {
    const { userEmail, role } = getTenantContext(req);
    const { comments } = req.body;

    if (role === 'MSME_USER' || role === 'DATA_ENTRY') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    project.status = 'APPROVED';
    project.reviewerComments = comments || 'Approved by reviewer.';
    project.reviewedBy = userEmail;
    project.reviewedAt = new Date().toISOString();
    await project.save();

    await AuditLog.create({
      organizationId: project.organizationId,
      user: userEmail,
      action: 'Project Approved',
      module: 'Projects',
      recordId: project._id.toString(),
      newValue: 'APPROVED',
      timestamp: new Date().toISOString()
    });

    await Notification.create({
      organizationId: project.organizationId,
      title: 'Project Approved',
      message: `Your project "${project.name}" has been approved.`,
      type: 'SUCCESS',
      link: `/projects?id=${project._id}`,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, data: project, message: 'Project approved successfully' });
  } catch (err) {
    console.error('Error approving project:', err);
    res.status(500).json({ success: false, message: 'Failed to approve project' });
  }
});

// POST /api/projects/:id/verify - Auditor Verification & Carbon Credit Issuance
router.post('/projects/:id/verify', async (req, res) => {
  try {
    const { userEmail, role } = getTenantContext(req);
    const { verifiedReduction, standard } = req.body;

    if (role === 'MSME_USER' || role === 'DATA_ENTRY') {
      return res.status(403).json({ success: false, message: 'Non-self-verification enforced. Only Auditors/Admins may verify projects.' });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const actualCredits = parseFloat(verifiedReduction || project.targetCO2eReduction || 100);

    project.status = 'VERIFIED';
    project.actualCO2eReduction = actualCredits;
    project.creditsIssued = actualCredits;
    project.verifiedBy = userEmail;
    project.verifiedAt = new Date().toISOString();
    await project.save();

    // Create Carbon Credit Batch
    const batchNumber = `CC-${new Date().getFullYear()}-${project._id.toString().substring(0, 6).toUpperCase()}`;
    const creditBatch = await CarbonCreditBatch.create({
      projectId: project._id.toString(),
      organizationId: project.organizationId,
      batchNumber,
      vintageYear: new Date().getFullYear(),
      creditsTotal: actualCredits,
      creditsAvailable: actualCredits,
      creditsRetired: 0,
      standard: standard || project.standard || 'VCS',
      status: 'ISSUED',
      createdAt: new Date().toISOString()
    });

    await AuditLog.create({
      organizationId: project.organizationId,
      user: userEmail,
      action: 'Project Verified & Credits Issued',
      module: 'Projects',
      recordId: project._id.toString(),
      newValue: JSON.stringify({ batchNumber, creditsIssued: actualCredits }),
      timestamp: new Date().toISOString()
    });

    await Notification.create({
      organizationId: project.organizationId,
      title: 'Project Verified & Carbon Credits Issued',
      message: `Project "${project.name}" has been verified! ${actualCredits} Carbon Credits minted under Batch ${batchNumber}.`,
      type: 'SUCCESS',
      link: '/carbon-credits',
      isRead: false,
      createdAt: new Date().toISOString()
    });

    res.json({
      success: true,
      data: { project, creditBatch },
      message: `Project verified and ${actualCredits} credits issued successfully.`
    });
  } catch (err) {
    console.error('Error verifying project:', err);
    res.status(500).json({ success: false, message: 'Failed to verify project' });
  }
});

// DELETE /api/projects/:id - Soft delete
router.delete('/projects/:id', async (req, res) => {
  try {
    const { userEmail } = getTenantContext(req);
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    project.isDeleted = true;
    project.deletedAt = new Date().toISOString();
    project.deletedBy = userEmail;
    await project.save();

    await AuditLog.create({
      organizationId: project.organizationId,
      user: userEmail,
      action: 'Project Soft Deleted (Archived)',
      module: 'Projects',
      recordId: project._id.toString(),
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, message: 'Project archived successfully' });
  } catch (err) {
    console.error('Error archiving project:', err);
    res.status(500).json({ success: false, message: 'Failed to archive project' });
  }
});

// POST /api/projects/:id/restore - Restore soft-deleted project
router.post('/projects/:id/restore', async (req, res) => {
  try {
    const { userEmail } = getTenantContext(req);
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    project.isDeleted = false;
    project.deletedAt = null;
    project.deletedBy = null;
    await project.save();

    await AuditLog.create({
      organizationId: project.organizationId,
      user: userEmail,
      action: 'Project Restored',
      module: 'Projects',
      recordId: project._id.toString(),
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, data: project, message: 'Project restored successfully' });
  } catch (err) {
    console.error('Error restoring project:', err);
    res.status(500).json({ success: false, message: 'Failed to restore project' });
  }
});

// DELETE /api/projects/:id/permanent - Permanent delete (Super Admin only)
router.delete('/projects/:id/permanent', async (req, res) => {
  try {
    const { userEmail, role } = getTenantContext(req);
    if (role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Permanent deletion requires Super Admin authority' });
    }

    await Project.findByIdAndDelete(req.params.id);

    await AuditLog.create({
      organizationId: 'system',
      user: userEmail,
      action: 'Project Permanently Deleted',
      module: 'Projects',
      recordId: req.params.id,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, message: 'Project permanently deleted' });
  } catch (err) {
    console.error('Error permanently deleting project:', err);
    res.status(500).json({ success: false, message: 'Failed to permanently delete project' });
  }
});

// =================================================================
// 2. CENTRALIZED NOTIFICATIONS SYSTEM
// =================================================================

// GET /api/notifications - List notifications
router.get('/notifications', async (req, res) => {
  try {
    const { orgId, role } = getTenantContext(req);
    const { unreadOnly = false, limit = 50 } = req.query;

    const query = {};
    if (role !== 'SUPER_ADMIN') {
      query.organizationId = orgId;
    }
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query);
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const unreadCount = notifications.filter(n => !n.isRead).length;

    res.json({
      success: true,
      data: notifications.slice(0, parseInt(limit)),
      unreadCount
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve notifications' });
  }
});

// PUT /api/notifications/:id/read - Mark as read
router.put('/notifications/:id/read', async (req, res) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    notif.isRead = true;
    await notif.save();
    res.json({ success: true, data: notif });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
});

// POST /api/notifications/mark-all-read - Mark all as read
router.post('/notifications/mark-all-read', async (req, res) => {
  try {
    const { orgId } = getTenantContext(req);
    const notifications = await Notification.find({ organizationId: orgId, isRead: false });
    for (const notif of notifications) {
      notif.isRead = true;
      await notif.save();
    }
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error marking all notifications as read:', err);
    res.status(500).json({ success: false, message: 'Failed to update notifications' });
  }
});

// =================================================================
// 3. CARBON CREDITS & OFFSETS REGISTRY
// =================================================================

// GET /api/credits - List batches & portfolio summary
router.get('/credits', async (req, res) => {
  try {
    const { orgId, role } = getTenantContext(req);
    const query = (role === 'SUPER_ADMIN' || role === 'PLATFORM_ADMIN') ? {} : { organizationId: orgId };

    const batches = await CarbonCreditBatch.find(query);
    batches.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    let totalIssued = 0;
    let totalAvailable = 0;
    let totalRetired = 0;

    batches.forEach(b => {
      totalIssued += (b.creditsTotal || 0);
      totalAvailable += (b.creditsAvailable || 0);
      totalRetired += (b.creditsRetired || 0);
    });

    res.json({
      success: true,
      data: batches,
      summary: {
        totalIssued,
        totalAvailable,
        totalRetired,
        batchCount: batches.length
      }
    });
  } catch (err) {
    console.error('Error fetching carbon credits:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve carbon credits' });
  }
});

// POST /api/credits/retire - Retire credits
router.post('/credits/retire', async (req, res) => {
  try {
    const { userEmail } = getTenantContext(req);
    const { batchId, quantity, reason, beneficiary } = req.body;

    const retireQty = parseFloat(quantity);
    if (!batchId || !retireQty || retireQty <= 0) {
      return res.status(400).json({ success: false, message: 'Valid batchId and quantity are required' });
    }

    const batch = await CarbonCreditBatch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Carbon credit batch not found' });
    }

    if (batch.creditsAvailable < retireQty) {
      return res.status(400).json({ 
        success: false, 
        message: `Insufficient credits available. Available: ${batch.creditsAvailable}, Requested: ${retireQty}` 
      });
    }

    const certificateId = `RET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const retirementRecord = {
      certificateId,
      quantity: retireQty,
      retiredBy: userEmail,
      reason: reason || 'Voluntary Scope 1 & 2 Offset',
      beneficiary: beneficiary || 'Self Organization',
      date: new Date().toISOString()
    };

    batch.creditsAvailable -= retireQty;
    batch.creditsRetired += retireQty;
    batch.retirementHistory.push(retirementRecord);
    if (batch.creditsAvailable === 0) {
      batch.status = 'RETIRED';
    } else {
      batch.status = 'PARTIALLY_RETIRED';
    }
    await batch.save();

    await AuditLog.create({
      organizationId: batch.organizationId,
      user: userEmail,
      action: 'Carbon Credits Retired',
      module: 'CarbonCredits',
      recordId: batch._id.toString(),
      newValue: JSON.stringify(retirementRecord),
      timestamp: new Date().toISOString()
    });

    await Notification.create({
      organizationId: batch.organizationId,
      title: 'Carbon Credits Retired',
      message: `${retireQty} credits retired from batch ${batch.batchNumber} (Cert: ${certificateId}).`,
      type: 'INFO',
      link: '/carbon-credits',
      isRead: false,
      createdAt: new Date().toISOString()
    });

    res.json({
      success: true,
      data: batch,
      certificate: retirementRecord,
      message: `Successfully retired ${retireQty} carbon credits.`
    });
  } catch (err) {
    console.error('Error retiring carbon credits:', err);
    res.status(500).json({ success: false, message: 'Failed to retire carbon credits' });
  }
});

// =================================================================
// 4. SOFT DELETE ARCHIVE & RECYCLE BIN
// =================================================================

// GET /api/archive - List soft-deleted records across entities
router.get('/archive', async (req, res) => {
  try {
    const { orgId, role } = getTenantContext(req);
    const query = { isDeleted: true };
    if (role !== 'SUPER_ADMIN') {
      query.organizationId = orgId;
    }

    const deletedProjects = await Project.find(query);
    const deletedEvidence = await Evidence.find(query);

    const formatted = [
      ...deletedProjects.map(p => ({
        _id: p._id,
        entityType: 'Project',
        name: p.name,
        category: p.category,
        deletedAt: p.deletedAt,
        deletedBy: p.deletedBy,
        organizationId: p.organizationId
      })),
      ...deletedEvidence.map(e => ({
        _id: e._id,
        entityType: 'Evidence',
        name: e.fileName,
        category: e.category,
        deletedAt: e.deletedAt,
        deletedBy: e.deletedBy,
        organizationId: e.organizationId
      }))
    ];

    formatted.sort((a, b) => new Date(b.deletedAt || 0) - new Date(a.deletedAt || 0));

    res.json({ success: true, data: formatted });
  } catch (err) {
    console.error('Error retrieving archive:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve archive items' });
  }
});

module.exports = router;
