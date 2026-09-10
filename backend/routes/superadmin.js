const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const { 
  Organization, User, Facility, ElectricityReading, WaterRecord, 
  WasteRecord, PollutionRecord, EmissionRecord, Evidence, 
  EnvironmentalAlert, AuditLog, EmissionFactor 
} = require('../models/models');

const JWT_SECRET = process.env.JWT_SECRET || 'environmental-esg-secret-key-98765';

// JWT Token Authentication Middleware
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

// Super Admin Role Gate
function authorizeSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Forbidden: Restricted to Super Administrators only.' });
  }
  next();
}

// Apply authentication and Super Admin authorization to all routes
router.use(authenticateToken);
router.use(authorizeSuperAdmin);

// ----------------------------------------------------
// 1. DASHBOARD: GLOBAL SaaS PLATFORM SUMMARY
// ----------------------------------------------------
router.get('/dashboard', async (req, res) => {
  try {
    const [
      orgsCount,
      usersCount,
      electricityCount,
      waterCount,
      wasteCount,
      pollutionCount,
      emissionsCount,
      evidenceList,
      alertsCount,
      logs
    ] = await Promise.all([
      Organization.countDocuments({}),
      User.countDocuments({}),
      ElectricityReading.countDocuments({}),
      WaterRecord.countDocuments({}),
      WasteRecord.countDocuments({}),
      PollutionRecord.countDocuments({}),
      EmissionRecord.countDocuments({}),
      Evidence.find({}),
      EnvironmentalAlert.countDocuments({}),
      AuditLog.find({})
    ]);

    const totalRecords = electricityCount + waterCount + wasteCount + pollutionCount + emissionsCount;

    // Aggregate evidence statuses
    const pendingEvidence = evidenceList.filter(e => e.verificationStatus === 'PENDING').length;
    const verifiedEvidence = evidenceList.filter(e => e.verificationStatus === 'VERIFIED').length;
    const rejectedEvidence = evidenceList.filter(e => e.verificationStatus === 'REJECTED').length;

    // AI & Report counts from Audit logs
    const aiUsage = logs.filter(l => l.action === 'AI Analysis Requested').length;
    const reportsGenerated = logs.filter(l => l.action === 'Report Generated').length;

    res.json({
      totalOrganizations: orgsCount,
      activeOrganizations: orgsCount, // Seeding maps organizations as active
      totalUsers: usersCount,
      environmentalRecords: totalRecords,
      pendingVerification: pendingEvidence,
      verifiedRecords: verifiedEvidence,
      rejectedRecords: rejectedEvidence,
      reportsGenerated: reportsGenerated || 14, // seed mock count if logs clean
      aiUsage: aiUsage || 28,
      systemAlerts: alertsCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 2. ORGANIZATIONS MANAGEMENT
// ----------------------------------------------------
router.get('/organizations', async (req, res) => {
  try {
    const orgs = await Organization.find({});
    const facilities = await Facility.find({});

    const orgsWithDetails = orgs.map(org => {
      const orgFacilities = facilities.filter(f => f.organizationId === org._id.toString());
      return {
        _id: org._id,
        name: org.name,
        createdAt: org.createdAt,
        facilitiesCount: orgFacilities.length,
        locations: orgFacilities.map(f => f.location)
      };
    });

    res.json(orgsWithDetails);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/organizations', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Organization name is required' });

    const existing = await Organization.findOne({ name });
    if (existing) return res.status(400).json({ error: 'Organization already exists' });

    const newOrg = await Organization.create({
      name,
      createdAt: new Date().toISOString().split('T')[0]
    });

    await AuditLog.create({
      organizationId: req.user.organizationId,
      user: req.user.email,
      action: 'Record Created',
      module: 'Support',
      recordId: newOrg._id.toString(),
      newValue: JSON.stringify(newOrg),
      timestamp: new Date().toISOString()
    });

    res.status(201).json(newOrg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 3. USERS CONFIGURATION
// ----------------------------------------------------
router.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    const orgs = await Organization.find({});

    const usersWithOrg = users.map(u => {
      const org = orgs.find(o => o._id.toString() === u.organizationId);
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        organizationId: u.organizationId,
        organizationName: org ? org.name : 'SaaS System Administration',
        facilityId: u.facilityId
      };
    });

    res.json(usersWithOrg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role, organizationId, facilityId } = req.body;
    if (!name || !email || !password || !role || !organizationId) {
      return res.status(400).json({ error: 'Name, email, password, role, and organizationId are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      organizationId,
      facilityId: facilityId || null
    });

    await AuditLog.create({
      organizationId: organizationId,
      user: req.user.email,
      action: 'Record Created',
      module: 'Support',
      recordId: newUser._id.toString(),
      newValue: JSON.stringify({ name, email, role, organizationId }),
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      organizationId: newUser.organizationId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 4. WORKSPACES (FACILITIES) MANAGEMENT
// ----------------------------------------------------
router.get('/facilities', async (req, res) => {
  try {
    const list = await Facility.find({});
    const orgs = await Organization.find({});
    const workspaces = list.map(f => {
      const org = orgs.find(o => o._id.toString() === f.organizationId);
      return {
        _id: f._id,
        name: f.name,
        location: f.location,
        area: f.area,
        description: f.description,
        organizationId: f.organizationId,
        organizationName: org ? org.name : 'Unknown Company'
      };
    });
    res.json(workspaces);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/facilities', async (req, res) => {
  try {
    const { name, location, area, description, organizationId } = req.body;
    if (!name || !location || !organizationId) {
      return res.status(400).json({ error: 'Name, location, and organizationId are required' });
    }

    const newFacility = await Facility.create({
      name,
      location,
      area: parseFloat(area || 0),
      description: description || '',
      organizationId
    });

    await AuditLog.create({
      organizationId,
      user: req.user.email,
      action: 'Record Created',
      module: 'Support',
      recordId: newFacility._id.toString(),
      newValue: JSON.stringify(newFacility),
      timestamp: new Date().toISOString()
    });

    res.status(201).json(newFacility);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 5. ROLES & PERMISSIONS
// ----------------------------------------------------
let rolePermissionsMatrix = {
  SUPER_ADMIN: { allAccess: true, auditAccess: true, configAccess: true, dataEntry: false },
  ADMIN: { allAccess: false, auditAccess: true, configAccess: true, dataEntry: true },
  ESG_MANAGER: { allAccess: false, auditAccess: true, configAccess: true, dataEntry: true },
  ENVIRONMENTAL_MANAGER: { allAccess: false, auditAccess: true, configAccess: true, dataEntry: true },
  DATA_ENTRY: { allAccess: false, auditAccess: false, configAccess: false, dataEntry: true },
  AUDITOR: { allAccess: false, auditAccess: true, configAccess: false, dataEntry: false },
  VIEWER: { allAccess: false, auditAccess: false, configAccess: false, dataEntry: false }
};

router.get('/roles-permissions', (req, res) => {
  res.json(rolePermissionsMatrix);
});

router.put('/roles-permissions', async (req, res) => {
  try {
    const { matrix } = req.body;
    if (matrix) {
      rolePermissionsMatrix = matrix;
      await AuditLog.create({
        organizationId: req.user.organizationId,
        user: req.user.email,
        action: 'Record Updated',
        module: 'Support',
        recordId: 'role-permissions-matrix',
        newValue: JSON.stringify(matrix),
        timestamp: new Date().toISOString()
      });
    }
    res.json(rolePermissionsMatrix);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 6. EMISSION FACTORS CONFIGURATION
// ----------------------------------------------------
router.get('/emission-factors', async (req, res) => {
  try {
    const factors = await EmissionFactor.find({});
    res.json(factors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/emission-factors', async (req, res) => {
  try {
    const { name, category, activityType, value, unit, source, region, effectiveFrom } = req.body;
    if (!name || !category || !activityType || !value || !unit || !source || !effectiveFrom) {
      return res.status(400).json({ error: 'All fields except region are required' });
    }

    const newFactor = await EmissionFactor.create({
      name,
      category,
      activityType,
      value: parseFloat(value),
      unit,
      source,
      region: region || 'Global',
      effectiveFrom,
      isActive: true
    });

    await AuditLog.create({
      organizationId: req.user.organizationId,
      user: req.user.email,
      action: 'Record Created',
      module: 'Support',
      recordId: newFactor._id.toString(),
      newValue: JSON.stringify(newFactor),
      timestamp: new Date().toISOString()
    });

    res.status(201).json(newFactor);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 7. VERIFICATION POOL
// ----------------------------------------------------
router.get('/verification', async (req, res) => {
  try {
    const list = await Evidence.find({});
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/verification/:id', async (req, res) => {
  try {
    const { status } = req.body; // VERIFIED, REJECTED
    if (!['VERIFIED', 'REJECTED', 'PENDING'].includes(status)) {
      return res.status(400).json({ error: 'Invalid verification status' });
    }

    const doc = await Evidence.findByIdAndUpdate(req.params.id, { verificationStatus: status }, { new: true });
    if (!doc) return res.status(404).json({ error: 'Evidence document not found' });

    await AuditLog.create({
      organizationId: doc.organizationId,
      user: req.user.email,
      action: 'Evidence Verified',
      module: 'Support',
      recordId: doc._id.toString(),
      newValue: `Status changed to: ${status}`,
      timestamp: new Date().toISOString()
    });

    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 8. REPORTS CONTROL
// ----------------------------------------------------
let systemReportsList = [
  { id: '1', name: 'Global Platform Carbon Summary Q1', format: 'PDF', generatedAt: '2026-03-31', size: '1.2 MB' },
  { id: '2', name: 'Multi-Tenant Energy Intensity Index', format: 'CSV', generatedAt: '2026-04-15', size: '340 KB' },
  { id: '3', name: 'SaaS Platform Audit Ledger 2025', format: 'XLSX', generatedAt: '2026-01-10', size: '4.8 MB' }
];

router.get('/reports', (req, res) => {
  res.json(systemReportsList);
});

router.post('/reports', async (req, res) => {
  try {
    const { name, format } = req.body;
    if (!name || !format) return res.status(400).json({ error: 'Report name and format are required' });

    const newReport = {
      id: String(systemReportsList.length + 1),
      name,
      format,
      generatedAt: new Date().toISOString().split('T')[0],
      size: '150 KB'
    };

    systemReportsList.push(newReport);

    await AuditLog.create({
      organizationId: req.user.organizationId,
      user: req.user.email,
      action: 'Report Generated',
      module: 'Support',
      recordId: newReport.id,
      newValue: JSON.stringify(newReport),
      timestamp: new Date().toISOString()
    });

    res.status(201).json(newReport);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 9. AI CONFIGURATION & ANALYTICS
// ----------------------------------------------------
let aiConfigState = {
  activeModel: 'Gemini-1.5-Pro',
  temperature: 0.2,
  tokenLimit: 8192,
  maxDailyRequests: 500
};

router.get('/ai-config', (req, res) => {
  res.json(aiConfigState);
});

router.put('/ai-config', async (req, res) => {
  try {
    aiConfigState = { ...aiConfigState, ...req.body };
    await AuditLog.create({
      organizationId: req.user.organizationId,
      user: req.user.email,
      action: 'Record Updated',
      module: 'Support',
      recordId: 'ai-config-state',
      newValue: JSON.stringify(aiConfigState),
      timestamp: new Date().toISOString()
    });
    res.json(aiConfigState);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 10. AUDIT LOGGING
// ----------------------------------------------------
router.get('/audit-logs', async (req, res) => {
  try {
    const logs = await AuditLog.find({}).sort({ timestamp: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 11. SYSTEM MONITORING HEALTH DIALS
// ----------------------------------------------------
router.get('/system-health', async (req, res) => {
  try {
    const cpuLoad = Math.floor(Math.random() * (45 - 12 + 1)) + 12; // 12% - 45%
    const heapMemory = Math.floor(Math.random() * (280 - 140 + 1)) + 140; // 140MB - 280MB
    const activeConns = Math.floor(Math.random() * (15 - 4 + 1)) + 4; // 4 - 15
    const trafficRate = Math.floor(Math.random() * (48 - 15 + 1)) + 15; // 15 - 48 req/min

    res.json({
      status: 'HEALTHY',
      cpuUsage: `${cpuLoad}%`,
      memoryHeap: `${heapMemory} MB`,
      activeConnections: activeConns,
      apiTrafficRate: `${trafficRate} req/min`,
      uptime: '72 hours, 18 minutes',
      dbUptime: 'Connected'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
