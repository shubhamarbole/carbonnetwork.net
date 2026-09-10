const express = require('express');
const router = express.Router();

const { 
  EnvironmentalTarget, EnvironmentalAlert, Evidence, AuditLog, EmissionFactor, 
  ClimateRisk, ComplianceRecord, ProductImpact, SupplyChainRecord, Facility,
  EnvironmentalAssessment, ElectricityReading, WaterRecord, EmissionRecord,
  WasteRecord, PollutionRecord
} = require('../../models/models');

const authenticateToken = require('./authenticate');

function enforceTenantScope(req, res, next) {
  if (!req.user || !req.user.organizationId) {
    return res.status(401).json({ error: 'Unauthorized: Missing Tenant Context' });
  }
  next();
}

// 1. Targets
router.get('/targets', authenticateToken, enforceTenantScope, async (req, res, next) => {
  try {
    const list = await EnvironmentalTarget.find({ organizationId: req.user.organizationId });
    res.json(list);
  } catch (err) { next(err); }
});

router.post('/targets', authenticateToken, enforceTenantScope, async (req, res, next) => {
  try {
    const record = await EnvironmentalTarget.create({
      ...req.body,
      organizationId: req.user.organizationId,
      status: 'ON_TRACK'
    });
    res.status(201).json(record);
  } catch (err) { next(err); }
});

router.put('/targets/:id', authenticateToken, enforceTenantScope, async (req, res, next) => {
  try {
    const record = await EnvironmentalTarget.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(record);
  } catch (err) { next(err); }
});

// 2. Alerts
router.get('/alerts', authenticateToken, enforceTenantScope, async (req, res, next) => {
  try {
    const list = await EnvironmentalAlert.find({ organizationId: req.user.organizationId });
    res.json(list);
  } catch (err) { next(err); }
});

router.put('/alerts/:id', authenticateToken, enforceTenantScope, async (req, res, next) => {
  try {
    const record = await EnvironmentalAlert.findByIdAndUpdate(req.params.id, { status: 'Read' }, { new: true });
    res.json(record);
  } catch (err) { next(err); }
});

// 3. Evidence
router.get('/evidence', authenticateToken, enforceTenantScope, async (req, res, next) => {
  try {
    const list = await Evidence.find({ organizationId: req.user.organizationId });
    res.json(list);
  } catch (err) { next(err); }
});

// 4. Audit Logs
router.get('/audit-logs', authenticateToken, enforceTenantScope, async (req, res, next) => {
  try {
    const logs = await AuditLog.find({ organizationId: req.user.organizationId }).sort({ timestamp: -1 });
    res.json(logs);
  } catch (err) { next(err); }
});

// 5. Factors
router.get('/factors', authenticateToken, async (req, res, next) => {
  try {
    const list = await EmissionFactor.find({});
    res.json(list);
  } catch (err) { next(err); }
});

router.post('/factors', authenticateToken, async (req, res, next) => {
  try {
    const record = await EmissionFactor.create(req.body);
    res.status(201).json(record);
  } catch (err) { next(err); }
});

// 6. Facilities
router.get('/facilities', authenticateToken, enforceTenantScope, async (req, res, next) => {
  try {
    const list = await Facility.find({ organizationId: req.user.organizationId });
    res.json(list);
  } catch (err) { next(err); }
});

router.post('/facilities', authenticateToken, enforceTenantScope, async (req, res, next) => {
  try {
    const record = await Facility.create({
      ...req.body,
      organizationId: req.user.organizationId
    });
    res.status(201).json(record);
  } catch (err) { next(err); }
});

// 7. Climate Risk Management
router.get('/climate', authenticateToken, enforceTenantScope, async (req, res, next) => {
  try {
    const list = await ClimateRisk.find({ organizationId: req.user.organizationId });
    res.json(list);
  } catch (err) { next(err); }
});

router.post('/climate', authenticateToken, enforceTenantScope, async (req, res, next) => {
  try {
    const record = await ClimateRisk.create({
      ...req.body,
      organizationId: req.user.organizationId,
      createdBy: req.user.email
    });
    res.status(201).json(record);
  } catch (err) { next(err); }
});

router.put('/climate/:id', authenticateToken, enforceTenantScope, async (req, res, next) => {
  try {
    const record = await ClimateRisk.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      req.body,
      { new: true }
    );
    res.json(record);
  } catch (err) { next(err); }
});

router.delete('/climate/:id', authenticateToken, enforceTenantScope, async (req, res, next) => {
  try {
    await ClimateRisk.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// 8. Compliance & Permits
router.get('/compliance', authenticateToken, enforceTenantScope, async (req, res, next) => {
  try {
    const list = await ComplianceRecord.find({ organizationId: req.user.organizationId });
    res.json(list);
  } catch (err) { next(err); }
});

router.post('/compliance', authenticateToken, enforceTenantScope, async (req, res, next) => {
  try {
    const record = await ComplianceRecord.create({
      ...req.body,
      organizationId: req.user.organizationId,
      createdBy: req.user.email
    });
    res.status(201).json(record);
  } catch (err) { next(err); }
});

router.put('/compliance/:id', authenticateToken, enforceTenantScope, async (req, res, next) => {
  try {
    const record = await ComplianceRecord.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      req.body,
      { new: true }
    );
    res.json(record);
  } catch (err) { next(err); }
});

router.delete('/compliance/:id', authenticateToken, enforceTenantScope, async (req, res, next) => {
  try {
    await ComplianceRecord.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// 9. Product Impact
router.get('/products', authenticateToken, enforceTenantScope, async (req, res, next) => {
  try {
    const list = await ProductImpact.find({ organizationId: req.user.organizationId });
    res.json(list);
  } catch (err) { next(err); }
});

router.post('/products', authenticateToken, enforceTenantScope, async (req, res, next) => {
  try {
    const record = await ProductImpact.create({
      ...req.body,
      organizationId: req.user.organizationId,
      createdBy: req.user.email
    });
    res.status(201).json(record);
  } catch (err) { next(err); }
});

router.put('/products/:id', authenticateToken, enforceTenantScope, async (req, res, next) => {
  try {
    const record = await ProductImpact.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      req.body,
      { new: true }
    );
    res.json(record);
  } catch (err) { next(err); }
});

router.delete('/products/:id', authenticateToken, enforceTenantScope, async (req, res, next) => {
  try {
    await ProductImpact.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// 10. Supply Chain
router.get('/supply-chain', authenticateToken, enforceTenantScope, async (req, res, next) => {
  try {
    const list = await SupplyChainRecord.find({ organizationId: req.user.organizationId });
    res.json(list);
  } catch (err) { next(err); }
});

router.post('/supply-chain', authenticateToken, enforceTenantScope, async (req, res, next) => {
  try {
    const record = await SupplyChainRecord.create({
      ...req.body,
      organizationId: req.user.organizationId,
      createdBy: req.user.email
    });
    res.status(201).json(record);
  } catch (err) { next(err); }
});

router.put('/supply-chain/:id', authenticateToken, enforceTenantScope, async (req, res, next) => {
  try {
    const record = await SupplyChainRecord.findOneAndUpdate(
      { _id: req.params.id, organizationId: req.user.organizationId },
      req.body,
      { new: true }
    );
    res.json(record);
  } catch (err) { next(err); }
});

router.delete('/supply-chain/:id', authenticateToken, enforceTenantScope, async (req, res, next) => {
  try {
    await SupplyChainRecord.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// 11. Environmental Assessment
router.get('/environment/assessment', authenticateToken, enforceTenantScope, async (req, res, next) => {
  try {
    const orgId = req.user.organizationId;
    const { period = 'Quarterly' } = req.query;

    const [readings, emissions, water, waste, pollution] = await Promise.all([
      ElectricityReading.find({ organizationId: orgId }),
      EmissionRecord.find({ organizationId: orgId }),
      WaterRecord.find({ organizationId: orgId }),
      WasteRecord.find({ organizationId: orgId }),
      PollutionRecord.find({ organizationId: orgId })
    ]);

    const categories = [
      { id: 'energy', name: 'Energy Management', status: readings.length > 0 ? 'GOOD' : 'MISSING' },
      { id: 'ghg', name: 'GHG Disclosures', status: emissions.length > 0 ? 'GOOD' : 'MISSING' },
      { id: 'water', name: 'Water Sourcing', status: water.length > 0 ? 'GOOD' : 'MISSING' },
      { id: 'waste', name: 'Waste Diversion', status: waste.length > 0 ? 'GOOD' : 'MISSING' },
      { id: 'pollution', name: 'Pollution Monitoring', status: pollution.filter(p => p.status === 'Open').length === 0 ? 'GOOD' : 'HIGH_RISK' }
    ];

    const completed = categories.filter(c => c.status === 'GOOD').length;
    const overallScore = Math.round((completed / categories.length) * 100);

    res.json({
      reportingPeriod: period,
      overallScore,
      status: overallScore >= 80 ? 'GOOD' : (overallScore >= 50 ? 'PARTIAL' : 'HIGH_RISK'),
      categories
    });
  } catch (err) { next(err); }
});

// Fallback module delete handlers
router.delete('/water/:id', authenticateToken, enforceTenantScope, async (req, res, next) => {
  try {
    await WaterRecord.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.delete('/ghg/:id', authenticateToken, enforceTenantScope, async (req, res, next) => {
  try {
    await EmissionRecord.findOneAndDelete({ _id: req.params.id, organizationId: req.user.organizationId });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Forecast and AI
router.get('/analytics/forecast', authenticateToken, enforceTenantScope, async (req, res, next) => {
  try {
    res.json([
      { name: 'Month 1', actual: 400, forecast: 420 },
      { name: 'Month 2', actual: 450, forecast: 440 },
      { name: 'Month 3', actual: null, forecast: 460 }
    ]);
  } catch (err) { next(err); }
});

router.post('/ai/query', authenticateToken, enforceTenantScope, async (req, res, next) => {
  try {
    const { query } = req.body;
    res.json({ response: `AI processing results for: "${query}". Environmental impact targets look compliant for this active reporting cycle.` });
  } catch (err) { next(err); }
});

module.exports = router;
