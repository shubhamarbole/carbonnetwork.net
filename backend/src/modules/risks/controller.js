const { Risk, RiskHistory, AIRiskAnalysis, AuditLog, User, Project, Organization } = require('../../../models/models');
const { db } = require('../../prisma/db');

const VALID_CATEGORIES = [
  'Financial', 'Operational', 'Environmental', 'ESG', 'Compliance',
  'Regulatory', 'Supplier', 'Project', 'Cybersecurity', 'Data',
  'Reputational', 'Fraud', 'Carbon', 'Documentation'
];

const VALID_STATUSES = [
  'OPEN', 'UNDER_REVIEW', 'MITIGATION_IN_PROGRESS', 'MITIGATED', 'CLOSED'
];

const VALID_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

// Deterministic Authoritative Risk Scoring Formula (Phase 2)
// Risk Score = (Probability * 0.35) + (Impact * 0.35) + (Exposure * 0.20) + (Urgency * 0.10)
function calculateRiskScore(probability, impact, exposure = 50, urgency = 50) {
  const p = Math.min(100, Math.max(0, Number(probability) || 0));
  const i = Math.min(100, Math.max(0, Number(impact) || 0));
  const e = Math.min(100, Math.max(0, Number(exposure !== undefined && exposure !== null ? exposure : 50)));
  const u = Math.min(100, Math.max(0, Number(urgency !== undefined && urgency !== null ? urgency : 50)));
  const raw = (p * 0.35) + (i * 0.35) + (e * 0.20) + (u * 0.10);
  return Math.round(raw * 100) / 100;
}

function classifySeverity(score) {
  const s = Number(score);
  if (s < 25) return 'LOW';
  if (s < 50) return 'MEDIUM';
  if (s < 75) return 'HIGH';
  return 'CRITICAL';
}

function getScoreBreakdown(probability, impact, exposure = 50, urgency = 50) {
  const p = Math.min(100, Math.max(0, Number(probability) || 0));
  const i = Math.min(100, Math.max(0, Number(impact) || 0));
  const e = Math.min(100, Math.max(0, Number(exposure !== undefined && exposure !== null ? exposure : 50)));
  const u = Math.min(100, Math.max(0, Number(urgency !== undefined && urgency !== null ? urgency : 50)));
  return {
    probability_contribution: Math.round(p * 0.35 * 100) / 100,
    impact_contribution: Math.round(i * 0.35 * 100) / 100,
    exposure_contribution: Math.round(e * 0.20 * 100) / 100,
    urgency_contribution: Math.round(u * 0.10 * 100) / 100,
    weights: { probability: 0.35, impact: 0.35, exposure: 0.20, urgency: 0.10 }
  };
}

// Helper to look up a user by ID or email across both Mongoose and Prisma
async function resolveUser(userIdOrEmail) {
  if (!userIdOrEmail) return null;
  try {
    const u1 = await User.findById(userIdOrEmail);
    if (u1) return { _id: u1._id.toString(), name: u1.name, email: u1.email, role: u1.role, organizationId: u1.organizationId };
  } catch (e) {}

  try {
    const u2 = await User.findOne({ email: userIdOrEmail });
    if (u2) return { _id: u2._id.toString(), name: u2.name, email: u2.email, role: u2.role, organizationId: u2.organizationId };
  } catch (e) {}

  try {
    if (db && db.orm && db.orm.users) {
      const pu = await db.orm.users.where({ email: userIdOrEmail }).first() || 
                 await db.orm.users.where({ _id: userIdOrEmail }).first();
      if (pu) return { _id: pu._id.toString(), name: pu.name, email: pu.email, role: pu.role, organizationId: pu.organizationId.toString() };
    }
  } catch (e) {}

  return null;
}

// Helper to look up project by ID
async function resolveProject(projectId) {
  if (!projectId) return null;
  try {
    const p = await Project.findById(projectId);
    if (p) return { _id: p._id.toString(), name: p.name, organizationId: p.organizationId };
  } catch (e) {}
  try {
    if (db && db.orm && db.orm.projects) {
      const pp = await db.orm.projects.where({ _id: projectId }).first();
      if (pp) return { _id: pp._id.toString(), name: pp.name, organizationId: pp.organizationId.toString() };
    }
  } catch (e) {}
  return null;
}

// Helper to look up organization by ID
async function resolveOrganization(orgId) {
  if (!orgId) return null;
  try {
    const org = await Organization.findById(orgId);
    if (org) return { _id: org._id.toString(), name: org.name };
  } catch (e) {}
  try {
    if (db && db.orm && db.orm.organizations) {
      const po = await db.orm.organizations.where({ _id: orgId }).first();
      if (po) return { _id: po._id.toString(), name: po.name };
    }
  } catch (e) {}
  return null;
}

class RiskController {
  // GET /api/risks - List with search, filters, pagination, and real aggregated metrics
  async list(req, res, next) {
    try {
      const {
        search,
        category,
        severity,
        status,
        ownerId,
        organizationId,
        projectId,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 10
      } = req.query;

      // Base tenant/role scoped filter initialized by riskAuth middleware
      const query = { ...req.riskQuery };

      if (category && category !== 'all') query.category = category;
      if (severity && severity !== 'all') query.severity = severity;
      if (status && status !== 'all') query.status = status;
      if (ownerId && ownerId !== 'all') query.ownerId = ownerId;
      if (projectId && projectId !== 'all') query.projectId = projectId;
      if (organizationId && organizationId !== 'all' && (req.user.role === 'SUPER_ADMIN' || req.user.role === 'PLATFORM_ADMIN')) {
        query.organizationId = organizationId;
      }

      // Fetch all candidate records matching the query
      let records = await Risk.find(query);
      if (!Array.isArray(records)) {
        records = records?.data || [];
      }

      // Apply in-memory text search if provided
      if (search && search.trim()) {
        const s = search.trim().toLowerCase();
        records = records.filter(r => 
          (r.title && r.title.toLowerCase().includes(s)) ||
          (r.description && r.description.toLowerCase().includes(s)) ||
          (r.category && r.category.toLowerCase().includes(s))
        );
      }

      // Compute REAL database metrics across the scoped records
      const totalRisks = records.length;
      const openRisks = records.filter(r => r.status === 'OPEN').length;
      const underReview = records.filter(r => r.status === 'UNDER_REVIEW').length;
      const highRisks = records.filter(r => r.severity === 'HIGH').length;
      const criticalRisks = records.filter(r => r.severity === 'CRITICAL').length;
      const mitigatedRisks = records.filter(r => r.status === 'MITIGATED').length;
      const closedRisks = records.filter(r => r.status === 'CLOSED').length;

      // Distribution aggregates
      const categoryDistribution = {};
      VALID_CATEGORIES.forEach(c => { categoryDistribution[c] = 0; });
      const severityDistribution = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
      const statusDistribution = { OPEN: 0, UNDER_REVIEW: 0, MITIGATION_IN_PROGRESS: 0, MITIGATED: 0, CLOSED: 0 };

      records.forEach(r => {
        if (categoryDistribution[r.category] !== undefined) categoryDistribution[r.category]++;
        if (severityDistribution[r.severity] !== undefined) severityDistribution[r.severity]++;
        if (statusDistribution[r.status] !== undefined) statusDistribution[r.status]++;
      });

      // Sorting
      records.sort((a, b) => {
        let valA = a[sortBy] ?? '';
        let valB = b[sortBy] ?? '';
        if (['probability', 'impact', 'risk_score', 'exposure', 'urgency'].includes(sortBy)) {
          return sortOrder === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
        }
        return sortOrder === 'asc' 
          ? String(valA).localeCompare(String(valB)) 
          : String(valB).localeCompare(String(valA));
      });

      // Pagination
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, parseInt(limit, 10) || 10);
      const startIndex = (pageNum - 1) * limitNum;
      const paginated = records.slice(startIndex, startIndex + limitNum);

      // Populate related metadata for the paginated slice
      const populated = await Promise.all(paginated.map(async (risk) => {
        const rObj = typeof risk.toObject === 'function' ? risk.toObject() : { ...risk };
        const [owner, project, org, creator] = await Promise.all([
          resolveUser(rObj.ownerId),
          resolveProject(rObj.projectId),
          resolveOrganization(rObj.organizationId),
          resolveUser(rObj.createdBy)
        ]);
        return {
          ...rObj,
          ownerName: owner?.name || 'Unassigned',
          ownerEmail: owner?.email || '',
          projectName: project?.name || 'General / Org Level',
          organizationName: org?.name || 'Organization',
          creatorName: creator?.name || 'System'
        };
      }));

      res.json({
        success: true,
        data: populated,
        summary: {
          totalRisks,
          openRisks,
          underReview,
          highRisks,
          criticalRisks,
          mitigatedRisks,
          closedRisks,
          categoryDistribution,
          severityDistribution,
          statusDistribution
        },
        pagination: {
          total: totalRisks,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalRisks / limitNum) || 1
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/risks/:id - Single risk detail with resolved metadata
  async getById(req, res, next) {
    try {
      const risk = await Risk.findById(req.params.id);
      if (!risk) {
        return res.status(404).json({ success: false, message: 'Risk record not found.' });
      }

      // Check organization scope for non-global admins
      const user = req.user;
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'PLATFORM_ADMIN') {
        if (risk.organizationId && risk.organizationId.toString() !== user.organizationId?.toString()) {
          return res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this risk.' });
        }
      }

      const rObj = typeof risk.toObject === 'function' ? risk.toObject() : { ...risk };
      const [owner, project, org, creator] = await Promise.all([
        resolveUser(rObj.ownerId),
        resolveProject(rObj.projectId),
        resolveOrganization(rObj.organizationId),
        resolveUser(rObj.createdBy)
      ]);

      res.json({
        success: true,
        data: {
          ...rObj,
          ownerName: owner?.name || 'Unassigned',
          ownerEmail: owner?.email || '',
          projectName: project?.name || 'General / Org Level',
          organizationName: org?.name || 'Organization',
          creatorName: creator?.name || 'System'
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/risks - Create new risk with validation, tenant check, and audit log
  async create(req, res, next) {
    try {
      const {
        title,
        description,
        category,
        probability,
        impact,
        severity,
        status = 'OPEN',
        organizationId,
        projectId,
        ownerId
      } = req.body;

      // 1. Validation
      if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ success: false, message: 'Risk title is required.' });
      }
      if (!description || typeof description !== 'string' || !description.trim()) {
        return res.status(400).json({ success: false, message: 'Risk description is required.' });
      }
      if (!category || !VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({ 
          success: false, 
          message: `Category is invalid. Must be one of: ${VALID_CATEGORIES.join(', ')}` 
        });
      }

      const probNum = Number(probability);
      if (isNaN(probNum) || probNum < 0 || probNum > 100) {
        return res.status(400).json({ success: false, message: 'Probability must be a number between 0 and 100.' });
      }

      const impactNum = Number(impact);
      if (isNaN(impactNum) || impactNum < 0 || impactNum > 100) {
        return res.status(400).json({ success: false, message: 'Impact must be a number between 0 and 100.' });
      }

      let expNum = 50;
      if (req.body.exposure !== undefined && req.body.exposure !== null) {
        expNum = Number(req.body.exposure);
        if (isNaN(expNum) || expNum < 0 || expNum > 100) {
          return res.status(400).json({ success: false, message: 'Exposure must be a number between 0 and 100.' });
        }
      }

      let urgNum = 50;
      if (req.body.urgency !== undefined && req.body.urgency !== null) {
        urgNum = Number(req.body.urgency);
        if (isNaN(urgNum) || urgNum < 0 || urgNum > 100) {
          return res.status(400).json({ success: false, message: 'Urgency must be a number between 0 and 100.' });
        }
      }

      // Authoritative calculation of risk score and severity
      const authoritativeScore = calculateRiskScore(probNum, impactNum, expNum, urgNum);
      const finalSeverity = (req.body.severity && VALID_SEVERITIES.includes(req.body.severity))
        ? req.body.severity
        : classifySeverity(authoritativeScore);
      const breakdown = getScoreBreakdown(probNum, impactNum, expNum, urgNum);

      if (status && !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ 
          success: false, 
          message: `Status is invalid. Must be one of: ${VALID_STATUSES.join(', ')}` 
        });
      }

      // 2. Validate organization and project relationship
      const targetOrgId = organizationId || req.user.organizationId;
      if (projectId) {
        const proj = await resolveProject(projectId);
        if (!proj) {
          return res.status(400).json({ success: false, message: 'Specified project does not exist.' });
        }
        if (proj.organizationId && proj.organizationId.toString() !== targetOrgId.toString() && req.user.role !== 'SUPER_ADMIN') {
          return res.status(400).json({ success: false, message: 'Project does not belong to the authorized organization.' });
        }
      }

      // 3. Validate owner if supplied
      if (ownerId) {
        const ownerUser = await resolveUser(ownerId);
        if (!ownerUser) {
          return res.status(400).json({ success: false, message: 'Assigned owner user was not found.' });
        }
        if (ownerUser.organizationId && ownerUser.organizationId.toString() !== targetOrgId.toString() && req.user.role !== 'SUPER_ADMIN') {
          return res.status(400).json({ success: false, message: 'Owner user does not belong to the target organization.' });
        }
      }

      const now = new Date().toISOString();
      const newRisk = await Risk.create({
        title: title.trim(),
        description: description.trim(),
        category,
        probability: probNum,
        impact: impactNum,
        exposure: expNum,
        urgency: urgNum,
        risk_score: authoritativeScore,
        score_version: 1,
        last_scored_at: now,
        severity: finalSeverity,
        status: status || 'OPEN',
        organizationId: targetOrgId.toString(),
        projectId: projectId ? projectId.toString() : null,
        ownerId: ownerId ? ownerId.toString() : null,
        createdBy: req.user.userId || req.user.email,
        createdAt: now,
        updatedAt: now
      });

      // Initial RiskHistory record
      await RiskHistory.create({
        risk_id: newRisk._id.toString(),
        old_score: null,
        new_score: authoritativeScore,
        old_severity: null,
        new_severity: finalSeverity,
        probability: probNum,
        impact: impactNum,
        exposure: expNum,
        urgency: urgNum,
        changed_by: req.user.email || req.user.name || 'User',
        reason: 'Initial risk score created',
        timestamp: now
      });

      // 4. Audit Log for creation
      await AuditLog.create({
        organizationId: targetOrgId.toString(),
        user: req.user.email || req.user.name || 'User',
        userId: req.user.userId || '',
        action: 'RISK_CREATED',
        riskId: newRisk._id.toString(),
        module: 'RiskManager',
        recordId: newRisk._id.toString(),
        newValue: JSON.stringify(newRisk),
        metadata: {
          title: newRisk.title,
          category: newRisk.category,
          severity: newRisk.severity,
          probability: newRisk.probability,
          impact: newRisk.impact,
          exposure: newRisk.exposure,
          urgency: newRisk.urgency,
          risk_score: authoritativeScore,
          status: newRisk.status
        },
        timestamp: now
      });

      // Audit Log for authoritative scoring
      await AuditLog.create({
        organizationId: targetOrgId.toString(),
        user: req.user.email || req.user.name || 'User',
        userId: req.user.userId || '',
        action: 'RISK_SCORED',
        riskId: newRisk._id.toString(),
        module: 'RiskManager',
        recordId: newRisk._id.toString(),
        oldValue: 'None',
        newValue: authoritativeScore.toString(),
        metadata: {
          score: authoritativeScore,
          severity: finalSeverity,
          scoreVersion: 1,
          breakdown,
          timestamp: now
        },
        timestamp: now
      });

      res.status(201).json({
        success: true,
        message: 'Risk record successfully created.',
        data: newRisk
      });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/risks/:id - Update risk details
  async update(req, res, next) {
    try {
      const risk = await Risk.findById(req.params.id);
      if (!risk) {
        return res.status(404).json({ success: false, message: 'Risk record not found.' });
      }

      // Scope check
      const user = req.user;
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'PLATFORM_ADMIN') {
        if (risk.organizationId && risk.organizationId.toString() !== user.organizationId?.toString()) {
          return res.status(403).json({ success: false, message: 'Forbidden: Cannot edit risk from another organization.' });
        }
      }

      const allowedUpdates = [
        'title', 'description', 'category', 'probability', 'impact',
        'exposure', 'urgency', 'severity', 'status', 'projectId', 'ownerId'
      ];

      const previousValue = typeof risk.toObject === 'function' ? risk.toObject() : { ...risk };
      const changedFields = {};

      if (req.body.title !== undefined) {
        if (!req.body.title.trim()) return res.status(400).json({ success: false, message: 'Title cannot be empty.' });
        risk.title = req.body.title.trim();
        changedFields.title = risk.title;
      }

      if (req.body.description !== undefined) {
        if (!req.body.description.trim()) return res.status(400).json({ success: false, message: 'Description cannot be empty.' });
        risk.description = req.body.description.trim();
        changedFields.description = risk.description;
      }

      if (req.body.category !== undefined) {
        if (!VALID_CATEGORIES.includes(req.body.category)) {
          return res.status(400).json({ success: false, message: 'Invalid category specified.' });
        }
        risk.category = req.body.category;
        changedFields.category = risk.category;
      }

      if (req.body.probability !== undefined) {
        const p = Number(req.body.probability);
        if (isNaN(p) || p < 0 || p > 100) return res.status(400).json({ success: false, message: 'Probability must be 0-100.' });
        risk.probability = p;
        changedFields.probability = p;
      }

      if (req.body.impact !== undefined) {
        const imp = Number(req.body.impact);
        if (isNaN(imp) || imp < 0 || imp > 100) return res.status(400).json({ success: false, message: 'Impact must be 0-100.' });
        risk.impact = imp;
        changedFields.impact = imp;
      }

      if (req.body.exposure !== undefined) {
        const exp = Number(req.body.exposure);
        if (isNaN(exp) || exp < 0 || exp > 100) return res.status(400).json({ success: false, message: 'Exposure must be 0-100.' });
        risk.exposure = exp;
        changedFields.exposure = exp;
      }

      if (req.body.urgency !== undefined) {
        const urg = Number(req.body.urgency);
        if (isNaN(urg) || urg < 0 || urg > 100) return res.status(400).json({ success: false, message: 'Urgency must be 0-100.' });
        risk.urgency = urg;
        changedFields.urgency = urg;
      }

      if (req.body.status !== undefined) {
        if (!VALID_STATUSES.includes(req.body.status)) {
          return res.status(400).json({ success: false, message: 'Invalid status specified.' });
        }
        risk.status = req.body.status;
        changedFields.status = risk.status;
      }

      if (req.body.projectId !== undefined) {
        risk.projectId = req.body.projectId ? req.body.projectId.toString() : null;
        changedFields.projectId = risk.projectId;
      }

      if (req.body.ownerId !== undefined) {
        risk.ownerId = req.body.ownerId ? req.body.ownerId.toString() : null;
        changedFields.ownerId = risk.ownerId;
      }

      const now = new Date().toISOString();

      // Check if any scoring factors were modified
      const factorsChanged = (
        req.body.probability !== undefined ||
        req.body.impact !== undefined ||
        req.body.exposure !== undefined ||
        req.body.urgency !== undefined
      );

      let oldScore = previousValue.risk_score;
      let oldSev = previousValue.severity;
      let newScore = risk.risk_score;
      let newSev = risk.severity;

      if (factorsChanged) {
        newScore = calculateRiskScore(risk.probability, risk.impact, risk.exposure, risk.urgency);
        newSev = (req.body.severity && VALID_SEVERITIES.includes(req.body.severity))
          ? req.body.severity
          : classifySeverity(newScore);
        risk.risk_score = newScore;
        risk.severity = newSev;
        risk.score_version = (risk.score_version || 1) + 1;
        risk.last_scored_at = now;
        changedFields.risk_score = newScore;
        changedFields.severity = newSev;

        // Record in RiskHistory
        await RiskHistory.create({
          risk_id: risk._id.toString(),
          old_score: oldScore,
          new_score: newScore,
          old_severity: oldSev,
          new_severity: newSev,
          probability: risk.probability,
          impact: risk.impact,
          exposure: risk.exposure,
          urgency: risk.urgency,
          changed_by: req.user.email || req.user.name || 'User',
          reason: req.body.reason || 'Factors updated via edit',
          timestamp: now
        });
      } else if (req.body.severity !== undefined) {
        if (!VALID_SEVERITIES.includes(req.body.severity)) {
          return res.status(400).json({ success: false, message: 'Invalid severity specified.' });
        }
        risk.severity = req.body.severity;
        changedFields.severity = risk.severity;
      }

      risk.updatedAt = now;
      await risk.save();

      // Audit Log for update
      await AuditLog.create({
        organizationId: risk.organizationId,
        user: req.user.email || req.user.name || 'User',
        userId: req.user.userId || '',
        action: 'RISK_UPDATED',
        riskId: risk._id.toString(),
        module: 'RiskManager',
        recordId: risk._id.toString(),
        oldValue: JSON.stringify(previousValue),
        newValue: JSON.stringify(risk),
        metadata: {
          changedFields,
          updatedBy: req.user.email
        },
        timestamp: now
      });

      // Audit Log for score change if score changed
      if (factorsChanged && oldScore !== newScore) {
        await AuditLog.create({
          organizationId: risk.organizationId,
          user: req.user.email || req.user.name || 'User',
          userId: req.user.userId || '',
          action: 'RISK_SCORE_CHANGED',
          riskId: risk._id.toString(),
          module: 'RiskManager',
          recordId: risk._id.toString(),
          oldValue: String(oldScore),
          newValue: String(newScore),
          metadata: { difference: Math.round((newScore - oldScore) * 100) / 100 },
          timestamp: now
        });
      }

      // Audit Log for severity change if severity changed
      if (factorsChanged && oldSev !== newSev) {
        await AuditLog.create({
          organizationId: risk.organizationId,
          user: req.user.email || req.user.name || 'User',
          userId: req.user.userId || '',
          action: 'RISK_SEVERITY_CHANGED',
          riskId: risk._id.toString(),
          module: 'RiskManager',
          recordId: risk._id.toString(),
          oldValue: oldSev,
          newValue: newSev,
          metadata: { from: oldSev, to: newSev },
          timestamp: now
        });
      }

      res.json({
        success: true,
        message: 'Risk record successfully updated.',
        data: risk
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/risks/:id/score - Authoritative score recalculation
  async recalculateScore(req, res, next) {
    try {
      const risk = await Risk.findById(req.params.id);
      if (!risk) {
        return res.status(404).json({ success: false, message: 'Risk record not found.' });
      }

      const user = req.user;
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'PLATFORM_ADMIN') {
        if (risk.organizationId && risk.organizationId.toString() !== user.organizationId?.toString()) {
          return res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this risk.' });
        }
      }

      const { probability, impact, exposure, urgency, reason } = req.body;
      if (probability !== undefined) {
        const p = Number(probability);
        if (isNaN(p) || p < 0 || p > 100) return res.status(400).json({ success: false, message: 'Probability must be 0-100.' });
        risk.probability = p;
      }
      if (impact !== undefined) {
        const i = Number(impact);
        if (isNaN(i) || i < 0 || i > 100) return res.status(400).json({ success: false, message: 'Impact must be 0-100.' });
        risk.impact = i;
      }
      if (exposure !== undefined) {
        const e = Number(exposure);
        if (isNaN(e) || e < 0 || e > 100) return res.status(400).json({ success: false, message: 'Exposure must be 0-100.' });
        risk.exposure = e;
      }
      if (urgency !== undefined) {
        const u = Number(urgency);
        if (isNaN(u) || u < 0 || u > 100) return res.status(400).json({ success: false, message: 'Urgency must be 0-100.' });
        risk.urgency = u;
      }

      const oldScore = risk.risk_score;
      const oldSev = risk.severity;
      const newScore = calculateRiskScore(risk.probability, risk.impact, risk.exposure, risk.urgency);
      const newSev = classifySeverity(newScore);
      const newVersion = (risk.score_version || 1) + 1;
      const now = new Date().toISOString();

      risk.risk_score = newScore;
      risk.severity = newSev;
      risk.score_version = newVersion;
      risk.last_scored_at = now;
      risk.updatedAt = now;
      await risk.save();

      const breakdown = getScoreBreakdown(risk.probability, risk.impact, risk.exposure, risk.urgency);

      await RiskHistory.create({
        risk_id: risk._id.toString(),
        old_score: oldScore,
        new_score: newScore,
        old_severity: oldSev,
        new_severity: newSev,
        probability: risk.probability,
        impact: risk.impact,
        exposure: risk.exposure,
        urgency: risk.urgency,
        changed_by: user.email || user.name || 'User',
        reason: reason || 'Manual score recalculation',
        timestamp: now
      });

      await AuditLog.create({
        organizationId: risk.organizationId,
        user: user.email || user.name || 'User',
        userId: user.userId || '',
        action: 'RISK_SCORED',
        riskId: risk._id.toString(),
        module: 'RiskManager',
        recordId: risk._id.toString(),
        oldValue: String(oldScore),
        newValue: String(newScore),
        metadata: {
          oldScore,
          newScore,
          oldSeverity: oldSev,
          newSeverity: newSev,
          scoreVersion: newVersion,
          breakdown,
          reason,
          timestamp: now
        },
        timestamp: now
      });

      if (oldScore !== newScore) {
        await AuditLog.create({
          organizationId: risk.organizationId,
          user: user.email || user.name || 'User',
          userId: user.userId || '',
          action: 'RISK_SCORE_CHANGED',
          riskId: risk._id.toString(),
          module: 'RiskManager',
          recordId: risk._id.toString(),
          oldValue: String(oldScore),
          newValue: String(newScore),
          metadata: { difference: Math.round((newScore - oldScore) * 100) / 100 },
          timestamp: now
        });
      }

      if (oldSev !== newSev) {
        await AuditLog.create({
          organizationId: risk.organizationId,
          user: user.email || user.name || 'User',
          userId: user.userId || '',
          action: 'RISK_SEVERITY_CHANGED',
          riskId: risk._id.toString(),
          module: 'RiskManager',
          recordId: risk._id.toString(),
          oldValue: oldSev,
          newValue: newSev,
          metadata: { from: oldSev, to: newSev },
          timestamp: now
        });
      }

      res.json({
        success: true,
        message: `Authoritative score recalculated to ${newScore} (${newSev}).`,
        data: {
          risk_id: risk._id.toString(),
          risk_score: newScore,
          severity: newSev,
          score_version: newVersion,
          last_scored_at: now,
          breakdown
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/risks/:id/score-history - Chronological score history
  async getScoreHistory(req, res, next) {
    try {
      const risk = await Risk.findById(req.params.id);
      if (!risk) {
        return res.status(404).json({ success: false, message: 'Risk record not found.' });
      }

      const user = req.user;
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'PLATFORM_ADMIN') {
        if (risk.organizationId && risk.organizationId.toString() !== user.organizationId?.toString()) {
          return res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this risk.' });
        }
      }

      let histories = await RiskHistory.find({ risk_id: req.params.id }).sort({ timestamp: -1 });
      if (!Array.isArray(histories)) histories = histories?.data || [];

      res.json({
        success: true,
        data: histories
      });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/risks/:id - Delete risk record
  async delete(req, res, next) {
    try {
      const risk = await Risk.findById(req.params.id);
      if (!risk) {
        return res.status(404).json({ success: false, message: 'Risk record not found.' });
      }

      const user = req.user;
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'PLATFORM_ADMIN') {
        if (risk.organizationId && risk.organizationId.toString() !== user.organizationId?.toString()) {
          return res.status(403).json({ success: false, message: 'Forbidden: Cannot delete risk from another organization.' });
        }
      }

      const now = new Date().toISOString();
      const riskId = risk._id.toString();
      const orgId = risk.organizationId;
      const title = risk.title;

      await Risk.findByIdAndDelete(risk._id);

      await AuditLog.create({
        organizationId: orgId,
        user: req.user.email || req.user.name || 'User',
        userId: req.user.userId || '',
        action: 'RISK_DELETED',
        riskId,
        module: 'RiskManager',
        recordId: riskId,
        metadata: {
          deletedTitle: title,
          deletedBy: req.user.email,
          timestamp: now
        },
        timestamp: now
      });

      res.json({
        success: true,
        message: `Risk "${title}" was successfully deleted.`
      });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/risks/:id/status - Status change
  async updateStatus(req, res, next) {
    try {
      const { status, reason } = req.body;
      if (!status || !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ 
          success: false, 
          message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` 
        });
      }

      const risk = await Risk.findById(req.params.id);
      if (!risk) {
        return res.status(404).json({ success: false, message: 'Risk record not found.' });
      }

      const user = req.user;
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'PLATFORM_ADMIN') {
        if (risk.organizationId && risk.organizationId.toString() !== user.organizationId?.toString()) {
          return res.status(403).json({ success: false, message: 'Forbidden: Cannot update risk from another organization.' });
        }
      }

      const oldStatus = risk.status;
      risk.status = status;
      const now = new Date().toISOString();
      risk.updatedAt = now;
      await risk.save();

      await AuditLog.create({
        organizationId: risk.organizationId,
        user: req.user.email || req.user.name || 'User',
        userId: req.user.userId || '',
        action: 'RISK_STATUS_CHANGED',
        riskId: risk._id.toString(),
        module: 'RiskManager',
        recordId: risk._id.toString(),
        oldValue: oldStatus,
        newValue: status,
        metadata: {
          oldStatus,
          newStatus: status,
          reason: reason || '',
          changedBy: req.user.email,
          timestamp: now
        },
        timestamp: now
      });

      res.json({
        success: true,
        message: `Status updated from ${oldStatus} to ${status}.`,
        data: risk
      });
    } catch (err) {
      next(err);
    }
  }

  // PATCH /api/risks/:id/owner - Owner assignment
  async updateOwner(req, res, next) {
    try {
      const { ownerId } = req.body;
      const risk = await Risk.findById(req.params.id);
      if (!risk) {
        return res.status(404).json({ success: false, message: 'Risk record not found.' });
      }

      const user = req.user;
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'PLATFORM_ADMIN') {
        if (risk.organizationId && risk.organizationId.toString() !== user.organizationId?.toString()) {
          return res.status(403).json({ success: false, message: 'Forbidden: Cannot assign owner on another organization\'s risk.' });
        }
      }

      let ownerName = 'Unassigned';
      if (ownerId) {
        const ownerUser = await resolveUser(ownerId);
        if (!ownerUser) {
          return res.status(400).json({ success: false, message: 'Selected owner user does not exist.' });
        }
        if (ownerUser.organizationId && ownerUser.organizationId.toString() !== risk.organizationId.toString() && user.role !== 'SUPER_ADMIN') {
          return res.status(400).json({ success: false, message: 'Selected owner does not belong to the risk\'s organization.' });
        }
        ownerName = ownerUser.name;
      }

      const oldOwnerId = risk.ownerId;
      risk.ownerId = ownerId ? ownerId.toString() : null;
      const now = new Date().toISOString();
      risk.updatedAt = now;
      await risk.save();

      await AuditLog.create({
        organizationId: risk.organizationId,
        user: req.user.email || req.user.name || 'User',
        userId: req.user.userId || '',
        action: 'RISK_ASSIGNED',
        riskId: risk._id.toString(),
        module: 'RiskManager',
        recordId: risk._id.toString(),
        oldValue: oldOwnerId || 'None',
        newValue: ownerId || 'None',
        metadata: {
          previousOwnerId: oldOwnerId,
          newOwnerId: ownerId,
          newOwnerName: ownerName,
          assignedBy: req.user.email,
          timestamp: now
        },
        timestamp: now
      });

      res.json({
        success: true,
        message: `Owner successfully updated to ${ownerName}.`,
        data: risk
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/risks/meta/assignable-users - List authorized users for owner assignment
  async getAssignableUsers(req, res, next) {
    try {
      const user = req.user;
      const targetOrgId = req.query.organizationId || user.organizationId;
      
      let users = [];
      try {
        if (user.role === 'SUPER_ADMIN' && !req.query.organizationId) {
          users = await User.find({});
        } else {
          users = await User.find({ organizationId: targetOrgId });
        }
      } catch (e) {
        users = [];
      }

      // Also gather from Prisma db if available
      try {
        if (db && db.orm && db.orm.users) {
          const prismaUsers = await db.orm.users.all();
          const filteredPrisma = (user.role === 'SUPER_ADMIN' && !req.query.organizationId)
            ? prismaUsers
            : prismaUsers.filter(u => u.organizationId && u.organizationId.toString() === targetOrgId?.toString());
          
          filteredPrisma.forEach(pu => {
            if (!users.some(u => u.email === pu.email)) {
              users.push({
                _id: pu._id.toString(),
                name: pu.name,
                email: pu.email,
                role: pu.role,
                organizationId: pu.organizationId.toString()
              });
            }
          });
        }
      } catch (e) {}

      res.json({
        success: true,
        data: users.map(u => ({
          _id: u._id.toString(),
          name: u.name,
          email: u.email,
          role: u.role
        }))
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/risks/meta/projects - List authorized projects
  async getProjects(req, res, next) {
    try {
      const user = req.user;
      const targetOrgId = req.query.organizationId || user.organizationId;
      
      let projects = [];
      try {
        const query = (user.role === 'SUPER_ADMIN' && !req.query.organizationId) 
          ? {} 
          : { organizationId: targetOrgId };
        projects = await Project.find(query);
      } catch (e) {
        projects = [];
      }

      // Also gather from Prisma db if available
      try {
        if (db && db.orm && db.orm.projects) {
          const prismaProjects = await db.orm.projects.all();
          const filteredPrisma = (user.role === 'SUPER_ADMIN' && !req.query.organizationId)
            ? prismaProjects
            : prismaProjects.filter(p => p.organizationId && p.organizationId.toString() === targetOrgId?.toString());

          filteredPrisma.forEach(pp => {
            if (!projects.some(p => p._id.toString() === pp._id.toString())) {
              projects.push({
                _id: pp._id.toString(),
                name: pp.name,
                organizationId: pp.organizationId.toString()
              });
            }
          });
        }
      } catch (e) {}

      res.json({
        success: true,
        data: projects.map(p => ({
          _id: p._id.toString(),
          name: p.name,
          category: p.category
        }))
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/risks/meta/organizations - List organizations for admins
  async getOrganizations(req, res, next) {
    try {
      let orgs = [];
      try {
        orgs = await Organization.find({});
      } catch (e) {
        orgs = [];
      }
      try {
        if (db && db.orm && db.orm.organizations) {
          const prismaOrgs = await db.orm.organizations.all();
          prismaOrgs.forEach(po => {
            if (!orgs.some(o => o.name === po.name)) {
              orgs.push({
                _id: po._id.toString(),
                name: po.name,
                type: po.type
              });
            }
          });
        }
      } catch (e) {}

      res.json({
        success: true,
        data: orgs.map(o => ({
          _id: o._id.toString(),
          name: o.name
        }))
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/risks/audit-logs - Query audit logs with filters
  async getAuditLogs(req, res, next) {
    try {
      const {
        riskId,
        action,
        module: moduleFilter,
        user: actorFilter,
        dateFrom,
        dateTo,
        page = 1,
        limit = 50
      } = req.query;

      const currentUser = req.user;
      const allowedModules = [
        'RiskManager', 'KnowledgeBase', 'AIAgent', 'Monitoring',
        'PredictiveIntelligence', 'ExecutiveIntelligence', 'DecisionIntelligence',
        'ScenarioEngine', 'IntegrationsFramework', 'PilotReadiness', 'SecurityAdmin',
        'CommandCenter', 'Collaboration', 'Optimization'
      ];
      const query = {};
      if (moduleFilter) {
        query.module = moduleFilter;
      } else {
        query.module = { $in: allowedModules };
      }

      if (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'PLATFORM_ADMIN') {
        query.organizationId = currentUser.organizationId;
      }

      if (riskId) query.riskId = riskId;
      if (action && action !== 'all') query.action = action;

      let logs = await AuditLog.find(query);
      if (!Array.isArray(logs)) logs = logs?.data || [];

      // Filter by user/actor
      if (actorFilter && actorFilter.trim()) {
        const act = actorFilter.trim().toLowerCase();
        logs = logs.filter(l => (l.user && l.user.toLowerCase().includes(act)));
      }

      // Filter by date range
      if (dateFrom) {
        const fTime = new Date(dateFrom).getTime();
        logs = logs.filter(l => new Date(l.timestamp).getTime() >= fTime);
      }
      if (dateTo) {
        const tTime = new Date(dateTo).getTime();
        logs = logs.filter(l => new Date(l.timestamp).getTime() <= tTime);
      }

      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, parseInt(limit, 10) || 20);
      const startIndex = (pageNum - 1) * limitNum;
      const paginated = logs.slice(startIndex, startIndex + limitNum);

      res.json({
        success: true,
        data: paginated,
        pagination: {
          total: logs.length,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(logs.length / limitNum) || 1
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/risks/:id/analyze - LLM-Powered AI Risk Analysis (Phase 3)
  async analyzeRisk(req, res, next) {
    try {
      const user = req.user;
      if (user.role === 'VIEWER') {
        return res.status(403).json({ success: false, message: 'Forbidden: Viewers are not permitted to trigger AI analysis.' });
      }

      const risk = await Risk.findById(req.params.id);
      if (!risk) {
        return res.status(404).json({ success: false, message: 'Risk record not found.' });
      }

      // Multi-tenant check
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'PLATFORM_ADMIN') {
        if (risk.organizationId && risk.organizationId.toString() !== user.organizationId?.toString()) {
          return res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this risk.' });
        }
      }

      const [project, org] = await Promise.all([
        resolveProject(risk.projectId),
        resolveOrganization(risk.organizationId)
      ]);

      // Recent score history context
      let historySummary = null;
      try {
        const histories = await RiskHistory.find({ risk_id: risk._id.toString() });
        const list = Array.isArray(histories) ? histories : (histories?.data || []);
        list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (list.length > 0) {
          historySummary = list.slice(0, 3).map(h => `v: ${h.old_score ?? 'init'} -> ${h.new_score} (${h.reason || 'manual'})`).join('; ');
        }
      } catch (hErr) {}

      const startTime = new Date().toISOString();

      // Emit AI_RISK_ANALYSIS_STARTED audit event
      await AuditLog.create({
        organizationId: risk.organizationId,
        user: user.email || user.name || 'User',
        userId: user.userId || user._id?.toString() || '',
        action: 'AI_RISK_ANALYSIS_STARTED',
        riskId: risk._id.toString(),
        module: 'RiskManager',
        recordId: risk._id.toString(),
        metadata: {
          category: risk.category,
          risk_score: risk.risk_score,
          severity: risk.severity,
          timestamp: startTime
        },
        timestamp: startTime
      });

      const pythonServiceUrl = process.env.PYTHON_AI_URL || 'http://localhost:8000';
      const internalKey = process.env.INTERNAL_SERVICE_KEY || 'esg-ai-internal-service-key-secret-2026';

      // 1. RAG Knowledge Retrieval Step
      let retrievedEvidence = [];
      const ragStartTime = new Date().toISOString();

      try {
        await AuditLog.create({
          organizationId: risk.organizationId,
          user: user.email || user.name || 'User',
          userId: user.userId || user._id?.toString() || '',
          action: 'RAG_RETRIEVAL_STARTED',
          riskId: risk._id.toString(),
          module: 'KnowledgeBase',
          recordId: risk._id.toString(),
          metadata: {
            risk_id: risk._id.toString(),
            category: risk.category,
            timestamp: ragStartTime
          },
          timestamp: ragStartTime
        });

        const ragSearchPayload = {
          query_text: `${risk.title}. ${risk.description}. Category: ${risk.category}. Severity: ${risk.severity}.`,
          organization_id: risk.organizationId ? risk.organizationId.toString() : '',
          project_id: risk.projectId ? risk.projectId.toString() : null,
          category: null,
          top_k: 5,
          min_score: 0.1
        };

        const ragSearchRes = await fetch(`${pythonServiceUrl}/internal/knowledge/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Service-Key': internalKey
          },
          body: JSON.stringify(ragSearchPayload)
        });

        if (ragSearchRes.ok) {
          retrievedEvidence = await ragSearchRes.json();
          const ragEndTime = new Date().toISOString();
          await AuditLog.create({
            organizationId: risk.organizationId,
            user: user.email || user.name || 'User',
            userId: user.userId || user._id?.toString() || '',
            action: 'RAG_RETRIEVAL_COMPLETED',
            riskId: risk._id.toString(),
            module: 'KnowledgeBase',
            recordId: risk._id.toString(),
            metadata: {
              risk_id: risk._id.toString(),
              chunks_retrieved: retrievedEvidence.length,
              timestamp: ragEndTime
            },
            timestamp: ragEndTime
          });
        } else {
          await AuditLog.create({
            organizationId: risk.organizationId,
            user: user.email || user.name || 'User',
            userId: user.userId || user._id?.toString() || '',
            action: 'RAG_RETRIEVAL_FAILED',
            riskId: risk._id.toString(),
            module: 'KnowledgeBase',
            recordId: risk._id.toString(),
            metadata: {
              risk_id: risk._id.toString(),
              status: ragSearchRes.status,
              timestamp: new Date().toISOString()
            },
            timestamp: new Date().toISOString()
          });
        }
      } catch (ragErr) {
        console.warn('RAG retrieval warning:', ragErr.message);
      }

      // Prepare sanitized AI context (no tokens, credentials, or internal details)
      const aiContext = {
        risk_id: risk._id.toString(),
        title: risk.title,
        description: risk.description,
        category: risk.category,
        probability: Number(risk.probability),
        impact: Number(risk.impact),
        exposure: Number(risk.exposure !== undefined ? risk.exposure : 50),
        urgency: Number(risk.urgency !== undefined ? risk.urgency : 50),
        risk_score: Number(risk.risk_score !== undefined ? risk.risk_score : 50),
        severity: risk.severity,
        status: risk.status,
        organization_name: org?.name || 'Enterprise Organization',
        project_name: project?.name || 'General / Organization Level',
        history_summary: historySummary,
        retrieved_evidence: retrievedEvidence
      };

      let aiResponse;
      try {
        aiResponse = await fetch(`${pythonServiceUrl}/internal/risk/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Service-Key': internalKey
          },
          body: JSON.stringify(aiContext)
        });
      } catch (netErr) {
        // Emit failure audit
        await AuditLog.create({
          organizationId: risk.organizationId,
          user: user.email || user.name || 'User',
          userId: user.userId || user._id?.toString() || '',
          action: 'AI_RISK_ANALYSIS_FAILED',
          riskId: risk._id.toString(),
          module: 'RiskManager',
          recordId: risk._id.toString(),
          metadata: {
            error_category: 'NETWORK_ERROR',
            error: netErr.message,
            timestamp: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        });

        return res.status(502).json({
          success: false,
          message: 'Python AI analysis service is unreachable. Ensure the AI service is running.'
        });
      }

      const responseJson = await aiResponse.json();
      if (!aiResponse.ok || !responseJson.success || !responseJson.data) {
        await AuditLog.create({
          organizationId: risk.organizationId,
          user: user.email || user.name || 'User',
          userId: user.userId || user._id?.toString() || '',
          action: 'AI_RISK_ANALYSIS_FAILED',
          riskId: risk._id.toString(),
          module: 'RiskManager',
          recordId: risk._id.toString(),
          metadata: {
            error_category: 'AI_SERVICE_ERROR',
            status: aiResponse.status,
            error: responseJson.detail || responseJson.message || 'AI service returned error',
            timestamp: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        });

        return res.status(aiResponse.status >= 400 && aiResponse.status < 500 ? 400 : 502).json({
          success: false,
          message: responseJson.detail || 'AI analysis failed to generate a valid structured response.'
        });
      }

      const aiData = responseJson.data;
      const analysis_id = `ana_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const completedTime = new Date().toISOString();

      const analysisDoc = await AIRiskAnalysis.create({
        analysis_id,
        risk_id: risk._id.toString(),
        organization_id: risk.organizationId || '',
        summary: aiData.summary,
        key_factors: aiData.key_factors,
        potential_impact: aiData.potential_impact,
        recommendations: aiData.recommendations,
        confidence: aiData.confidence,
        evidence: aiData.evidence || [],
        embedding_model: responseJson.embedding_model || '',
        model: responseJson.model || 'deterministic-risk-analyst-v1',
        prompt_version: responseJson.prompt_version || '1.0.0',
        created_by: user.email || user.name || 'User',
        created_at: completedTime
      });

      // Emit AI_RISK_ANALYSIS_WITH_RAG audit event if evidence citations were used
      if (aiData.evidence && aiData.evidence.length > 0) {
        await AuditLog.create({
          organizationId: risk.organizationId,
          user: user.email || user.name || 'User',
          userId: user.userId || user._id?.toString() || '',
          action: 'AI_RISK_ANALYSIS_WITH_RAG',
          riskId: risk._id.toString(),
          module: 'RiskManager',
          recordId: analysis_id,
          metadata: {
            analysis_id,
            evidence_count: aiData.evidence.length,
            sources: aiData.evidence.map(e => e.filename),
            timestamp: completedTime
          },
          timestamp: completedTime
        });
      }

      // Emit AI_RISK_ANALYSIS_COMPLETED audit event
      await AuditLog.create({
        organizationId: risk.organizationId,
        user: user.email || user.name || 'User',
        userId: user.userId || user._id?.toString() || '',
        action: 'AI_RISK_ANALYSIS_COMPLETED',
        riskId: risk._id.toString(),
        module: 'RiskManager',
        recordId: analysis_id,
        metadata: {
          analysis_id,
          confidence: aiData.confidence,
          evidence_count: (aiData.evidence || []).length,
          model: responseJson.model,
          prompt_version: responseJson.prompt_version,
          timestamp: completedTime
        },
        timestamp: completedTime
      });

      res.status(200).json({
        success: true,
        data: analysisDoc
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/risks/:id/ai-analyses - Historical AI analyses for a risk
  async getRiskAnalyses(req, res, next) {
    try {
      const risk = await Risk.findById(req.params.id);
      if (!risk) {
        return res.status(404).json({ success: false, message: 'Risk record not found.' });
      }

      const user = req.user;
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'PLATFORM_ADMIN') {
        if (risk.organizationId && risk.organizationId.toString() !== user.organizationId?.toString()) {
          return res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this risk.' });
        }
      }

      let analyses = await AIRiskAnalysis.find({ risk_id: req.params.id });
      if (!Array.isArray(analyses)) analyses = analyses?.data || [];
      analyses.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      res.json({
        success: true,
        data: analyses
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/ai-risk/analyses/:analysisId - Specific analysis record
  async getAnalysisById(req, res, next) {
    try {
      const { analysisId } = req.params;
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(analysisId);
      const query = isObjectId 
        ? { $or: [{ analysis_id: analysisId }, { _id: analysisId }] }
        : { analysis_id: analysisId };
      const analysis = await AIRiskAnalysis.findOne(query);

      if (!analysis) {
        return res.status(404).json({ success: false, message: 'AI Analysis record not found.' });
      }

      const user = req.user;
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'PLATFORM_ADMIN') {
        if (analysis.organization_id && analysis.organization_id.toString() !== user.organizationId?.toString()) {
          return res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this analysis.' });
        }
      }

      res.json({
        success: true,
        data: analysis
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RiskController();
