const { defineModel } = require('./db');

const OrganizationSchema = {
  name: { type: String, required: true },
  createdAt: { type: String, required: true } // YYYY-MM-DD
};

const UserSchema = {
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: [
      'SUPER_ADMIN', 'PLATFORM_ADMIN', 'MSME', 'MSME_USER', 'ENTERPRISE', 'ADMIN', 'ORGANIZATION_ADMIN', 
      'INVESTOR', 'CREDIT_BUYER', 'VERIFIER', 'AUDITOR', 'REGULATOR', 'REGISTRY', 'ADVISOR', 
      'ASSOCIATION', 'TECHNOLOGY_PROVIDER', 'INSURER', 'RESEARCHER', 'PROJECT_MANAGER', 
      'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'COMPLIANCE_MANAGER', 'DATA_ENTRY', 'VIEWER', 'EXECUTIVE'
    ], 
    default: 'MSME' 
  },
  organizationId: { type: String, required: true }, // Links to Organization
  facilityId: { type: String, default: null } // Optional link to restrict DATA_ENTRY
};

const FacilitySchema = {
  name: { type: String, required: true },
  location: { type: String, required: true },
  area: { type: Number, default: 0 }, // in Square Meters
  description: { type: String, default: '' },
  organizationId: { type: String, required: true }
};

// -------------------------
// ENERGY MANAGEMENT
// -------------------------
const ElectricityMeterSchema = {
  organizationId: { type: String, required: true },
  facilityId: { type: String, required: true },
  meterNumber: { type: String, required: true },
  location: { type: String, default: '' },
  meterType: { type: String, enum: ['MANUAL', 'DIGITAL', 'SMART_METER'], default: 'MANUAL' },
  connectionType: { type: String, enum: ['SINGLE_PHASE', 'THREE_PHASE'], default: 'SINGLE_PHASE' },
  voltage: { type: Number, default: 230 }, // descriptive volts
  installationDate: { type: String, required: true }, // YYYY-MM-DD
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'], default: 'ACTIVE' }
};

const ElectricityReadingSchema = {
  organizationId: { type: String, required: true },
  facilityId: { type: String, required: true },
  meterId: { type: String, default: null },
  previousReading: { type: Number, required: true },
  currentReading: { type: Number, required: true },
  consumption: { type: Number, required: true }, // calculated: current - previous
  readingDate: { type: String, required: true }, // YYYY-MM-DD
  unit: { type: String, default: 'kWh' },
  sourceType: { type: String, enum: ['GRID', 'SOLAR', 'WIND', 'HYDRO', 'OTHER_RENEWABLE', 'GENERATOR', 'OTHER'], default: 'GRID' },
  usageCategory: { type: String, enum: ['PRODUCTION_MACHINERY', 'MOTORS', 'PUMPS', 'COMPRESSORS', 'HVAC', 'REFRIGERATION', 'LIGHTING', 'IT_EQUIPMENT', 'OFFICE_EQUIPMENT', 'OTHER'], default: 'OTHER' },
  reportingPeriod: { type: String, enum: ['Monthly', 'Quarterly', 'Yearly'], required: true },
  dataQuality: { type: String, enum: ['Actual', 'Estimated', 'Calculated', 'Imported', 'Smart Meter (IoT MQTT)', 'Flow Meter (IoT MQTT)', 'Smart Scale (IoT MQTT)'], default: 'Actual' },
  evidenceId: { type: String, default: null },
  evidenceDetails: { type: Object, default: null },
  status: { 
    type: String, 
    enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'CORRECTION_REQUIRED', 'CORRECTED', 'RESUBMITTED', 'VERIFIED', 'REJECTED'], 
    default: 'DRAFT' 
  },
  reviewerComments: { type: String, default: '' },
  correctionReason: { type: String, default: '' },
  submittedAt: { type: String, default: null },
  verifiedAt: { type: String, default: null },
  verifiedBy: { type: String, default: null },
  rejectedAt: { type: String, default: null },
  rejectedBy: { type: String, default: null },
  submissionHistory: [{
    action: { type: String, required: true },
    status: { type: String, required: true },
    user: { type: String, required: true },
    timestamp: { type: String, required: true },
    comment: { type: String, default: '' }
  }],
  createdBy: { type: String, required: true }
};

const EnergyInitiativeSchema = {
  organizationId: { type: String, required: true },
  facilityId: { type: String, required: true },
  name: { type: String, required: true }, // e.g. LED Lighting Replacement
  description: { type: String, default: '' },
  baselineConsumption: { type: Number, required: true }, // kWh
  currentConsumption: { type: Number, default: 0 }, // kWh
  expectedSavings: { type: Number, required: true }, // kWh
  actualSavings: { type: Number, default: 0 }, // calculated or entered
  status: { type: String, enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], default: 'PLANNED' },
  startDate: { type: String, required: true }, // YYYY-MM-DD
  targetDate: { type: String, required: true }, // YYYY-MM-DD
  responsiblePerson: { type: String, default: '' },
  environmentalBenefit: { type: String, default: '' },
  evidenceId: { type: String, default: null },
  createdBy: { type: String, required: true }
};

// Backward compatibility schema mapping
const EnergyRecordSchema = {
  organizationId: { type: String, required: true },
  facilityId: { type: String, required: true },
  energyType: { type: String, required: true },
  consumption: { type: Number, required: true },
  unit: { type: String, default: 'kWh' },
  cost: { type: Number, default: 0 },
  renewable: { type: Boolean, default: false },
  readingDate: { type: String, required: true },
  reportingPeriod: { type: String, enum: ['Monthly', 'Quarterly', 'Yearly'], required: true },
  periodStart: { type: String, required: true },
  periodEnd: { type: String, required: true },
  dataQuality: { type: String, enum: ['Actual', 'Estimated', 'Calculated', 'Imported', 'Smart Meter (IoT MQTT)'], default: 'Actual' },
  evidenceId: { type: String, default: null },
  evidenceDetails: { type: Object, default: null },
  status: { 
    type: String, 
    enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'CORRECTION_REQUIRED', 'CORRECTED', 'RESUBMITTED', 'VERIFIED', 'REJECTED'], 
    default: 'DRAFT' 
  },
  reviewerComments: { type: String, default: '' },
  correctionReason: { type: String, default: '' },
  submittedAt: { type: String, default: null },
  verifiedAt: { type: String, default: null },
  verifiedBy: { type: String, default: null },
  rejectedAt: { type: String, default: null },
  rejectedBy: { type: String, default: null },
  submissionHistory: [{
    action: { type: String, required: true },
    status: { type: String, required: true },
    user: { type: String, required: true },
    timestamp: { type: String, required: true },
    comment: { type: String, default: '' }
  }],
  createdBy: { type: String, required: true }
};

// -------------------------
// GREENHOUSE GAS (GHG) EMISSIONS
// -------------------------
const EmissionRecordSchema = {
  organizationId: { type: String, required: true },
  facilityId: { type: String, required: true },
  scope: { type: Number, enum: [1, 2, 3], required: true },
  category: { type: String, required: true }, // e.g. Stationary combustion, purchased electricity, business travel
  sourceName: { type: String, required: true }, // e.g. Diesel Generator, Grid Grid, Commutes
  activityValue: { type: Number, required: true },
  activityUnit: { type: String, required: true },
  emissionFactor: { type: Number, required: true }, // saved lineage value
  factorUnit: { type: String, required: true },
  factorSource: { type: String, required: true },
  calculatedCO2e: { type: Number, required: true }, // in Metric Tonnes CO2e
  reportingPeriod: { type: String, enum: ['Monthly', 'Quarterly', 'Yearly'], required: true },
  periodStart: { type: String, required: true },
  periodEnd: { type: String, required: true },
  dataQuality: { type: String, enum: ['Actual', 'Estimated', 'Calculated', 'Imported', 'Smart Meter (IoT MQTT)'], default: 'Actual' },
  evidenceId: { type: String, default: null },
  evidenceDetails: { type: Object, default: null },
  status: { 
    type: String, 
    enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'CORRECTION_REQUIRED', 'CORRECTED', 'RESUBMITTED', 'VERIFIED', 'REJECTED'], 
    default: 'DRAFT' 
  },
  reviewerComments: { type: String, default: '' },
  correctionReason: { type: String, default: '' },
  submittedAt: { type: String, default: null },
  verifiedAt: { type: String, default: null },
  verifiedBy: { type: String, default: null },
  rejectedAt: { type: String, default: null },
  rejectedBy: { type: String, default: null },
  submissionHistory: [{
    action: { type: String, required: true },
    status: { type: String, required: true },
    user: { type: String, required: true },
    timestamp: { type: String, required: true },
    comment: { type: String, default: '' }
  }],
  createdBy: { type: String, required: true }
};

const EmissionFactorSchema = {
  name: { type: String, required: true },
  category: { type: String, required: true }, // e.g. Scope 1, Scope 2
  activityType: { type: String, required: true }, // e.g. Diesel, Grid Electricity
  value: { type: Number, required: true }, // Factor value
  unit: { type: String, required: true }, // e.g. kg CO2e / kWh
  source: { type: String, required: true }, // e.g. EPA, DEFRA, GHG Protocol
  region: { type: String, default: 'Global' },
  effectiveFrom: { type: String, required: true }, // YYYY-MM-DD
  effectiveTo: { type: String, default: null },
  version: { type: String, default: '1.0' },
  isActive: { type: Boolean, default: true }
};

// -------------------------
// WATER MANAGEMENT
// -------------------------
const WaterRecordSchema = {
  organizationId: { type: String, required: true },
  facilityId: { type: String, required: true },
  source: { type: String, enum: ['Municipal Water', 'Groundwater', 'Surface Water', 'Rainwater', 'Recycled Water', 'STP Recycled Water', 'Process Recycled Water', 'Other Reuse', 'Process Evaporation', 'Irrigation & Landscaping', 'Sanitation Loss', 'Other'], required: true },
  actionType: { type: String, enum: ['Withdrawal', 'Consumption', 'Reuse'], default: 'Withdrawal' }, // backward compatibility helper
  previousReading: { type: Number, default: 0 },
  currentReading: { type: Number, default: 0 },
  consumption: { type: Number, required: true }, // in m3
  unit: { type: String, default: 'm3' },
  reportingPeriod: { type: String, enum: ['Monthly', 'Quarterly', 'Yearly'], required: true },
  periodStart: { type: String, required: true },
  periodEnd: { type: String, required: true },
  dataQuality: { type: String, enum: ['Actual', 'Estimated', 'Calculated', 'Imported', 'Flow Meter (IoT MQTT)'], default: 'Actual' },
  evidenceId: { type: String, default: null },
  evidenceDetails: { type: Object, default: null },
  status: { 
    type: String, 
    enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'CORRECTION_REQUIRED', 'CORRECTED', 'RESUBMITTED', 'VERIFIED', 'REJECTED'], 
    default: 'DRAFT' 
  },
  reviewerComments: { type: String, default: '' },
  correctionReason: { type: String, default: '' },
  submittedAt: { type: String, default: null },
  verifiedAt: { type: String, default: null },
  verifiedBy: { type: String, default: null },
  rejectedAt: { type: String, default: null },
  rejectedBy: { type: String, default: null },
  submissionHistory: [{
    action: { type: String, required: true },
    status: { type: String, required: true },
    user: { type: String, required: true },
    timestamp: { type: String, required: true },
    comment: { type: String, default: '' }
  }],
  createdBy: { type: String, required: true }
};

const WaterRiskSchema = {
  organizationId: { type: String, required: true },
  facilityId: { type: String, required: true },
  riskType: { type: String, enum: ['Water Stress', 'Water Scarcity', 'Flood Risk', 'Groundwater Risk', 'Other'], required: true },
  riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'LOW' },
  description: { type: String, default: '' },
  mitigationMeasure: { type: String, default: '' },
  updatedBy: { type: String, required: true }
};

// -------------------------
// BIODIVERSITY
// -------------------------
const BiodiversityAssessmentSchema = {
  organizationId: { type: String, required: true },
  facilityId: { type: String, required: true },
  siteArea: { type: Number, required: true }, // in Hectares
  protectedAreaProximity: { type: Number, default: 0 }, // Distance in km, 0 = inside/adjacent
  environmentalSensitivity: { type: String, default: 'Standard' }, // e.g. High flora richness
  biodiversityRisk: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'LOW' },
  impactAssessment: { type: String, default: '' }, // Summary text of habitat/species impacts
  areaRestored: { type: Number, default: 0 }, // in Hectares
  areaPreserved: { type: Number, default: 0 }, // in Hectares
  evidenceId: { type: String, default: null },
  evidenceDetails: { type: Object, default: null },
  status: { 
    type: String, 
    enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'CORRECTION_REQUIRED', 'CORRECTED', 'RESUBMITTED', 'VERIFIED', 'REJECTED', 'Identified', 'Active Mitigation', 'Restored', 'Closed'], 
    default: 'DRAFT' 
  },
  reviewerComments: { type: String, default: '' },
  correctionReason: { type: String, default: '' },
  submittedAt: { type: String, default: null },
  verifiedAt: { type: String, default: null },
  verifiedBy: { type: String, default: null },
  rejectedAt: { type: String, default: null },
  rejectedBy: { type: String, default: null },
  submissionHistory: [{
    action: { type: String, required: true },
    status: { type: String, required: true },
    user: { type: String, required: true },
    timestamp: { type: String, required: true },
    comment: { type: String, default: '' }
  }],
  updatedBy: { type: String, required: true }
};

const BiodiversityInitiativeSchema = {
  organizationId: { type: String, required: true },
  facilityId: { type: String, required: true },
  name: { type: String, required: true }, // Initiative Name
  description: { type: String, default: '' },
  startDate: { type: String, required: true },
  targetDate: { type: String, required: true },
  responsiblePerson: { type: String, default: '' },
  status: { type: String, enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], default: 'PLANNED' },
  environmentalBenefit: { type: String, default: '' },
  evidenceId: { type: String, default: null },
  createdBy: { type: String, required: true }
};

// -------------------------
// WASTE MANAGEMENT
// -------------------------
const WasteRecordSchema = {
  organizationId: { type: String, required: true },
  facilityId: { type: String, required: true },
  category: { type: String, enum: ['Plastic', 'Paper', 'Metal', 'Glass', 'Organic', 'Chemical', 'Electronic', 'E-Waste', 'Construction', 'Other'], required: true },
  wasteType: { type: String, enum: ['HAZARDOUS', 'NON_HAZARDOUS'], required: true },
  quantity: { type: Number, required: true }, // raw values
  unit: { type: String, enum: ['kg', 'Tonnes'], default: 'kg' },
  disposalMethod: { type: String, enum: ['Recycling', 'Reuse', 'Recovery', 'Composting', 'Incineration', 'Landfill', 'Other'], required: true },
  vendor: { type: String, default: '' },
  reportingPeriod: { type: String, enum: ['Monthly', 'Quarterly', 'Yearly'], required: true },
  periodStart: { type: String, required: true },
  periodEnd: { type: String, required: true },
  dataQuality: { type: String, enum: ['Actual', 'Estimated', 'Calculated', 'Imported', 'Smart Scale (IoT MQTT)'], default: 'Actual' },
  evidenceId: { type: String, default: null },
  evidenceDetails: { type: Object, default: null },
  status: { 
    type: String, 
    enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'CORRECTION_REQUIRED', 'CORRECTED', 'RESUBMITTED', 'VERIFIED', 'REJECTED'], 
    default: 'DRAFT' 
  },
  reviewerComments: { type: String, default: '' },
  correctionReason: { type: String, default: '' },
  submittedAt: { type: String, default: null },
  verifiedAt: { type: String, default: null },
  verifiedBy: { type: String, default: null },
  rejectedAt: { type: String, default: null },
  rejectedBy: { type: String, default: null },
  submissionHistory: [{
    action: { type: String, required: true },
    status: { type: String, required: true },
    user: { type: String, required: true },
    timestamp: { type: String, required: true },
    comment: { type: String, default: '' }
  }],
  createdBy: { type: String, required: true }
};

// -------------------------
// POLLUTION PREVENTION
// -------------------------
const PollutionRecordSchema = {
  organizationId: { type: String, required: true },
  facilityId: { type: String, required: true },
  medium: { type: String, enum: ['Air', 'Water', 'Soil', 'Incident'], required: true },
  pollutantType: { type: String, required: true }, // e.g. NOx, SOx, PM, discharge chemicals, soil spillages
  quantity: { type: Number, default: 0 },
  unit: { type: String, default: 'kg' },
  source: { type: String, default: '' },
  legalLimit: { type: Number, default: 0 },
  actualValue: { type: Number, default: 0 },
  complianceStatus: { type: String, enum: ['COMPLIANT', 'NON_COMPLIANT'], default: 'COMPLIANT' },
  reportingPeriod: { type: String, enum: ['Monthly', 'Quarterly', 'Yearly'], required: true },
  date: { type: String, required: true },
  severity: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Low' },
  evidenceId: { type: String, default: null },
  evidenceDetails: { type: Object, default: null },
  status: { 
    type: String, 
    enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'CORRECTION_REQUIRED', 'CORRECTED', 'RESUBMITTED', 'VERIFIED', 'REJECTED', 'Open', 'Under Investigation', 'Closed'], 
    default: 'DRAFT' 
  },
  reviewerComments: { type: String, default: '' },
  correctionReason: { type: String, default: '' },
  submittedAt: { type: String, default: null },
  verifiedAt: { type: String, default: null },
  verifiedBy: { type: String, default: null },
  rejectedAt: { type: String, default: null },
  rejectedBy: { type: String, default: null },
  submissionHistory: [{
    action: { type: String, required: true },
    status: { type: String, required: true },
    user: { type: String, required: true },
    timestamp: { type: String, required: true },
    comment: { type: String, default: '' }
  }],
  cause: { type: String, default: '' },
  correctiveAction: { type: String, default: '' },
  createdBy: { type: String, required: true }
};

const PollutionControlSchema = {
  organizationId: { type: String, required: true },
  facilityId: { type: String, required: true },
  equipment: { type: String, required: true }, // e.g. Air Filters, Wastewater Treatment, Chemical Spill Containment
  installationDate: { type: String, required: true },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE'], default: 'ACTIVE' },
  effectiveness: { type: Number, default: 100 }, // represented as efficiency percentage
  maintenanceDate: { type: String, default: '' },
  evidenceId: { type: String, default: null },
  createdBy: { type: String, required: true }
};

// -------------------------
// EVIDENCE, TARGETS & WORKFLOWS
// -------------------------
const EvidenceSchema = {
  organizationId: { type: String, required: true },
  facilityId: { type: String, required: true },
  category: { type: String, enum: ['Energy', 'GHG', 'Water', 'Biodiversity', 'Waste', 'Pollution'], required: true },
  recordId: { type: String, required: true },
  recordModel: { type: String, required: true }, // e.g. ElectricityReading, WasteRecord, WaterRecord
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  fileSize: { type: Number, required: true },
  filePath: { type: String, required: true },
  uploadedBy: { type: String, required: true },
  uploadedAt: { type: String, required: true },
  verificationStatus: { type: String, enum: ['PENDING', 'VERIFIED', 'REJECTED'], default: 'PENDING' }
};

const EnvironmentalAssessmentSchema = {
  organizationId: { type: String, required: true },
  reportingPeriod: { type: String, enum: ['Monthly', 'Quarterly', 'Yearly'], required: true },
  assessments: { type: Object, required: true }, // compliance checklists
  overallScore: { type: Number, required: true },
  assessmentDate: { type: String, required: true }
};

const EnvironmentalGapSchema = {
  organizationId: { type: String, required: true },
  category: { type: String, required: true },
  gapTitle: { type: String, required: true },
  severity: { type: String, default: 'MEDIUM' },
  whyItMatters: { type: String, default: '' },
  recommendedAction: { type: String, default: '' },
  owner: { type: String, default: '' },
  targetDate: { type: String, default: '' },
  status: { type: String, default: 'Open' }
};

const EnvironmentalTargetSchema = {
  organizationId: { type: String, required: true },
  facilityId: { type: String, default: null }, // Null represents organization-wide target
  name: { type: String, required: true },
  category: { type: String, enum: ['Energy Reduction', 'Renewable Energy', 'GHG Reduction', 'Water Reduction', 'Water Recycling', 'Waste Reduction', 'Waste Recycling', 'Pollution Reduction', 'Biodiversity Improvement'], required: true },
  baselineValue: { type: Number, required: true },
  currentValue: { type: Number, required: true },
  targetValue: { type: Number, required: true },
  baselineYear: { type: Number, required: true },
  targetYear: { type: Number, required: true },
  owner: { type: String, default: '' },
  status: { type: String, enum: ['ON_TRACK', 'AT_RISK', 'OFF_TRACK', 'ACHIEVED'], default: 'ON_TRACK' }
};

const EnvironmentalActionSchema = {
  organizationId: { type: String, required: true },
  category: { type: String, enum: ['Energy', 'GHG', 'Water', 'Biodiversity', 'Waste', 'Pollution'], required: true },
  problem: { type: String, required: true },
  action: { type: String, required: true },
  owner: { type: String, default: '' },
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'MEDIUM' },
  startDate: { type: String, required: true },
  dueDate: { type: String, required: true },
  status: { type: String, enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED'], default: 'PLANNED' },
  expectedBenefit: { type: String, default: '' },
  actualBenefit: { type: String, default: '' },
  evidenceId: { type: String, default: null }
};

const EnvironmentalAlertSchema = {
  organizationId: { type: String, required: true },
  facilityId: { type: String, default: null },
  severity: { type: String, enum: ['Critical', 'Warning', 'Improvement'], required: true },
  type: { type: String, required: true }, // e.g. Limit Exceeded, Missing Readings
  relatedRecord: { type: String, default: '' },
  message: { type: String, required: true },
  status: { type: String, enum: ['Unread', 'Read', 'Resolved'], default: 'Unread' },
  createdAt: { type: String, required: true }
};

const AuditLogSchema = {
  organizationId: { type: String, default: '' },
  user: { type: String, default: '' }, // User email or name
  userId: { type: String, default: '' },
  action: { type: String, required: true }, // e.g. RISK_CREATED, RISK_UPDATED, RISK_DELETED, etc.
  riskId: { type: String, default: '' },
  module: { type: String, default: 'RiskManager' },
  recordId: { type: String, default: '' },
  oldValue: { type: String, default: '' },
  newValue: { type: String, default: '' },
  metadata: { type: Object, default: {} },
  timestamp: { type: String, required: true }
};

const RiskSchema = {
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    enum: [
      'Financial', 'Operational', 'Environmental', 'ESG', 'Compliance', 
      'Regulatory', 'Supplier', 'Project', 'Cybersecurity', 'Data', 
      'Reputational', 'Fraud', 'Carbon', 'Documentation'
    ], 
    required: true 
  },
  probability: { type: Number, min: 0, max: 100, required: true },
  impact: { type: Number, min: 0, max: 100, required: true },
  exposure: { type: Number, min: 0, max: 100, default: 50, required: true },
  urgency: { type: Number, min: 0, max: 100, default: 50, required: true },
  risk_score: { type: Number, min: 0, max: 100, default: 0 },
  score_version: { type: Number, default: 1 },
  last_scored_at: { type: String, default: null },
  severity: { 
    type: String, 
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['OPEN', 'UNDER_REVIEW', 'MITIGATION_IN_PROGRESS', 'MITIGATED', 'CLOSED'], 
    default: 'OPEN' 
  },
  organizationId: { type: String, required: true },
  projectId: { type: String, default: null },
  ownerId: { type: String, default: null },
  createdBy: { type: String, required: true },
  is_sandbox: { type: Boolean, default: false },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
};

const RiskHistorySchema = {
  risk_id: { type: String, required: true },
  old_score: { type: Number, default: null },
  new_score: { type: Number, required: true },
  old_severity: { type: String, default: null },
  new_severity: { type: String, required: true },
  probability: { type: Number, required: true },
  impact: { type: Number, required: true },
  exposure: { type: Number, required: true },
  urgency: { type: Number, required: true },
  changed_by: { type: String, required: true },
  reason: { type: String, default: 'Authoritative calculation' },
  timestamp: { type: String, required: true }
};

const AIRiskAnalysisSchema = {
  analysis_id: { type: String, required: true, unique: true },
  risk_id: { type: String, required: true },
  organization_id: { type: String, default: '' },
  summary: { type: String, required: true },
  key_factors: { type: [String], default: [] },
  potential_impact: { type: String, required: true },
  recommendations: { type: [String], default: [] },
  confidence: { type: Number, required: true },
  evidence: { type: Array, default: [] },
  embedding_model: { type: String, default: '' },
  model: { type: String, default: '' },
  prompt_version: { type: String, default: '1.0.0' },
  created_by: { type: String, default: 'System' },
  created_at: { type: String, required: true }
};

const KnowledgeDocumentSchema = {
  document_id: { type: String, required: true, unique: true },
  filename: { type: String, required: true },
  display_name: { type: String, required: true },
  mime_type: { type: String, required: true },
  size: { type: Number, required: true },
  organization_id: { type: String, required: true },
  project_id: { type: String, default: null },
  category: { type: String, required: true },
  uploaded_by: { type: String, required: true },
  storage_location: { type: String, required: true },
  processing_status: { 
    type: String, 
    enum: ['UPLOADED', 'PROCESSING', 'READY', 'FAILED', 'ARCHIVED'], 
    default: 'UPLOADED' 
  },
  processing_error: { type: String, default: null },
  chunk_count: { type: Number, default: 0 },
  embedding_model: { type: String, default: '' },
  created_at: { type: String, required: true },
  updated_at: { type: String, required: true }
};

const ClimateRiskSchema = {
  organizationId: { type: String, required: true },
  facilityId: { type: String, default: null },
  name: { type: String, required: true },
  category: { type: String, enum: ['Flood', 'Drought', 'Extreme Heat', 'Storm', 'Wildfire', 'Water Scarcity', 'Other'], default: 'Flood' },
  probability: { type: Number, default: 3 },
  impact: { type: Number, default: 3 },
  description: { type: String, default: '' },
  mitigationPlan: { type: String, default: '' },
  owner: { type: String, default: '' },
  deadline: { type: String, default: '' },
  status: { type: String, enum: ['OPEN', 'MITIGATING', 'CLOSED'], default: 'OPEN' },
  createdBy: { type: String, required: true }
};

const ComplianceRecordSchema = {
  organizationId: { type: String, required: true },
  facilityId: { type: String, default: null },
  permitName: { type: String, required: true },
  authority: { type: String, default: '' },
  status: { type: String, enum: ['Compliant', 'Under Review', 'Non-Compliant', 'Expired'], default: 'Compliant' },
  expirationDate: { type: String, default: '' },
  violations: { type: String, default: '' },
  fines: { type: String, default: '' },
  penalties: { type: String, default: '' },
  correctiveActions: { type: String, default: '' },
  createdBy: { type: String, required: true }
};

const ProductImpactSchema = {
  organizationId: { type: String, required: true },
  name: { type: String, required: true },
  sustainableMaterial: { type: String, default: '' },
  recyclableMaterial: { type: String, default: '' },
  productCO2e: { type: String, default: '' },
  energyConsumption: { type: String, default: '' },
  packagingReduction: { type: String, default: '' },
  lcaDetails: { type: String, default: '' },
  createdBy: { type: String, required: true }
};

const SupplyChainRecordSchema = {
  organizationId: { type: String, required: true },
  name: { type: String, required: true },
  assessed: { type: Boolean, default: false },
  emissions: { type: String, default: '' },
  sustainableSourcing: { type: String, default: '' },
  certifications: { type: String, default: '' },
  violations: { type: String, default: '0' },
  waste: { type: String, default: '' },
  waterImpact: { type: String, default: '' },
  riskLevel: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Low' },
  createdBy: { type: String, required: true }
};

const ProjectSchema = {
  organizationId: { type: String, required: true },
  facilityId: { type: String, default: null },
  name: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['ENERGY_EFFICIENCY', 'RENEWABLE_ENERGY', 'METHANE_CAPTURE', 'REFORESTATION', 'WASTE_DIVERSION', 'WATER_CONSERVATION', 'CIRCULAR_ECONOMY', 'OTHER'], 
    default: 'ENERGY_EFFICIENCY' 
  },
  description: { type: String, default: '' },
  baselineCO2e: { type: Number, default: 0 },
  targetCO2eReduction: { type: Number, default: 0 },
  actualCO2eReduction: { type: Number, default: 0 },
  startDate: { type: String, required: true },
  completionDate: { type: String, default: '' },
  standard: { type: String, default: 'VCS (Verified Carbon Standard)' },
  status: { 
    type: String, 
    enum: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'CHANGES_REQUESTED', 'RESUBMITTED', 'APPROVED', 'VERIFIED', 'PUBLISHED', 'REJECTED'], 
    default: 'DRAFT' 
  },
  reviewerComments: { type: String, default: '' },
  reviewedBy: { type: String, default: null },
  reviewedAt: { type: String, default: null },
  verifiedBy: { type: String, default: null },
  verifiedAt: { type: String, default: null },
  creditsIssued: { type: Number, default: 0 },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: String, default: null },
  deletedBy: { type: String, default: null },
  createdBy: { type: String, required: true }
};

const NotificationSchema = {
  notificationId: { type: String, default: null },
  userId: { type: String, default: null },
  organizationId: { type: String, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: [
      'INFO', 'SUCCESS', 'WARNING', 'CRITICAL', 'ALERT',
      'CRITICAL_RISK', 'HIGH_RISK', 'WORKFLOW_ASSIGNED', 'APPROVAL_REQUIRED',
      'MITIGATION_DUE', 'MITIGATION_OVERDUE', 'ESCALATION', 'AI_ANALYSIS_COMPLETE'
    ], 
    default: 'INFO' 
  },
  resourceType: { type: String, default: '' },
  resourceId: { type: String, default: '' },
  link: { type: String, default: '' },
  isRead: { type: Boolean, default: false },
  read: { type: Boolean, default: false },
  createdAt: { type: String, required: true }
};

const CarbonCreditBatchSchema = {
  projectId: { type: String, required: true },
  organizationId: { type: String, required: true },
  batchNumber: { type: String, required: true },
  vintageYear: { type: Number, required: true },
  creditsTotal: { type: Number, required: true },
  creditsAvailable: { type: Number, required: true },
  creditsRetired: { type: Number, default: 0 },
  standard: { type: String, default: 'VCS' },
  status: { type: String, enum: ['ISSUED', 'ACTIVE', 'PARTIALLY_RETIRED', 'RETIRED'], default: 'ISSUED' },
  retirementHistory: { type: Array, default: [] },
  createdAt: { type: String, required: true }
};

// Phase 5: AI Agent Schemas
const AgentRunSchema = {
  agent_run_id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true },
  organization_id: { type: String, required: true },
  goal: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['QUEUED', 'RUNNING', 'PLANNING', 'TOOL_EXECUTION', 'OBSERVING', 'WAITING_FOR_APPROVAL', 'COMPLETED', 'FAILED', 'CANCELLED', 'TIMEOUT'], 
    default: 'QUEUED' 
  },
  started_at: { type: String, required: true },
  completed_at: { type: String, default: null },
  step_count: { type: Number, default: 0 },
  result_summary: { type: String, default: '' },
  final_response: { type: String, default: '' },
  error_category: { type: String, default: null },
  metadata: { type: Object, default: {} }
};

const AgentStepSchema = {
  step_id: { type: String, required: true, unique: true },
  agent_run_id: { type: String, required: true },
  step_number: { type: Number, required: true },
  step_type: { 
    type: String, 
    enum: ['PLANNING', 'TOOL_CALL', 'TOOL_RESULT', 'RAG_RETRIEVAL', 'LLM_ANALYSIS', 'APPROVAL_REQUEST', 'FINAL_RESPONSE'], 
    required: true 
  },
  tool_name: { type: String, default: null },
  input_summary: { type: String, default: '' },
  output_summary: { type: String, default: '' },
  status: { type: String, default: 'COMPLETED' },
  created_at: { type: String, required: true }
};

const AgentToolCallSchema = {
  tool_call_id: { type: String, required: true, unique: true },
  agent_run_id: { type: String, required: true },
  step_id: { type: String, required: true },
  tool_name: { type: String, required: true },
  validated_input: { type: Object, default: {} },
  result_summary: { type: String, default: '' },
  status: { type: String, enum: ['REQUESTED', 'EXECUTING', 'SUCCESS', 'FAILED', 'APPROVAL_REQUIRED'], default: 'SUCCESS' },
  execution_time: { type: Number, default: 0 },
  created_at: { type: String, required: true }
};

const AgentApprovalSchema = {
  approval_id: { type: String, required: true, unique: true },
  agent_run_id: { type: String, required: true },
  tool_name: { type: String, required: true },
  reason: { type: String, required: true },
  requested_action: { type: Object, default: {} },
  requested_by_agent: { type: String, default: 'RiskAgent' },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'], default: 'PENDING' },
  approved_by: { type: String, default: null },
  approved_at: { type: String, default: null },
  rejected_by: { type: String, default: null },
  rejected_at: { type: String, default: null },
  created_at: { type: String, required: true }
};

const MitigationPlanSchema = {
  plan_id: { type: String, required: true, unique: true },
  risk_id: { type: String, required: true },
  organization_id: { type: String, required: true },
  title: { type: String, required: true },
  steps: { type: [String], default: [] },
  owner: { type: String, default: '' },
  target_date: { type: String, default: '' },
  status: { type: String, enum: ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], default: 'PLANNED' },
  created_at: { type: String, required: true }
};

// -------------------------
// PHASE 6: PROACTIVE MONITORING & EVENT DETECTION
// -------------------------
const MonitoringRuleSchema = {
  ruleId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  eventType: { type: String, required: true },
  conditions: { type: Array, default: [] },
  action: { type: String, enum: ['CREATE_ALERT', 'TRIGGER_AI_ANALYSIS', 'TRIGGER_AI_AGENT', 'LOG_ONLY'], default: 'CREATE_ALERT' },
  enabled: { type: Boolean, default: true },
  organizationId: { type: String, required: true },
  projectId: { type: String, default: null },
  createdBy: { type: String, default: 'System' },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
};

const MonitoringEventSchema = {
  eventId: { type: String, required: true, unique: true },
  eventType: { type: String, required: true },
  organizationId: { type: String, required: true },
  projectId: { type: String, default: null },
  resourceType: { type: String, required: true },
  resourceId: { type: String, required: true },
  previousValue: { type: Object, default: null },
  currentValue: { type: Object, default: null },
  payload: { type: Object, default: {} },
  source: { type: String, default: 'MonitoringEngine' },
  fingerprint: { type: String, required: true },
  status: { type: String, enum: ['DETECTED', 'PROCESSING', 'PROCESSED', 'FAILED', 'IGNORED'], default: 'DETECTED' },
  detectedAt: { type: String, required: true },
  processedAt: { type: String, default: null },
  aiAgentRunId: { type: String, default: null },
  ruleId: { type: String, default: null }
};

const MonitoringRunSchema = {
  runId: { type: String, required: true, unique: true },
  startedAt: { type: String, required: true },
  completedAt: { type: String, default: null },
  eventsProcessed: { type: Number, default: 0 },
  eventsFailed: { type: Number, default: 0 },
  aiTriggers: { type: Number, default: 0 },
  status: { type: String, enum: ['RUNNING', 'COMPLETED', 'PARTIAL_FAILURE', 'FAILED'], default: 'RUNNING' },
  metadata: { type: Object, default: {} }
};

const MonitoringAlertSchema = {
  alertId: { type: String, required: true, unique: true },
  organizationId: { type: String, required: true },
  projectId: { type: String, default: null },
  eventId: { type: String, required: true },
  ruleId: { type: String, default: null },
  title: { type: String, required: true },
  severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'LOW' },
  message: { type: String, required: true },
  aiAgentRunId: { type: String, default: null },
  acknowledged: { type: Boolean, default: false },
  createdAt: { type: String, required: true }
};

// -------------------------
// PHASE 7: ALERTS + WORKFLOW AUTOMATION
// -------------------------
const AlertSchema = {
  alertId: { type: String, required: true, unique: true },
  eventId: { type: String, default: null },
  riskId: { type: String, default: null },
  organizationId: { type: String, required: true },
  projectId: { type: String, default: null },
  type: {
    type: String,
    enum: [
      'CRITICAL_RISK', 'HIGH_RISK', 'RISK_ESCALATION', 'COMPLIANCE', 'ESG',
      'CARBON', 'SUPPLIER', 'PROJECT', 'MONITORING', 'AI_AGENT', 'MITIGATION_OVERDUE'
    ],
    default: 'MONITORING'
  },
  severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED'], default: 'NEW' },
  assignedTo: { type: String, default: null },
  acknowledgedAt: { type: String, default: null },
  resolvedAt: { type: String, default: null },
  metadata: { type: Object, default: {} },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
};

const WorkflowDefinitionSchema = {
  workflowId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  trigger: { type: String, required: true },
  conditions: { type: Array, default: [] },
  actions: { type: Array, default: [] },
  enabled: { type: Boolean, default: true },
  organizationId: { type: String, required: true },
  projectId: { type: String, default: null },
  deadlineConfig: { type: Object, default: null },
  createdBy: { type: String, default: 'System' },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
};

const WorkflowInstanceSchema = {
  instanceId: { type: String, required: true, unique: true },
  workflowId: { type: String, required: true },
  eventId: { type: String, default: null },
  riskId: { type: String, default: null },
  organizationId: { type: String, required: true },
  projectId: { type: String, default: null },
  status: {
    type: String,
    enum: ['PENDING', 'RUNNING', 'WAITING_FOR_APPROVAL', 'WAITING_FOR_USER', 'COMPLETED', 'FAILED', 'CANCELLED', 'ESCALATED'],
    default: 'RUNNING'
  },
  currentStep: { type: Number, default: 0 },
  startedAt: { type: String, required: true },
  completedAt: { type: String, default: null },
  createdBy: { type: String, default: 'System' },
  error: { type: String, default: null },
  deadline: { type: Object, default: null },
  updatedAt: { type: String, required: true }
};

const WorkflowStepSchema = {
  stepId: { type: String, required: true, unique: true },
  instanceId: { type: String, required: true },
  stepNumber: { type: Number, required: true },
  actionType: { type: String, required: true },
  status: {
    type: String,
    enum: ['PENDING', 'RUNNING', 'WAITING', 'COMPLETED', 'FAILED', 'SKIPPED'],
    default: 'PENDING'
  },
  inputSummary: { type: String, default: '' },
  resultSummary: { type: String, default: '' },
  assignedTo: { type: String, default: null },
  startedAt: { type: String, required: true },
  completedAt: { type: String, default: null },
  error: { type: String, default: null }
};

const PredictionHistorySchema = {
  prediction_id: { type: String, required: true, unique: true },
  risk_id: { type: String, required: true },
  organizationId: { type: String, required: true },
  projectId: { type: String, default: null },
  current_score: { type: Number, required: true },
  current_severity: { type: String, required: true },
  prediction_horizon_days: { type: Number, required: true },
  predicted_score: { type: Number, required: true },
  predicted_severity: { type: String, required: true },
  critical_probability: { type: Number, required: true },
  trend: { type: String, enum: ['INCREASING', 'STABLE', 'DECREASING'], default: 'STABLE' },
  top_predictive_factors: [{ type: String }],
  model_version: { type: String, default: 'risk-predictor-v1' },
  feature_version: { type: String, default: 'risk-features-v1' },
  prediction_timestamp: { type: String, required: true },
  feedback: {
    evaluated_at: { type: String, default: null },
    actual_score: { type: Number, default: null },
    actual_severity: { type: String, default: null },
    prediction_correct: { type: Boolean, default: null }
  }
};

// Phase 10 Real ESG/Carbon Integrations & Scenario Intelligence Schemas
const IntegrationSchema = {
  integrationId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  providerType: {
    type: String,
    enum: ['ESG', 'CARBON', 'ENERGY', 'SUPPLIER', 'COMPLIANCE', 'PROJECT'],
    required: true
  },
  adapterName: { type: String, required: true },
  status: {
    type: String,
    enum: ['CONNECTED', 'DISCONNECTED', 'ERROR', 'PAUSED', 'SYNCING'],
    default: 'CONNECTED'
  },
  syncFrequency: {
    type: String,
    enum: ['HOURLY', 'DAILY', 'WEEKLY', 'MANUAL'],
    default: 'DAILY'
  },
  config: { type: Object, default: {} },
  organizationId: { type: String, required: true },
  projectId: { type: String, default: null },
  lastSyncAt: { type: String, default: null },
  lastSyncStatus: { type: String, default: null },
  recordsImported: { type: Number, default: 0 },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
};

const SyncJobSchema = {
  jobId: { type: String, required: true, unique: true },
  integrationId: { type: String, required: true },
  organizationId: { type: String, required: true },
  projectId: { type: String, default: null },
  syncType: {
    type: String,
    enum: ['MANUAL', 'SCHEDULED', 'INCREMENTAL', 'FULL'],
    default: 'INCREMENTAL'
  },
  status: {
    type: String,
    enum: ['STARTED', 'SUCCESS', 'PARTIAL', 'FAILED'],
    default: 'STARTED'
  },
  recordsFetched: { type: Number, default: 0 },
  recordsImported: { type: Number, default: 0 },
  recordsSkipped: { type: Number, default: 0 },
  errors: [{ type: String }],
  startedAt: { type: String, required: true },
  completedAt: { type: String, default: null }
};

const NormalizedDataRecordSchema = {
  recordId: { type: String, required: true, unique: true },
  source: { type: String, required: true },
  domain: {
    type: String,
    enum: ['ESG', 'CARBON', 'ENERGY', 'SUPPLIER', 'COMPLIANCE', 'PROJECT'],
    required: true
  },
  organizationId: { type: String, required: true },
  projectId: { type: String, default: null },
  metric: { type: String, required: true },
  value: { type: Number, required: true },
  unit: { type: String, required: true },
  period: { type: String, default: 'realtime' },
  timestamp: { type: String, required: true },
  fingerprint: { type: String, required: true },
  metadata: { type: Object, default: {} }
};

const ScenarioSchema = {
  scenarioId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  scenarioType: {
    type: String,
    enum: [
      'CARBON_INCREASE',
      'CARBON_REDUCTION',
      'ENERGY_INCREASE',
      'ENERGY_REDUCTION',
      'COMPLIANCE_DELAY',
      'SUPPLIER_FAILURE',
      'PROJECT_DELAY',
      'ESG_DEGRADATION',
      'MITIGATION_FAILURE',
      'RISK_FACTOR_CHANGE'
    ],
    required: true
  },
  organizationId: { type: String, required: true },
  projectId: { type: String, default: null },
  parameters: { type: Object, default: {} },
  createdBy: { type: String, default: 'SYSTEM' },
  status: { type: String, enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'], default: 'ACTIVE' },
  lastRunAt: { type: String, default: null },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
};

const ScenarioResultSchema = {
  simulationId: { type: String, required: true, unique: true },
  scenarioId: { type: String, default: null },
  scenarioName: { type: String, required: true },
  scenarioType: { type: String, required: true },
  organizationId: { type: String, required: true },
  projectId: { type: String, default: null },
  baselineAverageScore: { type: Number, required: true },
  projectedAverageScore: { type: Number, required: true },
  scoreDelta: { type: Number, required: true },
  baselineCriticalCount: { type: Number, default: 0 },
  projectedCriticalCount: { type: Number, default: 0 },
  baselineHighCount: { type: Number, default: 0 },
  projectedHighCount: { type: Number, default: 0 },
  affectedRisks: [{ type: Object }],
  potentialEvents: [{ type: Object }],
  potentialAlerts: [{ type: Object }],
  aiExplanation: { type: String, default: '' },
  policyCitations: [{ type: Object }],
  engineVersion: { type: String, default: 'scenario-engine-v1.0.0' },
  simulation: { type: Boolean, default: true },
  createdAt: { type: String, required: true }
};

// Phase 11 Executive Risk Intelligence Schemas
const ExecutiveBriefingSchema = {
  briefingId: { type: String, required: true, unique: true },
  organizationId: { type: String, required: true },
  projectId: { type: String, default: null },
  title: { type: String, required: true },
  summary: { type: String, required: true },
  executiveIndex: { type: Number, required: true },
  executiveSeverity: { type: String, required: true },
  sections: { type: Object, required: true },
  evidenceReferences: [{ type: Object }],
  metricsSnapshot: { type: Object, default: {} },
  generatedBy: { type: String, default: 'Executive AI Assistant' },
  modelVersion: { type: String, default: 'executive-analyst-v1' },
  promptVersion: { type: String, default: 'v1.0.0' },
  createdAt: { type: String, required: true }
};

const ExecutiveIndexSnapshotSchema = {
  snapshotId: { type: String, required: true, unique: true },
  organizationId: { type: String, required: true },
  projectId: { type: String, default: null },
  executiveIndex: { type: Number, required: true },
  overallSeverity: { type: String, required: true },
  trend: { type: String, enum: ['INCREASING', 'STABLE', 'DECREASING'], default: 'STABLE' },
  components: { type: Object, required: true },
  calculationVersion: { type: String, default: 'executive-index-v1.0.0' },
  recordedAt: { type: String, required: true }
};

// Phase 12 Production Pilot, Validation & Productization Schemas
const IncidentSchema = {
  incidentId: { type: String, required: true, unique: true },
  organizationId: { type: String, required: true },
  severity: { type: String, enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], default: 'MEDIUM' },
  category: { 
    type: String, 
    enum: ['SECURITY', 'AI', 'DATABASE', 'MONITORING', 'WORKFLOW', 'INTEGRATION', 'PERFORMANCE', 'AVAILABILITY'], 
    required: true 
  },
  summary: { type: String, required: true },
  affectedService: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['DETECTED', 'TRIAGED', 'INVESTIGATING', 'MITIGATED', 'RESOLVED', 'POSTMORTEM'], 
    default: 'DETECTED' 
  },
  owner: { type: String, default: 'Unassigned' },
  timeline: [{ type: Object }],
  rootCause: { type: String, default: null },
  resolution: { type: String, default: null },
  createdAt: { type: String, required: true },
  resolvedAt: { type: String, default: null }
};

const FeatureFlagSchema = {
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  enabled: { type: Boolean, default: true },
  environment: { type: String, default: 'ALL' },
  rolloutPercentage: { type: Number, default: 100 },
  allowedRoles: [{ type: String }],
  updatedBy: { type: String, default: 'SYSTEM' },
  updatedAt: { type: String, required: true }
};

const ReleaseRecordSchema = {
  releaseId: { type: String, required: true, unique: true },
  version: { type: String, required: true },
  frontendVersion: { type: String, default: '12.0.0' },
  expressVersion: { type: String, default: '12.0.0' },
  pythonVersion: { type: String, default: '12.0.0' },
  modelVersion: { type: String, default: 'executive-index-v1.0.0' },
  promptVersion: { type: String, default: 'v1.0.0' },
  migrationVersion: { type: String, default: 'v12-2026' },
  status: { 
    type: String, 
    enum: ['PLANNED', 'STAGING', 'APPROVED', 'DEPLOYED', 'ROLLED_BACK'], 
    default: 'DEPLOYED' 
  },
  qualityGates: { type: Object, default: {} },
  createdAt: { type: String, required: true },
  deployedAt: { type: String, default: null }
};

const OnboardingStateSchema = {
  organizationId: { type: String, required: true, unique: true },
  currentStep: { type: Number, default: 1 },
  completedSteps: [{ type: Number }],
  status: { 
    type: String, 
    enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'PAUSED'], 
    default: 'IN_PROGRESS' 
  },
  stepData: { type: Object, default: {} },
  startedAt: { type: String, required: true },
  completedAt: { type: String, default: null },
  updatedAt: { type: String, required: true }
};

const AIUsageRecordSchema = {
  recordId: { type: String, required: true, unique: true },
  organizationId: { type: String, required: true },
  service: { type: String, required: true },
  model: { type: String, required: true },
  promptTokens: { type: Number, default: 0 },
  completionTokens: { type: Number, default: 0 },
  totalTokens: { type: Number, default: 0 },
  latencyMs: { type: Number, default: 0 },
  estimatedCostUsd: { type: Number, default: 0.0 },
  costDataStatus: { type: String, enum: ['ACTUAL', 'ESTIMATED', 'UNAVAILABLE'], default: 'ESTIMATED' },
  timestamp: { type: String, required: true }
};

const UATRunResultSchema = {
  runId: { type: String, required: true, unique: true },
  persona: { type: String, required: true },
  suiteName: { type: String, required: true },
  totalTests: { type: Number, required: true },
  passed: { type: Number, required: true },
  failed: { type: Number, required: true },
  results: [{ type: Object }],
  executedAt: { type: String, required: true }
};

const AIEvaluationRunSchema = {
  evaluationId: { type: String, required: true, unique: true },
  organizationId: { type: String, required: true },
  totalCases: { type: Number, required: true },
  overallScore: { type: Number, required: true },
  metrics: { type: Object, required: true },
  details: [{ type: Object }],
  measuredAt: { type: String, required: true }
};

// Phase 13 Advanced Decision Intelligence Schemas
const DecisionSchema = {
  decisionId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  organizationId: { type: String, required: true },
  projectId: { type: String, default: null },
  riskId: { type: String, default: null },
  createdBy: { type: String, required: true },
  objective: { 
    type: String, 
    enum: ['RISK_REDUCTION', 'COST_MINIMIZATION', 'COMPLIANCE', 'ESG_IMPROVEMENT', 'CARBON_REDUCTION', 'OPERATIONAL_STABILITY', 'BALANCED_OUTCOME'], 
    default: 'BALANCED_OUTCOME' 
  },
  constraints: { type: Object, default: {} },
  status: { 
    type: String, 
    enum: ['DRAFT', 'ANALYZING', 'READY_FOR_REVIEW', 'WAITING_FOR_APPROVAL', 'APPROVED', 'REJECTED', 'EXECUTED', 'COMPLETED', 'CANCELLED'], 
    default: 'DRAFT' 
  },
  selectedOptionId: { type: String, default: null },
  decisionVersion: { type: Number, default: 1 },
  weightConfiguration: { type: Object, default: {} },
  weightVersion: { type: String, default: 'weight-v1.0.0' },
  aiRecommendation: { type: Object, default: null },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
};

const DecisionOptionSchema = {
  optionId: { type: String, required: true, unique: true },
  decisionId: { type: String, required: true },
  organizationId: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  inputs: { type: Object, default: {} },
  scenarioReference: { type: String, default: null },
  projectedRisk: { type: Number, default: 50.0 },
  projectedCost: { type: Number, default: 0.0 },
  projectedEsgImpact: { type: Number, default: 50.0 },
  projectedCarbonImpact: { type: Number, default: 0.0 },
  projectedComplianceExposure: { type: Number, default: 0.0 },
  implementationTime: { type: Number, default: 30.0 },
  operationalImpact: { type: Number, default: 20.0 },
  decisionScore: { type: Number, default: 0.0 },
  rank: { type: Number, default: 1 },
  constraintViolations: [{ type: String }],
  isFeasible: { type: Boolean, default: true },
  createdAt: { type: String, required: true }
};

const DecisionOutcomeSchema = {
  outcomeId: { type: String, required: true, unique: true },
  decisionId: { type: String, required: true },
  optionId: { type: String, required: true },
  organizationId: { type: String, required: true },
  expectedResult: { type: Object, default: {} },
  actualResult: { type: Object, default: {} },
  actualRisk: { type: Number, required: true },
  actualCost: { type: Number, required: true },
  actualEsg: { type: Number, default: 50.0 },
  actualCarbon: { type: Number, default: 0.0 },
  actualCompliance: { type: Number, default: 0.0 },
  forecastError: { type: Number, default: 0.0 },
  expectedRiskReduction: { type: Number, default: 0.0 },
  actualRiskReduction: { type: Number, default: 0.0 },
  costVariance: { type: Number, default: 0.0 },
  costVariancePercentage: { type: Number, default: 0.0 },
  accuracyNotes: { type: String, default: '' },
  evaluatedAt: { type: String, required: true }
};

// Phase 15 Autonomous Risk Optimization Schemas
const OptimizationRunSchema = {
  runId: { type: String, required: true, unique: true },
  organizationId: { type: String, required: true },
  objective: { type: String, required: true },
  weightsVersion: { type: String, default: 'opt-weights-v1.0.0' },
  scoringVersion: { type: String, default: 'opt-score-v1.0.0' },
  weights: { type: Object, default: {} },
  constraints: { type: Object, default: {} },
  totalRisksConsidered: { type: Number, default: 0 },
  selectedMitigationsCount: { type: Number, default: 0 },
  totalBudgetAllocated: { type: Number, default: 0.0 },
  budgetCap: { type: Number, default: 0.0 },
  budgetUtilizationPct: { type: Number, default: 0.0 },
  totalRiskPointsReduced: { type: Number, default: 0.0 },
  totalCarbonReductionTco2e: { type: Number, default: 0.0 },
  totalEsgGain: { type: Number, default: 0.0 },
  maxImplementationDays: { type: Number, default: 0 },
  constraintsSatisfied: { type: Boolean, default: true },
  constraintViolations: [{ type: String }],
  rankedStrategies: { type: Array, default: [] },
  executiveSummary: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['OPTIMIZED', 'WAITING_FOR_APPROVAL', 'APPROVED', 'EXECUTED', 'REJECTED'], 
    default: 'OPTIMIZED' 
  },
  approvalId: { type: String, default: null },
  approvedBy: { type: String, default: null },
  approvedAt: { type: String, default: null },
  executedAt: { type: String, default: null },
  isSimulation: { type: Boolean, default: false },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
};

// Phase 16 Enterprise Intelligence & Collaboration Schemas
const RiskCommentSchema = {
  commentId: { type: String, required: true, unique: true },
  riskId: { type: String, required: true },
  organizationId: { type: String, required: true },
  projectId: { type: String, default: null },
  userId: { type: String, required: true },
  userEmail: { type: String, required: true },
  userName: { type: String, default: '' },
  content: { type: String, required: true },
  mentions: [{
    type: { type: String },
    id: { type: String },
    name: { type: String },
    tag: { type: String }
  }],
  attachments: [{ type: Object }],
  deletedAt: { type: String, default: null },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
};

const WorkspaceItemSchema = {
  workspaceId: { type: String, required: true, unique: true },
  organizationId: { type: String, required: true },
  projectId: { type: String, default: null },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  members: [{ type: String }],
  pinnedRiskIds: [{ type: String }],
  pinnedDecisionIds: [{ type: String }],
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true }
};

// Phase 17 AI Risk Platform 2.0 Schemas
const IndustryTemplateSchema = {
  templateId: { type: String, required: true, unique: true },
  industry: { 
    type: String, 
    enum: ['MANUFACTURING', 'ENERGY', 'LOGISTICS', 'CONSTRUCTION', 'TECHNOLOGY', 'FINANCE', 'MSME', 'GENERAL_ESG'],
    required: true,
    unique: true
  },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  riskCategories: [{ type: String }],
  monitoringRules: [{ type: Object }],
  workflowTemplates: [{ type: Object }],
  esgKpis: [{ type: Object }],
  scenarioTemplates: [{ type: Object }],
  dashboardLayout: { type: Object, default: {} },
  isSystem: { type: Boolean, default: true },
  createdAt: { type: String, required: true }
};

const PlatformApiKeySchema = {
  keyId: { type: String, required: true, unique: true },
  organizationId: { type: String, required: true },
  name: { type: String, required: true },
  prefix: { type: String, required: true },
  hashedKey: { type: String, required: true },
  scopes: [{ type: String }],
  rateLimit: { type: Number, default: 60 },
  status: { type: String, enum: ['ACTIVE', 'REVOKED'], default: 'ACTIVE' },
  lastUsedAt: { type: String, default: null },
  createdAt: { type: String, required: true }
};

const PlatformUsageRecordSchema = {
  recordId: { type: String, required: true, unique: true },
  organizationId: { type: String, required: true },
  period: { type: String, required: true },
  usersCount: { type: Number, default: 0 },
  projectsCount: { type: Number, default: 0 },
  risksCount: { type: Number, default: 0 },
  agentRunsCount: { type: Number, default: 0 },
  aiRequestsCount: { type: Number, default: 0 },
  ragRequestsCount: { type: Number, default: 0 },
  workflowExecutionsCount: { type: Number, default: 0 },
  predictionsCount: { type: Number, default: 0 },
  integrationsCount: { type: Number, default: 0 },
  storageMb: { type: Number, default: 0.0 },
  updatedAt: { type: String, required: true }
};

const PlatformCostRecordSchema = {
  costId: { type: String, required: true, unique: true },
  organizationId: { type: String, required: true },
  period: { type: String, required: true },
  llmCostActual: { type: Number, default: 0.0 },
  llmCostEstimated: { type: Number, default: 0.0 },
  embeddingCostActual: { type: Number, default: 0.0 },
  storageCost: { type: Number, default: 0.0 },
  processingCost: { type: Number, default: 0.0 },
  agentExecutionCost: { type: Number, default: 0.0 },
  totalCost: { type: Number, default: 0.0 },
  currency: { type: String, default: 'USD' },
  breakdown: { type: Object, default: {} },
  updatedAt: { type: String, required: true }
};

const ToolRegistryItemSchema = {
  toolId: { type: String, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  version: { type: String, default: '1.0.0' },
  category: { 
    type: String, 
    enum: ['Risk', 'ESG', 'Carbon', 'Compliance', 'Supplier', 'Project', 'Scenario', 'Decision', 'Reporting', 'Executive', 'Optimization'],
    default: 'Risk'
  },
  description: { type: String, default: '' },
  schema: { type: Object, default: {} },
  permissions: [{ type: String }],
  riskLevel: { type: String, enum: ['READ', 'WRITE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'READ' },
  owner: { type: String, default: 'Platform' },
  auditPolicy: { type: String, default: 'LOG_EXECUTION' },
  enabled: { type: Boolean, default: true },
  updatedAt: { type: String, required: true }
};

// Phase 20 Developer Platform Models
const DeveloperApplicationSchema = {
  application_id: { type: String, required: true, unique: true },
  organization_id: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  status: { type: String, enum: ['ACTIVE', 'SUSPENDED', 'REVOKED'], default: 'ACTIVE' },
  client_id: { type: String, required: true, unique: true },
  client_secret_hash: { type: String, default: '' },
  scopes: [{ type: String }],
  rate_limit_tier: { type: String, enum: ['STANDARD', 'PROFESSIONAL', 'ENTERPRISE'], default: 'STANDARD' },
  is_sandbox: { type: Boolean, default: false },
  created_by: { type: String, default: 'System' },
  created_at: { type: String, required: true },
  updated_at: { type: String, required: true }
};

const ApiCredentialSchema = {
  credential_id: { type: String, required: true, unique: true },
  application_id: { type: String, required: true },
  key_prefix: { type: String, required: true },
  secret_hash: { type: String, required: true },
  scopes: [{ type: String }],
  status: { type: String, enum: ['ACTIVE', 'REVOKED', 'EXPIRED'], default: 'ACTIVE' },
  last_used_at: { type: String, default: null },
  expires_at: { type: String, default: null },
  revoked_at: { type: String, default: null },
  created_at: { type: String, required: true }
};

const WebhookEndpointSchema = {
  webhook_id: { type: String, required: true, unique: true },
  organization_id: { type: String, required: true },
  application_id: { type: String, default: '' },
  url: { type: String, required: true },
  events: [{ type: String }],
  secret_hash: { type: String, required: true },
  status: { type: String, enum: ['ACTIVE', 'DISABLED', 'FAILED'], default: 'ACTIVE' },
  failure_count: { type: Number, default: 0 },
  created_at: { type: String, required: true },
  updated_at: { type: String, required: true }
};

const WebhookDeliverySchema = {
  delivery_id: { type: String, required: true, unique: true },
  webhook_id: { type: String, required: true },
  event_id: { type: String, required: true },
  event_type: { type: String, required: true },
  payload: { type: Object, default: {} },
  attempt: { type: Number, default: 1 },
  status: { type: String, enum: ['PENDING', 'DELIVERED', 'RETRYING', 'FAILED', 'DISABLED'], default: 'PENDING' },
  status_code: { type: Number, default: null },
  latency_ms: { type: Number, default: null },
  response_summary: { type: String, default: null },
  delivered_at: { type: String, default: null },
  next_retry_at: { type: String, default: null },
  created_at: { type: String, required: true }
};

const ApiRequestLogSchema = {
  log_id: { type: String, required: true, unique: true },
  application_id: { type: String, default: '' },
  organization_id: { type: String, required: true },
  credential_id: { type: String, default: '' },
  endpoint: { type: String, required: true },
  method: { type: String, required: true },
  status_code: { type: Number, required: true },
  latency_ms: { type: Number, default: 0 },
  request_id: { type: String, required: true },
  request_size: { type: Number, default: 0 },
  response_size: { type: Number, default: 0 },
  is_sandbox: { type: Boolean, default: false },
  ai_metrics: { type: Object, default: null },
  timestamp: { type: String, required: true }
};

const IdempotencyRecordSchema = {
  key: { type: String, required: true },
  organization_id: { type: String, required: true },
  application_id: { type: String, default: '' },
  endpoint: { type: String, required: true },
  response_status: { type: Number, required: true },
  response_body: { type: Object, default: {} },
  created_at: { type: String, required: true },
  expires_at: { type: String, required: true }
};

const RiskAssessmentSchema = {
  submissionId: { type: String, required: true },
  recordId: { type: String, default: null },
  environmentalModule: { type: String, enum: ['energy', 'ghg', 'water', 'biodiversity', 'waste', 'pollution'], required: true },
  module: { type: String, default: null },
  organizationId: { type: String, required: true },
  facilityId: { type: String, default: null },
  riskScore: { type: Number, required: true }, // 0 - 100
  severity: { type: String, enum: ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'], required: true },
  confidence: { type: Number, default: 0.90 }, // 0.00 - 1.00
  status: { type: String, default: 'COMPLETED' },
  workflowAction: { 
    type: String, 
    enum: ['NORMAL_REVIEW', 'WARNING', 'CORRECTION_RECOMMENDED', 'ENHANCED_REVIEW'], 
    default: 'NORMAL_REVIEW' 
  },
  componentScores: {
    dataQuality: { type: Number, default: 0 },
    anomalyDetection: { type: Number, default: 0 },
    evidenceIntegrity: { type: Number, default: 0 },
    crossModuleConsistency: { type: Number, default: 0 },
    processRisk: { type: Number, default: 0 },
    aiContextual: { type: Number, default: 0 }
  },
  findings: [{
    id: { type: String, required: true },
    riskAssessmentId: { type: String, default: null },
    category: { 
      type: String, 
      enum: ['DATA_COMPLETENESS', 'DATA_VALIDITY', 'ANOMALY', 'EVIDENCE', 'CROSS_MODULE', 'CALCULATION', 'PROCESS', 'CONFIGURATION'],
      required: true 
    },
    severity: { type: String, enum: ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
    title: { type: String, required: true },
    description: { type: String, required: true },
    affectedFields: [{ type: String }],
    evidenceReference: { type: String, default: null },
    baselineReference: { type: Object, default: null },
    confidence: { type: Number, default: 0.90 },
    recommendedAction: { type: String, default: '' },
    createdAt: { type: String, required: true }
  }],
  recommendations: [{ type: String }],
  summary: { type: String, default: '' },
  modelVersion: { type: String, default: 'deterministic-v1' },
  rulesetVersion: { type: String, default: 'v1' },
  engineType: { type: String, default: 'deterministic' },
  inputSnapshotHash: { type: String, default: '' },
  scannedData: { type: Object, default: {} },
  userId: { type: String, default: null },
  createdAt: { type: String, required: true },
  updatedAt: { type: String, required: true },
  timestamp: { type: String, default: null }
};

module.exports = {
  Organization: defineModel('Organization', OrganizationSchema),
  User: defineModel('User', UserSchema),
  Facility: defineModel('Facility', FacilitySchema),
  EmissionFactor: defineModel('EmissionFactor', EmissionFactorSchema),
  
  // Refactored Core 6-Modules
  ElectricityMeter: defineModel('ElectricityMeter', ElectricityMeterSchema),
  ElectricityReading: defineModel('ElectricityReading', ElectricityReadingSchema),
  EnergyInitiative: defineModel('EnergyInitiative', EnergyInitiativeSchema),
  EnergyRecord: defineModel('EnergyRecord', EnergyRecordSchema), // back-compat mapping
  
  EmissionRecord: defineModel('EmissionRecord', EmissionRecordSchema),
  
  WaterRecord: defineModel('WaterRecord', WaterRecordSchema),
  WaterRisk: defineModel('WaterRisk', WaterRiskSchema),
  
  BiodiversityAssessment: defineModel('BiodiversityAssessment', BiodiversityAssessmentSchema),
  BiodiversityInitiative: defineModel('BiodiversityInitiative', BiodiversityInitiativeSchema),
  
  WasteRecord: defineModel('WasteRecord', WasteRecordSchema),
  
  PollutionRecord: defineModel('PollutionRecord', PollutionRecordSchema),
  PollutionControl: defineModel('PollutionControl', PollutionControlSchema),

  // Environmental AI Risk Assessment
  RiskAssessment: defineModel('RiskAssessment', RiskAssessmentSchema, [
    { recordId: 1 },
    { organizationId: 1, module: 1 },
    { timestamp: -1 }
  ]),
  
  // Additional Domain Modules
  ClimateRisk: defineModel('ClimateRisk', ClimateRiskSchema),
  ComplianceRecord: defineModel('ComplianceRecord', ComplianceRecordSchema),
  ProductImpact: defineModel('ProductImpact', ProductImpactSchema),
  SupplyChainRecord: defineModel('SupplyChainRecord', SupplyChainRecordSchema),

  // Project Management, Carbon Credits & Notifications
  Project: defineModel('CarbonProject', ProjectSchema),
  Notification: defineModel('Notification', NotificationSchema),
  CarbonCreditBatch: defineModel('CarbonCreditBatch', CarbonCreditBatchSchema),

  // Support & Workflows
  Evidence: defineModel('Evidence', EvidenceSchema),
  EnvironmentalAssessment: defineModel('EnvironmentalAssessment', EnvironmentalAssessmentSchema),
  EnvironmentalGap: defineModel('EnvironmentalGap', EnvironmentalGapSchema),
  EnvironmentalTarget: defineModel('EnvironmentalTarget', EnvironmentalTargetSchema),
  EnvironmentalAction: defineModel('EnvironmentalAction', EnvironmentalActionSchema),
  EnvironmentalAlert: defineModel('EnvironmentalAlert', EnvironmentalAlertSchema),
  AuditLog: defineModel('AuditLog', AuditLogSchema, [
    { organizationId: 1, timestamp: -1 },
    { action: 1 },
    { riskId: 1 }
  ]),
  Risk: defineModel('Risk', RiskSchema, [
    { organizationId: 1, createdAt: -1 },
    { organizationId: 1, severity: 1 },
    { organizationId: 1, status: 1 },
    { projectId: 1 }
  ]),
  RiskHistory: defineModel('RiskHistory', RiskHistorySchema, [
    { risk_id: 1, timestamp: -1 },
    { organizationId: 1 }
  ]),
  AIRiskAnalysis: defineModel('AIRiskAnalysis', AIRiskAnalysisSchema, [
    { risk_id: 1, created_at: -1 },
    { organization_id: 1 }
  ]),
  KnowledgeDocument: defineModel('KnowledgeDocument', KnowledgeDocumentSchema, [
    { organization_id: 1, created_at: -1 },
    [{ document_id: 1 }, { unique: true }]
  ]),

  // Phase 5 AI Agent Models
  AgentRun: defineModel('AgentRun', AgentRunSchema, [
    { organization_id: 1, created_at: -1 },
    [{ agent_run_id: 1 }, { unique: true }]
  ]),
  AgentStep: defineModel('AgentStep', AgentStepSchema, [
    { agent_run_id: 1, step_number: 1 }
  ]),
  AgentToolCall: defineModel('AgentToolCall', AgentToolCallSchema, [
    { agent_run_id: 1, timestamp: -1 }
  ]),
  AgentApproval: defineModel('AgentApproval', AgentApprovalSchema, [
    { organization_id: 1, status: 1 }
  ]),
  MitigationPlan: defineModel('MitigationPlan', MitigationPlanSchema, [
    { risk_id: 1, organization_id: 1 }
  ]),

  // Phase 6 Proactive Monitoring Models
  MonitoringRule: defineModel('MonitoringRule', MonitoringRuleSchema, [
    { organization_id: 1, enabled: 1 }
  ]),
  MonitoringEvent: defineModel('MonitoringEvent', MonitoringEventSchema, [
    { organization_id: 1, detected_at: -1 },
    { rule_id: 1 }
  ]),
  MonitoringRun: defineModel('MonitoringRun', MonitoringRunSchema, [
    { organization_id: 1, started_at: -1 }
  ]),
  MonitoringAlert: defineModel('MonitoringAlert', MonitoringAlertSchema),

  // Phase 7 Alerts & Workflows Models
  Alert: defineModel('Alert', AlertSchema, [
    { organizationId: 1, createdAt: -1 },
    { organizationId: 1, status: 1 },
    [{ alertId: 1 }, { unique: true }]
  ]),
  WorkflowDefinition: defineModel('WorkflowDefinition', WorkflowDefinitionSchema, [
    { organizationId: 1, enabled: 1 },
    [{ definitionId: 1 }, { unique: true }]
  ]),
  WorkflowInstance: defineModel('WorkflowInstance', WorkflowInstanceSchema, [
    { organizationId: 1, createdAt: -1 },
    { status: 1 },
    [{ instanceId: 1 }, { unique: true }]
  ]),
  WorkflowStep: defineModel('WorkflowStep', WorkflowStepSchema, [
    { instanceId: 1, stepNumber: 1 },
    [{ stepId: 1 }, { unique: true }]
  ]),

  // Phase 9 Predictive Intelligence Models
  PredictionHistory: defineModel('PredictionHistory', PredictionHistorySchema, [
    { risk_id: 1, prediction_timestamp: -1 },
    { organizationId: 1, prediction_timestamp: -1 },
    { organizationId: 1, critical_probability: -1 },
    [{ prediction_id: 1 }, { unique: true }]
  ]),

  // Phase 10 Real ESG/Carbon Integrations & Scenario Intelligence
  Integration: defineModel('Integration', IntegrationSchema, [
    { organizationId: 1, name: 1 },
    { organizationId: 1, providerType: 1 },
    [{ integrationId: 1 }, { unique: true }]
  ]),
  SyncJob: defineModel('SyncJob', SyncJobSchema, [
    { organizationId: 1, integrationId: 1, startedAt: -1 },
    [{ jobId: 1 }, { unique: true }]
  ]),
  NormalizedDataRecord: defineModel('NormalizedDataRecord', NormalizedDataRecordSchema, [
    { organizationId: 1, fingerprint: 1 },
    { organizationId: 1, domain: 1, timestamp: -1 },
    [{ recordId: 1 }, { unique: true }]
  ]),
  Scenario: defineModel('Scenario', ScenarioSchema, [
    { organizationId: 1, scenarioType: 1 },
    [{ scenarioId: 1 }, { unique: true }]
  ]),
  ScenarioResult: defineModel('ScenarioResult', ScenarioResultSchema, [
    { organizationId: 1, scenarioId: 1, createdAt: -1 },
    [{ simulationId: 1 }, { unique: true }]
  ]),

  // Phase 11 Executive Risk Intelligence Models
  ExecutiveBriefing: defineModel('ExecutiveBriefing', ExecutiveBriefingSchema, [
    { organizationId: 1, createdAt: -1 },
    [{ briefingId: 1 }, { unique: true }]
  ]),
  ExecutiveIndexSnapshot: defineModel('ExecutiveIndexSnapshot', ExecutiveIndexSnapshotSchema, [
    { organizationId: 1, recordedAt: -1 },
    [{ snapshotId: 1 }, { unique: true }]
  ]),

  // Phase 12 Production Pilot, Validation & Productization Models
  Incident: defineModel('Incident', IncidentSchema, [
    { organizationId: 1, createdAt: -1 },
    { organizationId: 1, status: 1 },
    [{ incidentId: 1 }, { unique: true }]
  ]),
  FeatureFlag: defineModel('FeatureFlag', FeatureFlagSchema, [
    [{ key: 1 }, { unique: true }]
  ]),
  ReleaseRecord: defineModel('ReleaseRecord', ReleaseRecordSchema, [
    { createdAt: -1 },
    [{ releaseId: 1 }, { unique: true }]
  ]),
  OnboardingState: defineModel('OnboardingState', OnboardingStateSchema, [
    [{ organizationId: 1 }, { unique: true }]
  ]),
  AIUsageRecord: defineModel('AIUsageRecord', AIUsageRecordSchema, [
    { organizationId: 1, timestamp: -1 },
    [{ recordId: 1 }, { unique: true }]
  ]),
  UATRunResult: defineModel('UATRunResult', UATRunResultSchema, [
    { executedAt: -1 },
    [{ runId: 1 }, { unique: true }]
  ]),
  AIEvaluationRun: defineModel('AIEvaluationRun', AIEvaluationRunSchema, [
    { organizationId: 1, measuredAt: -1 },
    [{ evaluationId: 1 }, { unique: true }]
  ]),

  // Phase 13 Advanced Decision Intelligence Models
  Decision: defineModel('Decision', DecisionSchema, [
    { organizationId: 1, createdAt: -1 },
    { organizationId: 1, status: 1 },
    [{ decisionId: 1 }, { unique: true }]
  ]),
  DecisionOption: defineModel('DecisionOption', DecisionOptionSchema, [
    { decisionId: 1, rank: 1 },
    { organizationId: 1 },
    [{ optionId: 1 }, { unique: true }]
  ]),
  DecisionOutcome: defineModel('DecisionOutcome', DecisionOutcomeSchema, [
    { decisionId: 1, evaluatedAt: -1 },
    { organizationId: 1 },
    [{ outcomeId: 1 }, { unique: true }]
  ]),

  // Phase 15 Autonomous Risk Optimization Models
  OptimizationRun: defineModel('OptimizationRun', OptimizationRunSchema, [
    { organizationId: 1, createdAt: -1 },
    { organizationId: 1, status: 1 },
    [{ runId: 1 }, { unique: true }]
  ]),

  // Phase 16 Enterprise Intelligence & Collaboration Models
  RiskComment: defineModel('RiskComment', RiskCommentSchema, [
    { riskId: 1, createdAt: -1 },
    { organizationId: 1, createdAt: -1 },
    [{ commentId: 1 }, { unique: true }]
  ]),
  WorkspaceItem: defineModel('WorkspaceItem', WorkspaceItemSchema, [
    { organizationId: 1, createdAt: -1 },
    [{ workspaceId: 1 }, { unique: true }]
  ]),

  // Phase 17 AI Risk Platform 2.0 Models
  IndustryTemplate: defineModel('IndustryTemplate', IndustryTemplateSchema, [
    [{ industry: 1 }, { unique: true }],
    [{ templateId: 1 }, { unique: true }]
  ]),
  PlatformApiKey: defineModel('PlatformApiKey', PlatformApiKeySchema, [
    { organizationId: 1, status: 1 },
    [{ keyId: 1 }, { unique: true }],
    [{ hashedKey: 1 }, { unique: true }]
  ]),
  PlatformUsageRecord: defineModel('PlatformUsageRecord', PlatformUsageRecordSchema, [
    { organizationId: 1, period: 1 },
    [{ recordId: 1 }, { unique: true }]
  ]),
  PlatformCostRecord: defineModel('PlatformCostRecord', PlatformCostRecordSchema, [
    { organizationId: 1, period: 1 },
    [{ costId: 1 }, { unique: true }]
  ]),
  ToolRegistryItem: defineModel('ToolRegistryItem', ToolRegistryItemSchema, [
    [{ toolId: 1 }, { unique: true }],
    [{ name: 1 }, { unique: true }]
  ]),

  // Phase 20 Developer Platform Models
  DeveloperApplication: defineModel('DeveloperApplication', DeveloperApplicationSchema, [
    { organization_id: 1, status: 1 },
    [{ application_id: 1 }, { unique: true }],
    [{ client_id: 1 }, { unique: true }]
  ]),
  ApiCredential: defineModel('ApiCredential', ApiCredentialSchema, [
    { application_id: 1, status: 1 },
    [{ credential_id: 1 }, { unique: true }]
  ]),
  WebhookEndpoint: defineModel('WebhookEndpoint', WebhookEndpointSchema, [
    { organization_id: 1, status: 1 },
    [{ webhook_id: 1 }, { unique: true }]
  ]),
  WebhookDelivery: defineModel('WebhookDelivery', WebhookDeliverySchema, [
    { webhook_id: 1, created_at: -1 },
    [{ delivery_id: 1 }, { unique: true }]
  ]),
  ApiRequestLog: defineModel('ApiRequestLog', ApiRequestLogSchema, [
    { organization_id: 1, timestamp: -1 },
    { application_id: 1, timestamp: -1 },
    [{ log_id: 1 }, { unique: true }]
  ]),
  IdempotencyRecord: defineModel('IdempotencyRecord', IdempotencyRecordSchema, [
    { organization_id: 1, key: 1 },
    { key: 1 }
  ])
};
