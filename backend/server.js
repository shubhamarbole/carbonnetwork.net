const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const mongoose = require('mongoose');
require('dotenv').config();

const { setUseMock, isMock } = require('./models/db');
const { 
  Organization, User, Facility, GHGRecord, EnergyRecord, WaterRecord, WasteRecord, Pollution, 
  ClimateRisk, EnvironmentalTarget, EnvironmentalAlert, Evidence, AuditLog, EmissionFactor 
} = require('./models/models');

const { calculateEnvironmentalScore } = require('./services/scoreService');
const { getForecastingData } = require('./services/forecastService');
const { handleAIQuery } = require('./services/aiService');
const { compileReportData, generateCSV, generateExcel, generateHTMLReport } = require('./services/reportService');
const { resolveEmissionFactor } = require('./services/emissionFactorService');

const app = express();
const PORT = process.env.PORT || 5050;
const JWT_SECRET = process.env.JWT_SECRET || 'environmental-esg-secret-key-98765';

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/api/environment', require('./routes/environment'));
app.use('/api/superadmin', require('./routes/superadmin'));
app.use('/api/platformadmin', require('./routes/platformadmin'));

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Multer Storage Configuration for Evidence Upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });

// Database Connection Attempt
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/esg-environmental';
mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 3000 })
  .then(() => {
    console.log("🟢 Connected to MongoDB.");
  })
  .catch((err) => {
    console.warn("🔴 MongoDB Connection failed. Switching to in-memory/file Mock DB fallback.");
    setUseMock(true);
  });

// JWT Verification Middleware
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

// Multi-Tenant Isolation Middleware
function enforceTenantIsolation(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized: Missing Tenant Context' });
  }
  if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'PLATFORM_ADMIN') {
    return next();
  }
  if (!req.user.organizationId) {
    return res.status(401).json({ error: 'Unauthorized: Missing Tenant Context' });
  }
  next();
}

// Role-Based Access Control (RBAC) Middleware
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Forbidden: Access restricted to roles [${allowedRoles.join(', ')}]` });
    }
    next();
  };
}

// ----------------------------------------------------
// 1. Authentication Routes
// ----------------------------------------------------
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, organizationName } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });

    // Find or create organization
    let org = await Organization.findOne({ name: organizationName || 'Acme Corporation' });
    if (!org) {
      org = await Organization.create({
        name: organizationName || 'Acme Corporation',
        createdAt: new Date().toISOString().split('T')[0]
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || 'VIEWER',
      organizationId: org._id.toString(),
      facilityId: null
    });

    const token = jwt.sign({ 
      id: newUser._id.toString(), 
      role: newUser.role, 
      email: newUser.email,
      organizationId: newUser.organizationId,
      facilityId: newUser.facilityId
    }, JWT_SECRET);
    
    res.status(201).json({ 
      token, 
      user: { 
        name: newUser.name, 
        email: newUser.email, 
        role: newUser.role,
        organizationId: newUser.organizationId,
        facilityId: newUser.facilityId
      } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'User not found' });

    const validPass = await bcrypt.compare(password, user.password);
    if (!validPass) return res.status(400).json({ error: 'Invalid password' });

    const token = jwt.sign({ 
      id: user._id.toString(), 
      role: user.role, 
      email: user.email,
      organizationId: user.organizationId,
      facilityId: user.facilityId
    }, JWT_SECRET);

    res.json({ 
      token, 
      user: { 
        name: user.name, 
        email: user.email, 
        role: user.role,
        organizationId: user.organizationId,
        facilityId: user.facilityId
      } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ 
      name: user.name, 
      email: user.email, 
      role: user.role,
      organizationId: user.organizationId,
      facilityId: user.facilityId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 2. Facilities Endpoints
// ----------------------------------------------------
app.get('/api/facilities', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const list = await Facility.find({ organizationId: req.user.organizationId });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/facilities', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER'), async (req, res) => {
  try {
    const { name, location, area, description } = req.body;
    if (!name || !location) return res.status(400).json({ error: 'Name and location are required' });

    const newFacility = await Facility.create({
      name,
      location,
      area: area ? parseFloat(area) : 0,
      description: description || '',
      organizationId: req.user.organizationId
    });
    res.status(201).json(newFacility);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 3. Environmental Score Overview
// ----------------------------------------------------
app.get('/api/analytics/score', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const scores = await calculateEnvironmentalScore(req.user.organizationId);
    res.json(scores);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 4. GHG Emissions Endpoints (Scope 1, 2, 3)
// ----------------------------------------------------
app.get('/api/ghg', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const list = await GHGRecord.find({ organizationId: req.user.organizationId });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ghg', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'DATA_ENTRY'), async (req, res) => {
  try {
    const { facilityId, scope, category, sourceName, activityValue, activityUnit, reportingPeriod, periodStart, periodEnd } = req.body;
    
    // RBAC: Data Entry role limit check
    if (req.user.role === 'DATA_ENTRY' && req.user.facilityId && req.user.facilityId !== facilityId) {
      return res.status(403).json({ error: 'Forbidden: You are restricted to your assigned facility data.' });
    }

    if (!facilityId || !scope || !category || !sourceName || activityValue === undefined || !activityUnit || !reportingPeriod || !periodStart || !periodEnd) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Resolve EF dynamically
    const ef = await resolveEmissionFactor(category, sourceName, periodStart);
    // Calculated CO2e = Activity value * EF. Convert kg to metric tonnes.
    const calculatedCO2e = (parseFloat(activityValue) * ef.value) / 1000;

    const record = await GHGRecord.create({
      organizationId: req.user.organizationId,
      facilityId,
      scope: parseInt(scope),
      category,
      sourceName,
      activityValue: parseFloat(activityValue),
      activityUnit,
      emissionFactor: ef.value,
      factorUnit: ef.unit,
      factorSource: ef.source,
      methodology: ef.methodology,
      calculatedCO2e,
      reportingPeriod,
      periodStart,
      periodEnd,
      createdBy: req.user.email,
      updatedBy: req.user.email
    });

    // Audit Log
    await AuditLog.create({
      organizationId: req.user.organizationId,
      user: req.user.email,
      action: 'CREATE',
      module: 'GHG',
      recordId: record._id.toString(),
      oldValue: '',
      newValue: JSON.stringify(record),
      timestamp: new Date().toISOString()
    });

    // Check targets and update Target currentValue
    const ghgTarget = await EnvironmentalTarget.findOne({ organizationId: req.user.organizationId, metric: 'GHG' });
    if (ghgTarget) {
      const records = await GHGRecord.find({ organizationId: req.user.organizationId });
      const sum = records.reduce((acc, curr) => acc + curr.calculatedCO2e, 0);
      
      let status = 'ON TRACK';
      if (sum > ghgTarget.targetValue) status = 'OFF TRACK';
      else if (sum > ghgTarget.targetValue * 0.9) status = 'AT RISK';

      await EnvironmentalTarget.findByIdAndUpdate(ghgTarget._id, { 
        currentValue: Math.round(sum),
        status
      });
    }

    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/ghg/:id', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER'), async (req, res) => {
  try {
    const record = await GHGRecord.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!record) return res.status(404).json({ error: 'Record not found' });

    await GHGRecord.deleteOne({ _id: req.params.id, organizationId: req.user.organizationId });

    // Audit Log
    await AuditLog.create({
      organizationId: req.user.organizationId,
      user: req.user.email,
      action: 'DELETE',
      module: 'GHG',
      recordId: req.params.id,
      oldValue: JSON.stringify(record),
      newValue: '',
      timestamp: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 5. Energy Management Endpoints
// ----------------------------------------------------
app.get('/api/energy', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const list = await EnergyRecord.find({ organizationId: req.user.organizationId });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/energy', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'DATA_ENTRY'), async (req, res) => {
  try {
    const { facilityId, type, subtype, amount, unit, isRenewable, reportingPeriod, periodStart, periodEnd } = req.body;
    
    // RBAC: Data Entry restriction
    if (req.user.role === 'DATA_ENTRY' && req.user.facilityId && req.user.facilityId !== facilityId) {
      return res.status(403).json({ error: 'Forbidden: You are restricted to your assigned facility data.' });
    }

    if (!facilityId || !type || amount === undefined || !unit || !reportingPeriod || !periodStart || !periodEnd) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Normalize to equivalent kWh: Natural Gas m3 * 10.5, Diesel Liters * 10, Petrol Liters * 9, LPG Liter * 7
    let kwh = parseFloat(amount);
    if (type === 'Natural Gas') kwh = parseFloat(amount) * 10.5;
    else if (type === 'Diesel') kwh = parseFloat(amount) * 10.0;
    else if (type === 'Petrol') kwh = parseFloat(amount) * 9.0;
    else if (type === 'LPG') kwh = parseFloat(amount) * 7.0;

    const record = await EnergyRecord.create({
      organizationId: req.user.organizationId,
      facilityId,
      type,
      subtype: subtype || '',
      amount: parseFloat(amount),
      unit,
      isRenewable: !!isRenewable,
      calculatedkWh: kwh,
      reportingPeriod,
      periodStart,
      periodEnd,
      createdBy: req.user.email
    });

    // Audit Log
    await AuditLog.create({
      organizationId: req.user.organizationId,
      user: req.user.email,
      action: 'CREATE',
      module: 'Energy',
      recordId: record._id.toString(),
      oldValue: '',
      newValue: JSON.stringify(record),
      timestamp: new Date().toISOString()
    });

    // Update energy targets
    const target = await EnvironmentalTarget.findOne({ organizationId: req.user.organizationId, metric: 'Energy' });
    if (target) {
      const records = await EnergyRecord.find({ organizationId: req.user.organizationId });
      const sum = records.reduce((acc, curr) => acc + curr.calculatedkWh, 0);
      
      let status = 'ON TRACK';
      if (sum > target.targetValue) status = 'OFF TRACK';
      else if (sum > target.targetValue * 0.9) status = 'AT RISK';

      await EnvironmentalTarget.findByIdAndUpdate(target._id, { 
        currentValue: Math.round(sum),
        status
      });
    }

    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/energy/:id', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER'), async (req, res) => {
  try {
    const record = await EnergyRecord.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!record) return res.status(404).json({ error: 'Record not found' });

    await EnergyRecord.deleteOne({ _id: req.params.id, organizationId: req.user.organizationId });

    // Audit Log
    await AuditLog.create({
      organizationId: req.user.organizationId,
      user: req.user.email,
      action: 'DELETE',
      module: 'Energy',
      recordId: req.params.id,
      oldValue: JSON.stringify(record),
      newValue: '',
      timestamp: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 6. Water Management Endpoints
// ----------------------------------------------------
app.get('/api/water', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const list = await WaterRecord.find({ organizationId: req.user.organizationId });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/water', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'DATA_ENTRY'), async (req, res) => {
  try {
    const { facilityId, actionType, source, amount, unit, waterStressedLocation, reportingPeriod, periodStart, periodEnd } = req.body;
    
    // RBAC: Data Entry limit
    if (req.user.role === 'DATA_ENTRY' && req.user.facilityId && req.user.facilityId !== facilityId) {
      return res.status(403).json({ error: 'Forbidden: You are restricted to your assigned facility data.' });
    }

    if (!facilityId || !actionType || !source || amount === undefined || !reportingPeriod || !periodStart || !periodEnd) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const record = await WaterRecord.create({
      organizationId: req.user.organizationId,
      facilityId,
      actionType,
      source,
      amount: parseFloat(amount),
      unit: unit || 'm3',
      waterStressedLocation: !!waterStressedLocation,
      reportingPeriod,
      periodStart,
      periodEnd,
      createdBy: req.user.email
    });

    // Audit Log
    await AuditLog.create({
      organizationId: req.user.organizationId,
      user: req.user.email,
      action: 'CREATE',
      module: 'Water',
      recordId: record._id.toString(),
      oldValue: '',
      newValue: JSON.stringify(record),
      timestamp: new Date().toISOString()
    });

    // Update water target
    const target = await EnvironmentalTarget.findOne({ organizationId: req.user.organizationId, metric: 'Water' });
    if (target) {
      const records = await WaterRecord.find({ organizationId: req.user.organizationId, actionType: 'Withdrawal' });
      const sum = records.reduce((acc, curr) => acc + curr.amount, 0);
      
      let status = 'ON TRACK';
      if (sum > target.targetValue) status = 'OFF TRACK';
      else if (sum > target.targetValue * 0.9) status = 'AT RISK';

      await EnvironmentalTarget.findByIdAndUpdate(target._id, {
        currentValue: Math.round(sum),
        status
      });
    }

    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/water/:id', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER'), async (req, res) => {
  try {
    const record = await WaterRecord.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!record) return res.status(404).json({ error: 'Record not found' });

    await WaterRecord.deleteOne({ _id: req.params.id, organizationId: req.user.organizationId });

    // Audit Log
    await AuditLog.create({
      organizationId: req.user.organizationId,
      user: req.user.email,
      action: 'DELETE',
      module: 'Water',
      recordId: req.params.id,
      oldValue: JSON.stringify(record),
      newValue: '',
      timestamp: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 7. Waste Management Endpoints
// ----------------------------------------------------
app.get('/api/waste', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const list = await WasteRecord.find({ organizationId: req.user.organizationId });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/waste', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'DATA_ENTRY'), async (req, res) => {
  try {
    const { facilityId, type, treatment, amount, unit, reportingPeriod, periodStart, periodEnd } = req.body;
    
    // RBAC: Data Entry limit
    if (req.user.role === 'DATA_ENTRY' && req.user.facilityId && req.user.facilityId !== facilityId) {
      return res.status(403).json({ error: 'Forbidden: You are restricted to your assigned facility data.' });
    }

    if (!facilityId || !type || !treatment || amount === undefined || !reportingPeriod || !periodStart || !periodEnd) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const record = await WasteRecord.create({
      organizationId: req.user.organizationId,
      facilityId,
      type,
      treatment,
      amount: parseFloat(amount),
      unit: unit || 'Tonnes',
      reportingPeriod,
      periodStart,
      periodEnd,
      createdBy: req.user.email
    });

    // Audit Log
    await AuditLog.create({
      organizationId: req.user.organizationId,
      user: req.user.email,
      action: 'CREATE',
      module: 'Waste',
      recordId: record._id.toString(),
      oldValue: '',
      newValue: JSON.stringify(record),
      timestamp: new Date().toISOString()
    });

    // Check targets (Waste Diversion/Recycling %)
    const target = await EnvironmentalTarget.findOne({ organizationId: req.user.organizationId, metric: 'Waste' });
    if (target) {
      const records = await WasteRecord.find({ organizationId: req.user.organizationId });
      const total = records.reduce((acc, curr) => acc + curr.amount, 0);
      const diverted = records.filter(r => ['Recycled', 'Reused', 'Composted'].includes(r.treatment))
                             .reduce((acc, curr) => acc + curr.amount, 0);
      const rate = total > 0 ? (diverted / total) * 100 : 0;
      
      let status = 'OFF TRACK';
      if (rate >= target.targetValue) status = 'ON TRACK';
      else if (rate >= target.targetValue * 0.8) status = 'AT RISK';

      await EnvironmentalTarget.findByIdAndUpdate(target._id, {
        currentValue: Math.round(rate),
        status
      });
    }

    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/waste/:id', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER'), async (req, res) => {
  try {
    const record = await WasteRecord.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!record) return res.status(404).json({ error: 'Record not found' });

    await WasteRecord.deleteOne({ _id: req.params.id, organizationId: req.user.organizationId });

    // Audit Log
    await AuditLog.create({
      organizationId: req.user.organizationId,
      user: req.user.email,
      action: 'DELETE',
      module: 'Waste',
      recordId: req.params.id,
      oldValue: JSON.stringify(record),
      newValue: '',
      timestamp: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 8. Pollution Management Endpoints
// ----------------------------------------------------
app.get('/api/pollution', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const list = await Pollution.find({ organizationId: req.user.organizationId });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/pollution', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'DATA_ENTRY'), async (req, res) => {
  try {
    const data = req.body;
    data.organizationId = req.user.organizationId;
    data.createdBy = req.user.email;
    data.updatedBy = req.user.email;
    const record = await Pollution.create(data);

    // If it's a critical incident, trigger an alert immediately
    if (data.medium === 'Incident' && (data.severity === 'Critical' || data.severity === 'High')) {
      await EnvironmentalAlert.create({
        organizationId: req.user.organizationId,
        facilityId: data.facilityId,
        type: 'Pollution Spill',
        severity: data.severity,
        relatedRecord: record._id.toString(),
        message: `${data.pollutantType} spill reported at Facility on ${data.date}. Severity: ${data.severity}. Action Required.`,
        status: 'Unread',
        createdAt: new Date().toISOString().split('T')[0]
      });
    }

    // Audit Log
    await AuditLog.create({
      organizationId: req.user.organizationId,
      user: req.user.email,
      action: 'CREATE',
      module: 'Pollution',
      recordId: record._id.toString(),
      oldValue: '',
      newValue: JSON.stringify(record),
      timestamp: new Date().toISOString()
    });

    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/pollution/:id', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER'), async (req, res) => {
  try {
    const record = await Pollution.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!record) return res.status(404).json({ error: 'Record not found' });

    await Pollution.deleteOne({ _id: req.params.id, organizationId: req.user.organizationId });

    // Audit Log
    await AuditLog.create({
      organizationId: req.user.organizationId,
      user: req.user.email,
      action: 'DELETE',
      module: 'Pollution',
      recordId: req.params.id,
      oldValue: JSON.stringify(record),
      newValue: '',
      timestamp: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 9. Climate Risks Adaptation Endpoints
// ----------------------------------------------------
app.get('/api/climate', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const list = await ClimateRisk.find({ organizationId: req.user.organizationId });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/climate', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER'), async (req, res) => {
  try {
    const { facilityId, name, category, probability, impact, description, mitigationPlan, owner, deadline, status } = req.body;
    
    if (!facilityId || !name || !category || probability === undefined || impact === undefined) {
      return res.status(400).json({ error: 'Facility, Name, Category, Probability, and Impact are required.' });
    }

    const prob = parseInt(probability);
    const imp = parseInt(impact);
    const riskScore = prob * imp;

    // Severity mapping logic
    let severity = 'Low';
    if (riskScore >= 20) severity = 'Critical';
    else if (riskScore >= 13) severity = 'High';
    else if (riskScore >= 6) severity = 'Medium';

    const record = await ClimateRisk.create({
      organizationId: req.user.organizationId,
      facilityId,
      name,
      category,
      probability: prob,
      impact: imp,
      riskScore,
      severity,
      description: description || '',
      mitigationPlan: mitigationPlan || '',
      owner: owner || '',
      deadline: deadline || '',
      status: status || 'Identified'
    });

    // Trigger alert if Critical Risk
    if (severity === 'Critical') {
      await EnvironmentalAlert.create({
        organizationId: req.user.organizationId,
        facilityId,
        type: 'Critical Climate Risk',
        severity: 'Critical',
        relatedRecord: record._id.toString(),
        message: `CRITICAL Climate Risk Identified: "${name}" has a risk score of ${riskScore}/25. Mitigation plan check required.`,
        status: 'Unread',
        createdAt: new Date().toISOString().split('T')[0]
      });
    }

    // Audit Log
    await AuditLog.create({
      organizationId: req.user.organizationId,
      user: req.user.email,
      action: 'CREATE',
      module: 'Climate',
      recordId: record._id.toString(),
      oldValue: '',
      newValue: JSON.stringify(record),
      timestamp: new Date().toISOString()
    });

    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/climate/:id', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER'), async (req, res) => {
  try {
    const existing = await ClimateRisk.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!existing) return res.status(404).json({ error: 'Record not found' });

    const data = req.body;
    if (data.probability !== undefined && data.impact !== undefined) {
      data.riskScore = parseInt(data.probability) * parseInt(data.impact);
      let severity = 'Low';
      if (data.riskScore >= 20) severity = 'Critical';
      else if (data.riskScore >= 13) severity = 'High';
      else if (data.riskScore >= 6) severity = 'Medium';
      data.severity = severity;
    }

    const record = await ClimateRisk.findByIdAndUpdate(req.params.id, data, { new: true });

    // Audit Log
    await AuditLog.create({
      organizationId: req.user.organizationId,
      user: req.user.email,
      action: 'UPDATE',
      module: 'Climate',
      recordId: req.params.id,
      oldValue: JSON.stringify(existing),
      newValue: JSON.stringify(record),
      timestamp: new Date().toISOString()
    });

    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/climate/:id', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER'), async (req, res) => {
  try {
    const record = await ClimateRisk.findOne({ _id: req.params.id, organizationId: req.user.organizationId });
    if (!record) return res.status(404).json({ error: 'Record not found' });

    await ClimateRisk.deleteOne({ _id: req.params.id, organizationId: req.user.organizationId });

    // Audit Log
    await AuditLog.create({
      organizationId: req.user.organizationId,
      user: req.user.email,
      action: 'DELETE',
      module: 'Climate',
      recordId: req.params.id,
      oldValue: JSON.stringify(record),
      newValue: '',
      timestamp: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 10. Targets & Alerts Endpoints
// ----------------------------------------------------
app.get('/api/targets', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const list = await EnvironmentalTarget.find({ organizationId: req.user.organizationId });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/targets', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER'), async (req, res) => {
  try {
    const { name, metric, baselineValue, targetValue, currentValue, baselineYear, targetYear, facilityId, owner } = req.body;
    
    if (!name || !metric || baselineValue === undefined || targetValue === undefined || currentValue === undefined || !baselineYear || !targetYear) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const record = await EnvironmentalTarget.create({
      organizationId: req.user.organizationId,
      facilityId: facilityId || null,
      name,
      metric,
      baselineValue: parseFloat(baselineValue),
      targetValue: parseFloat(targetValue),
      currentValue: parseFloat(currentValue),
      baselineYear: parseInt(baselineYear),
      targetYear: parseInt(targetYear),
      owner: owner || '',
      status: 'ON TRACK'
    });
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/targets/:id', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER'), async (req, res) => {
  try {
    const record = await EnvironmentalTarget.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/alerts', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const list = await EnvironmentalAlert.find({ organizationId: req.user.organizationId });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/alerts/:id', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER'), async (req, res) => {
  try {
    const record = await EnvironmentalAlert.findByIdAndUpdate(req.params.id, { status: 'Read' }, { new: true });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 11. Evidence Endpoints (Audit Trail & Document Store)
// ----------------------------------------------------
app.get('/api/evidence', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const list = await Evidence.find({ organizationId: req.user.organizationId });
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/evidence/upload', authenticateToken, enforceTenantIsolation, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { recordId, recordModel, facilityId } = req.body;
    
    if (!recordId || !recordModel || !facilityId) {
      return res.status(400).json({ error: 'recordId, recordModel and facilityId are required.' });
    }

    const doc = await Evidence.create({
      organizationId: req.user.organizationId,
      facilityId,
      recordId,
      recordModel,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      filePath: `/uploads/${req.file.filename}`,
      uploadedBy: req.user.email,
      uploadedAt: new Date().toISOString().split('T')[0]
    });

    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/audit-logs', authenticateToken, enforceTenantIsolation, authorizeRoles('ADMIN', 'AUDITOR', 'ESG_MANAGER'), async (req, res) => {
  try {
    const logs = await AuditLog.find({ organizationId: req.user.organizationId });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 12. Forecasting & AI Assistant Endpoints
// ----------------------------------------------------
app.get('/api/analytics/forecast', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const data = await getForecastingData(req.user.organizationId);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/query', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const { query } = req.body;
    const response = await handleAIQuery(query, req.user.role, req.user.organizationId);
    res.json({ response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 13. Reports Generation Endpoints
// ----------------------------------------------------
app.get('/api/reports/download/:type', authenticateToken, enforceTenantIsolation, async (req, res) => {
  try {
    const type = req.params.type;
    const format = req.query.format || 'csv';
    const data = await compileReportData(type, req.user.organizationId);

    if (format === 'pdf') {
      const org = await Organization.findById(req.user.organizationId);
      const orgName = org ? org.name : 'Acme Corporation';
      const html = generateHTMLReport(data, orgName);
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    }

    if (format === 'excel') {
      const xls = generateExcel(data);
      res.setHeader('Content-Type', 'application/vnd.ms-excel');
      res.setHeader('Content-Disposition', `attachment; filename=environmental_${type}_report_${Date.now()}.xls`);
      return res.send(xls);
    }

    const csv = generateCSV(data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=environmental_${type}_report_${Date.now()}.csv`);
    return res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 14. Emission Factors Registry Endpoints (Admin only)
// ----------------------------------------------------
app.get('/api/factors', authenticateToken, async (req, res) => {
  try {
    const list = await EmissionFactor.find({});
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/factors', authenticateToken, authorizeRoles('ADMIN'), async (req, res) => {
  try {
    const record = await EmissionFactor.create(req.body);
    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 ESG Platform Express server running on port ${PORT}`);
  if (isMock()) {
    console.log("⚠️ Operating in Local Mock JSON Mode. Files persist in 'backend/data/'");
  }
});
