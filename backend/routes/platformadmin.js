const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const { 
  Organization, User, Facility, ElectricityReading, WaterRecord, 
  WasteRecord, PollutionRecord, EmissionRecord, Evidence, 
  EnvironmentalAlert, AuditLog 
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

// Platform Admin Role Gate
function authorizePlatformAdmin(req, res, next) {
  if (!req.user || (req.user.role !== 'PLATFORM_ADMIN' && req.user.role !== 'SUPER_ADMIN')) {
    return res.status(403).json({ error: 'Forbidden: Restricted to Platform Administrators only.' });
  }
  next();
}

// Apply middlewares
router.use(authenticateToken);
router.use(authorizePlatformAdmin);

// ----------------------------------------------------
// 1. OPERATIONS DASHBOARD SUMMARY
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
      alertsList,
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
      EnvironmentalAlert.find({}),
      AuditLog.find({}).sort({ timestamp: -1 }).limit(10)
    ]);

    const totalRecords = electricityCount + waterCount + wasteCount + pollutionCount + emissionsCount;
    const pendingEvidence = evidenceList.filter(e => e.verificationStatus === 'PENDING').length;

    // Approvals queue count (simulated count based on pending evidence)
    const approvalsPending = pendingEvidence;

    // Alerts count by severity
    const criticalAlerts = alertsList.filter(a => a.severity === 'Critical').length;
    const warningAlerts = alertsList.filter(a => a.severity === 'Warning').length;
    const infoAlerts = alertsList.filter(a => a.severity === 'Improvement').length;

    res.json({
      totalOrganizations: orgsCount,
      activeOrganizations: orgsCount,
      totalUsers: usersCount,
      environmentalRecords: totalRecords,
      approvalsPending: approvalsPending,
      verificationQueueSize: pendingEvidence,
      alerts: {
        critical: criticalAlerts,
        warning: warningAlerts,
        improvement: infoAlerts
      },
      recentActivity: logs
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 2. ORGANIZATIONS MANAGEMENT (Onboarding & directory)
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
      newValue: `Organization onboarding: ${name}`,
      timestamp: new Date().toISOString()
    });

    res.status(201).json(newOrg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 3. USERS MANAGEMENT (Manage Users)
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
// 4. APPROVALS WORKFLOW
// ----------------------------------------------------
let approvalsMockList = [
  { id: 'app-1', title: 'Q1 Scope 2 Grid Emissions Audit', company: 'Acme Corporation', status: 'PENDING', submittedAt: '2026-04-10' },
  { id: 'app-2', title: 'Hazardous Waste Landfill Diversion Manifest', company: 'Beta Industries', status: 'PENDING', submittedAt: '2026-04-18' }
];

router.get('/approvals', (req, res) => {
  res.json(approvalsMockList);
});

router.put('/approvals/:id', async (req, res) => {
  try {
    const { status } = req.body; // APPROVED, REJECTED
    approvalsMockList = approvalsMockList.map(a => {
      if (a.id === req.params.id) {
        return { ...a, status };
      }
      return a;
    });

    await AuditLog.create({
      organizationId: req.user.organizationId,
      user: req.user.email,
      action: 'Submission Approved',
      module: 'Support',
      recordId: req.params.id,
      newValue: `Approval status changed to: ${status}`,
      timestamp: new Date().toISOString()
    });

    res.json({ id: req.params.id, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 5. VERIFICATION QUEUE & ASSIGNMENTS
// ----------------------------------------------------
router.get('/verification', async (req, res) => {
  try {
    const evidence = await Evidence.find({});
    res.json(evidence);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/verification/:id/assign', async (req, res) => {
  try {
    const { verifierEmail } = req.body;
    if (!verifierEmail) return res.status(400).json({ error: 'Verifier email is required' });

    // Simulate assignment log in AuditLog
    await AuditLog.create({
      organizationId: req.user.organizationId,
      user: req.user.email,
      action: 'Record Updated',
      module: 'Support',
      recordId: req.params.id,
      newValue: `Assigned verifier: ${verifierEmail}`,
      timestamp: new Date().toISOString()
    });

    res.json({ id: req.params.id, verifierEmail, status: 'ASSIGNED' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/verification/:id/review', async (req, res) => {
  try {
    const { status } = req.body; // VERIFIED, REJECTED
    const doc = await Evidence.findByIdAndUpdate(req.params.id, { verificationStatus: status }, { new: true });
    if (!doc) return res.status(404).json({ error: 'Evidence document not found' });

    await AuditLog.create({
      organizationId: doc.organizationId,
      user: req.user.email,
      action: 'Evidence Verified',
      module: 'Support',
      recordId: doc._id.toString(),
      newValue: `Review Status: ${status}`,
      timestamp: new Date().toISOString()
    });

    res.json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 6. DATA QUALITY MONITORING
// ----------------------------------------------------
router.get('/data-quality', async (req, res) => {
  try {
    const [electricity, water, waste, pollution] = await Promise.all([
      ElectricityReading.find({}),
      WaterRecord.find({}),
      WasteRecord.find({}),
      PollutionRecord.find({})
    ]);

    const allRecords = [...electricity, ...water, ...waste, ...pollution];
    const total = allRecords.length || 1;

    const actual = allRecords.filter(r => r.dataQuality === 'Actual').length;
    const estimated = allRecords.filter(r => r.dataQuality === 'Estimated').length;
    const calculated = allRecords.filter(r => r.dataQuality === 'Calculated').length;

    res.json({
      totalCount: total,
      breakdown: {
        actual: actual || 15, // fallback seed numbers if empty
        estimated: estimated || 4,
        calculated: calculated || 2
      },
      actualRatio: (((actual || 15) / (total || 21)) * 100).toFixed(1) + '%'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 7. ENVIRONMENTAL ALERTS & ISSUE RESOLUTION
// ----------------------------------------------------
router.get('/alerts', async (req, res) => {
  try {
    const alerts = await EnvironmentalAlert.find({});
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/alerts/:id/resolve', async (req, res) => {
  try {
    const alert = await EnvironmentalAlert.findByIdAndUpdate(req.params.id, { status: 'Resolved' }, { new: true });
    if (!alert) return res.status(404).json({ error: 'Alert not found' });

    await AuditLog.create({
      organizationId: alert.organizationId,
      user: req.user.email,
      action: 'Record Updated',
      module: 'Support',
      recordId: alert._id.toString(),
      newValue: 'Alert status set to Resolved',
      timestamp: new Date().toISOString()
    });

    res.json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 8. REPORTS
// ----------------------------------------------------
let opsReportsList = [
  { id: '1', name: 'Operations Audit Q1 Summary', format: 'PDF', generatedAt: '2026-03-31', size: '640 KB' },
  { id: '2', name: 'Actual vs Estimated Quality Ratio Report', format: 'CSV', generatedAt: '2026-04-12', size: '120 KB' }
];

router.get('/reports', (req, res) => {
  res.json(opsReportsList);
});

router.post('/reports', async (req, res) => {
  try {
    const { name, format } = req.body;
    const newReport = {
      id: String(opsReportsList.length + 1),
      name,
      format,
      generatedAt: new Date().toISOString().split('T')[0],
      size: '220 KB'
    };
    opsReportsList.push(newReport);

    await AuditLog.create({
      organizationId: req.user.organizationId,
      user: req.user.email,
      action: 'Report Generated',
      module: 'Support',
      recordId: newReport.id,
      newValue: `Operations generated report: ${name}`,
      timestamp: new Date().toISOString()
    });

    res.status(201).json(newReport);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 9. ACTIVITY FEED
// ----------------------------------------------------
router.get('/activity', async (req, res) => {
  try {
    const list = await AuditLog.find({}).sort({ timestamp: -1 }).limit(50);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
