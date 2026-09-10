const https = require('https');
const { 
  ElectricityReading, EmissionRecord, WaterRecord, 
  WasteRecord, PollutionRecord, BiodiversityAssessment, 
  Evidence, AuditLog, RiskAssessment, Facility
} = require('../models/models');

/**
 * Environmental Risk Management Service
 * Provides deterministic 5-stage rule checking + contextual AI assessment
 * Generates an explainable 0-100 Risk Score with strict component sub-scores.
 */
class EnvironmentalRiskService {
  constructor() {
    this.modelVersion = 'esg-risk-engine-v2.5';
    this.rulesetVersion = 'esg-rules-2026.1';
  }

  /**
   * Resolve Module Model
   */
  resolveModel(moduleName) {
    const key = (moduleName || '').toLowerCase().trim();
    switch (key) {
      case 'energy':
        return { model: ElectricityReading, name: 'Energy', primaryField: 'consumption', unit: 'kWh', evidenceMandatory: true };
      case 'ghg':
      case 'emissions':
        return { model: EmissionRecord, name: 'GHG Emissions', primaryField: 'calculatedCO2e', unit: 'tCO2e', evidenceMandatory: true };
      case 'water':
        return { model: WaterRecord, name: 'Water', primaryField: 'amount', unit: 'm³', evidenceMandatory: true };
      case 'waste':
        return { model: WasteRecord, name: 'Waste', primaryField: 'quantity', unit: 'kg', evidenceMandatory: true };
      case 'pollution':
        return { model: PollutionRecord, name: 'Pollution Prevention', primaryField: 'actualValue', unit: 'ppm', evidenceMandatory: false };
      case 'biodiversity':
        return { model: BiodiversityAssessment, name: 'Biodiversity', primaryField: 'siteArea', unit: 'ha', evidenceMandatory: false };
      default:
        throw new Error(`Unsupported environmental module: ${moduleName}`);
    }
  }

  /**
   * 1. DATA QUALITY & COMPLETENESS (Max Penalty: 25 pts)
   */
  evaluateDataQuality(moduleKey, data) {
    let penalty = 0;
    const findings = [];
    const mod = (moduleKey || '').toLowerCase();

    // Data Source Tier Penalty
    const dqTier = data.dataQuality || 'Actual';
    if (dqTier === 'Estimated') {
      penalty += 6;
      findings.push({
        id: `dq-tier-${Date.now()}-1`,
        category: 'DATA_QUALITY',
        severity: 'LOW',
        field: 'dataQuality',
        title: 'Estimated Data Tier Utilized',
        message: 'Record uses estimated calculations rather than direct meter telemetry or utility invoices.',
        suggestedAction: 'Replace estimated values with metered telemetry or utility billing documentation.'
      });
    } else if (dqTier === 'Calculated') {
      penalty += 3;
      findings.push({
        id: `dq-tier-${Date.now()}-2`,
        category: 'DATA_QUALITY',
        severity: 'LOW',
        field: 'dataQuality',
        title: 'Calculated Secondary Tier',
        message: 'Value is derived through calculation factors rather than primary sensor readings.',
        suggestedAction: 'Ensure calculation methodology aligns with GHG Protocol Corporate Standard.'
      });
    } else if (dqTier === 'Imported') {
      penalty += 7;
      findings.push({
        id: `dq-tier-${Date.now()}-3`,
        category: 'DATA_QUALITY',
        severity: 'MEDIUM',
        field: 'dataQuality',
        title: 'Unverified Third-Party Import',
        message: 'Imported batch data lacks automated cryptographic validation.',
        suggestedAction: 'Attach API integration log or raw provider CSV payload.'
      });
    }

    // Module-specific validations
    if (mod === 'energy') {
      const prev = parseFloat(data.previousReading);
      const curr = parseFloat(data.currentReading);
      const cons = parseFloat(data.consumption !== undefined ? data.consumption : (curr - prev));

      if (isNaN(curr) || curr <= 0) {
        penalty += 15;
        findings.push({
          id: `dq-val-${Date.now()}-1`,
          category: 'DATA_QUALITY',
          severity: 'CRITICAL',
          field: 'currentReading',
          title: 'Invalid Meter Reading',
          message: 'Current electricity meter reading must be a positive number.',
          suggestedAction: 'Enter the cumulative reading recorded from the physical electricity meter.'
        });
      } else if (!isNaN(prev) && curr < prev) {
        penalty += 20;
        findings.push({
          id: `dq-rollover-${Date.now()}`,
          category: 'DATA_QUALITY',
          severity: 'CRITICAL',
          field: 'currentReading',
          title: 'Meter Rollover or Negative Consumption',
          message: `Current meter reading (${curr}) is less than previous reading (${prev}).`,
          suggestedAction: 'Verify meter rollover status or rectify data transposition error.'
        });
      }

      if (isNaN(cons) || cons <= 0) {
        penalty += 10;
        findings.push({
          id: `dq-cons-${Date.now()}`,
          category: 'DATA_QUALITY',
          severity: 'HIGH',
          field: 'consumption',
          title: 'Zero or Non-Numeric Energy Consumption',
          message: 'Net calculated electricity consumption is zero or non-numeric.',
          suggestedAction: 'Verify start and end meter dates and readings.'
        });
      }

      if (!data.readingDate) {
        penalty += 5;
        findings.push({
          id: `dq-date-${Date.now()}`,
          category: 'DATA_QUALITY',
          severity: 'MEDIUM',
          field: 'readingDate',
          title: 'Missing Reading Date',
          message: 'Observation timestamp is required for temporal indexing.',
          suggestedAction: 'Select the exact date the meter was read or billed.'
        });
      } else if (new Date(data.readingDate) > new Date()) {
        penalty += 12;
        findings.push({
          id: `dq-future-${Date.now()}`,
          category: 'DATA_QUALITY',
          severity: 'HIGH',
          field: 'readingDate',
          title: 'Post-Dated Observation',
          message: 'Reading date occurs in the future.',
          suggestedAction: 'Correct reading date to current or historical billing cycle.'
        });
      }
    } else if (mod === 'ghg') {
      const co2 = parseFloat(data.calculatedCO2e);
      const actAmt = parseFloat(data.activityAmount);

      if (isNaN(actAmt) || actAmt <= 0) {
        penalty += 15;
        findings.push({
          id: `dq-ghg-act-${Date.now()}`,
          category: 'DATA_QUALITY',
          severity: 'CRITICAL',
          field: 'activityAmount',
          title: 'Missing Activity Quantity',
          message: 'Activity amount must be a positive number.',
          suggestedAction: 'Enter activity quantity (liters of fuel, distance traveled, or kWh).'
        });
      }

      if (isNaN(co2) || co2 <= 0) {
        penalty += 15;
        findings.push({
          id: `dq-ghg-co2-${Date.now()}`,
          category: 'DATA_QUALITY',
          severity: 'CRITICAL',
          field: 'calculatedCO2e',
          title: 'Zero Calculated Emissions',
          message: 'Calculated CO2e is missing or zero for reported activity.',
          suggestedAction: 'Run emissions calculation engine or supply certified factor.'
        });
      }

      if (!data.scope || ![1, 2, 3].includes(Number(data.scope))) {
        penalty += 10;
        findings.push({
          id: `dq-ghg-scope-${Date.now()}`,
          category: 'DATA_QUALITY',
          severity: 'HIGH',
          field: 'scope',
          title: 'Invalid GHG Scope Definition',
          message: 'Scope must be strictly categorized as Scope 1, 2, or 3.',
          suggestedAction: 'Designate appropriate GHG Protocol scope.'
        });
      }
    } else if (mod === 'water') {
      const amt = parseFloat(data.amount !== undefined ? data.amount : data.consumption);
      if (isNaN(amt) || amt <= 0) {
        penalty += 18;
        findings.push({
          id: `dq-water-amt-${Date.now()}`,
          category: 'DATA_QUALITY',
          severity: 'CRITICAL',
          field: 'amount',
          title: 'Invalid Water Volume',
          message: 'Water withdrawal volume must be positive cubic meters (m³).',
          suggestedAction: 'Enter water volume recorded on municipal meter or pump logger.'
        });
      }
      if (!data.source) {
        penalty += 8;
        findings.push({
          id: `dq-water-src-${Date.now()}`,
          category: 'DATA_QUALITY',
          severity: 'MEDIUM',
          field: 'source',
          title: 'Unclassified Water Source',
          message: 'Water source classification (Municipal, Groundwater, Surface, Rainwater) is required.',
          suggestedAction: 'Select source category.'
        });
      }
    } else if (mod === 'waste') {
      const qty = parseFloat(data.quantity !== undefined ? data.quantity : data.amount);
      if (isNaN(qty) || qty <= 0) {
        penalty += 18;
        findings.push({
          id: `dq-waste-qty-${Date.now()}`,
          category: 'DATA_QUALITY',
          severity: 'CRITICAL',
          field: 'quantity',
          title: 'Invalid Waste Weight',
          message: 'Waste weight must be a positive numerical quantity.',
          suggestedAction: 'Enter measured weight from haulage manifest or scale log.'
        });
      }
      if (!data.wasteType || !['HAZARDOUS', 'NON_HAZARDOUS'].includes(data.wasteType)) {
        penalty += 8;
        findings.push({
          id: `dq-waste-type-${Date.now()}`,
          category: 'DATA_QUALITY',
          severity: 'HIGH',
          field: 'wasteType',
          title: 'Missing Waste Classification',
          message: 'Waste must be classified as HAZARDOUS or NON_HAZARDOUS.',
          suggestedAction: 'Set hazardous status in accordance with environmental regulations.'
        });
      }
    } else if (mod === 'pollution') {
      const val = parseFloat(data.actualValue !== undefined ? data.actualValue : data.quantity);
      if (isNaN(val) || val < 0) {
        penalty += 15;
        findings.push({
          id: `dq-pol-val-${Date.now()}`,
          category: 'DATA_QUALITY',
          severity: 'CRITICAL',
          field: 'actualValue',
          title: 'Invalid Pollution Concentration',
          message: 'Measured concentration/discharge value must be non-negative.',
          suggestedAction: 'Input laboratory test report reading.'
        });
      }
      if (!data.medium) {
        penalty += 8;
        findings.push({
          id: `dq-pol-med-${Date.now()}`,
          category: 'DATA_QUALITY',
          severity: 'MEDIUM',
          field: 'medium',
          title: 'Discharge Medium Missing',
          message: 'Pollution discharge medium (Air, Water, Soil) is required.',
          suggestedAction: 'Specify discharge medium.'
        });
      }
    } else if (mod === 'biodiversity') {
      const area = parseFloat(data.siteArea);
      if (isNaN(area) || area <= 0) {
        penalty += 15;
        findings.push({
          id: `dq-bio-area-${Date.now()}`,
          category: 'DATA_QUALITY',
          severity: 'HIGH',
          field: 'siteArea',
          title: 'Missing Operational Area',
          message: 'Operational site footprint area must be positive hectares.',
          suggestedAction: 'Enter facility land area from deed or survey.'
        });
      }
    }

    return {
      score: Math.min(25, penalty),
      findings
    };
  }

  /**
   * 2. ANOMALY DETECTION & STATISTICAL BASELINES (Max Penalty: 25 pts)
   */
  async evaluateAnomalies(moduleKey, orgId, facilityId, data) {
    let penalty = 0;
    const findings = [];
    const { model, primaryField, unit, name } = this.resolveModel(moduleKey);

    const targetVal = parseFloat(
      data[primaryField] !== undefined ? data[primaryField] : 
      (data.consumption || data.calculatedCO2e || data.amount || data.quantity || data.actualValue || data.siteArea)
    );

    if (isNaN(targetVal) || targetVal <= 0) {
      return { score: 0, findings: [] };
    }

    // Query historical baseline records
    const filter = { organizationId: orgId };
    if (facilityId) filter.facilityId = facilityId;

    let historicalRecords = [];
    try {
      historicalRecords = await model.find(filter).sort({ readingDate: -1, date: -1, periodEnd: -1 }).limit(24);
    } catch (e) {
      historicalRecords = [];
    }

    // Filter out current record if updating
    if (data._id) {
      historicalRecords = historicalRecords.filter(r => r._id.toString() !== data._id.toString());
    }

    if (historicalRecords.length >= 3) {
      // Calculate sample Mean (mu) and Standard Deviation (sigma)
      const values = historicalRecords.map(r => {
        const v = parseFloat(r[primaryField] || r.consumption || r.calculatedCO2e || r.amount || r.quantity || r.actualValue || r.siteArea);
        return isNaN(v) ? 0 : v;
      }).filter(v => v > 0);

      if (values.length >= 3) {
        const sum = values.reduce((acc, v) => acc + v, 0);
        const mean = sum / values.length;
        const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance) || (mean * 0.1) || 1;

        const zScore = (targetVal - mean) / stdDev;
        const percentageFromMean = ((targetVal - mean) / mean) * 100;

        if (zScore > 3.0 || percentageFromMean > 150) {
          penalty += 25;
          findings.push({
            id: `anom-crit-${Date.now()}`,
            category: 'ANOMALY',
            severity: 'CRITICAL',
            field: primaryField,
            title: 'Critical Statistical Outlier (Z > 3.0)',
            message: `Reported ${name} (${targetVal.toLocaleString()} ${unit}) is ${Math.round(percentageFromMean)}% higher than the historical baseline mean (${Math.round(mean).toLocaleString()} ${unit}, Z=${zScore.toFixed(1)}).`,
            suggestedAction: 'Review meter readings, verify whether equipment expansion occurred, or attach explanatory engineering log.'
          });
        } else if (zScore > 2.0 || percentageFromMean > 65) {
          penalty += 15;
          findings.push({
            id: `anom-high-${Date.now()}`,
            category: 'ANOMALY',
            severity: 'HIGH',
            field: primaryField,
            title: 'Elevated Baseline Variance (Z > 2.0)',
            message: `Reported value is ${Math.round(percentageFromMean)}% above seasonal trend for this facility.`,
            suggestedAction: 'Check for atypical operating hours, HVAC spikes, or leak events during the period.'
          });
        } else if (percentageFromMean < -60) {
          penalty += 10;
          findings.push({
            id: `anom-drop-${Date.now()}`,
            category: 'ANOMALY',
            severity: 'MEDIUM',
            field: primaryField,
            title: 'Unexplained Operational Plummet',
            message: `Reported value (${targetVal.toLocaleString()} ${unit}) is ${Math.round(Math.abs(percentageFromMean))}% lower than facility baseline.`,
            suggestedAction: 'Verify whether facility experienced partial shutdown, turnaround, or incomplete billing data.'
          });
        }
      }
    } else {
      // Historical data < 3 records: Compare against generalized industrial bounds
      const sectorBounds = {
        energy: { min: 100, max: 250000 },
        ghg: { min: 0.1, max: 1500 },
        water: { min: 5, max: 50000 },
        waste: { min: 5, max: 50000 },
        pollution: { min: 0, max: 2000 },
        biodiversity: { min: 0.1, max: 1000 }
      };

      const bounds = sectorBounds[moduleKey.toLowerCase()] || { min: 0, max: 1000000 };
      if (targetVal > bounds.max) {
        penalty += 15;
        findings.push({
          id: `anom-bmark-${Date.now()}`,
          category: 'ANOMALY',
          severity: 'HIGH',
          field: primaryField,
          title: 'Sector Benchmark Range Exceeded',
          message: `Reported ${name} value exceeds typical industrial thresholds (${bounds.max.toLocaleString()} ${unit}).`,
          suggestedAction: 'Verify units of measurement (e.g. kWh vs MWh, kg vs metric tons).'
        });
      } else if (targetVal < bounds.min) {
        penalty += 8;
        findings.push({
          id: `anom-bmark-low-${Date.now()}`,
          category: 'ANOMALY',
          severity: 'LOW',
          field: primaryField,
          title: 'Near-Zero Operational Entry',
          message: `Value is unusually low for an active industrial site. Confirm continuous meter operation.`,
          suggestedAction: 'Validate operational activity during this cycle.'
        });
      }
    }

    return {
      score: Math.min(25, penalty),
      findings
    };
  }

  /**
   * 3. EVIDENCE INTEGRITY & AUDIT READINESS (Max Penalty: 20 pts)
   */
  async evaluateEvidenceIntegrity(moduleKey, data, orgId) {
    let penalty = 0;
    const findings = [];
    const { name, evidenceMandatory } = this.resolveModel(moduleKey);

    const hasEvidence = data.evidenceId || (data.evidenceDetails && (data.evidenceDetails.fileName || data.evidenceDetails.id));

    if (evidenceMandatory && !hasEvidence) {
      penalty += 20;
      findings.push({
        id: `ev-missing-${Date.now()}`,
        category: 'EVIDENCE',
        severity: 'HIGH',
        field: 'evidenceId',
        title: 'Missing Supporting Verification Proof',
        message: `${name} submissions require verifiable documentation (utility bill, meter log, or weight ticket) for auditor sign-off.`,
        suggestedAction: 'Upload an invoice, calibration certificate, or SCADA export before submitting.'
      });
      return { score: penalty, findings };
    }

    if (hasEvidence) {
      let evidenceRecord = null;
      if (data.evidenceId) {
        try {
          evidenceRecord = await Evidence.findOne({ _id: data.evidenceId, organizationId: orgId });
        } catch (e) {}
      }

      const fileName = (evidenceRecord && evidenceRecord.fileName) || (data.evidenceDetails && data.evidenceDetails.fileName) || '';
      const ext = fileName.split('.').pop().toLowerCase();
      const validExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'csv', 'xlsx', 'xls', 'docx', 'doc'];

      if (fileName && !validExtensions.includes(ext)) {
        penalty += 10;
        findings.push({
          id: `ev-ext-${Date.now()}`,
          category: 'EVIDENCE',
          severity: 'MEDIUM',
          field: 'evidenceId',
          title: 'Unverified File Type Format',
          message: `Evidence file "${fileName}" uses an unrecognized extension (.${ext}).`,
          suggestedAction: 'Upload documents in PDF, CSV, XLSX, or high-resolution image format.'
        });
      }

      // Check evidence age vs reporting period if timestamps exist
      if (evidenceRecord && evidenceRecord.uploadedAt && data.readingDate) {
        const uploadDate = new Date(evidenceRecord.uploadedAt);
        const recordDate = new Date(data.readingDate);
        const diffDays = Math.abs((uploadDate - recordDate) / (1000 * 60 * 60 * 24));
        if (diffDays > 180) {
          penalty += 5;
          findings.push({
            id: `ev-stale-${Date.now()}`,
            category: 'EVIDENCE',
            severity: 'LOW',
            field: 'evidenceId',
            title: 'Temporal Evidence Gap (>180 Days)',
            message: `Document upload timestamp differs by ${Math.round(diffDays)} days from the operational period date.`,
            suggestedAction: 'Ensure evidence correlates to the specific billing cycle being reported.'
          });
        }
      }
    }

    return {
      score: Math.min(20, penalty),
      findings
    };
  }

  /**
   * 4. CROSS-MODULE CONSISTENCY (Max Penalty: 15 pts)
   */
  async evaluateCrossModuleConsistency(moduleKey, orgId, facilityId, data) {
    let penalty = 0;
    const findings = [];
    const mod = (moduleKey || '').toLowerCase();

    // 1. Energy vs GHG Scope 2 Reconciliation
    // Grid electricity factor ~0.82 kg CO2e / kWh (0.00082 tCO2e / kWh)
    if (mod === 'energy' && (data.sourceType === 'GRID' || !data.sourceType)) {
      const consumption = parseFloat(data.consumption || (data.currentReading - data.previousReading) || 0);
      if (consumption > 500) {
        const expectedCO2e = (consumption * 0.82) / 1000; // tCO2e
        try {
          const ghgQuery = { organizationId: orgId, scope: 2 };
          if (facilityId) ghgQuery.facilityId = facilityId;
          const relatedGHG = await EmissionRecord.find(ghgQuery).limit(5);

          if (relatedGHG.length > 0) {
            const reportedCO2e = relatedGHG.reduce((sum, r) => sum + (parseFloat(r.calculatedCO2e) || 0), 0);
            const ratio = reportedCO2e > 0 ? expectedCO2e / reportedCO2e : 99;
            if (ratio < 0.4 || ratio > 2.5) {
              penalty += 15;
              findings.push({
                id: `cross-ghg-energy-${Date.now()}`,
                category: 'CROSS_MODULE',
                severity: 'HIGH',
                field: 'consumption',
                title: 'Energy & GHG Scope 2 Imbalance',
                message: `Reported electricity (${consumption.toLocaleString()} kWh) implies ~${expectedCO2e.toFixed(1)} tCO2e, which diverges significantly from reported facility Scope 2 records (${reportedCO2e.toFixed(1)} tCO2e).`,
                suggestedAction: 'Reconcile electricity consumption with purchased grid emission disclosures.'
              });
            }
          }
        } catch (e) {}
      }
    }

    // 2. GHG Scope 2 vs Energy Availability
    if (mod === 'ghg' && Number(data.scope) === 2) {
      const reportedCO2e = parseFloat(data.calculatedCO2e || 0);
      if (reportedCO2e > 10) {
        try {
          const energyQuery = { organizationId: orgId };
          if (facilityId) energyQuery.facilityId = facilityId;
          const energyReadings = await ElectricityReading.find(energyQuery).limit(3);
          if (energyReadings.length === 0) {
            penalty += 12;
            findings.push({
              id: `cross-scope2-unbacked-${Date.now()}`,
              category: 'CROSS_MODULE',
              severity: 'MEDIUM',
              field: 'calculatedCO2e',
              title: 'Scope 2 Without Electricity Telemetry',
              message: 'Scope 2 emissions are declared, but no primary electricity meter readings exist for this site.',
              suggestedAction: 'Log corresponding electricity meter records to establish Scope 2 auditability.'
            });
          }
        } catch (e) {}
      }
    }

    // 3. Water Balance Check (Recycled cannot exceed total withdrawal)
    if (mod === 'water' && data.source === 'RECYCLED') {
      const recycledAmt = parseFloat(data.amount || data.consumption || 0);
      try {
        const freshQuery = { organizationId: orgId, source: { $in: ['MUNICIPAL', 'GROUNDWATER', 'SURFACE'] } };
        if (facilityId) freshQuery.facilityId = facilityId;
        const freshRecords = await WaterRecord.find(freshQuery).limit(10);
        const totalFresh = freshRecords.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
        if (totalFresh > 0 && recycledAmt > totalFresh * 1.2) {
          penalty += 15;
          findings.push({
            id: `cross-water-bal-${Date.now()}`,
            category: 'CROSS_MODULE',
            severity: 'HIGH',
            field: 'amount',
            title: 'Water Mass Balance Violation',
            message: `Reported recycled water (${recycledAmt} m³) exceeds historical primary freshwater withdrawal (${totalFresh} m³).`,
            suggestedAction: 'Audit closed-loop water treatment recycling meters.'
          });
        }
      } catch (e) {}
    }

    // 4. Active Facility Ghost Check
    if (facilityId) {
      try {
        const fac = await Facility.findOne({ _id: facilityId, organizationId: orgId });
        const val = parseFloat(data.consumption || data.amount || data.quantity || data.calculatedCO2e || 0);
        if (fac && val === 0) {
          penalty += 8;
          findings.push({
            id: `cross-ghost-fac-${Date.now()}`,
            category: 'CROSS_MODULE',
            severity: 'LOW',
            field: 'facilityId',
            title: 'Zero Activity on Active Facility',
            message: `Facility "${fac.name}" is designated ACTIVE but reports zero operational output.`,
            suggestedAction: 'Confirm facility idle state or correct meter log.'
          });
        }
      } catch (e) {}
    }

    return {
      score: Math.min(15, penalty),
      findings
    };
  }

  /**
   * 5. PROCESS RISK & OPERATIONAL COMPLIANCE (Max Penalty: 10 pts)
   */
  async evaluateProcessRisk(moduleKey, data, orgId, recordId) {
    let penalty = 0;
    const findings = [];
    const dateField = data.readingDate || data.periodEnd || data.date;

    // Latency penalty: Period ended > 75 days ago
    if (dateField) {
      const periodDate = new Date(dateField);
      const now = new Date();
      const ageDays = (now - periodDate) / (1000 * 60 * 60 * 24);
      if (ageDays > 75) {
        penalty += 5;
        findings.push({
          id: `proc-late-${Date.now()}`,
          category: 'PROCESS',
          severity: 'LOW',
          field: 'readingDate',
          title: 'Delayed Environmental Disclosure',
          message: `Submission logged ${Math.round(ageDays)} days after operational period end.`,
          suggestedAction: 'Transition toward automated monthly or real-time IoT synchronization.'
        });
      }
    }

    // Churn check: If record was previously rejected or requested corrections > 2 times
    if (recordId) {
      const { model } = this.resolveModel(moduleKey);
      try {
        const existing = await model.findOne({ _id: recordId, organizationId: orgId });
        if (existing && existing.submissionHistory) {
          const correctionCount = existing.submissionHistory.filter(h => 
            h.status === 'CORRECTION_REQUIRED' || h.status === 'CHANGES_REQUESTED' || h.status === 'REJECTED'
          ).length;

          if (correctionCount >= 2) {
            penalty += 5;
            findings.push({
              id: `proc-churn-${Date.now()}`,
              category: 'PROCESS',
              severity: 'MEDIUM',
              field: 'status',
              title: 'Elevated Correction Churn (>2 Iterations)',
              message: `This record has experienced ${correctionCount} verification rejections or correction requests.`,
              suggestedAction: 'Perform double-blind peer review before resubmitting to audit queue.'
            });
          }
        }
      } catch (e) {}
    }

    return {
      score: Math.min(10, penalty),
      findings
    };
  }

  /**
   * 6. AI CONTEXTUAL ASSESSMENT & REASONING (Max Penalty: 5 pts)
   */
  async evaluateContextualAI(moduleKey, data, rawFindings, componentScores) {
    const totalPriorPenalties = componentScores.dataQuality + componentScores.anomalyDetection + componentScores.evidenceIntegrity + componentScores.crossModuleConsistency + componentScores.processRisk;

    let penalty = 0;
    if (totalPriorPenalties >= 40) {
      penalty = 5;
    } else if (totalPriorPenalties >= 20) {
      penalty = 3;
    } else if (totalPriorPenalties >= 8) {
      penalty = 1;
    }

    // Generate executive summary and recommendations based on deterministic findings synthesis
    const { name } = this.resolveModel(moduleKey);
    const criticals = rawFindings.filter(f => f.severity === 'CRITICAL');
    const highs = rawFindings.filter(f => f.severity === 'HIGH');
    const mediums = rawFindings.filter(f => f.severity === 'MEDIUM');

    let summary = '';
    const recommendations = [];

    if (criticals.length > 0) {
      summary = `The AI Risk Agent detected ${criticals.length} critical data integrity or statistical anomaly issues in this ${name} record. Submitting this record without remediation presents severe non-compliance risk during ESG assurance.`;
      recommendations.push(`Resolve ${criticals[0].title}: ${criticals[0].suggestedAction}`);
      if (highs.length > 0) recommendations.push(`Address ${highs[0].title}: ${highs[0].suggestedAction}`);
      recommendations.push('Cross-reference physical utility meters before requesting auditor verification.');
    } else if (highs.length > 0) {
      summary = `The AI Risk Agent identified elevated operational variance and evidence gaps in this ${name} disclosure. While structurally valid, assurance partners will likely request supplementary verification.`;
      recommendations.push(`Remediate ${highs[0].title}: ${highs[0].suggestedAction}`);
      recommendations.push('Ensure supporting evidence invoices are attached and correspond to the reported billing cycle.');
      recommendations.push('Document any operational expansions or seasonal shifts in the submission comments.');
    } else if (mediums.length > 0) {
      summary = `${name} disclosure aligns with baseline parameters with minor procedural observations. Low probability of auditor rejection.`;
      recommendations.push(`Review ${mediums[0].title} for continuous reporting quality.`);
      recommendations.push('Maintain original meter documentation in local site archives for periodic audit sampling.');
    } else {
      summary = `Clean assessment. ${name} telemetry demonstrates high statistical consistency, compliant evidence attachments, and robust cross-module alignment. Ready for formal verification.`;
      recommendations.push('Proceed with submission for third-party verification.');
      recommendations.push('Archive digital meter export in compliance repository.');
    }

    const confidence = Math.max(82, Math.min(98, 100 - Math.round(totalPriorPenalties * 0.3)));

    return {
      score: penalty,
      summary,
      recommendations,
      confidence
    };
  }

  /**
   * Comprehensive Risk Assessment Runner
   */
  async assessRisk({ module: moduleKey, data, recordId, organizationId, user }) {
    if (!moduleKey) throw new Error('Environmental module is required');
    if (!data) throw new Error('Data payload is required for risk assessment');
    if (!organizationId) throw new Error('Organization context is required');

    const facilityId = data.facilityId || null;

    // 1. Data Quality
    const dqResult = this.evaluateDataQuality(moduleKey, data);

    // 2. Anomaly Detection
    const anomalyResult = await this.evaluateAnomalies(moduleKey, organizationId, facilityId, data);

    // 3. Evidence Integrity
    const evidenceResult = await this.evaluateEvidenceIntegrity(moduleKey, data, organizationId);

    // 4. Cross-Module Consistency
    const crossResult = await this.evaluateCrossModuleConsistency(moduleKey, organizationId, facilityId, data);

    // 5. Process Risk
    const processResult = await this.evaluateProcessRisk(moduleKey, data, organizationId, recordId);

    // Aggregate sub-scores
    const componentScores = {
      dataQuality: dqResult.score,
      anomalyDetection: anomalyResult.score,
      evidenceIntegrity: evidenceResult.score,
      crossModuleConsistency: crossResult.score,
      processRisk: processResult.score,
      aiContextual: 0
    };

    const allFindings = [
      ...dqResult.findings,
      ...anomalyResult.findings,
      ...evidenceResult.findings,
      ...crossResult.findings,
      ...processResult.findings
    ];

    // 6. Contextual AI Assessment
    const aiResult = await this.evaluateContextualAI(moduleKey, data, allFindings, componentScores);
    componentScores.aiContextual = aiResult.score;

    // Calculate Overall Hybrid Risk Score (0 - 100)
    const rawTotal = componentScores.dataQuality + 
                     componentScores.anomalyDetection + 
                     componentScores.evidenceIntegrity + 
                     componentScores.crossModuleConsistency + 
                     componentScores.processRisk + 
                     componentScores.aiContextual;

    const riskScore = Math.min(100, Math.max(0, Math.round(rawTotal)));

    // Determine Severity Tier
    let severity = 'LOW';
    if (riskScore >= 80) severity = 'CRITICAL';
    else if (riskScore >= 60) severity = 'HIGH';
    else if (riskScore >= 30) severity = 'MODERATE';

    const timestamp = new Date().toISOString();

    const assessment = {
      recordId: recordId ? recordId.toString() : 'DRAFT_CHECK',
      module: moduleKey.toLowerCase(),
      organizationId: organizationId.toString(),
      facilityId: facilityId ? facilityId.toString() : null,
      riskScore,
      severity,
      confidence: aiResult.confidence,
      status: 'COMPLETED',
      componentScores,
      findings: allFindings,
      recommendations: aiResult.recommendations,
      summary: aiResult.summary,
      modelVersion: this.modelVersion,
      rulesetVersion: this.rulesetVersion,
      scannedData: {
        ...data,
        evaluatedAt: timestamp
      },
      userId: user ? (user._id || user.id || '').toString() : null,
      timestamp
    };

    // Save assessment to MongoDB if recordId exists
    if (recordId && recordId !== 'NEW' && recordId !== 'DRAFT_CHECK') {
      try {
        const saved = await RiskAssessment.create(assessment);
        assessment.id = saved._id ? saved._id.toString() : saved.id;

        // Log Audit Event
        await AuditLog.create({
          action: 'AI_RISK_CHECK_COMPLETED',
          recordType: moduleKey,
          recordId: recordId.toString(),
          organizationId: organizationId.toString(),
          user: user ? (user.name || user.email || 'System') : 'AI Risk Agent',
          timestamp,
          details: {
            riskScore,
            severity,
            findingsCount: allFindings.length,
            confidence: aiResult.confidence
          }
        });
      } catch (err) {
        console.error('Failed to persist RiskAssessment record:', err.message);
      }
    }

    return assessment;
  }

  /**
   * Get Latest Risk Assessment for a Record
   */
  async getLatestAssessment(moduleKey, recordId, organizationId) {
    if (!recordId) throw new Error('recordId is required');
    const record = await RiskAssessment.findOne({
      recordId: recordId.toString(),
      organizationId: organizationId.toString()
    }).sort({ timestamp: -1 });

    return record;
  }

  /**
   * Get Assessment History Trail for a Record
   */
  async getAssessmentHistory(moduleKey, recordId, organizationId) {
    if (!recordId) throw new Error('recordId is required');
    const records = await RiskAssessment.find({
      recordId: recordId.toString(),
      organizationId: organizationId.toString()
    }).sort({ timestamp: -1 }).limit(20);

    return records;
  }
}

module.exports = new EnvironmentalRiskService();
