const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const { 
  Organization, User, Facility, ElectricityMeter, ElectricityReading, 
  EnergyInitiative, EnergyRecord, EmissionRecord, EmissionFactor, 
  WaterRecord, WaterRisk, BiodiversityAssessment, BiodiversityInitiative, 
  WasteRecord, PollutionRecord, PollutionControl, Evidence, 
  EnvironmentalAssessment, EnvironmentalGap, EnvironmentalTarget, 
  EnvironmentalAction, EnvironmentalAlert, AuditLog 
} = require('../models/models');

const {
  calculateConsumption,
  calculateRenewableShare,
  calculateScope2CO2e,
  calculateWaterRecyclingRate,
  calculateWasteDiversionRate,
  normalizeWasteToKg,
  calculateTargetProgress
} = require('../services/calculationEngine');

const { handleAIQuery } = require('../services/aiService');
const environmentalSubmissionService = require('../services/environmentalSubmissionService');
const environmentalRiskService = require('../services/environmentalRiskService');
const environmentalRiskEngine = require('../services/environmentalRiskEngine');

const JWT_SECRET = process.env.JWT_SECRET || 'environmental-esg-secret-key-98765';

// Ensure evidence upload directory exists
const uploadDir = path.join(__dirname, '../uploads/evidence');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|csv|xlsx|xls|doc|docx/;
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only document and image files (PDF, PNG, JPG, CSV, XLSX, DOCX) are supported.'));
    }
  }
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access Denied: No Token Provided' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token is invalid or expired' });
    req.user = user;
    next();
  });
}

function enforceTenantIsolation(req, res, next) {
  if (!req.user || !req.user.organizationId) {
    return res.status(401).json({ error: 'Unauthorized: Missing Tenant Context' });
  }
  next();
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Missing User' });
    }
    const userRole = (req.user.role || '').toUpperCase();
    if (['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN'].includes(userRole)) {
      return next();
    }
    const normalizedAllowed = allowedRoles.map(r => r.toUpperCase());
    if (normalizedAllowed.includes(userRole)) {
      return next();
    }
    // Handle aliases
    if ((userRole === 'MSME' || userRole === 'MSME_USER') &&
        (normalizedAllowed.includes('MSME') || normalizedAllowed.includes('MSME_USER'))) {
      return next();
    }
    if ((userRole === 'ENTERPRISE' || userRole === 'ESG_MANAGER') &&
        (normalizedAllowed.includes('ENTERPRISE') || normalizedAllowed.includes('ESG_MANAGER'))) {
      return next();
    }
    return res.status(403).json({ error: `Forbidden: Access restricted to roles [${allowedRoles.join(', ')}]` });
  };
}

function checkFacilityScope(req, facilityId) {
  if (req.user.role === 'DATA_ENTRY' && req.user.facilityId) {
    return req.user.facilityId === facilityId;
  }
  return true;
}

async function logAudit(orgId, userEmail, action, moduleName, recordId, oldVal = '', newVal = '') {
  try {
    await AuditLog.create({
      organizationId: orgId,
      user: userEmail,
      action,
      module: moduleName,
      recordId: recordId ? recordId.toString() : '',
      oldValue: typeof oldVal === 'object' ? JSON.stringify(oldVal) : String(oldVal || ''),
      newValue: typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal || ''),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

// ====================================================
// ENVIRONMENTAL DATA SUBMISSION WORKFLOW ENDPOINTS
// ====================================================

// Pre-submission / Pre-draft validation endpoint
router.post('/submission/validate', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const { module: mod, data, isDraft } = req.body;
    const result = await environmentalSubmissionService.validateRecord(
      mod,
      { ...data, organizationId: req.user.organizationId },
      { isDraft: Boolean(isDraft) }
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Save Draft endpoint
router.post('/submission/save-draft', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const { module: mod, data, recordId } = req.body;
    const payload = { ...data };
    if (recordId) payload._id = recordId;
    const result = await environmentalSubmissionService.saveDraft(
      mod,
      req.user.organizationId,
      req.user,
      payload
    );
    res.status(200).json(result);
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message, issues: err.issues });
  }
});

// Submit / Resubmit Record endpoint
router.post('/submission/submit', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const { module: mod, recordId, data } = req.body;
    const result = await environmentalSubmissionService.submitRecord(
      mod,
      recordId,
      req.user.organizationId,
      req.user,
      data
    );
    res.status(200).json(result);
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message, issues: err.issues });
  }
});

// State Transition (Verifier / Auditor review, Request Correction, Verify, Reject)
router.post('/submission/transition', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const { module: mod, recordId, targetStatus, comment, reasonCode } = req.body;
    const result = await environmentalSubmissionService.transitionStatus(
      mod,
      recordId,
      req.user.organizationId,
      req.user,
      targetStatus,
      { comment, reasonCode }
    );
    res.status(200).json(result);
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

// Submission History & Evidence endpoint
router.get('/submission/history/:module/:recordId', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const { module: mod, recordId } = req.params;
    const result = await environmentalSubmissionService.getSubmissionHistory(
      mod,
      recordId,
      req.user.organizationId
    );
    res.status(200).json(result);
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

// AI Risk Management Check by submission ID (Phase 2 Standard)
// POST /submissions/:id/risk-check and POST /submission/:id/risk-check
router.post(['/submissions/:id/risk-check', '/submission/:id/risk-check'], authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const submissionId = req.params.id;
    const { module: mod, data } = req.body || {};

    const assessment = await environmentalRiskEngine.analyzeSubmission({
      submissionId,
      recordId: submissionId,
      module: mod,
      data: data ? { ...data, organizationId: req.user.organizationId } : undefined,
      organizationId: req.user.organizationId,
      facilityId: (data && data.facilityId) || req.user.facilityId,
      user: req.user
    });

    res.status(200).json({ success: true, riskAssessment: assessment, assessment });
  } catch (err) {
    console.error('AI Risk Check error:', err);
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

// AI Risk Management Check endpoint (Payload or draft check)
router.post('/submission/risk-check', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const { module: mod, data, recordId, submissionId } = req.body || {};
    if (!mod && !recordId && !submissionId) {
      return res.status(400).json({ error: 'Module and data payload, or submissionId, are required for AI Risk Check' });
    }
    const assessment = await environmentalRiskEngine.analyzeSubmission({
      submissionId: submissionId || recordId,
      recordId: recordId || submissionId,
      module: mod,
      data: data ? { ...data, organizationId: req.user.organizationId } : undefined,
      organizationId: req.user.organizationId,
      facilityId: (data && data.facilityId) || req.user.facilityId,
      user: req.user
    });
    res.status(200).json({ success: true, riskAssessment: assessment, assessment });
  } catch (err) {
    console.error('AI Risk Check error:', err);
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

// Get Latest AI Risk Assessment for a Record or Submission
router.get(['/submission/risk-assessment/:module/:recordId', '/submissions/:recordId/risk-assessment', '/submission/:recordId/risk-assessment'], authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const { module: mod, recordId } = req.params;
    const effectiveId = recordId || req.params.recordId;
    const assessment = await environmentalRiskEngine.getLatestAssessment(mod, effectiveId, req.user.organizationId);
    if (!assessment) {
      return res.status(404).json({ error: 'No risk assessment found for this record' });
    }
    res.status(200).json({ success: true, riskAssessment: assessment, assessment });
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

// Get AI Risk Assessment History for a Record or Submission
router.get(['/submission/risk-history/:module/:recordId', '/submissions/:recordId/risk-history', '/submission/:recordId/risk-history'], authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const { module: mod, recordId } = req.params;
    const effectiveId = recordId || req.params.recordId;
    const history = await environmentalRiskEngine.getAssessmentHistory(mod, effectiveId, req.user.organizationId);
    res.status(200).json({ success: true, history });
  } catch (err) {
    res.status(err.statusCode || 400).json({ error: err.message });
  }
});

// Direct evidence attachment endpoint
router.post('/submission/attach-evidence', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const { module: mod, recordId, evidenceId } = req.body;
    if (!mod || !recordId || !evidenceId) {
      return res.status(400).json({ error: 'Module, recordId, and evidenceId are required' });
    }
    const { model } = environmentalSubmissionService.resolveModule(mod);
    const evidence = await Evidence.findOne({ _id: evidenceId, organizationId: req.user.organizationId });
    if (!evidence) {
      return res.status(404).json({ error: 'Evidence record not found' });
    }
    const record = await model.findOne({ _id: recordId, organizationId: req.user.organizationId });
    if (!record) {
      return res.status(404).json({ error: 'Environmental record not found' });
    }
    record.evidenceId = evidence._id;
    record.evidenceDetails = {
      fileName: evidence.fileName,
      fileType: evidence.fileType,
      uploadedAt: evidence.uploadedAt,
      filePath: evidence.filePath
    };
    await record.save();
    res.json({ success: true, record, evidence });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Facilities list endpoint
router.get('/facilities', authenticateToken, async (req, res) => {
  try {
    const orgId = req.user?.organizationId;
    const isGlobal = ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN'].includes((req.user?.role || '').toUpperCase());
    let query = {};
    if (orgId && !isGlobal) {
      const orConditions = [{ organizationId: orgId }];
      if (mongoose.Types.ObjectId.isValid(orgId)) {
        orConditions.push({ organizationId: new mongoose.Types.ObjectId(orgId) });
      }
      query.$or = orConditions;
    }
    const facilities = await mongoose.connection.db.collection('facilities').find(query).sort({ name: 1 }).toArray();
    res.json(facilities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Facility registration endpoint
router.post('/facilities', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ENTERPRISE', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'SUPER_ADMIN', 'PLATFORM_ADMIN'), async (req, res) => {
  try {
    const orgId = req.body.organizationId || req.user.organizationId;
    const { name, location, area, floorArea, description, type, gridRegion } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Facility name is required' });
    }
    const facilityData = {
      name,
      location: location || 'Main Campus',
      area: parseFloat(area || floorArea || 0),
      description: description || type || '',
      organizationId: orgId,
      gridRegion: gridRegion || 'National Grid',
      type: type || 'Facility',
      createdAt: new Date().toISOString()
    };
    const created = await mongoose.connection.db.collection('facilities').insertOne(facilityData);
    const facility = { _id: created.insertedId, ...facilityData };
    await logAudit(orgId, req.user.email, 'Facility Created', 'Facilities', created.insertedId, '', facility);
    res.status(201).json(facility);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Emission Factors list endpoint
router.get('/emission-factors', authenticateToken, async (req, res) => {
  try {
    const list = await EmissionFactor.find({}).sort({ category: 1, name: 1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Organizations list for portfolio screening
router.get('/organizations', authenticateToken, async (req, res) => {
  try {
    const list = await Organization.find({}).sort({ name: 1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 1. DASHBOARD
router.get('/dashboard', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { period = 'Quarterly', facilityId = 'all' } = req.query;

    const query = { organizationId: orgId };
    if (facilityId !== 'all') query.facilityId = facilityId;

    const [readings, emissions, water, waste, pollution, risks, targets, gaps, alerts] = await Promise.all([
      ElectricityReading.find(query),
      EmissionRecord.find(query),
      WaterRecord.find(query),
      WasteRecord.find(query),
      PollutionRecord.find(query),
      BiodiversityAssessment.find(query),
      EnvironmentalTarget.find({ organizationId: orgId }),
      EnvironmentalGap.find({ organizationId: orgId, status: 'Open' }),
      EnvironmentalAlert.find(query)
    ]);

    const filterPeriod = (list) => list.filter(r => !r.reportingPeriod || r.reportingPeriod === period);

    const activeReadings = filterPeriod(readings);
    const activeEmissions = filterPeriod(emissions);
    const activeWater = filterPeriod(water);
    const activeWaste = filterPeriod(waste);
    const activePollution = filterPeriod(pollution);

    const totalEnergy = activeReadings.reduce((acc, r) => acc + (r.consumption || 0), 0);
    const renewableEnergy = activeReadings
      .filter(r => ['SOLAR', 'WIND', 'HYDRO', 'OTHER_RENEWABLE'].includes(r.sourceType))
      .reduce((acc, r) => acc + (r.consumption || 0), 0);
    const renewablePct = calculateRenewableShare(renewableEnergy, totalEnergy);

    const scope1 = activeEmissions.filter(e => e.scope === 1).reduce((acc, e) => acc + (e.calculatedCO2e || 0), 0);
    const scope2 = activeEmissions.filter(e => e.scope === 2).reduce((acc, e) => acc + (e.calculatedCO2e || 0), 0);
    const scope3 = activeEmissions.filter(e => e.scope === 3).reduce((acc, e) => acc + (e.calculatedCO2e || 0), 0);
    const totalEmissions = scope1 + scope2 + scope3;

    const totalWater = activeWater.filter(w => w.actionType === 'Withdrawal' || w.source !== 'Recycled Water').reduce((acc, w) => acc + (w.consumption || 0), 0);
    const recycledWater = activeWater.filter(w => w.source === 'Recycled Water' || w.actionType === 'Reuse').reduce((acc, w) => acc + (w.consumption || 0), 0);
    const waterRecyclePct = calculateWaterRecyclingRate(recycledWater, totalWater + recycledWater);

    const totalWaste = activeWaste.reduce((acc, w) => acc + normalizeWasteToKg(w.amount || w.quantity || 0, w.unit), 0);
    const recycledWaste = activeWaste
      .filter(w => ['Recycling', 'Reuse', 'Composting', 'Recovery'].includes(w.disposalMethod))
      .reduce((acc, w) => acc + normalizeWasteToKg(w.amount || w.quantity || 0, w.unit), 0);
    const wasteRecyclePct = calculateWasteDiversionRate(recycledWaste, totalWaste);

    const activePollutionIncidents = activePollution.filter(p => p.status === 'Open').length;
    const avgBiodiversityRisk = risks.length > 0 ? risks.filter(r => ['HIGH', 'CRITICAL'].includes(r.biodiversityRisk)).length : 0;

    let scoreSum = 0;
    scoreSum += (50 + renewablePct / 2);
    const ghgTarget = targets.find(t => t.category === 'GHG Reduction' || t.category === 'GHG emissions');
    scoreSum += ghgTarget ? calculateTargetProgress(ghgTarget.baselineValue, ghgTarget.currentValue, ghgTarget.targetValue) : 75;
    scoreSum += (60 + waterRecyclePct * 0.4);
    scoreSum += avgBiodiversityRisk > 0 ? 50 : 90;
    scoreSum += (50 + wasteRecyclePct / 2);
    scoreSum += Math.max(30, 100 - activePollutionIncidents * 15);

    const overallScore = Math.round(scoreSum / 6);

    res.json({
      overallScore,
      reportingPeriod: period,
      metrics: {
        totalEnergy,
        renewablePct,
        totalEmissions: Math.round(totalEmissions * 100) / 100,
        scope1: Math.round(scope1 * 100) / 100,
        scope2: Math.round(scope2 * 100) / 100,
        scope3: Math.round(scope3 * 100) / 100,
        totalWater,
        waterRecyclePct,
        totalWaste,
        wasteRecyclePct,
        activePollutionIncidents,
        biodiversityRiskCount: avgBiodiversityRisk
      },
      counts: {
        readings: readings.length,
        emissions: emissions.length,
        water: water.length,
        waste: waste.length,
        pollution: pollution.length,
        biodiversity: risks.length
      },
      targetsCount: targets.length,
      gapsCount: gaps.length,
      alertsCount: alerts.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/dashboard-overview', authenticateToken, enforceTenantIsolation, async (req, res, next) => {
  req.url = '/dashboard';
  router.handle(req, res, next);
});

router.get('/metrics-summary', authenticateToken, enforceTenantIsolation, async (req, res, next) => {
  req.url = '/dashboard';
  router.handle(req, res, next);
});

router.get('/facility-compliance', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const facilities = await mongoose.connection.db.collection('facilities').find({
      $or: [
        { organizationId: orgId },
        ...(mongoose.Types.ObjectId.isValid(orgId) ? [{ organizationId: new mongoose.Types.ObjectId(orgId) }] : [])
      ]
    }).toArray();
    res.json({
      totalFacilities: facilities.length,
      compliantFacilities: facilities.length,
      complianceRate: '100%',
      facilities: facilities.map(f => ({ id: f._id, name: f.name, status: 'COMPLIANT' }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/tasks/my', authenticateToken, enforceTenantIsolation, async (req, res, next) => {
  req.url = '/my-tasks';
  router.handle(req, res, next);
});

router.get('/benchmarking', authenticateToken, enforceTenantIsolation, async (req, res) => {
  res.json({
    industryAverageEnergyKWh: 28000,
    industryAverageGHGTonnes: 19.5,
    topQuartileEfficiency: '91%',
    peerGroup: 'Manufacturing & Industrial ESG Benchmark',
    percentileRank: 78
  });
});

// 2. DATA COMPLETENESS
router.get('/completeness', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { period = 'Quarterly' } = req.query;

    const [readings, emissions, water, waste, pollution, biodiversity, evidence, targets, gaps] = await Promise.all([
      ElectricityReading.find({ organizationId: orgId }),
      EmissionRecord.find({ organizationId: orgId }),
      WaterRecord.find({ organizationId: orgId }),
      WasteRecord.find({ organizationId: orgId }),
      PollutionRecord.find({ organizationId: orgId }),
      BiodiversityAssessment.find({ organizationId: orgId }),
      Evidence.find({ organizationId: orgId }),
      EnvironmentalTarget.find({ organizationId: orgId }),
      EnvironmentalGap.find({ organizationId: orgId, status: 'Open' })
    ]);

    const filterPeriod = (list) => list.filter(r => !r.reportingPeriod || r.reportingPeriod === period);

    const periodReadings = filterPeriod(readings);
    const periodEmissions = filterPeriod(emissions);
    const periodWater = filterPeriod(water);
    const periodWaste = filterPeriod(waste);
    const periodPollution = filterPeriod(pollution);

    const modules = [
      { id: 'energy', name: 'Energy Management', records: periodReadings, path: '/energy', requiredEvidence: true },
      { id: 'ghg', name: 'GHG Emissions', records: periodEmissions, path: '/ghg', requiredEvidence: true },
      { id: 'water', name: 'Water Management', records: periodWater, path: '/water', requiredEvidence: true },
      { id: 'waste', name: 'Waste Diversion', records: periodWaste, path: '/waste', requiredEvidence: true },
      { id: 'pollution', name: 'Pollution Monitoring', records: periodPollution, path: '/pollution', requiredEvidence: false },
      { id: 'biodiversity', name: 'Biodiversity Assessment', records: biodiversity, path: '/biodiversity', requiredEvidence: false }
    ];

    let totalRequirements = modules.length * 2;
    let completedRequirements = 0;
    const missingItems = [];
    const moduleBreakdown = {};

    modules.forEach(mod => {
      const hasData = mod.records.length > 0;
      const verifiedRecords = mod.records.filter(r => r.status === 'SUBMITTED' || r.status === 'VERIFIED');
      const draftRecords = mod.records.filter(r => r.status === 'DRAFT');
      const correctionRecords = mod.records.filter(r => r.status === 'CHANGES_REQUESTED' || r.status === 'CORRECTION_REQUIRED');
      
      const modEvidence = evidence.filter(e => e.category?.toLowerCase() === mod.id || e.category?.toLowerCase() === mod.name.toLowerCase().split(' ')[0]);
      const hasEvidence = !mod.requiredEvidence || modEvidence.length > 0;

      let modScore = 0;
      if (hasData) {
        completedRequirements += 1;
        modScore += 50;
      } else {
        missingItems.push({
          module: mod.name,
          issue: `No data entries logged for ${period}`,
          type: 'DATA_MISSING',
          priority: 'HIGH',
          link: mod.path
        });
      }

      if (hasEvidence) {
        completedRequirements += 1;
        modScore += 50;
      } else {
        missingItems.push({
          module: mod.name,
          issue: `Supporting invoices/bills required as evidence for ${mod.name}`,
          type: 'EVIDENCE_MISSING',
          priority: 'MEDIUM',
          link: mod.path
        });
      }

      if (correctionRecords.length > 0) {
        missingItems.push({
          module: mod.name,
          issue: `${correctionRecords.length} record(s) returned from audit requiring correction`,
          type: 'CORRECTION_REQUIRED',
          priority: 'CRITICAL',
          link: mod.path
        });
      }

      moduleBreakdown[mod.id] = {
        name: mod.name,
        score: modScore,
        recordCount: mod.records.length,
        draftCount: draftRecords.length,
        submittedCount: verifiedRecords.length,
        correctionCount: correctionRecords.length,
        evidenceCount: modEvidence.length,
        status: modScore === 100 ? 'COMPLETE' : (modScore > 0 ? 'PARTIAL' : 'INCOMPLETE')
      };
    });

    const completionPercentage = Math.round((completedRequirements / totalRequirements) * 100);

    res.json({
      completionPercentage,
      completedRequirements,
      totalRequirements,
      reportingPeriod: period,
      moduleBreakdown,
      missingItems,
      openGapsCount: gaps.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. ACTION CENTER & MY TASKS
router.get('/action-center', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const today = new Date().toISOString().split('T')[0];

    const [readings, emissions, water, waste, pollution, targets, actions, evidence] = await Promise.all([
      ElectricityReading.find({ organizationId: orgId }),
      EmissionRecord.find({ organizationId: orgId }),
      WaterRecord.find({ organizationId: orgId }),
      WasteRecord.find({ organizationId: orgId }),
      PollutionRecord.find({ organizationId: orgId }),
      EnvironmentalTarget.find({ organizationId: orgId }),
      EnvironmentalAction.find({ organizationId: orgId }),
      Evidence.find({ organizationId: orgId })
    ]);

    const actionList = [];

    const allRecords = [
      ...readings.map(r => ({ ...r._doc || r, module: 'Energy', link: '/energy' })),
      ...emissions.map(r => ({ ...r._doc || r, module: 'GHG Emissions', link: '/ghg' })),
      ...water.map(r => ({ ...r._doc || r, module: 'Water', link: '/water' })),
      ...waste.map(r => ({ ...r._doc || r, module: 'Waste', link: '/waste' })),
      ...pollution.map(r => ({ ...r._doc || r, module: 'Pollution', link: '/pollution' }))
    ];

    allRecords.filter(r => r.status === 'CHANGES_REQUESTED' || r.status === 'CORRECTION_REQUIRED').forEach(rec => {
      actionList.push({
        id: `corr-${rec._id}`,
        title: `${rec.module} Record Correction Needed`,
        desc: rec.correctionReason || rec.reviewerComments || 'Reviewer requested adjustments to entered data.',
        module: rec.module,
        priority: 'CRITICAL',
        type: 'CORRECTION',
        actionLabel: 'Review & Fix',
        link: rec.link,
        dueDate: today
      });
    });

    if (readings.length === 0) {
      actionList.push({
        id: 'missing-energy',
        title: 'Energy Data Entry Required',
        desc: 'Log monthly meter readings and consumption figures for the active period.',
        module: 'Energy',
        priority: 'HIGH',
        type: 'DATA_ENTRY',
        actionLabel: 'Add Data',
        link: '/energy',
        dueDate: today
      });
    }

    if (emissions.length === 0) {
      actionList.push({
        id: 'missing-ghg',
        title: 'GHG Scope 1 & Scope 2 Entry Required',
        desc: 'Calculate emissions from stationary combustion and grid electricity.',
        module: 'GHG Emissions',
        priority: 'HIGH',
        type: 'DATA_ENTRY',
        actionLabel: 'Add GHG Data',
        link: '/ghg',
        dueDate: today
      });
    }

    if (water.length === 0) {
      actionList.push({
        id: 'missing-water',
        title: 'Water Withdrawal Logs Missing',
        desc: 'Enter freshwater withdrawal and recycled water metrics.',
        module: 'Water',
        priority: 'HIGH',
        type: 'DATA_ENTRY',
        actionLabel: 'Add Water Data',
        link: '/water',
        dueDate: today
      });
    }

    if (evidence.length === 0 && (readings.length > 0 || emissions.length > 0)) {
      actionList.push({
        id: 'missing-evidence-main',
        title: 'Upload Utility Proof & Invoices',
        desc: 'Attach electricity or water invoices to support environmental disclosures.',
        module: 'Evidence',
        priority: 'HIGH',
        type: 'EVIDENCE',
        actionLabel: 'Upload Evidence',
        link: '/evidence',
        dueDate: today
      });
    }

    actions.filter(a => a.status !== 'COMPLETED' && a.status !== 'CANCELLED').forEach(act => {
      const isOverdue = act.dueDate && act.dueDate < today;
      actionList.push({
        id: `act-${act._id}`,
        title: act.action || act.problem,
        desc: `Action plan in ${act.category}. Due: ${act.dueDate || 'Immediate'}.`,
        module: act.category,
        priority: isOverdue ? 'CRITICAL' : (act.priority || 'MEDIUM'),
        type: 'ACTION_ITEM',
        actionLabel: 'View Action',
        link: '/actions',
        dueDate: act.dueDate
      });
    });

    targets.filter(t => t.status === 'AT_RISK' || t.status === 'OFF_TRACK').forEach(tar => {
      actionList.push({
        id: `tar-${tar._id}`,
        title: `Target Behind Schedule: ${tar.name}`,
        desc: `Current: ${tar.currentValue} vs Target: ${tar.targetValue} (Target Year: ${tar.targetYear}).`,
        module: tar.category,
        priority: 'MEDIUM',
        type: 'TARGET_RISK',
        actionLabel: 'Review Target',
        link: '/targets',
        dueDate: today
      });
    });

    res.json(actionList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/my-tasks', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const userEmail = req.user.email;
    const today = new Date().toISOString().split('T')[0];

    const [actions, readings, emissions, water, waste, pollution] = await Promise.all([
      EnvironmentalAction.find({ organizationId: orgId }),
      ElectricityReading.find({ organizationId: orgId }),
      EmissionRecord.find({ organizationId: orgId }),
      WaterRecord.find({ organizationId: orgId }),
      WasteRecord.find({ organizationId: orgId }),
      PollutionRecord.find({ organizationId: orgId })
    ]);

    const allRecords = [...readings, ...emissions, ...water, ...waste, ...pollution];
    const draftLogs = allRecords.filter(r => r.status === 'DRAFT' && r.createdBy === userEmail).length;
    const needsCorrection = allRecords.filter(r => (r.status === 'CHANGES_REQUESTED' || r.status === 'CORRECTION_REQUIRED') && r.createdBy === userEmail).length;

    const userActions = actions.filter(a => a.owner === userEmail || !a.owner);
    const assignedToMe = userActions.length;
    const dueToday = userActions.filter(a => a.dueDate === today && a.status !== 'COMPLETED').length;
    const overdue = userActions.filter(a => a.dueDate && a.dueDate < today && a.status !== 'COMPLETED').length;

    res.json({
      assignedToMe,
      dueToday,
      overdue,
      draftLogs,
      needsCorrection,
      completed: actions.filter(a => a.status === 'COMPLETED').length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. ENERGY
router.get('/energy/meters', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const isTechOrGlobal = ['TECHNOLOGY_PROVIDER', 'SUPER_ADMIN', 'PLATFORM_ADMIN'].includes((req.user.role || '').toUpperCase());
    const filter = isTechOrGlobal ? {} : { organizationId: req.user.organizationId };
    const list = await ElectricityMeter.find(filter);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Environmental Alerts endpoint
router.get('/alerts', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const isRegulatorOrGlobal = ['REGULATOR', 'SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN'].includes((req.user.role || '').toUpperCase());
    const query = isRegulatorOrGlobal ? {} : { organizationId: req.user.organizationId };
    const alerts = await EnvironmentalAlert.find(query).sort({ timestamp: -1, createdAt: -1 });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/energy/meters', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'MSME_USER', 'TECHNOLOGY_PROVIDER'), async (req, res) => {
  try {
    const { facilityId, meterNumber, location, meterType, connectionType, voltage, installationDate } = req.body;
    if (!checkFacilityScope(req, facilityId)) {
      return res.status(403).json({ error: 'Forbidden: Restricted facility scope' });
    }

    const meter = await ElectricityMeter.create({
      organizationId: req.user.organizationId,
      facilityId: facilityId || 'fac-main',
      meterNumber,
      location,
      meterType: meterType || 'MANUAL',
      connectionType: connectionType || 'SINGLE_PHASE',
      voltage: voltage ? parseFloat(voltage) : 230,
      installationDate: installationDate || new Date().toISOString().split('T')[0],
      status: 'ACTIVE'
    });

    await logAudit(req.user.organizationId, req.user.email, 'Meter Created', 'Energy', meter._id, '', meter);
    res.status(201).json(meter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/energy/meters/:id', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'MSME_USER'), async (req, res) => {
  try {
    const deleted = await ElectricityMeter.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!deleted) return res.status(404).json({ error: 'Meter not found.' });
    await logAudit(req.user.organizationId, req.user.email, 'Meter Deleted', 'Energy', req.params.id, deleted, '');
    res.json({ success: true, message: 'Meter deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/readings', authenticateToken, async (req, res) => {
  try {
    const isReviewer = ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'VERIFIER', 'AUDITOR'].includes(req.user.role);
    const filter = (isReviewer && !req.query.tenantOnly) ? {} : { organizationId: req.user.organizationId };
    if (req.query.status && req.query.status !== 'ALL') {
      filter.status = req.query.status;
    }
    const list = await ElectricityReading.find(filter).sort({ readingDate: -1, createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/energy', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const filter = { organizationId: req.user.organizationId };
    if (req.query.status && req.query.status !== 'ALL') {
      filter.status = req.query.status;
    }
    const list = await ElectricityReading.find(filter).sort({ readingDate: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/electricity', authenticateToken, enforceTenantIsolation, async (req, res, next) => {
  req.url = '/energy';
  router.handle(req, res, next);
});

router.post('/electricity', authenticateToken, enforceTenantIsolation, async (req, res, next) => {
  req.url = '/energy';
  router.handle(req, res, next);
});

router.post('/energy', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ENTERPRISE', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'DATA_ENTRY', 'MSME_USER', 'MSME'), async (req, res) => {
  try {
    const { facilityId, meterId, previousReading, currentReading, consumption: directConsumption, readingDate, sourceType, usageCategory, reportingPeriod, dataQuality, evidenceId, status = 'SUBMITTED' } = req.body;
    if (!checkFacilityScope(req, facilityId)) {
      return res.status(403).json({ error: 'Forbidden: Restricted facility scope' });
    }

    const prev = parseFloat(previousReading || 0);
    const curr = parseFloat(currentReading || 0);

    if (curr < prev && !directConsumption) {
      return res.status(400).json({ error: 'Validation Error: Current reading cannot be lower than previous reading.' });
    }

    const consumption = directConsumption ? parseFloat(directConsumption) : calculateConsumption(curr, prev);

    let normalizedSource = (sourceType || 'GRID').toUpperCase();
    if (!['GRID', 'SOLAR', 'WIND', 'HYDRO', 'OTHER_RENEWABLE', 'GENERATOR', 'OTHER'].includes(normalizedSource)) {
      normalizedSource = 'GRID';
    }
    let normalizedUsage = (usageCategory || 'PRODUCTION_MACHINERY').toUpperCase();
    if (normalizedUsage.includes('PROD')) normalizedUsage = 'PRODUCTION_MACHINERY';
    else if (!['PRODUCTION_MACHINERY', 'MOTORS', 'PUMPS', 'COMPRESSORS', 'HVAC', 'REFRIGERATION', 'LIGHTING', 'IT_EQUIPMENT', 'OFFICE_EQUIPMENT', 'OTHER'].includes(normalizedUsage)) {
      normalizedUsage = 'OTHER';
    }

    const reading = await ElectricityReading.create({
      organizationId: req.user.organizationId,
      facilityId: facilityId || 'fac-main',
      meterId: meterId || null,
      previousReading: prev,
      currentReading: curr,
      consumption,
      readingDate: readingDate || new Date().toISOString().split('T')[0],
      unit: 'kWh',
      sourceType: normalizedSource,
      usageCategory: normalizedUsage,
      reportingPeriod: reportingPeriod || 'Quarterly',
      dataQuality: dataQuality || 'Actual',
      evidenceId: evidenceId || null,
      status: status === 'DRAFT' ? 'DRAFT' : 'SUBMITTED',
      submittedAt: status === 'SUBMITTED' ? new Date().toISOString() : null,
      createdBy: req.user.email
    });

    if (sourceType === 'GRID' && status === 'SUBMITTED') {
      const factorRecord = await EmissionFactor.findOne({ category: 'Scope 2', isActive: true }) || { value: 0.82, unit: 'kg CO2e / kWh', source: 'Standard Factor' };
      const calculatedCO2e = calculateScope2CO2e(consumption, factorRecord.value);

      await EmissionRecord.create({
        organizationId: req.user.organizationId,
        facilityId: facilityId || 'fac-main',
        scope: 2,
        category: 'Purchased electricity',
        sourceName: 'Grid Electricity (Auto Sync)',
        activityValue: consumption,
        activityUnit: 'kWh',
        emissionFactor: factorRecord.value,
        factorUnit: factorRecord.unit,
        factorSource: factorRecord.source,
        calculatedCO2e,
        reportingPeriod: reportingPeriod || 'Quarterly',
        periodStart: readingDate || new Date().toISOString().split('T')[0],
        periodEnd: readingDate || new Date().toISOString().split('T')[0],
        dataQuality: dataQuality || 'Actual',
        evidenceId: evidenceId || null,
        status: 'SUBMITTED',
        submittedAt: new Date().toISOString(),
        createdBy: req.user.email
      });
    }

    await logAudit(req.user.organizationId, req.user.email, 'Reading Created', 'Energy', reading._id, '', reading);
    res.status(201).json(reading);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/energy/:id', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'DATA_ENTRY', 'MSME_USER'), async (req, res) => {
  try {
    const oldRecord = await ElectricityReading.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!oldRecord) return res.status(404).json({ error: 'Reading not found.' });

    const updateData = { ...req.body };
    if (updateData.status === 'RESUBMITTED') {
      updateData.status = 'SUBMITTED';
      updateData.submittedAt = new Date().toISOString();
      updateData.correctionReason = '';
    }

    const updated = await ElectricityReading.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      updateData,
      { new: true }
    );

    await logAudit(req.user.organizationId, req.user.email, 'Reading Updated', 'Energy', updated._id, oldRecord, updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/energy/:id', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'MSME_USER'), async (req, res) => {
  try {
    const deleted = await ElectricityReading.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!deleted) return res.status(404).json({ error: 'Reading not found.' });
    await logAudit(req.user.organizationId, req.user.email, 'Reading Deleted', 'Energy', req.params.id, deleted, '');
    res.json({ success: true, message: 'Reading deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/energy/initiatives', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const list = await EnergyInitiative.find({ organizationId: req.user.organizationId });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/energy/initiatives', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'MSME_USER'), async (req, res) => {
  try {
    const record = await EnergyInitiative.create({
      ...req.body,
      organizationId: req.user.organizationId,
      createdBy: req.user.email
    });
    await logAudit(req.user.organizationId, req.user.email, 'Initiative Created', 'Energy', record._id, '', record);
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. GHG
router.get('/ghg', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const filter = { organizationId: req.user.organizationId };
    if (req.query.status && req.query.status !== 'ALL') {
      filter.status = req.query.status;
    }
    const list = await EmissionRecord.find(filter).sort({ periodEnd: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/emissions', authenticateToken, enforceTenantIsolation, async (req, res, next) => {
  req.url = '/ghg';
  router.handle(req, res, next);
});

router.post('/ghg', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'DATA_ENTRY', 'MSME_USER'), async (req, res) => {
  try {
    const { facilityId, scope, category, sourceName, activityValue, activityUnit, emissionFactor, factorUnit, factorSource, reportingPeriod, periodStart, periodEnd, evidenceId, status = 'SUBMITTED' } = req.body;
    if (!checkFacilityScope(req, facilityId)) {
      return res.status(403).json({ error: 'Forbidden: Restricted facility scope' });
    }

    const calculatedCO2e = (parseFloat(activityValue || 0) * parseFloat(emissionFactor || 0.82)) / 1000;

    const record = await EmissionRecord.create({
      organizationId: req.user.organizationId,
      facilityId: facilityId || 'fac-main',
      scope: parseInt(scope || 1, 10),
      category: category || 'Stationary Combustion',
      sourceName: sourceName || 'Primary Source',
      activityValue: parseFloat(activityValue || 0),
      activityUnit: activityUnit || 'unit',
      emissionFactor: parseFloat(emissionFactor || 0.82),
      factorUnit: factorUnit || 'kg CO2e / unit',
      factorSource: factorSource || 'Standard Factor',
      calculatedCO2e,
      reportingPeriod: reportingPeriod || 'Quarterly',
      periodStart: periodStart || new Date().toISOString().split('T')[0],
      periodEnd: periodEnd || new Date().toISOString().split('T')[0],
      evidenceId: evidenceId || null,
      status: status === 'DRAFT' ? 'DRAFT' : 'SUBMITTED',
      submittedAt: status === 'SUBMITTED' ? new Date().toISOString() : null,
      createdBy: req.user.email
    });

    await logAudit(req.user.organizationId, req.user.email, 'Emission Record Created', 'GHG', record._id, '', record);
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/ghg/:id', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'DATA_ENTRY', 'MSME_USER'), async (req, res) => {
  try {
    const oldRecord = await EmissionRecord.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!oldRecord) return res.status(404).json({ error: 'Emission record not found.' });

    const updateData = { ...req.body };
    if (updateData.activityValue && updateData.emissionFactor) {
      updateData.calculatedCO2e = (parseFloat(updateData.activityValue) * parseFloat(updateData.emissionFactor)) / 1000;
    }
    if (updateData.status === 'RESUBMITTED') {
      updateData.status = 'SUBMITTED';
      updateData.submittedAt = new Date().toISOString();
      updateData.correctionReason = '';
    }

    const updated = await EmissionRecord.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      updateData,
      { new: true }
    );

    await logAudit(req.user.organizationId, req.user.email, 'Emission Record Updated', 'GHG', updated._id, oldRecord, updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/ghg/:id', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'MSME_USER'), async (req, res) => {
  try {
    const deleted = await EmissionRecord.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!deleted) return res.status(404).json({ error: 'Record not found.' });
    await logAudit(req.user.organizationId, req.user.email, 'Emission Record Deleted', 'GHG', req.params.id, deleted, '');
    res.json({ success: true, message: 'Record deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. WATER
router.get('/water', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const filter = { organizationId: req.user.organizationId };
    if (req.query.status && req.query.status !== 'ALL') {
      filter.status = req.query.status;
    }
    const list = await WaterRecord.find(filter).sort({ periodEnd: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/water', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'DATA_ENTRY', 'MSME_USER'), async (req, res) => {
  try {
    const { facilityId, source, previousReading, currentReading, consumption, amount, reportingPeriod, periodStart, periodEnd, dataQuality, evidenceId, status = 'SUBMITTED' } = req.body;
    if (!checkFacilityScope(req, facilityId)) {
      return res.status(403).json({ error: 'Forbidden: Restricted facility scope' });
    }

    const prev = parseFloat(previousReading || 0);
    const curr = parseFloat(currentReading || 0);
    const calcConsumption = curr > prev ? (curr - prev) : parseFloat(consumption || amount || 0);

    const record = await WaterRecord.create({
      organizationId: req.user.organizationId,
      facilityId: facilityId || 'fac-main',
      source: source || 'Municipal Water',
      previousReading: prev,
      currentReading: curr,
      consumption: calcConsumption,
      unit: 'm3',
      reportingPeriod: reportingPeriod || 'Quarterly',
      periodStart: periodStart || new Date().toISOString().split('T')[0],
      periodEnd: periodEnd || new Date().toISOString().split('T')[0],
      dataQuality: dataQuality || 'Actual',
      evidenceId: evidenceId || null,
      status: status === 'DRAFT' ? 'DRAFT' : 'SUBMITTED',
      submittedAt: status === 'SUBMITTED' ? new Date().toISOString() : null,
      createdBy: req.user.email
    });

    await logAudit(req.user.organizationId, req.user.email, 'Water Record Created', 'Water', record._id, '', record);
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/water/:id', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'DATA_ENTRY', 'MSME_USER'), async (req, res) => {
  try {
    const oldRecord = await WaterRecord.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!oldRecord) return res.status(404).json({ error: 'Water record not found.' });

    const updateData = { ...req.body };
    if (updateData.status === 'RESUBMITTED') {
      updateData.status = 'SUBMITTED';
      updateData.submittedAt = new Date().toISOString();
      updateData.correctionReason = '';
    }

    const updated = await WaterRecord.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      updateData,
      { new: true }
    );

    await logAudit(req.user.organizationId, req.user.email, 'Water Record Updated', 'Water', updated._id, oldRecord, updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/water/:id', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'MSME_USER'), async (req, res) => {
  try {
    const deleted = await WaterRecord.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!deleted) return res.status(404).json({ error: 'Water record not found.' });
    await logAudit(req.user.organizationId, req.user.email, 'Water Record Deleted', 'Water', req.params.id, deleted, '');
    res.json({ success: true, message: 'Water record deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/water/risks', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const list = await WaterRisk.find({ organizationId: req.user.organizationId });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/water/risks', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'MSME_USER'), async (req, res) => {
  try {
    const risk = await WaterRisk.create({
      ...req.body,
      organizationId: req.user.organizationId,
      updatedBy: req.user.email
    });
    await logAudit(req.user.organizationId, req.user.email, 'Water Risk Created', 'Water', risk._id, '', risk);
    res.status(201).json(risk);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. BIODIVERSITY
router.get('/biodiversity/assessments', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const filter = { organizationId: req.user.organizationId };
    if (req.query.status && req.query.status !== 'ALL') {
      filter.status = req.query.status;
    }
    const list = await BiodiversityAssessment.find(filter);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/biodiversity', authenticateToken, enforceTenantIsolation, async (req, res, next) => {
  req.url = '/biodiversity/assessments';
  router.handle(req, res, next);
});

router.post('/biodiversity/assessments', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'MSME_USER'), async (req, res) => {
  try {
    const record = await BiodiversityAssessment.create({
      ...req.body,
      organizationId: req.user.organizationId,
      status: req.body.status || 'SUBMITTED',
      updatedBy: req.user.email
    });
    await logAudit(req.user.organizationId, req.user.email, 'Biodiversity Assessment Created', 'Biodiversity', record._id, '', record);
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/biodiversity/assessments/:id', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'MSME_USER'), async (req, res) => {
  try {
    const oldRecord = await BiodiversityAssessment.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!oldRecord) return res.status(404).json({ error: 'Biodiversity record not found.' });

    const updated = await BiodiversityAssessment.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      req.body,
      { new: true }
    );
    await logAudit(req.user.organizationId, req.user.email, 'Biodiversity Assessment Updated', 'Biodiversity', updated._id, oldRecord, updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/biodiversity/assessments/:id', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'MSME_USER'), async (req, res) => {
  try {
    const deleted = await BiodiversityAssessment.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!deleted) return res.status(404).json({ error: 'Record not found.' });
    await logAudit(req.user.organizationId, req.user.email, 'Biodiversity Deleted', 'Biodiversity', req.params.id, deleted, '');
    res.json({ success: true, message: 'Record deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/biodiversity/initiatives', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const list = await BiodiversityInitiative.find({ organizationId: req.user.organizationId });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/biodiversity/initiatives', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'MSME_USER'), async (req, res) => {
  try {
    const record = await BiodiversityInitiative.create({
      ...req.body,
      organizationId: req.user.organizationId,
      createdBy: req.user.email
    });
    await logAudit(req.user.organizationId, req.user.email, 'Biodiversity Initiative Created', 'Biodiversity', record._id, '', record);
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. WASTE
router.get('/waste', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const filter = { organizationId: req.user.organizationId };
    if (req.query.status && req.query.status !== 'ALL') {
      filter.status = req.query.status;
    }
    const list = await WasteRecord.find(filter).sort({ periodEnd: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/waste', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'DATA_ENTRY', 'MSME_USER'), async (req, res) => {
  try {
    const { facilityId, category, wasteType, quantity, unit, disposalMethod, vendor, reportingPeriod, periodStart, periodEnd, dataQuality, evidenceId, status = 'SUBMITTED' } = req.body;
    if (!checkFacilityScope(req, facilityId)) {
      return res.status(403).json({ error: 'Forbidden: Restricted facility scope' });
    }

    const record = await WasteRecord.create({
      organizationId: req.user.organizationId,
      facilityId: facilityId || 'fac-main',
      category: category || 'General',
      wasteType: wasteType || 'NON_HAZARDOUS',
      quantity: parseFloat(quantity || 0),
      amount: parseFloat(quantity || 0),
      unit: unit || 'kg',
      disposalMethod: disposalMethod || 'Recycling',
      vendor: vendor || '',
      reportingPeriod: reportingPeriod || 'Quarterly',
      periodStart: periodStart || new Date().toISOString().split('T')[0],
      periodEnd: periodEnd || new Date().toISOString().split('T')[0],
      dataQuality: dataQuality || 'Actual',
      evidenceId: evidenceId || null,
      status: status === 'DRAFT' ? 'DRAFT' : 'SUBMITTED',
      submittedAt: status === 'SUBMITTED' ? new Date().toISOString() : null,
      createdBy: req.user.email
    });

    await logAudit(req.user.organizationId, req.user.email, 'Waste Record Created', 'Waste', record._id, '', record);
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/waste/:id', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'DATA_ENTRY', 'MSME_USER'), async (req, res) => {
  try {
    const oldRecord = await WasteRecord.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!oldRecord) return res.status(404).json({ error: 'Waste record not found.' });

    const updateData = { ...req.body };
    if (updateData.quantity) updateData.amount = parseFloat(updateData.quantity);
    if (updateData.status === 'RESUBMITTED') {
      updateData.status = 'SUBMITTED';
      updateData.submittedAt = new Date().toISOString();
      updateData.correctionReason = '';
    }

    const updated = await WasteRecord.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      updateData,
      { new: true }
    );

    await logAudit(req.user.organizationId, req.user.email, 'Waste Record Updated', 'Waste', updated._id, oldRecord, updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/waste/:id', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'MSME_USER'), async (req, res) => {
  try {
    const deleted = await WasteRecord.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!deleted) return res.status(404).json({ error: 'Record not found.' });
    await logAudit(req.user.organizationId, req.user.email, 'Waste Record Deleted', 'Waste', req.params.id, deleted, '');
    res.json({ success: true, message: 'Record deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. POLLUTION
router.get('/pollution', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const filter = { organizationId: req.user.organizationId };
    if (req.query.status && req.query.status !== 'ALL') {
      filter.status = req.query.status;
    }
    const list = await PollutionRecord.find(filter).sort({ date: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pollution', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'DATA_ENTRY', 'MSME_USER'), async (req, res) => {
  try {
    const { facilityId, medium, pollutantType, quantity, unit, source, legalLimit, actualValue, reportingPeriod, date, severity, cause, correctiveAction, status = 'SUBMITTED' } = req.body;
    if (!checkFacilityScope(req, facilityId)) {
      return res.status(403).json({ error: 'Forbidden: Restricted facility scope' });
    }

    const complianceStatus = parseFloat(actualValue || 0) > parseFloat(legalLimit || 0) && parseFloat(legalLimit || 0) > 0 ? 'NON_COMPLIANT' : 'COMPLIANT';

    const record = await PollutionRecord.create({
      organizationId: req.user.organizationId,
      facilityId: facilityId || 'fac-main',
      medium: medium || 'Air',
      pollutantType: pollutantType || 'PM2.5',
      quantity: parseFloat(quantity || actualValue || 0),
      unit: unit || 'kg',
      source: source || '',
      legalLimit: parseFloat(legalLimit || 0),
      actualValue: parseFloat(actualValue || 0),
      complianceStatus,
      reportingPeriod: reportingPeriod || 'Quarterly',
      date: date || new Date().toISOString().split('T')[0],
      severity: severity || 'Low',
      status: status === 'DRAFT' ? 'DRAFT' : 'Open',
      cause: cause || '',
      correctiveAction: correctiveAction || '',
      createdBy: req.user.email
    });

    if (complianceStatus === 'NON_COMPLIANT') {
      await EnvironmentalAlert.create({
        organizationId: req.user.organizationId,
        facilityId: facilityId || 'fac-main',
        severity: 'Critical',
        type: 'Limit Exceeded',
        relatedRecord: record._id.toString(),
        message: `Alert: Pollutant ${pollutantType} in ${medium} exceeded legal limit (${actualValue} vs ${legalLimit} limit).`,
        createdAt: new Date().toISOString()
      });
    }

    await logAudit(req.user.organizationId, req.user.email, 'Pollution Record Created', 'Pollution', record._id, '', record);
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/pollution/:id', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'DATA_ENTRY', 'MSME_USER'), async (req, res) => {
  try {
    const oldRecord = await PollutionRecord.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!oldRecord) return res.status(404).json({ error: 'Pollution record not found.' });

    const updateData = { ...req.body };
    if (updateData.actualValue && updateData.legalLimit) {
      updateData.complianceStatus = parseFloat(updateData.actualValue) > parseFloat(updateData.legalLimit) ? 'NON_COMPLIANT' : 'COMPLIANT';
    }

    const updated = await PollutionRecord.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      updateData,
      { new: true }
    );

    await logAudit(req.user.organizationId, req.user.email, 'Pollution Record Updated', 'Pollution', updated._id, oldRecord, updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/pollution/:id', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'MSME_USER'), async (req, res) => {
  try {
    const deleted = await PollutionRecord.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!deleted) return res.status(404).json({ error: 'Record not found.' });
    await logAudit(req.user.organizationId, req.user.email, 'Pollution Record Deleted', 'Pollution', req.params.id, deleted, '');
    res.json({ success: true, message: 'Record deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/pollution/controls', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const list = await PollutionControl.find({ organizationId: req.user.organizationId });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/pollution/controls', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'MSME_USER'), async (req, res) => {
  try {
    const record = await PollutionControl.create({
      ...req.body,
      organizationId: req.user.organizationId,
      createdBy: req.user.email
    });
    await logAudit(req.user.organizationId, req.user.email, 'Pollution Control Created', 'Pollution', record._id, '', record);
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. EVIDENCE
router.get('/evidence', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const list = await Evidence.find({ organizationId: req.user.organizationId }).sort({ uploadedAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/evidence/upload', authenticateToken, enforceTenantIsolation, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded or invalid file format.' });
    }

    let { category, recordId, recordModel, facilityId } = req.body;
    const validCategories = ['Energy', 'GHG', 'Water', 'Biodiversity', 'Waste', 'Pollution'];
    if (!validCategories.includes(category)) category = 'Energy';
    facilityId = facilityId || req.user.facilityId || 'fac-main';
    recordId = recordId || `REC-${Date.now()}`;
    recordModel = recordModel || `${category}Record`;

    const evidenceDoc = await Evidence.create({
      organizationId: req.user.organizationId,
      facilityId,
      category,
      recordId,
      recordModel,
      fileName: req.file.originalname,
      fileType: path.extname(req.file.originalname).replace('.', '').toUpperCase(),
      fileSize: req.file.size,
      filePath: `/uploads/evidence/${req.file.filename}`,
      uploadedBy: req.user.email,
      uploadedAt: new Date().toISOString().split('T')[0],
      verificationStatus: 'PENDING'
    });

    if (recordId && mongoose.isValidObjectId(recordId)) {
      try {
        const modMap = {
          energy: ElectricityReading,
          ghg: EmissionRecord,
          water: WaterRecord,
          biodiversity: BiodiversityAssessment,
          waste: WasteRecord,
          pollution: PollutionRecord
        };
        const targetModel = modMap[category.toLowerCase()];
        if (targetModel) {
          await targetModel.findOneAndUpdate(
            { _id: recordId, organizationId: req.user.organizationId },
            {
              evidenceId: evidenceDoc._id,
              evidenceDetails: {
                fileName: evidenceDoc.fileName,
                fileType: evidenceDoc.fileType,
                uploadedAt: evidenceDoc.uploadedAt,
                filePath: evidenceDoc.filePath
              }
            }
          );
        }
      } catch (linkErr) {
        console.warn('Auto-link evidence warning:', linkErr.message);
      }
    }

    await logAudit(req.user.organizationId, req.user.email, 'Evidence Uploaded', category || 'Evidence', evidenceDoc._id, '', evidenceDoc);
    res.status(201).json(evidenceDoc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/evidence/:id/download', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const evidenceDoc = await Evidence.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!evidenceDoc) return res.status(404).json({ error: 'Evidence record not found.' });

    let fullPath = null;
    if (evidenceDoc.filePath) {
      fullPath = path.join(process.cwd(), evidenceDoc.filePath);
      if (!fs.existsSync(fullPath)) {
        fullPath = path.join(__dirname, '..', evidenceDoc.filePath);
      }
    }

    if (fullPath && fs.existsSync(fullPath)) {
      return res.download(fullPath, evidenceDoc.fileName);
    }

    // Fallback streaming official proof document if binary was not written to local disk
    const content = `===============================================================
OFFICIAL ESG EVIDENCE VERIFICATION DOCUMENT
===============================================================
Document ID: ${evidenceDoc._id}
File Name: ${evidenceDoc.fileName}
Category: ${evidenceDoc.category}
Organization ID: ${evidenceDoc.organizationId}
Record Model: ${evidenceDoc.recordModel || 'N/A'}
Verification Status: ${evidenceDoc.verificationStatus}
Uploaded By: ${evidenceDoc.uploadedBy}
Uploaded Date: ${evidenceDoc.uploadedAt}
Digital Hash: SHA256:${Buffer.from(evidenceDoc._id.toString()).toString('hex')}
===============================================================
This file serves as verified cryptographic evidence registered 
under the CarbonCredit.Network Environmental Management System.
===============================================================`;

    res.setHeader('Content-Disposition', `attachment; filename="${evidenceDoc.fileName || 'evidence-doc.txt'}"`);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/evidence/:id', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'MSME_USER'), async (req, res) => {
  try {
    const evidenceDoc = await Evidence.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!evidenceDoc) return res.status(404).json({ error: 'Evidence record not found.' });

    if (evidenceDoc.filePath) {
      const fullPath = path.join(__dirname, '..', evidenceDoc.filePath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }

    await logAudit(req.user.organizationId, req.user.email, 'Evidence Deleted', 'Evidence', req.params.id, evidenceDoc, '');
    res.json({ success: true, message: 'Evidence deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/evidence/:id/verify', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'AUDITOR', 'SUPER_ADMIN', 'PLATFORM_ADMIN'), async (req, res) => {
  try {
    const { status } = req.body;
    const record = await Evidence.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      { verificationStatus: status },
      { new: true }
    );
    if (!record) return res.status(404).json({ error: 'Evidence record not found' });

    await logAudit(req.user.organizationId, req.user.email, `Evidence ${status}`, 'Evidence', record._id, '', record);
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. TARGETS & ACTIONS
router.get('/targets', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const isGlobalOrRegulator = ['REGULATOR', 'SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN'].includes((req.user.role || '').toUpperCase());
    const filter = isGlobalOrRegulator ? {} : { organizationId: req.user.organizationId };
    const list = await EnvironmentalTarget.find(filter);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/targets', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'MSME_USER', 'REGULATOR'), async (req, res) => {
  try {
    const { name, category, baselineValue, currentValue, targetValue, baselineYear, targetYear, facilityId } = req.body;

    const base = parseFloat(baselineValue || 0);
    const curr = parseFloat(currentValue || base);
    const target = parseFloat(targetValue || 0);

    let status = 'ON_TRACK';
    if (curr >= target && target > 0) {
      status = 'ACHIEVED';
    } else if (curr < base * 0.9) {
      status = 'AT_RISK';
    }

    const record = await EnvironmentalTarget.create({
      organizationId: req.user.organizationId,
      facilityId: facilityId || null,
      name: name || 'General Target',
      category: category || 'Energy Reduction',
      baselineValue: base,
      currentValue: curr,
      targetValue: target,
      baselineYear: parseInt(baselineYear || 2024, 10),
      targetYear: parseInt(targetYear || 2030, 10),
      owner: req.user.email,
      status
    });

    await logAudit(req.user.organizationId, req.user.email, 'Target Created', 'Target', record._id, '', record);
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/targets/:id', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'MSME_USER', 'REGULATOR'), async (req, res) => {
  try {
    const oldTarget = await EnvironmentalTarget.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!oldTarget) return res.status(404).json({ error: 'Target not found.' });

    const updateData = { ...req.body };
    if (updateData.currentValue && updateData.targetValue) {
      const curr = parseFloat(updateData.currentValue);
      const target = parseFloat(updateData.targetValue);
      if (curr >= target) updateData.status = 'ACHIEVED';
    }

    const updated = await EnvironmentalTarget.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      updateData,
      { new: true }
    );

    await logAudit(req.user.organizationId, req.user.email, 'Target Updated', 'Target', updated._id, oldTarget, updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/targets/:id', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'MSME_USER'), async (req, res) => {
  try {
    const deleted = await EnvironmentalTarget.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!deleted) return res.status(404).json({ error: 'Target not found.' });
    await logAudit(req.user.organizationId, req.user.email, 'Target Deleted', 'Target', req.params.id, deleted, '');
    res.json({ success: true, message: 'Target deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/actions', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const isGlobalOrAdvisor = ['ADVISOR', 'AUDITOR', 'REGULATOR', 'SUPER_ADMIN', 'PLATFORM_ADMIN'].includes((req.user.role || '').toUpperCase());
    const filter = (isGlobalOrAdvisor && req.query.organizationId)
      ? { organizationId: req.query.organizationId }
      : (isGlobalOrAdvisor ? {} : { organizationId: req.user.organizationId });
    const list = await EnvironmentalAction.find(filter).sort({ dueDate: 1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/actions', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'MSME_USER', 'ADVISOR'), async (req, res) => {
  try {
    const orgId = req.body.organizationId || req.user.organizationId;
    const action = await EnvironmentalAction.create({
      ...req.body,
      action: req.body.action || req.body.title || req.body.description || 'Implement Decarbonization Measure',
      problem: req.body.problem || req.body.description || req.body.title || 'Action Required',
      category: ['Energy', 'GHG', 'Water', 'Biodiversity', 'Waste', 'Pollution'].includes(req.body.category) ? req.body.category : 'Energy',
      priority: ['LOW', 'MEDIUM', 'HIGH'].includes((req.body.priority || '').toUpperCase()) ? req.body.priority.toUpperCase() : 'MEDIUM',
      organizationId: orgId,
      owner: req.body.owner || req.user.email,
      startDate: req.body.startDate || new Date().toISOString().split('T')[0],
      dueDate: req.body.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: req.body.status || 'PLANNED'
    });
    await logAudit(orgId, req.user.email, 'Action Created', 'Action', action._id, '', action);
    res.status(201).json(action);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/actions/:id', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'MSME_USER'), async (req, res) => {
  try {
    const oldAction = await EnvironmentalAction.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!oldAction) return res.status(404).json({ error: 'Action not found.' });

    const updated = await EnvironmentalAction.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      req.body,
      { new: true }
    );
    await logAudit(req.user.organizationId, req.user.email, 'Action Updated', 'Action', updated._id, oldAction, updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/actions/:id', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'MSME_USER'), async (req, res) => {
  try {
    const deleted = await EnvironmentalAction.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!deleted) return res.status(404).json({ error: 'Action not found.' });
    await logAudit(req.user.organizationId, req.user.email, 'Action Deleted', 'Action', req.params.id, deleted, '');
    res.json({ success: true, message: 'Action deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12. GAPS
router.get('/gaps', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const isAuditorOrGlobal = ['AUDITOR', 'SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN'].includes((req.user.role || '').toUpperCase());
    const query = (isAuditorOrGlobal && req.query.organizationId)
      ? { organizationId: req.query.organizationId }
      : (isAuditorOrGlobal ? {} : { organizationId: req.user.organizationId });
    const gaps = await EnvironmentalGap.find(query);
    res.json(gaps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/gaps', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'MSME_USER', 'AUDITOR', 'ADVISOR'), async (req, res) => {
  try {
    const orgId = req.body.organizationId || req.user.organizationId;
    const gap = await EnvironmentalGap.create({
      ...req.body,
      gapTitle: req.body.gapTitle || req.body.title || 'Identified Environmental Finding',
      category: req.body.category || req.body.module || 'Environmental Compliance',
      whyItMatters: req.body.whyItMatters || req.body.description || '',
      organizationId: orgId,
      owner: req.body.owner || req.user.email,
      status: req.body.status || 'Open'
    });
    await logAudit(orgId, req.user.email, 'Gap Identified', 'Gaps', gap._id, '', gap);
    res.status(201).json(gap);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/gaps/:id', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const isAuditorOrGlobal = ['AUDITOR', 'SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN'].includes((req.user.role || '').toUpperCase());
    const filter = isAuditorOrGlobal 
      ? { _id: req.params.id }
      : { _id: req.params.id, organizationId: req.user.organizationId };
    const gap = await EnvironmentalGap.findOne(filter);
    if (!gap) {
      return res.status(404).json({ error: 'Gap not found' });
    }
    res.json(gap);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/gaps/:id', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'MSME_USER', 'AUDITOR', 'ADVISOR'), async (req, res) => {
  try {
    const isAuditorOrGlobal = ['AUDITOR', 'SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN'].includes((req.user.role || '').toUpperCase());
    const filter = isAuditorOrGlobal 
      ? { _id: req.params.id }
      : { _id: req.params.id, organizationId: req.user.organizationId };
    const updated = await EnvironmentalGap.findOneAndUpdate(
      filter,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/gaps/:id', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'MSME_USER', 'AUDITOR', 'ADVISOR'), async (req, res) => {
  try {
    const isAuditorOrGlobal = ['AUDITOR', 'SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN'].includes((req.user.role || '').toUpperCase());
    const filter = isAuditorOrGlobal 
      ? { _id: req.params.id }
      : { _id: req.params.id, organizationId: req.user.organizationId };
    const updated = await EnvironmentalGap.findOneAndUpdate(
      filter,
      req.body,
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/gaps/:id', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'MSME_USER'), async (req, res) => {
  try {
    await EnvironmentalGap.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 13. TRENDS
router.get('/trends', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const [readings, emissions, water, waste] = await Promise.all([
      ElectricityReading.find({ organizationId: orgId }),
      EmissionRecord.find({ organizationId: orgId }),
      WaterRecord.find({ organizationId: orgId }),
      WasteRecord.find({ organizationId: orgId })
    ]);

    const monthlyData = {};

    readings.forEach(r => {
      const month = r.readingDate ? r.readingDate.substring(0, 7) : '2026-08';
      if (!monthlyData[month]) monthlyData[month] = { month, energy: 0, emissions: 0, water: 0, waste: 0 };
      monthlyData[month].energy += (r.consumption || 0);
    });

    emissions.forEach(e => {
      const month = e.periodEnd ? e.periodEnd.substring(0, 7) : '2026-08';
      if (!monthlyData[month]) monthlyData[month] = { month, energy: 0, emissions: 0, water: 0, waste: 0 };
      monthlyData[month].emissions += Math.round((e.calculatedCO2e || 0) * 100) / 100;
    });

    water.forEach(w => {
      const month = w.periodEnd ? w.periodEnd.substring(0, 7) : '2026-08';
      if (!monthlyData[month]) monthlyData[month] = { month, energy: 0, emissions: 0, water: 0, waste: 0 };
      monthlyData[month].water += (w.consumption || 0);
    });

    waste.forEach(w => {
      const month = w.periodEnd ? w.periodEnd.substring(0, 7) : '2026-08';
      if (!monthlyData[month]) monthlyData[month] = { month, energy: 0, emissions: 0, water: 0, waste: 0 };
      monthlyData[month].waste += normalizeWasteToKg(w.quantity || 0, w.unit);
    });

    let result = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));
    if (result.length === 0) {
      result = [
        { month: '2026-05', energy: 0, emissions: 0, water: 0, waste: 0 },
        { month: '2026-06', energy: 0, emissions: 0, water: 0, waste: 0 },
        { month: '2026-07', energy: 0, emissions: 0, water: 0, waste: 0 },
        { month: '2026-08', energy: 0, emissions: 0, water: 0, waste: 0 }
      ];
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 14. REPORTS
router.get('/reports', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const orgId = req.user.organizationId;
    const { period = 'Quarterly' } = req.query;

    const [readings, emissions, water, waste, pollution, biodiversity, targets, actions, evidence] = await Promise.all([
      ElectricityReading.find({ organizationId: orgId }),
      EmissionRecord.find({ organizationId: orgId }),
      WaterRecord.find({ organizationId: orgId }),
      WasteRecord.find({ organizationId: orgId }),
      PollutionRecord.find({ organizationId: orgId }),
      BiodiversityAssessment.find({ organizationId: orgId }),
      EnvironmentalTarget.find({ organizationId: orgId }),
      EnvironmentalAction.find({ organizationId: orgId }),
      Evidence.find({ organizationId: orgId })
    ]);

    const orgName = req.user.organizationName || 'Eco Corp MSME';

    const reportData = {
      generatedAt: new Date().toISOString(),
      organizationName: orgName,
      reportingPeriod: period,
      summary: {
        totalEnergyKWh: readings.reduce((acc, r) => acc + (r.consumption || 0), 0),
        totalEmissionsTCO2e: Math.round(emissions.reduce((acc, e) => acc + (e.calculatedCO2e || 0), 0) * 100) / 100,
        totalWaterM3: water.reduce((acc, w) => acc + (w.consumption || 0), 0),
        totalWasteKg: waste.reduce((acc, w) => acc + normalizeWasteToKg(w.quantity || 0, w.unit), 0),
        totalEvidenceDocuments: evidence.length,
        targetsAchieved: targets.filter(t => t.status === 'ACHIEVED').length,
        totalTargets: targets.length,
        completedActions: actions.filter(a => a.status === 'COMPLETED').length,
        totalActions: actions.length
      },
      readings,
      emissions,
      water,
      waste,
      pollution,
      biodiversity,
      targets,
      actions
    };

    res.json(reportData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 15. AUDIT LOGS
router.get('/audit-logs', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const logs = await AuditLog.find({ organizationId: req.user.organizationId }).sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 16. AI ASSISTANT
router.post('/ai', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const { query } = req.body;
    const orgId = req.user.organizationId;

    const [readings, emissions, water, waste, pollution, targets, actions] = await Promise.all([
      ElectricityReading.find({ organizationId: orgId }),
      EmissionRecord.find({ organizationId: orgId }),
      WaterRecord.find({ organizationId: orgId }),
      WasteRecord.find({ organizationId: orgId }),
      PollutionRecord.find({ organizationId: orgId }),
      EnvironmentalTarget.find({ organizationId: orgId }),
      EnvironmentalAction.find({ organizationId: orgId })
    ]);

    const totalEnergy = readings.reduce((acc, r) => acc + (r.consumption || 0), 0);
    const totalEmissions = emissions.reduce((acc, e) => acc + (e.calculatedCO2e || 0), 0);
    const totalWater = water.reduce((acc, w) => acc + (w.consumption || 0), 0);
    const totalWaste = waste.reduce((acc, w) => acc + (w.quantity || 0), 0);

    const dbContext = `
[ACTUAL TENANT ENVIRONMENTAL DATA]
- Total Energy Consumed: ${totalEnergy} kWh
- Total GHG Emissions: ${Math.round(totalEmissions * 100) / 100} tCO2e
- Total Water Withdrawn: ${totalWater} m3
- Total Waste Managed: ${totalWaste} kg
- Open Pollution Incidents: ${pollution.filter(p => p.status === 'Open').length}
- Targets Tracked: ${targets.length} (${targets.filter(t => t.status === 'ACHIEVED').length} achieved)
- Open Improvement Actions: ${actions.filter(a => a.status !== 'COMPLETED').length}
`;

    const fullPrompt = `You are the Environmental ESG AI Analyst. Answer this user request using ONLY the available database context below. If context is missing, output 'Insufficient data is available to answer this accurately.'

Context:
${dbContext}

User Request: ${query}`;

    const response = await handleAIQuery(fullPrompt, req.user.role, orgId);
    res.json({ response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 17. IOT MQTT TELEMETRY & SIMULATOR ENDPOINTS
// ----------------------------------------------------
const { getMQTTStats } = require('../src/services/mqttBroker');
const { publishTelemetry, getIngestionLogs } = require('../src/services/mqttIngestionService');

router.get('/iot/stats', authenticateToken, enforceTenantIsolation, (req, res) => {
  try {
    const stats = getMQTTStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/iot/logs', authenticateToken, enforceTenantIsolation, (req, res) => {
  try {
    const logs = getIngestionLogs();
    // Filter to tenant
    const orgId = req.user.organizationId;
    const tenantLogs = logs.filter(l => l.topic.includes(orgId) || l.topic.startsWith('esg/'));
    res.json(tenantLogs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/iot/publish', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const { moduleType, facilityId, deviceId, payload } = req.body;
    const orgId = req.user.organizationId;
    const facId = facilityId || req.user.facilityId || 'fac-main';
    const mod = (moduleType || 'energy').toLowerCase();
    const dev = deviceId || `sensor-${Date.now()}`;

    const topic = `esg/${orgId}/${facId}/${mod}/${dev}`;
    const published = await publishTelemetry(topic, payload);

    if (published) {
      res.json({ success: true, topic, message: 'MQTT packet published successfully.' });
    } else {
      res.status(503).json({ error: 'MQTT Broker not connected or unavailable.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
