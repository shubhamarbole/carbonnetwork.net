const crypto = require('crypto');
const mongoose = require('mongoose');
const { 
  ElectricityReading, EmissionRecord, WaterRecord, 
  WasteRecord, PollutionRecord, BiodiversityAssessment, 
  Evidence, AuditLog, RiskAssessment, Facility
} = require('../models/models');

/**
 * Environmental Module Definitions & Rules
 */
const MODULE_CONFIG = {
  energy: {
    name: 'Energy',
    key: 'energy',
    model: ElectricityReading,
    primaryField: 'consumption',
    canonicalUnits: ['kwh', 'mwh', 'gj', 'kwh/unit'],
    defaultUnit: 'kWh',
    evidenceMandatory: true,
    requiredFields: ['readingDate', 'reportingPeriod']
  },
  ghg: {
    name: 'GHG Emissions',
    key: 'ghg',
    model: EmissionRecord,
    primaryField: 'calculatedCO2e',
    canonicalUnits: ['tco2e', 'kgco2e', 'mt co2e', 'mtco2e', 't co2e'],
    defaultUnit: 'tCO2e',
    evidenceMandatory: true,
    requiredFields: ['scope', 'sourceName', 'activityValue', 'activityUnit', 'reportingPeriod']
  },
  water: {
    name: 'Water',
    key: 'water',
    model: WaterRecord,
    primaryField: 'amount',
    canonicalUnits: ['m³', 'm3', 'liters', 'gallons', 'ml', 'cubic meters'],
    defaultUnit: 'm³',
    evidenceMandatory: true,
    requiredFields: ['source', 'reportingPeriod']
  },
  waste: {
    name: 'Waste',
    key: 'waste',
    model: WasteRecord,
    primaryField: 'quantity',
    canonicalUnits: ['kg', 'metric tons', 'tonnes', 'tons', 'lbs'],
    defaultUnit: 'kg',
    evidenceMandatory: true,
    requiredFields: ['category', 'wasteType', 'disposalMethod', 'reportingPeriod']
  },
  pollution: {
    name: 'Pollution Prevention',
    key: 'pollution',
    model: PollutionRecord,
    primaryField: 'actualValue',
    canonicalUnits: ['ppm', 'mg/m³', 'mg/m3', 'µg/m³', 'ug/m3', 'mg/l', 'kg'],
    defaultUnit: 'ppm',
    evidenceMandatory: false,
    requiredFields: ['medium', 'pollutantType', 'date']
  },
  biodiversity: {
    name: 'Biodiversity',
    key: 'biodiversity',
    model: BiodiversityAssessment,
    primaryField: 'siteArea',
    canonicalUnits: ['ha', 'hectares', 'm²', 'm2', 'acres'],
    defaultUnit: 'ha',
    evidenceMandatory: false,
    requiredFields: ['siteArea', 'environmentalSensitivity']
  }
};

/**
 * 1. DATA QUALITY & COMPLETENESS SUB-ENGINE (Max 25 pts)
 */
class DataQualityEngine {
  static async evaluate(config, data, orgId) {
    let penalty = 0;
    const findings = [];
    const now = new Date();

    // 1. Mandatory Fields Check
    const missingFields = [];
    for (const field of config.requiredFields) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      const fieldPenalty = Math.min(15, missingFields.length * 5);
      penalty += fieldPenalty;
      findings.push({
        id: `dq-missing-${Date.now()}-${Math.floor(Math.random()*1000)}`,
        category: 'DATA_COMPLETENESS',
        severity: missingFields.length > 1 ? 'HIGH' : 'MEDIUM',
        title: 'Missing Required Environmental Fields',
        description: `Submission is missing required operational field(s): ${missingFields.join(', ')}.`,
        affectedFields: missingFields,
        confidence: 0.95,
        recommendedAction: `Provide complete values for ${missingFields.join(', ')} before submitting for assurance.`
      });
    }

    // 2. Numeric Sanity & Primary Metric Checks
    const modKey = config.key;
    if (modKey === 'energy') {
      const curr = parseFloat(data.currentReading);
      const prev = parseFloat(data.previousReading);
      const cons = parseFloat(data.consumption !== undefined ? data.consumption : (curr - prev));

      if (isNaN(curr) && isNaN(cons)) {
        penalty += 15;
        findings.push({
          id: `dq-num-energy-${Date.now()}`,
          category: 'DATA_VALIDITY',
          severity: 'CRITICAL',
          title: 'Missing Meter Reading or Consumption',
          description: 'Neither valid cumulative meter readings nor net electricity consumption was provided.',
          affectedFields: ['currentReading', 'consumption'],
          confidence: 0.95,
          recommendedAction: 'Enter valid meter readings or direct verified consumption in kWh.'
        });
      } else if (!isNaN(curr) && curr < 0) {
        penalty += 15;
        findings.push({
          id: `dq-curr-neg-${Date.now()}`,
          category: 'DATA_VALIDITY',
          severity: 'CRITICAL',
          title: 'Negative Meter Reading',
          description: `Electricity meter reading cannot be negative (${curr}).`,
          affectedFields: ['currentReading'],
          confidence: 0.95,
          recommendedAction: 'Input non-negative meter counter reading.'
        });
      } else if (!isNaN(curr) && !isNaN(prev) && curr < prev && isNaN(cons)) {
        penalty += 15;
        findings.push({
          id: `dq-rollover-${Date.now()}`,
          category: 'DATA_VALIDITY',
          severity: 'HIGH',
          title: 'Meter Rollover or Reading Inversion',
          description: `Current reading (${curr}) is lower than previous reading (${prev}).`,
          affectedFields: ['currentReading', 'previousReading'],
          confidence: 0.90,
          recommendedAction: 'Verify if physical meter rollover occurred or rectify entry reversal.'
        });
      }

      if (!isNaN(cons) && cons < 0) {
        penalty += 15;
        findings.push({
          id: `dq-cons-neg-${Date.now()}`,
          category: 'DATA_VALIDITY',
          severity: 'CRITICAL',
          title: 'Negative Energy Consumption',
          description: `Calculated energy consumption cannot be negative (${cons} kWh).`,
          affectedFields: ['consumption'],
          confidence: 0.95,
          recommendedAction: 'Ensure current reading exceeds previous reading or provide net generation justification.'
        });
      }
    } else if (modKey === 'ghg') {
      const actVal = parseFloat(data.activityValue);
      if (isNaN(actVal) || actVal <= 0) {
        penalty += 15;
        findings.push({
          id: `dq-ghg-val-${Date.now()}`,
          category: 'DATA_VALIDITY',
          severity: 'CRITICAL',
          title: 'Invalid GHG Activity Data',
          description: 'GHG activity data value must be a strictly positive numerical value.',
          affectedFields: ['activityValue'],
          confidence: 0.95,
          recommendedAction: 'Input the measured fuel, gas, or secondary activity quantity.'
        });
      }
      const scope = parseInt(data.scope, 10);
      if (![1, 2, 3].includes(scope)) {
        penalty += 10;
        findings.push({
          id: `dq-ghg-scope-${Date.now()}`,
          category: 'DATA_VALIDITY',
          severity: 'HIGH',
          title: 'Invalid GHG Scope Classification',
          description: `Scope value must be 1, 2, or 3 according to GHG Protocol standards (received: ${data.scope}).`,
          affectedFields: ['scope'],
          confidence: 0.98,
          recommendedAction: 'Assign appropriate Scope tier (Scope 1: Direct, Scope 2: Purchased Energy, Scope 3: Value Chain).'
        });
      }
    } else if (modKey === 'water') {
      const amt = parseFloat(data.amount !== undefined ? data.amount : data.consumption);
      if (isNaN(amt) || amt <= 0) {
        penalty += 15;
        findings.push({
          id: `dq-water-val-${Date.now()}`,
          category: 'DATA_VALIDITY',
          severity: 'CRITICAL',
          title: 'Invalid Water Withdrawal Volume',
          description: 'Water volume must be a strictly positive number.',
          affectedFields: ['amount', 'consumption'],
          confidence: 0.95,
          recommendedAction: 'Enter verified water meter volume in cubic meters (m³).'
        });
      }
    } else if (modKey === 'waste') {
      const qty = parseFloat(data.quantity !== undefined ? data.quantity : data.amount);
      if (isNaN(qty) || qty <= 0) {
        penalty += 15;
        findings.push({
          id: `dq-waste-qty-${Date.now()}`,
          category: 'DATA_VALIDITY',
          severity: 'CRITICAL',
          title: 'Invalid Waste Quantity',
          description: 'Waste mass quantity must be a positive number.',
          affectedFields: ['quantity', 'amount'],
          confidence: 0.95,
          recommendedAction: 'Enter scale weight from certified waste transfer manifest.'
        });
      }
      if (data.wasteType && !['HAZARDOUS', 'NON_HAZARDOUS'].includes(data.wasteType.toUpperCase())) {
        penalty += 6;
        findings.push({
          id: `dq-waste-type-${Date.now()}`,
          category: 'DATA_VALIDITY',
          severity: 'MEDIUM',
          title: 'Non-Standard Waste Classification',
          description: 'Waste type should be either HAZARDOUS or NON_HAZARDOUS.',
          affectedFields: ['wasteType'],
          confidence: 0.92,
          recommendedAction: 'Select regulatory waste classification code.'
        });
      }
    } else if (modKey === 'pollution') {
      const actVal = parseFloat(data.actualValue !== undefined ? data.actualValue : data.quantity);
      if (isNaN(actVal) || actVal < 0) {
        penalty += 15;
        findings.push({
          id: `dq-poll-val-${Date.now()}`,
          category: 'DATA_VALIDITY',
          severity: 'CRITICAL',
          title: 'Invalid Discharge/Emission Concentration',
          description: 'Pollution measured concentration must be a non-negative number.',
          affectedFields: ['actualValue', 'quantity'],
          confidence: 0.95,
          recommendedAction: 'Enter calibrated lab measurement or continuous sensor reading.'
        });
      }
      if (data.complianceStatus === 'NON_COMPLIANT' && !data.cause && !data.correctiveAction) {
        penalty += 12;
        findings.push({
          id: `dq-poll-noncomp-${Date.now()}`,
          category: 'PROCESS',
          severity: 'HIGH',
          title: 'Unaddressed Regulatory Exceedance',
          description: 'Non-compliant pollution incident lacks documentation for root cause and corrective action.',
          affectedFields: ['cause', 'correctiveAction'],
          confidence: 0.96,
          recommendedAction: 'Document root cause analysis and immediate corrective actions taken.'
        });
      }
    } else if (modKey === 'biodiversity') {
      const area = parseFloat(data.siteArea !== undefined ? data.siteArea : data.areaHectares);
      if (isNaN(area) || area <= 0) {
        penalty += 15;
        findings.push({
          id: `dq-bio-area-${Date.now()}`,
          category: 'DATA_VALIDITY',
          severity: 'CRITICAL',
          title: 'Invalid Biodiversity Site Area',
          description: 'Site assessment operational area must be a positive number in hectares.',
          affectedFields: ['siteArea'],
          confidence: 0.95,
          recommendedAction: 'Input measured plot or facility surface area in hectares.'
        });
      }
    }

    // 3. Unit Validation against Canonical Registry
    const submittedUnit = (data.unit || data.activityUnit || '').toLowerCase().trim();
    if (submittedUnit && !config.canonicalUnits.some(u => submittedUnit.includes(u.toLowerCase()))) {
      penalty += 5;
      findings.push({
        id: `dq-unit-${Date.now()}`,
        category: 'DATA_VALIDITY',
        severity: 'LOW',
        title: 'Non-Standard Measurement Unit',
        description: `Submitted unit "${submittedUnit}" deviates from canonical units (${config.canonicalUnits.join(', ')}).`,
        affectedFields: data.unit ? ['unit'] : ['activityUnit'],
        confidence: 0.90,
        recommendedAction: `Standardize to standard ${config.defaultUnit} to avoid conversion discrepancies.`
      });
    }

    // 4. Temporal & Period Sanity
    const dateField = data.readingDate || data.periodEnd || data.date || data.assessmentDate;
    if (dateField) {
      const parsedDate = new Date(dateField);
      if (parsedDate > now) {
        penalty += 10;
        findings.push({
          id: `dq-future-${Date.now()}`,
          category: 'DATA_VALIDITY',
          severity: 'HIGH',
          title: 'Post-Dated Observation Date',
          description: `Observation date (${dateField}) occurs in the future.`,
          affectedFields: [data.readingDate ? 'readingDate' : (data.periodEnd ? 'periodEnd' : 'date')],
          confidence: 0.98,
          recommendedAction: 'Correct the observation date to a past or present timestamp.'
        });
      }
    }

    if (data.periodStart && data.periodEnd) {
      if (new Date(data.periodStart) > new Date(data.periodEnd)) {
        penalty += 10;
        findings.push({
          id: `dq-period-inv-${Date.now()}`,
          category: 'DATA_VALIDITY',
          severity: 'HIGH',
          title: 'Inverted Reporting Period Dates',
          description: `Period start date (${data.periodStart}) is after period end date (${data.periodEnd}).`,
          affectedFields: ['periodStart', 'periodEnd'],
          confidence: 0.98,
          recommendedAction: 'Correct the reporting period boundaries.'
        });
      }
    }

    // 5. Duplicate Submission Detection
    if (orgId && data.facilityId && dateField) {
      try {
        const query = {
          organizationId: orgId.toString(),
          facilityId: data.facilityId.toString(),
          status: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'VERIFIED'] }
        };

        if (data._id) query._id = { $ne: data._id };

        if (modKey === 'energy' && data.readingDate) query.readingDate = data.readingDate;
        else if (modKey === 'ghg' && data.periodEnd) {
          query.periodEnd = data.periodEnd;
          if (data.sourceName) query.sourceName = data.sourceName;
        } else if (modKey === 'pollution' && data.date) {
          query.date = data.date;
          if (data.pollutantType) query.pollutantType = data.pollutantType;
        }

        const existingDup = await config.model.findOne(query).lean();
        if (existingDup) {
          penalty += 8;
          findings.push({
            id: `dq-dup-${Date.now()}`,
            category: 'PROCESS',
            severity: 'MEDIUM',
            title: 'Potential Duplicate Submission Identified',
            description: `An authoritative record for this facility and reporting date/period already exists in the system (ID: ${existingDup._id}).`,
            affectedFields: ['facilityId', dateField],
            confidence: 0.88,
            recommendedAction: 'Verify whether this is a revision to existing record or a distinct meter stream.'
          });
        }
      } catch (e) {
        // Query error non-fatal for risk engine
      }
    }

    return {
      score: Math.min(25, penalty),
      findings
    };
  }
}

/**
 * 2. EVIDENCE INTEGRITY SUB-ENGINE (Max 20 pts)
 */
class EvidenceEngine {
  static async evaluate(config, data, orgId) {
    let penalty = 0;
    const findings = [];
    const hasEvidenceId = Boolean(data.evidenceId);
    const hasEvidenceDetails = Boolean(data.evidenceDetails && (data.evidenceDetails.fileName || data.evidenceDetails.id || data.evidenceDetails.filePath));

    // Mandatory Evidence Check
    if (config.evidenceMandatory && !hasEvidenceId && !hasEvidenceDetails) {
      penalty += 20;
      findings.push({
        id: `ev-missing-${Date.now()}`,
        category: 'EVIDENCE',
        severity: 'HIGH',
        title: 'Missing Mandatory Supporting Evidence',
        description: `A verified supporting document (utility invoice, calibrated meter log, or waste manifest) is required for ${config.name} assurance.`,
        affectedFields: ['evidenceId'],
        confidence: 0.95,
        recommendedAction: 'Upload and attach a valid supporting document (.pdf, .png, .jpg, .csv, .xlsx).'
      });
      return { score: Math.min(20, penalty), findings };
    }

    // Evidence Reference Lookup & File Format Integrity
    let resolvedDoc = null;
    if (hasEvidenceId && orgId) {
      try {
        if (mongoose.Types.ObjectId.isValid(data.evidenceId)) {
          resolvedDoc = await Evidence.findOne({
            _id: data.evidenceId,
            organizationId: orgId.toString()
          }).lean();
        } else {
          resolvedDoc = await Evidence.findOne({
            recordId: data.evidenceId.toString(),
            organizationId: orgId.toString()
          }).lean();
        }

        if (!resolvedDoc) {
          penalty += 15;
          findings.push({
            id: `ev-notfound-${Date.now()}`,
            category: 'EVIDENCE',
            severity: 'HIGH',
            title: 'Unresolved Evidence Document Reference',
            description: `Specified evidence document ID "${data.evidenceId}" could not be verified in the organization evidence repository.`,
            affectedFields: ['evidenceId'],
            confidence: 0.95,
            recommendedAction: 'Re-attach valid evidence from the repository or upload a new file.'
          });
        }
      } catch (e) {
        penalty += 15;
        findings.push({
          id: `ev-invalid-id-${Date.now()}`,
          category: 'EVIDENCE',
          severity: 'HIGH',
          title: 'Invalid Evidence Document Reference',
          description: 'Provided evidence reference format is malformed.',
          affectedFields: ['evidenceId'],
          confidence: 0.95,
          recommendedAction: 'Select a valid evidence record from the library.'
        });
      }
    }

    const fileName = (resolvedDoc && resolvedDoc.fileName) || (data.evidenceDetails && data.evidenceDetails.fileName) || '';
    if (fileName) {
      const allowedExts = ['.pdf', '.png', '.jpg', '.jpeg', '.csv', '.xlsx'];
      const fileExtMatch = fileName.toLowerCase().match(/\.[0-9a-z]+$/i);
      const fileExt = fileExtMatch ? fileExtMatch[0] : '';
      if (!allowedExts.includes(fileExt)) {
        penalty += 8;
        findings.push({
          id: `ev-unsupported-ext-${Date.now()}`,
          category: 'EVIDENCE',
          severity: 'MEDIUM',
          title: 'Unsupported Evidence File Format',
          description: `Evidence file "${fileName}" format (${fileExt || 'unknown'}) is not in the approved assurance format list (${allowedExts.join(', ')}).`,
          affectedFields: ['evidenceId'],
          confidence: 0.92,
          recommendedAction: 'Convert supporting file to PDF or accepted image/spreadsheet format.'
        });
      }
    }

    return {
      score: Math.min(20, penalty),
      findings
    };
  }
}

/**
 * 3. HISTORICAL ENGINE & STATISTICAL ANOMALY DETECTOR (Max 25 pts)
 */
class HistoricalEngine {
  static async evaluate(config, data, orgId, facilityId) {
    let penalty = 0;
    const findings = [];
    let anomalyStatus = 'ANALYZED';
    let baselineReference = null;

    if (!orgId || !facilityId) {
      return {
        score: 0,
        findings: [],
        anomalyStatus: 'SKIPPED',
        baselineReference: null
      };
    }

    // Determine current record primary value
    let currentValue = null;
    const modKey = config.key;
    if (modKey === 'energy') {
      const c = parseFloat(data.consumption);
      const curr = parseFloat(data.currentReading);
      const prev = parseFloat(data.previousReading);
      currentValue = !isNaN(c) ? c : (!isNaN(curr) && !isNaN(prev) ? curr - prev : null);
    } else if (modKey === 'ghg') {
      const c = parseFloat(data.calculatedCO2e);
      const act = parseFloat(data.activityValue);
      currentValue = !isNaN(c) ? c : (!isNaN(act) ? act : null);
    } else if (modKey === 'water') {
      const amt = parseFloat(data.amount !== undefined ? data.amount : data.consumption);
      currentValue = !isNaN(amt) ? amt : null;
    } else if (modKey === 'waste') {
      const qty = parseFloat(data.quantity !== undefined ? data.quantity : data.amount);
      currentValue = !isNaN(qty) ? qty : null;
    } else if (modKey === 'pollution') {
      const val = parseFloat(data.actualValue !== undefined ? data.actualValue : data.quantity);
      currentValue = !isNaN(val) ? val : null;
    } else if (modKey === 'biodiversity') {
      const area = parseFloat(data.siteArea !== undefined ? data.siteArea : data.areaHectares);
      currentValue = !isNaN(area) ? area : null;
    }

    if (currentValue === null || isNaN(currentValue)) {
      return {
        score: 0,
        findings: [],
        anomalyStatus: 'INVALID_METRIC',
        baselineReference: null
      };
    }

    // Fetch Authorized Historical Records for (orgId, facilityId)
    let historicalDocs = [];
    try {
      const query = {
        organizationId: orgId.toString(),
        facilityId: facilityId.toString()
      };
      if (data._id) query._id = { $ne: data._id };

      historicalDocs = await config.model.find(query)
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
    } catch (e) {
      // Historical fetch error non-fatal
    }

    // Check sample size constraint (< 3 records)
    if (historicalDocs.length < 3) {
      anomalyStatus = 'INSUFFICIENT_HISTORY';
      findings.push({
        id: `anom-insufficient-${Date.now()}`,
        category: 'ANOMALY',
        severity: 'INFO',
        title: 'Insufficient Historical Baseline',
        description: `Fewer than 3 historical records are available for this facility and module (found: ${historicalDocs.length}). Anomaly detection is paused until a statistically valid baseline is established.`,
        affectedFields: [],
        confidence: 0.75,
        baselineReference: {
          sampleCount: historicalDocs.length,
          minRequired: 3
        },
        recommendedAction: 'Continue populating historical readings to enable automated longitudinal outlier detection.'
      });

      return {
        score: 0,
        findings,
        anomalyStatus,
        baselineReference: { sampleCount: historicalDocs.length, minRequired: 3 }
      };
    }

    // Extract historical metric series
    const series = [];
    for (const doc of historicalDocs) {
      let val = null;
      if (modKey === 'energy') {
        const c = parseFloat(doc.consumption);
        const curr = parseFloat(doc.currentReading);
        const prev = parseFloat(doc.previousReading);
        val = !isNaN(c) ? c : (!isNaN(curr) && !isNaN(prev) ? curr - prev : null);
      } else if (modKey === 'ghg') {
        const c = parseFloat(doc.calculatedCO2e);
        const act = parseFloat(doc.activityValue);
        val = !isNaN(c) ? c : (!isNaN(act) ? act : null);
      } else if (modKey === 'water') {
        const amt = parseFloat(doc.amount !== undefined ? doc.amount : doc.consumption);
        val = !isNaN(amt) ? amt : null;
      } else if (modKey === 'waste') {
        const qty = parseFloat(doc.quantity !== undefined ? doc.quantity : doc.amount);
        val = !isNaN(qty) ? qty : null;
      } else if (modKey === 'pollution') {
        const p = parseFloat(doc.actualValue !== undefined ? doc.actualValue : doc.quantity);
        val = !isNaN(p) ? p : null;
      } else if (modKey === 'biodiversity') {
        const a = parseFloat(doc.siteArea !== undefined ? doc.siteArea : doc.areaHectares);
        val = !isNaN(a) ? a : null;
      }

      if (val !== null && !isNaN(val) && val >= 0) {
        series.push(val);
      }
    }

    if (series.length < 3) {
      return {
        score: 0,
        findings: [],
        anomalyStatus: 'INSUFFICIENT_HISTORY',
        baselineReference: { sampleCount: series.length, minRequired: 3 }
      };
    }

    // Calculate baseline statistics (Mean & Standard Deviation)
    const n = series.length;
    const mean = series.reduce((acc, v) => acc + v, 0) / n;
    const variance = series.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(variance);

    let zScore = 0;
    let pctDiff = 0;
    if (stdDev > 0) {
      zScore = Math.abs(currentValue - mean) / stdDev;
    }
    if (mean > 0) {
      pctDiff = ((currentValue - mean) / mean) * 100;
    }

    baselineReference = {
      mean: Math.round(mean * 100) / 100,
      standardDeviation: Math.round(stdDev * 100) / 100,
      zScore: Math.round(zScore * 100) / 100,
      percentageDivergence: Math.round(pctDiff * 100) / 100,
      sampleCount: n,
      metricField: config.primaryField,
      currentValue
    };

    // Statistical Anomaly Evaluation
    if (zScore >= 3.0 || Math.abs(pctDiff) >= 150) {
      penalty += 25;
      findings.push({
        id: `anom-extreme-${Date.now()}`,
        category: 'ANOMALY',
        severity: 'CRITICAL',
        title: 'Extreme Statistical Anomaly Detected',
        description: `Potential anomaly detected. Value (${currentValue}) is significantly different from the historical baseline (Mean: ${baselineReference.mean}, Z: ${baselineReference.zScore}).`,
        affectedFields: [config.primaryField],
        confidence: 0.92,
        baselineReference,
        recommendedAction: 'Verify input figures against physical meter telemetry, check multiplier settings, or attach operational justification notes.'
      });
    } else if (zScore >= 2.0 || Math.abs(pctDiff) >= 60) {
      penalty += 12;
      findings.push({
        id: `anom-moderate-${Date.now()}`,
        category: 'ANOMALY',
        severity: 'MEDIUM',
        title: 'Elevated Statistical Deviation',
        description: `Potential anomaly detected. Value (${currentValue}) is moderately divergent from historical baseline (Mean: ${baselineReference.mean}, Z: ${baselineReference.zScore}).`,
        affectedFields: [config.primaryField],
        confidence: 0.88,
        baselineReference,
        recommendedAction: 'Confirm meter reading with field operator prior to final verification.'
      });
    }

    return {
      score: Math.min(25, penalty),
      findings,
      anomalyStatus,
      baselineReference
    };
  }
}

/**
 * 4. CROSS-MODULE CONSISTENCY ENGINE (Max 15 pts)
 */
class CrossModuleEngine {
  static async evaluate(config, data, orgId, facilityId) {
    let penalty = 0;
    const findings = [];

    if (!orgId || !facilityId) {
      return { score: 0, findings: [] };
    }

    const modKey = config.key;

    // Rule 1: Energy <-> Scope 2 GHG Emissions Reconciliation
    if (modKey === 'energy' || modKey === 'ghg') {
      try {
        let electricityCons = null;
        let scope2CO2e = null;

        if (modKey === 'energy') {
          const curr = parseFloat(data.currentReading);
          const prev = parseFloat(data.previousReading);
          const c = parseFloat(data.consumption);
          electricityCons = !isNaN(c) ? c : (!isNaN(curr) && !isNaN(prev) ? curr - prev : null);

          // Find counterpart Scope 2 GHG record
          const ghgRecord = await EmissionRecord.findOne({
            organizationId: orgId.toString(),
            facilityId: facilityId.toString(),
            scope: 2
          }).sort({ createdAt: -1 }).lean();

          if (ghgRecord) {
            scope2CO2e = parseFloat(ghgRecord.calculatedCO2e);
          }
        } else if (modKey === 'ghg' && parseInt(data.scope, 10) === 2) {
          scope2CO2e = parseFloat(data.calculatedCO2e);

          // Find counterpart Energy record
          const energyRecord = await ElectricityReading.findOne({
            organizationId: orgId.toString(),
            facilityId: facilityId.toString()
          }).sort({ createdAt: -1 }).lean();

          if (energyRecord) {
            const c = parseFloat(energyRecord.consumption);
            const curr = parseFloat(energyRecord.currentReading);
            const prev = parseFloat(energyRecord.previousReading);
            electricityCons = !isNaN(c) ? c : (!isNaN(curr) && !isNaN(prev) ? curr - prev : null);
          }
        }

        // Only evaluate if authoritative counterpart record actually exists
        if (electricityCons !== null && scope2CO2e !== null && electricityCons > 0 && scope2CO2e > 0) {
          // Standard Grid Baseline: ~0.82 kg CO2e / kWh = 0.00082 tCO2e / kWh
          const expectedCO2e = (electricityCons * 0.82) / 1000;
          const disparityPct = (Math.abs(scope2CO2e - expectedCO2e) / expectedCO2e) * 100;

          if (disparityPct > 45) {
            penalty += 10;
            findings.push({
              id: `cross-energy-ghg-${Date.now()}`,
              category: 'CROSS_MODULE',
              severity: 'MEDIUM',
              title: 'Energy and Scope 2 Emissions Disparity',
              description: `Calculated Scope 2 emissions (${scope2CO2e} tCO2e) diverge by ${Math.round(disparityPct)}% from electricity consumption baseline (${electricityCons} kWh @ 0.82 kg CO2e/kWh standard factor).`,
              affectedFields: modKey === 'energy' ? ['consumption'] : ['calculatedCO2e', 'emissionFactor'],
              confidence: 0.86,
              recommendedAction: 'Reconcile facility electricity billing kWh with Scope 2 emissions activity calculation.'
            });
          }
        }
      } catch (e) {
        // Non-fatal
      }
    }

    // Rule 2: Water Mass Balance: Recycled Water vs Withdrawal
    if (modKey === 'water') {
      try {
        const withdrawal = parseFloat(data.amount !== undefined ? data.amount : data.consumption);
        const recycled = parseFloat(data.recycledAmount !== undefined ? data.recycledAmount : data.recycledVolume);

        if (!isNaN(withdrawal) && !isNaN(recycled) && recycled > withdrawal && withdrawal > 0) {
          penalty += 15;
          findings.push({
            id: `cross-water-balance-${Date.now()}`,
            category: 'CROSS_MODULE',
            severity: 'HIGH',
            title: 'Water Mass Balance Violation',
            description: `Reported recycled water volume (${recycled} m³) exceeds total freshwater withdrawal volume (${withdrawal} m³) for this facility.`,
            affectedFields: ['amount', 'recycledAmount'],
            confidence: 0.94,
            recommendedAction: 'Correct water recycling volume or clarify external circular recycling streams.'
          });
        }
      } catch (e) {
        // Non-fatal
      }
    }

    return {
      score: Math.min(15, penalty),
      findings
    };
  }
}

/**
 * 5. PROCESS & CONFIGURATION RISK SUB-ENGINE (Max 10 pts)
 */
class ProcessRiskEngine {
  static async evaluate(config, data, orgId, facilityId) {
    let penalty = 0;
    const findings = [];

    // 1. Data Source Tier Integrity
    const dqTier = data.dataQuality || 'Actual';
    if (dqTier === 'Estimated') {
      penalty += 5;
      findings.push({
        id: `proc-estimated-${Date.now()}`,
        category: 'PROCESS',
        severity: 'LOW',
        title: 'Estimated Data Tier Utilized',
        description: 'Submission utilizes estimated calculations rather than direct telemetry or verified billing records.',
        affectedFields: ['dataQuality'],
        confidence: 0.90,
        recommendedAction: 'Attach utility billing documentation or replace estimates with metered readings when available.'
      });
    } else if (dqTier === 'Imported') {
      penalty += 3;
      findings.push({
        id: `proc-imported-${Date.now()}`,
        category: 'PROCESS',
        severity: 'LOW',
        title: 'Unverified Batch Import',
        description: 'Imported batch data lacks verified provider signature.',
        affectedFields: ['dataQuality'],
        confidence: 0.88,
        recommendedAction: 'Verify import batch checksum and provider integration log.'
      });
    }

    // 2. Facility Validation
    if (facilityId && orgId) {
      try {
        const facilityExists = await Facility.findOne({
          _id: facilityId.toString(),
          organizationId: orgId.toString()
        }).lean();

        if (!facilityExists && facilityId !== 'fac-main' && !facilityId.startsWith('fac-')) {
          penalty += 4;
          findings.push({
            id: `proc-fac-unresolved-${Date.now()}`,
            category: 'CONFIGURATION',
            severity: 'LOW',
            title: 'Unregistered Facility Identifier',
            description: `Facility ID "${facilityId}" is not registered in the organization registry.`,
            affectedFields: ['facilityId'],
            confidence: 0.85,
            recommendedAction: 'Verify facility assignment against master facilities list.'
          });
        }
      } catch (e) {
        // Non-fatal
      }
    }

    return {
      score: Math.min(10, penalty),
      findings
    };
  }
}

/**
 * MAIN ENVIRONMENTAL RISK ENGINE
 * Reusable, deterministic, explainable, multi-tenant environmental data risk evaluation engine.
 */
class EnvironmentalRiskEngine {
  constructor() {
    this.modelVersion = 'deterministic-v1';
    this.rulesetVersion = 'v1';
    this.engineType = 'deterministic';
    this.activeJobLocks = new Map(); // Concurrency & Idempotency in-flight lock map
  }

  /**
   * Resolve Module
   */
  resolveModule(moduleName) {
    if (!moduleName) throw new Error('Module identifier is required');
    const key = moduleName.toString().toLowerCase().trim();
    if (key === 'emissions') return MODULE_CONFIG.ghg;
    const match = MODULE_CONFIG[key];
    if (!match) {
      throw new Error(`Unsupported environmental module: ${moduleName}. Supported: Energy, GHG, Water, Biodiversity, Waste, Pollution`);
    }
    return match;
  }

  /**
   * Compute Snapshot SHA-256 Hash for Idempotency
   */
  computeSnapshotHash(canonicalData) {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(canonicalData))
      .digest('hex');
  }

  /**
   * Map Severity Score to Severity Bands (0-24 LOW, 25-49 MODERATE, 50-74 HIGH, 75-100 CRITICAL)
   */
  calculateSeverity(score) {
    if (score >= 75) return 'CRITICAL';
    if (score >= 50) return 'HIGH';
    if (score >= 25) return 'MODERATE';
    return 'LOW';
  }

  /**
   * Determine Workflow Guidance Action
   */
  determineWorkflowAction(severity) {
    switch (severity) {
      case 'CRITICAL':
        return 'ENHANCED_REVIEW';
      case 'HIGH':
        return 'CORRECTION_RECOMMENDED';
      case 'MODERATE':
        return 'WARNING';
      case 'LOW':
      default:
        return 'NORMAL_REVIEW';
    }
  }

  /**
   * Execute Multi-Layer Deterministic Risk Analysis
   */
  async analyzeSubmission({
    submissionId,
    recordId,
    module: rawModule,
    data: inputData,
    organizationId,
    facilityId: inputFacilityId,
    user
  }) {
    if (!organizationId) {
      throw new Error('Organization ID context is required for risk analysis');
    }

    const effectiveId = submissionId || recordId || 'DRAFT_CHECK';
    const lockKey = `${organizationId}:${effectiveId}`;

    // Concurrency Lock: Prevent duplicate simultaneous executions on same submission
    if (this.activeJobLocks.has(lockKey)) {
      // Await existing in-flight run
      return await this.activeJobLocks.get(lockKey);
    }

    const analysisPromise = (async () => {
      let resolvedModule = null;
      let record = null;
      let submissionData = inputData ? { ...inputData } : {};

      // 1. Identify module and retrieve existing DB record if ID provided
      if (rawModule) {
        resolvedModule = this.resolveModule(rawModule);
      }

      if (effectiveId !== 'DRAFT_CHECK' && effectiveId !== 'NEW' && effectiveId !== 'draft') {
        const isValidId = mongoose.Types.ObjectId.isValid(effectiveId);
        if (isValidId) {
          try {
            if (resolvedModule) {
              record = await resolvedModule.model.findOne({
                _id: effectiveId,
                organizationId: organizationId.toString()
              }).lean();
            } else {
              for (const key of Object.keys(MODULE_CONFIG)) {
                const conf = MODULE_CONFIG[key];
                const found = await conf.model.findOne({
                  _id: effectiveId,
                  organizationId: organizationId.toString()
                }).lean();
                if (found) {
                  record = found;
                  resolvedModule = conf;
                  break;
                }
              }
            }
          } catch (e) {
            // Non-fatal query error
          }
        }

        if (record) {
          submissionData = { ...record, ...submissionData };
        }
      }

      if (!resolvedModule) {
        throw new Error(`Unable to resolve environmental module for submission ${effectiveId}`);
      }

      // 2. Multi-Tenant Ownership & Facility Restrictions
      const effectiveFacilityId = submissionData.facilityId || inputFacilityId || (user && user.facilityId) || 'fac-main';

      if (user && user.role === 'DATA_ENTRY' && user.facilityId) {
        if (effectiveFacilityId && effectiveFacilityId !== user.facilityId) {
          const err = new Error(`Forbidden: User is restricted to facility ${user.facilityId}`);
          err.statusCode = 403;
          throw err;
        }
      }

      // Canonical Snapshot for Hash
      const canonicalSnapshot = {
        module: resolvedModule.key,
        organizationId: organizationId.toString(),
        facilityId: effectiveFacilityId,
        data: submissionData
      };
      const inputSnapshotHash = this.computeSnapshotHash(canonicalSnapshot);

      // 3. Multi-Engine Pipeline Execution
      const [dqResult, evidenceResult, historicalResult, crossResult, processResult] = await Promise.all([
        DataQualityEngine.evaluate(resolvedModule, submissionData, organizationId),
        EvidenceEngine.evaluate(resolvedModule, submissionData, organizationId),
        HistoricalEngine.evaluate(resolvedModule, submissionData, organizationId, effectiveFacilityId),
        CrossModuleEngine.evaluate(resolvedModule, submissionData, organizationId, effectiveFacilityId),
        ProcessRiskEngine.evaluate(resolvedModule, submissionData, organizationId, effectiveFacilityId)
      ]);

      const componentScores = {
        dataQuality: dqResult.score,
        anomalyDetection: historicalResult.score,
        evidenceIntegrity: evidenceResult.score,
        crossModuleConsistency: crossResult.score,
        processRisk: processResult.score,
        aiContextual: 0 // Strictly 0 in Phase 2 deterministic foundation
      };

      const timestamp = new Date().toISOString();

      const allFindings = [
        ...dqResult.findings,
        ...evidenceResult.findings,
        ...historicalResult.findings,
        ...crossResult.findings,
        ...processResult.findings
      ].map((f, fIdx) => ({
        id: f.id || `fnd-${Date.now()}-${fIdx}`,
        riskAssessmentId: effectiveId.toString(),
        category: f.category,
        severity: f.severity || 'MEDIUM',
        title: f.title,
        description: f.description || f.message || '',
        affectedFields: f.affectedFields || (f.field ? [f.field] : []),
        evidenceReference: f.evidenceReference || null,
        baselineReference: f.baselineReference || null,
        confidence: f.confidence || 0.90,
        recommendedAction: f.recommendedAction || f.suggestedAction || '',
        createdAt: f.createdAt || timestamp
      }));

      // 4. Deterministic Aggregation
      const rawTotal = componentScores.dataQuality +
                       componentScores.anomalyDetection +
                       componentScores.evidenceIntegrity +
                       componentScores.crossModuleConsistency +
                       componentScores.processRisk +
                       componentScores.aiContextual;

      const riskScore = Math.min(100, Math.max(0, Math.round(rawTotal)));
      const severity = this.calculateSeverity(riskScore);
      const workflowAction = this.determineWorkflowAction(severity);

      // Confidence Calculation: Base 95, penalize for missing evidence or incomplete baseline
      let confidence = 95;
      if (historicalResult.anomalyStatus === 'INSUFFICIENT_HISTORY') confidence -= 10;
      if (componentScores.dataQuality > 0) confidence -= Math.min(15, Math.round(componentScores.dataQuality * 0.5));
      if (componentScores.evidenceIntegrity > 0) confidence -= 5;
      confidence = Math.max(60, Math.min(98, confidence));

      // Synthesize Actionable Recommendations
      const recommendations = [];
      if (componentScores.dataQuality > 0) {
        recommendations.push('Rectify identified field format and completeness issues prior to formal review.');
      }
      if (componentScores.evidenceIntegrity > 0) {
        recommendations.push('Attach verified supporting documentation (utility invoice, telemetry log, or waste manifest).');
      }
      if (componentScores.anomalyDetection > 0) {
        recommendations.push('Review statistical deviation from facility baseline and document operational factors causing variance.');
      }
      if (componentScores.crossModuleConsistency > 0) {
        recommendations.push('Reconcile energy and emissions calculations across linked environmental reporting scopes.');
      }
      if (recommendations.length === 0) {
        recommendations.push('Record complies with deterministic validation benchmarks and is ready for reviewer sign-off.');
      }

      // Objective Summary
      let summary = '';
      if (severity === 'LOW') {
        summary = `Deterministic evaluation completed with LOW overall risk score (${riskScore}/100). All mandatory validation benchmarks satisfied.`;
      } else if (severity === 'MODERATE') {
        summary = `Procedural observations detected with MODERATE risk score (${riskScore}/100). Standard assurance review recommended.`;
      } else if (severity === 'HIGH') {
        summary = `Elevated assurance risk detected with HIGH score (${riskScore}/100). Pre-submission corrections recommended for highlighted fields.`;
      } else {
        summary = `CRITICAL assurance risk detected (${riskScore}/100). High probability of verification rejection unless highlighted issues are resolved.`;
      }

      const assessment = {
        submissionId: effectiveId.toString(),
        recordId: effectiveId.toString(),
        environmentalModule: resolvedModule.key,
        module: resolvedModule.key,
        organizationId: organizationId.toString(),
        facilityId: effectiveFacilityId ? effectiveFacilityId.toString() : null,
        riskScore,
        severity,
        confidence,
        status: 'COMPLETED',
        workflowAction,
        componentScores,
        findings: allFindings,
        recommendations,
        summary,
        modelVersion: this.modelVersion,
        rulesetVersion: this.rulesetVersion,
        engineType: this.engineType,
        inputSnapshotHash,
        scannedData: {
          ...submissionData,
          evaluatedAt: timestamp
        },
        userId: user ? (user._id || user.id || '').toString() : null,
        timestamp,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      // 5. Database Persistence & Immutable Audit Trail
      if (effectiveId !== 'DRAFT_CHECK' && effectiveId !== 'draft' && effectiveId !== 'new') {
        try {
          const saved = await RiskAssessment.create(assessment);
          assessment.id = saved._id ? saved._id.toString() : saved.id;

          await AuditLog.create({
            organizationId: organizationId.toString(),
            user: user ? (user.email || user.name || user.id) : 'System',
            action: 'AI_RISK_CHECK',
            module: resolvedModule.name,
            recordId: effectiveId.toString(),
            newValue: JSON.stringify({ riskScore, severity, ruleset: 'v1' }),
            metadata: {
              submissionId: effectiveId.toString(),
              module: resolvedModule.key,
              score: riskScore,
              severity,
              ruleset: 'v1',
              engineType: 'deterministic',
              modelVersion: 'deterministic-v1',
              findingsCount: allFindings.length,
              workflowAction
            },
            timestamp
          });
        } catch (persistErr) {
          console.error('Failed to persist RiskAssessment or AuditLog:', persistErr.message);
        }
      }

      return assessment;
    })();

    // Store in lock map and clean up on completion
    this.activeJobLocks.set(lockKey, analysisPromise);
    try {
      return await analysisPromise;
    } finally {
      this.activeJobLocks.delete(lockKey);
    }
  }

  /**
   * Get Latest Assessment for a Submission/Record
   */
  async getLatestAssessment(moduleKey, recordId, organizationId) {
    if (!recordId) throw new Error('recordId is required');
    const query = {
      $or: [
        { submissionId: recordId.toString() },
        { recordId: recordId.toString() }
      ],
      organizationId: organizationId.toString()
    };
    if (moduleKey) {
      query.module = moduleKey.toLowerCase();
    }
    return await RiskAssessment.findOne(query).sort({ timestamp: -1 });
  }

  /**
   * Get Assessment History
   */
  async getAssessmentHistory(moduleKey, recordId, organizationId) {
    if (!recordId) throw new Error('recordId is required');
    const query = {
      $or: [
        { submissionId: recordId.toString() },
        { recordId: recordId.toString() }
      ],
      organizationId: organizationId.toString()
    };
    if (moduleKey) {
      query.module = moduleKey.toLowerCase();
    }
    return await RiskAssessment.find(query).sort({ timestamp: -1 }).limit(20);
  }
}

module.exports = new EnvironmentalRiskEngine();
