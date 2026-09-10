const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { setUseMock } = require('../models/db');
const { 
  Organization, User, Facility, EmissionFactor, ElectricityMeter, 
  ElectricityReading, EnergyInitiative, EnergyRecord, EmissionRecord, 
  WaterRecord, WaterRisk, BiodiversityAssessment, BiodiversityInitiative, 
  WasteRecord, PollutionRecord, PollutionControl, Evidence, 
  EnvironmentalAssessment, EnvironmentalGap, EnvironmentalTarget, 
  EnvironmentalAction, EnvironmentalAlert, AuditLog 
} = require('../models/models');

async function seed() {
  console.log("🌱 Seeding Complete 6-Module Environmental ESG database...");

  const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/esg-environmental';
  
  let useMock = false;
  try {
    await mongoose.connect(mongoURI, { serverSelectionTimeoutMS: 2000 });
    console.log("Connected to MongoDB for seeding.");
  } catch (err) {
    console.warn("MongoDB offline, seeding in mock JSON mode.");
    useMock = true;
    setUseMock(true);
  }

  // Clear data first
  if (useMock) {
    const dataDir = path.join(__dirname, '../data');
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir);
      for (const file of files) {
        fs.writeFileSync(path.join(dataDir, file), JSON.stringify([]));
      }
    }
  } else {
    await Promise.all([
      Organization.deleteMany({}), User.deleteMany({}), Facility.deleteMany({}), 
      EmissionFactor.deleteMany({}), ElectricityMeter.deleteMany({}), ElectricityReading.deleteMany({}),
      EnergyInitiative.deleteMany({}), EnergyRecord.deleteMany({}), EmissionRecord.deleteMany({}),
      WaterRecord.deleteMany({}), WaterRisk.deleteMany({}), BiodiversityAssessment.deleteMany({}),
      BiodiversityInitiative.deleteMany({}), WasteRecord.deleteMany({}), PollutionRecord.deleteMany({}),
      PollutionControl.deleteMany({}), Evidence.deleteMany({}), EnvironmentalAssessment.deleteMany({}),
      EnvironmentalGap.deleteMany({}), EnvironmentalTarget.deleteMany({}), EnvironmentalAction.deleteMany({}),
      EnvironmentalAlert.deleteMany({}), AuditLog.deleteMany({})
    ]);
  }

  // Helper to generate 24-character hexadecimal ObjectId strings
  const genId = () => new mongoose.Types.ObjectId().toString();

  // 1. Seed Organizations
  const acmeOrgId = genId();
  const betaOrgId = genId();
  const systemOrgId = genId();

  if (useMock) {
    // Write mock json files
  } else {
    await Organization.create([
      { _id: acmeOrgId, name: 'Acme Corporation', createdAt: '2025-01-01' },
      { _id: betaOrgId, name: 'Beta Industries', createdAt: '2025-06-01' },
      { _id: systemOrgId, name: 'SaaS System Administration', createdAt: '2025-01-01' }
    ]);
  }
  console.log("✅ Seeded Organizations");

  // 2. Seed Facilities for Acme Corp & Beta Corp
  const blrFacId = genId();
  const puneFacId = genId();
  const mumFacId = genId();
  const betaFacId = genId();

  if (!useMock) {
    await Facility.create([
      { _id: blrFacId, name: 'Bangalore Plant', location: 'Electronic City, Bangalore', area: 15000, description: 'Electronics manufacturing and assembly unit', organizationId: acmeOrgId },
      { _id: puneFacId, name: 'Pune Plant', location: 'MIDC Chakan, Pune', area: 25000, description: 'Heavy machinery and fabrication site', organizationId: acmeOrgId },
      { _id: mumFacId, name: 'Mumbai Plant', location: 'Thane, Mumbai', area: 12000, description: 'Logistics hub and regional warehouse', organizationId: acmeOrgId },
      { _id: betaFacId, name: 'Beta Chakan Plant', location: 'Chakan Industrial Area, Pune', area: 18000, description: 'Heavy fabrication and assembly unit', organizationId: betaOrgId }
    ]);
  }
  console.log("✅ Seeded Facilities");

  // 3. Seed Users for Acme Corp, Beta Corp, and System
  const passHash = await bcrypt.hash('password123', 10);
  if (!useMock) {
    await User.create([
      { name: 'Platform Super Admin', email: 'superadmin@esg.com', password: passHash, role: 'SUPER_ADMIN', organizationId: systemOrgId, facilityId: null },
      { name: 'Platform Operations Admin', email: 'platformadmin@esg.com', password: passHash, role: 'PLATFORM_ADMIN', organizationId: systemOrgId, facilityId: null },
      { name: 'Acme Admin', email: 'admin@acme.com', password: passHash, role: 'ADMIN', organizationId: acmeOrgId, facilityId: null },
      { name: 'Acme ESG Manager', email: 'esg_mgr@acme.com', password: passHash, role: 'ESG_MANAGER', organizationId: acmeOrgId, facilityId: null },
      { name: 'Acme Environmental Lead', email: 'env_mgr@acme.com', password: passHash, role: 'ENVIRONMENTAL_MANAGER', organizationId: acmeOrgId, facilityId: null },
      { name: 'Bangalore Specialist', email: 'data_entry@acme.com', password: passHash, role: 'DATA_ENTRY', organizationId: acmeOrgId, facilityId: blrFacId },
      { name: 'Acme Auditor', email: 'auditor@acme.com', password: passHash, role: 'AUDITOR', organizationId: acmeOrgId, facilityId: null },
      { name: 'Acme Viewer', email: 'viewer@acme.com', password: passHash, role: 'VIEWER', organizationId: acmeOrgId, facilityId: null },
      { name: 'Beta Admin', email: 'admin@beta.com', password: passHash, role: 'ADMIN', organizationId: betaOrgId, facilityId: null }
    ]);
  }
  console.log("✅ Seeded Users");

  // 4. Seed Emission Factors Registry
  if (!useMock) {
    await EmissionFactor.create([
      { name: 'Grid Electricity India', category: 'Scope 2', activityType: 'Grid Electricity', value: 0.82, unit: 'kg CO2e / kWh', source: 'CEA India 2025', effectiveFrom: '2025-01-01' },
      { name: 'Stationary Diesel Fuel', category: 'Scope 1', activityType: 'Diesel', value: 2.68, unit: 'kg CO2e / Liter', source: 'EPA 2025', effectiveFrom: '2025-01-01' },
      { name: 'Refrigerant HFC-134a', category: 'Scope 1', activityType: 'Refrigerant', value: 1430.00, unit: 'kg CO2e / kg', source: 'IPCC AR5', effectiveFrom: '2025-01-01' },
      { name: 'Business Flight Short-haul', category: 'Scope 3', activityType: 'Travel', value: 0.15, unit: 'kg CO2e / passenger-km', source: 'DEFRA 2025', effectiveFrom: '2025-01-01' }
    ]);
  }
  console.log("✅ Seeded Emission Factors");

  // 5. Seed Electricity Meters
  const meter1 = genId();
  const meter2 = genId();
  const meter3 = genId();

  if (!useMock) {
    await ElectricityMeter.create([
      { _id: meter1, organizationId: acmeOrgId, facilityId: blrFacId, meterNumber: 'MTR-BLR-001', location: 'Main Power Room', meterType: 'SMART_METER', connectionType: 'THREE_PHASE', voltage: 415, installationDate: '2025-01-10', status: 'ACTIVE' },
      { _id: meter2, organizationId: acmeOrgId, facilityId: puneFacId, meterNumber: 'MTR-PUN-002', location: 'Assembly Hall A', meterType: 'DIGITAL', connectionType: 'THREE_PHASE', voltage: 415, installationDate: '2025-02-15', status: 'ACTIVE' },
      { _id: meter3, organizationId: acmeOrgId, facilityId: mumFacId, meterNumber: 'MTR-MUM-003', location: 'Warehouse Office', meterType: 'MANUAL', connectionType: 'SINGLE_PHASE', voltage: 230, installationDate: '2025-03-20', status: 'ACTIVE' }
    ]);
  }
  console.log("✅ Seeded Electricity Meters");

  // 6. Seed Electricity Readings (Energy)
  if (!useMock) {
    await ElectricityReading.create([
      { organizationId: acmeOrgId, facilityId: blrFacId, meterId: meter1, previousReading: 100000, currentReading: 125000, consumption: 25000, readingDate: '2026-03-31', unit: 'kWh', sourceType: 'GRID', usageCategory: 'PRODUCTION_MACHINERY', reportingPeriod: 'Quarterly', createdBy: 'admin@acme.com' },
      { organizationId: acmeOrgId, facilityId: blrFacId, meterId: meter1, previousReading: 125000, currentReading: 135000, consumption: 10000, readingDate: '2026-03-31', unit: 'kWh', sourceType: 'SOLAR', usageCategory: 'LIGHTING', reportingPeriod: 'Quarterly', createdBy: 'admin@acme.com' },
      { organizationId: acmeOrgId, facilityId: puneFacId, meterId: meter2, previousReading: 200000, currentReading: 260000, consumption: 60000, readingDate: '2026-03-31', unit: 'kWh', sourceType: 'GRID', usageCategory: 'HVAC', reportingPeriod: 'Quarterly', createdBy: 'admin@acme.com' }
    ]);
  }
  console.log("✅ Seeded Electricity Readings");

  // 7. Seed Energy Initiatives
  if (!useMock) {
    await EnergyInitiative.create([
      { organizationId: acmeOrgId, facilityId: blrFacId, name: 'LED Replacement Initiative', description: 'Swap fluorescent bulbs for LED models', baselineConsumption: 12000, expectedConsumption: 4000, expectedSavings: 8000, actualSavings: 8000, startDate: '2025-06-01', targetDate: '2025-12-31', status: 'COMPLETED', responsiblePerson: 'Mr. John (BLR Facility Engineer)', createdBy: 'admin@acme.com' }
    ]);
  }
  console.log("✅ Seeded Energy Initiatives");

  // 8. Seed GHG Emission Records
  if (!useMock) {
    await EmissionRecord.create([
      { organizationId: acmeOrgId, facilityId: blrFacId, scope: 1, category: 'Stationary combustion', sourceName: 'Generator Diesel Fuel', activityValue: 1500, activityUnit: 'Liters', emissionFactor: 2.68, factorUnit: 'kg CO2e / Liter', factorSource: 'EPA 2025', calculatedCO2e: 4.02, reportingPeriod: 'Quarterly', periodStart: '2026-01-01', periodEnd: '2026-03-31', createdBy: 'admin@acme.com' },
      // Auto sync from grid reading above: 25000 kWh * 0.82 kg/kWh / 1000 = 20.5 tCO2e
      { organizationId: acmeOrgId, facilityId: blrFacId, scope: 2, category: 'Purchased electricity', sourceName: 'Grid Power (Auto Sync)', activityValue: 25000, activityUnit: 'kWh', emissionFactor: 0.82, factorUnit: 'kg CO2e / kWh', factorSource: 'CEA India 2025', calculatedCO2e: 20.5, reportingPeriod: 'Quarterly', periodStart: '2026-01-01', periodEnd: '2026-03-31', createdBy: 'admin@acme.com' }
    ]);
  }
  console.log("✅ Seeded Emission Records");

  // 9. Seed Water Records
  if (!useMock) {
    await WaterRecord.create([
      { organizationId: acmeOrgId, facilityId: blrFacId, source: 'Municipal Water', previousReading: 1000, currentReading: 5500, consumption: 4500, unit: 'm3', reportingPeriod: 'Quarterly', periodStart: '2026-01-01', periodEnd: '2026-03-31', createdBy: 'admin@acme.com' },
      { organizationId: acmeOrgId, facilityId: blrFacId, source: 'Recycled Water', previousReading: 0, currentReading: 1500, consumption: 1500, unit: 'm3', reportingPeriod: 'Quarterly', periodStart: '2026-01-01', periodEnd: '2026-03-31', createdBy: 'admin@acme.com' }
    ]);
    await WaterRisk.create([
      { organizationId: acmeOrgId, facilityId: blrFacId, riskType: 'Water Stress', riskLevel: 'MEDIUM', description: 'Region experiences summer municipal restrictions', mitigationMeasure: 'Increase recycling loops and construct rainwater catchments', updatedBy: 'admin@acme.com' }
    ]);
  }
  console.log("✅ Seeded Water Records");

  // 10. Seed Biodiversity Assessments
  if (!useMock) {
    await BiodiversityAssessment.create([
      { organizationId: acmeOrgId, facilityId: blrFacId, siteArea: 1.5, protectedAreaProximity: 12.0, environmentalSensitivity: 'Low richness, industrial zone', biodiversityRisk: 'LOW', impactAssessment: 'No protected species or unique habitats adjacent.', areaRestored: 0, areaPreserved: 0, status: 'Identified', updatedBy: 'admin@acme.com' }
    ]);
    await BiodiversityInitiative.create([
      { organizationId: acmeOrgId, facilityId: blrFacId, name: 'Roof Garden Planting', description: 'Native flora planting on cafeteria rooftop', startDate: '2026-01-01', targetDate: '2026-06-30', status: 'IN_PROGRESS', environmentalBenefit: 'Increases local pollinator counts', createdBy: 'admin@acme.com' }
    ]);
  }
  console.log("✅ Seeded Biodiversity Assessment");

  // 11. Seed Waste Records
  if (!useMock) {
    await WasteRecord.create([
      { organizationId: acmeOrgId, facilityId: blrFacId, category: 'Metal', wasteType: 'NON_HAZARDOUS', quantity: 125.0, unit: 'Tonnes', disposalMethod: 'Recycling', vendor: 'MetalRecycle India Ltd', reportingPeriod: 'Quarterly', periodStart: '2026-01-01', periodEnd: '2026-03-31', createdBy: 'admin@acme.com' },
      { organizationId: acmeOrgId, facilityId: blrFacId, category: 'Chemical', wasteType: 'HAZARDOUS', quantity: 4.8, unit: 'Tonnes', disposalMethod: 'Incineration', vendor: 'HazardWaste Ltd', reportingPeriod: 'Quarterly', periodStart: '2026-01-01', periodEnd: '2026-03-31', createdBy: 'admin@acme.com' }
    ]);
  }
  console.log("✅ Seeded Waste Manifests");

  // 12. Seed Pollution Control & Records
  if (!useMock) {
    await PollutionRecord.create([
      { organizationId: acmeOrgId, facilityId: blrFacId, medium: 'Air', pollutantType: 'NOx', quantity: 450, unit: 'kg', source: 'Boiler 1 Exhaust Stack', legalLimit: 500, actualValue: 420, complianceStatus: 'COMPLIANT', reportingPeriod: 'Quarterly', date: '2026-03-31', createdBy: 'admin@acme.com' }
    ]);
    await PollutionControl.create([
      { organizationId: acmeOrgId, facilityId: blrFacId, equipment: 'Electrostatic Precipitator', installationDate: '2024-11-20', status: 'ACTIVE', effectiveness: 98, maintenanceDate: '2026-01-15', createdBy: 'admin@acme.com' }
    ]);
  }
  console.log("✅ Seeded Pollution Records");

  // 13. Seed Environmental Targets
  if (!useMock) {
    await EnvironmentalTarget.create([
      { organizationId: acmeOrgId, name: 'Reduce electricity consumption by 20%', category: 'Energy Reduction', baselineValue: 150000, currentValue: 125000, targetValue: 120000, baselineYear: 2025, targetYear: 2030, owner: 'Esg Manager', status: 'ON_TRACK' },
      { organizationId: acmeOrgId, name: 'Achieve 30% renewable energy share', category: 'Renewable Energy', baselineValue: 5, currentValue: 15, targetValue: 30, baselineYear: 2025, targetYear: 2028, owner: 'Esg Manager', status: 'ON_TRACK' }
    ]);
  }
  console.log("✅ Seeded Environmental Targets");

  console.log("🎉 Database Seeding Complete!");
  if (!useMock) mongoose.disconnect();
}

seed();
