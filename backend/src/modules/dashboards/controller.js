const Organization = require('../organizations/model');
const User = require('../users/model');
const Facility = require('../facilities/model');
const EnvironmentalRecord = require('../environmental/model');
const Evidence = require('../evidence/model');
const AuditLog = require('../audit/model');

// Helper to compile core metrics
async function getBaseMetrics(organizationId) {
  const query = { isArchived: false };
  if (organizationId) {
    query.organizationId = organizationId;
  }

  const records = await EnvironmentalRecord.find(query);
  const totalRecords = records.length;

  // Calculate energy, water, etc.
  const energy = records.filter(r => r.moduleType === 'Energy');
  const water = records.filter(r => r.moduleType === 'Water');
  const waste = records.filter(r => r.moduleType === 'Waste');

  const totalEnergy = energy.reduce((acc, r) => acc + (parseFloat(r.dataPayload.consumptionKwh) || 0), 0);
  const totalWater = water.reduce((acc, r) => acc + (parseFloat(r.dataPayload.withdrawalM3) || 0), 0);
  const totalWaste = waste.reduce((acc, r) => acc + (parseFloat(r.dataPayload.quantityKg) || 0), 0);

  return {
    totalRecords,
    totalEnergy,
    totalWater,
    totalWaste
  };
}

class DashboardsController {

  // 1. SUPER_ADMIN
  async superAdmin(req, res, next) {
    try {
      const [orgs, users, recordsCount, evidenceList] = await Promise.all([
        Organization.countDocuments({}),
        User.countDocuments({}),
        EnvironmentalRecord.countDocuments({ isArchived: false }),
        Evidence.find({})
      ]);

      const pending = evidenceList.filter(e => e.status === 'UNDER_REVIEW').length;
      const verified = evidenceList.filter(e => e.status === 'ACCEPTED').length;
      const rejected = evidenceList.filter(e => e.status === 'REJECTED').length;

      res.json({
        totalOrganizations: orgs,
        activeOrganizations: orgs,
        totalUsers: users,
        environmentalRecords: recordsCount,
        pendingVerification: pending,
        verifiedRecords: verified,
        rejectedRecords: rejected,
        reportsGenerated: 12,
        systemAlerts: 1,
        systemHealth: { status: 'HEALTHY', cpu: '22%', memory: '194 MB' }
      });
    } catch (err) { next(err); }
  }

  // 2. PLATFORM_ADMIN
  async platformAdmin(req, res, next) {
    try {
      const [orgs, users, records, evidence] = await Promise.all([
        Organization.countDocuments({}),
        User.countDocuments({}),
        EnvironmentalRecord.find({ isArchived: false }),
        Evidence.find({})
      ]);

      const pendingSubmissions = records.filter(r => r.verificationStatus === 'SUBMITTED').length;
      const pendingApprovals = evidence.filter(e => e.status === 'UNDER_REVIEW').length;

      res.json({
        totalOrganizations: orgs,
        activeOrganizations: orgs,
        totalUsers: users,
        environmentalRecords: records.length,
        pendingApprovals,
        pendingSubmissions,
        dataQuality: '91.8%',
        verificationWorkload: pendingApprovals + pendingSubmissions,
        environmentalAlerts: 2,
        supportActivity: 1
      });
    } catch (err) { next(err); }
  }

  // 3. MSME_USER
  async msme(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const metrics = await getBaseMetrics(orgId);
      
      res.json({
        environmentalScore: 78,
        energyStatus: `${metrics.totalEnergy.toLocaleString()} kWh logged`,
        ghgStatus: 'Scope 1 & 2 mapped',
        waterStatus: `${metrics.totalWater.toLocaleString()} m³ consumed`,
        wasteStatus: `${metrics.totalWaste.toLocaleString()} kg generated`,
        pollutionStatus: 'Compliant',
        biodiversityStatus: 'Not Scoped',
        missingData: 1,
        evidenceCompletion: '80%',
        targets: 'On Track',
        recommendedActions: 2
      });
    } catch (err) { next(err); }
  }

  // 4. ENTERPRISE_USER
  async enterprise(req, res, next) {
    try {
      const orgId = req.user.organizationId;
      const [facilities, metrics] = await Promise.all([
        Facility.find({ organizationId: orgId }),
        getBaseMetrics(orgId)
      ]);

      res.json({
        consolidatedKPIs: {
          energy: `${metrics.totalEnergy.toLocaleString()} kWh`,
          water: `${metrics.totalWater.toLocaleString()} m³`,
          waste: `${metrics.totalWaste.toLocaleString()} kg`
        },
        multiFacilityOverview: facilities.map(f => ({ id: f._id, name: f.name, region: f.region })),
        facilityRanking: facilities.map((f, i) => ({ name: f.name, rank: i + 1, score: 90 - (i * 5) })),
        environmentalTrends: [
          { name: 'Jan', value: 800 },
          { name: 'Feb', value: 720 },
          { name: 'Mar', value: 680 }
        ],
        targets: '2 / 3 Met',
        risks: 'Water stress (High)',
        missingData: 0
      });
    } catch (err) { next(err); }
  }

  // 5. INVESTOR
  async investor(req, res, next) {
    try {
      res.json({
        portfolioScore: 84.5,
        highRiskOrganizations: ['Eco MSME Solutions'],
        ghgTrends: [
          { name: 'Q1', value: 2400 },
          { name: 'Q2', value: 2150 }
        ],
        environmentalRisk: 'Flood Scarcity (Medium)',
        watchlist: ['Acme ESG Corporation']
      });
    } catch (err) { next(err); }
  }

  // 6. CREDIT_BUYER
  async creditBuyer(req, res, next) {
    try {
      res.json({
        availableProjects: 14,
        availableCredits: 85000,
        purchaseRequests: 2,
        watchlist: ['Pune Solar Generation Offset'],
        environmentalImpact: '2,400 tonnes CO2e offset'
      });
    } catch (err) { next(err); }
  }

  // 7. VERIFIER
  async verifier(req, res, next) {
    try {
      const verifierId = req.user.userId;
      const records = await EnvironmentalRecord.find({ assignedVerifier: verifierId, isArchived: false });

      const pending = records.filter(r => r.verificationStatus === 'VERIFICATION').length;
      const verified = records.filter(r => r.verificationStatus === 'VERIFIED').length;
      const rejected = records.filter(r => r.verificationStatus === 'REJECTED').length;

      res.json({
        pendingReviews: pending,
        underReview: pending,
        verifiedCount: verified,
        rejectedCount: rejected,
        missingEvidence: 1,
        overdueReviews: 0
      });
    } catch (err) { next(err); }
  }

  // 8. AUDITOR (ASSURANCE_AUDITOR)
  async auditor(req, res, next) {
    try {
      res.json({
        openAudits: 2,
        auditFindings: 4,
        evidenceIssues: 1,
        highRiskFindings: 0,
        overdueResponses: 0
      });
    } catch (err) { next(err); }
  }

  // 9. REGULATOR
  async regulator(req, res, next) {
    try {
      res.json({
        monitoredOrgs: 12,
        environmentalAlerts: 1,
        highRiskEntities: ['Zeta Chemicals'],
        pollutionTrends: 'Downward PM10 emissions',
        ghgTrends: 'Linear decline',
        waterRisks: 'Safe'
      });
    } catch (err) { next(err); }
  }

  // 10. CARBON_REGISTRY
  async registry(req, res, next) {
    try {
      res.json({
        projectsRegistry: 24,
        pendingRegistrations: 3,
        verifiedProjects: 18,
        registryStatus: 'Synchronized',
        creditRecords: 52000
      });
    } catch (err) { next(err); }
  }

  // 11. ADVISOR
  async advisor(req, res, next) {
    try {
      res.json({
        clientList: ['Eco MSME Solutions', 'Gamma Logistics'],
        environmentalGaps: 3,
        riskSummary: 'Energy dependency high',
        targetsAtRisk: 1,
        recommendations: 5,
        actionProgress: '40% completed'
      });
    } catch (err) { next(err); }
  }

  // 12. INDUSTRY_ASSOCIATION
  async association(req, res, next) {
    try {
      res.json({
        industryAverages: { energy: '14,000 kWh/month', water: '480 m³/month' },
        benchmarks: 'Top 10% compliance',
        memberTrends: 'Transitioning to renewables',
        anonymousComparisons: 'Member A consumes 12% less than average'
      });
    } catch (err) { next(err); }
  }

  // 13. TECHNOLOGY_PROVIDER
  async technologyProvider(req, res, next) {
    try {
      res.json({
        devices: 18,
        meters: 12,
        connections: 12,
        dataStreams: 'Active',
        syncStatus: '100%',
        syncErrors: 0,
        apiStatus: 'Healthy'
      });
    } catch (err) { next(err); }
  }

  // 14. INSURER
  async insurer(req, res, next) {
    try {
      res.json({
        riskDistribution: { low: 8, medium: 3, high: 1 },
        highRiskOrganizations: ['Zeta Chemicals'],
        incidents: 0,
        riskTrends: 'Stabilizing portfolio'
      });
    } catch (err) { next(err); }
  }

  // 15. RESEARCHER
  async researcher(req, res, next) {
    try {
      res.json({
        authorizedDatasets: ['Anonymized Multi-Tenant Grid Scope 2'],
        trendAnalysis: 'Scope 2 offset correlations positive',
        savedQueries: 3
      });
    } catch (err) { next(err); }
  }
}

module.exports = new DashboardsController();
