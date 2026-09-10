const { 
  ElectricityReading, EmissionRecord, WaterRecord, 
  BiodiversityAssessment, WasteRecord, PollutionRecord, 
  Evidence, AuditLog, Notification 
} = require('../models/models');

/**
 * Environmental Module Mapping
 */
const MODULE_MODEL_MAP = {
  energy: { model: ElectricityReading, name: 'Energy', evidenceMandatory: true },
  ghg: { model: EmissionRecord, name: 'GHG Emissions', evidenceMandatory: true },
  water: { model: WaterRecord, name: 'Water', evidenceMandatory: true },
  biodiversity: { model: BiodiversityAssessment, name: 'Biodiversity', evidenceMandatory: false },
  waste: { model: WasteRecord, name: 'Waste', evidenceMandatory: true },
  pollution: { model: PollutionRecord, name: 'Pollution Prevention', evidenceMandatory: false }
};

function resolveModule(moduleName) {
  if (!moduleName) throw new Error('Module name is required');
  const key = moduleName.toString().toLowerCase().trim();
  if (key === 'emissions') return MODULE_MODEL_MAP.ghg;
  const match = MODULE_MODEL_MAP[key];
  if (!match) {
    throw new Error(`Unsupported environmental module: ${moduleName}. Supported: Energy, GHG, Water, Biodiversity, Waste, Pollution`);
  }
  return match;
}

/**
 * Check if a role has verification/review privileges
 */
function isReviewerRole(role) {
  const privileged = ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'VERIFIER', 'AUDITOR', 'REGISTRY'];
  return privileged.includes(role);
}

/**
 * Pre-submission & Pre-draft Validation Engine
 */
async function validateRecord(moduleKey, data, { isDraft = false } = {}) {
  const { name, evidenceMandatory } = resolveModule(moduleKey);
  const issues = [];

  if (!data.organizationId) {
    issues.push('Organization context is required');
  }

  // If Draft mode, perform basic structural validation without blocking on optional/evidence fields
  if (isDraft) {
    if (data.consumption !== undefined && isNaN(Number(data.consumption))) {
      issues.push('Consumption must be a valid numerical value');
    }
    if (data.amount !== undefined && isNaN(Number(data.amount))) {
      issues.push('Amount must be a valid numerical value');
    }
    if (data.quantity !== undefined && isNaN(Number(data.quantity))) {
      issues.push('Quantity must be a valid numerical value');
    }
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  // --- Strict Validation Before Submission ---
  const modLower = moduleKey.toLowerCase();

  // 1. Module-specific checks
  if (modLower === 'energy') {
    if (!data.readingDate) issues.push('Reading date is required');
    if (!data.reportingPeriod) issues.push('Reporting period (Monthly, Quarterly, Yearly) is required');
    
    const curr = Number(data.currentReading);
    const prev = Number(data.previousReading);
    const directConsumption = Number(data.consumption);

    if (isNaN(curr) && isNaN(directConsumption)) {
      issues.push('Current meter reading or direct consumption is required');
    }
    if (!isNaN(curr) && !isNaN(prev) && curr < prev && isNaN(directConsumption)) {
      issues.push('Current reading cannot be lower than previous reading');
    }
    if (!isNaN(directConsumption) && directConsumption < 0) {
      issues.push('Energy consumption cannot be negative');
    }
  } else if (modLower === 'ghg' || modLower === 'emissions') {
    if (!data.scope || ![1, 2, 3].includes(Number(data.scope))) {
      issues.push('Scope must be 1, 2, or 3');
    }
    if (!data.sourceName) issues.push('Source name / fuel type is required');
    const val = Number(data.activityValue);
    if (isNaN(val) || val <= 0) {
      issues.push('Activity data value must be a positive number');
    }
    if (!data.activityUnit) issues.push('Activity measurement unit is required');
    if (!data.reportingPeriod) issues.push('Reporting period is required');
    if (!data.periodEnd) issues.push('Period date is required');
  } else if (modLower === 'water') {
    if (!data.source) issues.push('Water source is required');
    const amt = Number(data.amount !== undefined ? data.amount : data.consumption);
    if (isNaN(amt) || amt <= 0) {
      issues.push('Water quantity must be a positive number (m³)');
    }
    if (!data.reportingPeriod) issues.push('Reporting period is required');
    if (!data.periodEnd && !data.periodStart) issues.push('Reporting period date is required');
  } else if (modLower === 'waste') {
    if (!data.category) issues.push('Waste category is required');
    if (!data.wasteType || !['HAZARDOUS', 'NON_HAZARDOUS'].includes(data.wasteType)) {
      issues.push('Waste type must be HAZARDOUS or NON_HAZARDOUS');
    }
    const qty = Number(data.quantity !== undefined ? data.quantity : data.amount);
    if (isNaN(qty) || qty <= 0) {
      issues.push('Waste quantity must be a positive number');
    }
    if (!data.disposalMethod) issues.push('Disposal / diversion method is required');
    if (!data.reportingPeriod) issues.push('Reporting period is required');
  } else if (modLower === 'pollution') {
    if (!data.medium || !['Air', 'Water', 'Soil', 'Incident'].includes(data.medium)) {
      issues.push('Pollution medium (Air, Water, Soil, Incident) is required');
    }
    if (!data.pollutantType) issues.push('Pollutant identifier / type is required');
    const actualVal = Number(data.actualValue !== undefined ? data.actualValue : data.quantity);
    if (isNaN(actualVal) || actualVal < 0) {
      issues.push('Measured emission / discharge value must be a non-negative number');
    }
    if (!data.date) issues.push('Observation date is required');
    if (data.complianceStatus === 'NON_COMPLIANT' && !data.cause && !data.correctiveAction) {
      issues.push('Non-compliant incidents require an identified cause or corrective action');
    }
  } else if (modLower === 'biodiversity') {
    const area = Number(data.siteArea);
    if (isNaN(area) || area <= 0) {
      issues.push('Site operational area must be a positive number in hectares');
    }
    if (!data.environmentalSensitivity) {
      issues.push('Environmental sensitivity classification is required');
    }
  }

  // 2. Mandatory Evidence Verification
  if (evidenceMandatory) {
    const hasEvidence = data.evidenceId || (data.evidenceDetails && (data.evidenceDetails.fileName || data.evidenceDetails.id));
    if (!hasEvidence) {
      issues.push(`Supporting evidence document (utility invoice, meter log, or lab report) is required for ${name} submission`);
    }
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Environmental Submission Service
 */
class EnvironmentalSubmissionService {
  /**
   * Save a record as DRAFT
   */
  async saveDraft(moduleKey, orgId, user, payload) {
    const { model, name } = resolveModule(moduleKey);
    const now = new Date().toISOString();

    const today = now.split('T')[0];
    const draftData = {
      facilityId: user.facilityId || 'fac-main',
      reportingPeriod: 'Quarterly',
      periodStart: today,
      periodEnd: today,
      ...payload,
      organizationId: orgId,
      status: 'DRAFT',
      createdBy: user.email || user.id
    };

    // Normalize module-specific defaults for drafts to satisfy schema requirements
    const modLower = moduleKey.toLowerCase();
    if (modLower === 'water') {
      if (draftData.source === 'Municipal') draftData.source = 'Municipal Water';
      if (!draftData.source) draftData.source = 'Municipal Water';
      if (draftData.consumption === undefined) draftData.consumption = draftData.amount ? Number(draftData.amount) : 0;
    } else if (modLower === 'energy') {
      if (!draftData.readingDate) draftData.readingDate = today;
      if (draftData.previousReading === undefined) draftData.previousReading = 0;
      if (draftData.currentReading === undefined) draftData.currentReading = 0;
      if (draftData.consumption === undefined) {
        const c = Number(draftData.currentReading);
        const p = Number(draftData.previousReading);
        draftData.consumption = c >= p ? (c - p) : 0;
      }
      if (!draftData.sourceType) draftData.sourceType = 'GRID';
      if (!draftData.usageCategory) draftData.usageCategory = 'PRODUCTION_MACHINERY';
    } else if (modLower === 'ghg') {
      if (!draftData.scope) draftData.scope = 1;
      if (!draftData.category) draftData.category = 'Stationary Combustion';
      if (!draftData.sourceName) draftData.sourceName = 'Primary Source';
      if (draftData.activityValue === undefined) draftData.activityValue = 0;
      if (!draftData.activityUnit) draftData.activityUnit = 'unit';
      if (draftData.emissionFactor === undefined) draftData.emissionFactor = 0.82;
      if (!draftData.factorUnit) draftData.factorUnit = 'kg CO2e / unit';
      if (!draftData.factorSource) draftData.factorSource = 'Standard Factor';
      if (draftData.calculatedCO2e === undefined) {
        draftData.calculatedCO2e = (Number(draftData.activityValue) * Number(draftData.emissionFactor)) / 1000;
      }
    } else if (modLower === 'waste') {
      const validWasteCats = ['Plastic', 'Paper', 'Metal', 'Glass', 'Organic', 'Chemical', 'Electronic', 'E-Waste', 'Construction', 'Other'];
      if (!validWasteCats.includes(draftData.category)) draftData.category = 'Other';
      if (!['HAZARDOUS', 'NON_HAZARDOUS'].includes(draftData.wasteType)) {
        draftData.wasteType = (draftData.wasteType || '').toUpperCase().includes('HAZ') ? 'HAZARDOUS' : 'NON_HAZARDOUS';
      }
      if (draftData.quantity === undefined) draftData.quantity = draftData.amount ? Number(draftData.amount) : 0;
      if (!draftData.unit) draftData.unit = 'kg';
      const validDisposal = ['Recycling', 'Reuse', 'Recovery', 'Composting', 'Incineration', 'Landfill', 'Other'];
      if (!validDisposal.includes(draftData.disposalMethod)) draftData.disposalMethod = 'Recycling';
    } else if (modLower === 'pollution') {
      const validMediums = ['Air', 'Water', 'Soil', 'Incident'];
      if (!validMediums.includes(draftData.medium)) draftData.medium = 'Air';
      if (!draftData.pollutantType) draftData.pollutantType = 'NOx';
      if (draftData.quantity === undefined) draftData.quantity = 0;
      if (!draftData.unit) draftData.unit = 'ppm';
      if (!draftData.source) draftData.source = 'Furnace Stack';
      if (!draftData.severity) draftData.severity = 'Low';
      if (!draftData.date) draftData.date = today;
    } else if (modLower === 'biodiversity') {
      if (!draftData.siteName) draftData.siteName = 'Site 1';
      draftData.siteArea = draftData.siteArea !== undefined ? Number(draftData.siteArea) : (draftData.areaHectares !== undefined ? Number(draftData.areaHectares) : 1);
      draftData.updatedBy = user.email || user.id;
      if (!draftData.habitatType) draftData.habitatType = 'Wetland';
      if (!draftData.condition) draftData.condition = 'Good';
      if (!draftData.assessmentDate) draftData.assessmentDate = today;
    }

    // Basic structure validation
    const valResult = await validateRecord(moduleKey, draftData, { isDraft: true });
    if (!valResult.isValid) {
      const error = new Error(`Draft validation failed: ${valResult.issues.join(', ')}`);
      error.statusCode = 400;
      error.issues = valResult.issues;
      throw error;
    }

    let record;
    if (payload._id) {
      record = await model.findOne({ _id: payload._id, organizationId: orgId });
      if (!record) {
        const error = new Error('Existing draft record not found');
        error.statusCode = 404;
        throw error;
      }
      if (record.status !== 'DRAFT' && record.status !== 'CORRECTION_REQUIRED') {
        const error = new Error(`Cannot edit record in ${record.status} status. Only DRAFT and CORRECTION_REQUIRED records can be modified.`);
        error.statusCode = 400;
        throw error;
      }

      Object.assign(record, draftData);
      if (!record.submissionHistory) record.submissionHistory = [];
      record.submissionHistory.push({
        action: 'Draft Updated',
        status: 'DRAFT',
        user: user.email || user.id,
        timestamp: now,
        comment: payload.comment || 'Draft updated with new entries'
      });
      await record.save();
    } else {
      draftData.submissionHistory = [{
        action: 'Draft Created',
        status: 'DRAFT',
        user: user.email || user.id,
        timestamp: now,
        comment: payload.comment || 'Initial draft record created'
      }];
      record = await model.create(draftData);
    }

    // Log to Audit Trail
    await AuditLog.create({
      organizationId: orgId,
      user: user.email || user.id,
      action: 'ENVIRONMENTAL_DRAFT_SAVED',
      module: name,
      recordId: record._id.toString(),
      newValue: JSON.stringify({ status: 'DRAFT', module: name }),
      timestamp: now
    });

    return {
      success: true,
      message: 'Draft saved successfully.',
      record
    };
  }

  /**
   * Submit Record for Verification
   */
  async submitRecord(moduleKey, recordId, orgId, user, payload = {}) {
    const { model, name } = resolveModule(moduleKey);
    const now = new Date().toISOString();

    let record;
    if (recordId) {
      record = await model.findOne({ _id: recordId, organizationId: orgId });
      if (!record) {
        const error = new Error(`${name} record not found`);
        error.statusCode = 404;
        throw error;
      }
    }

    const today = now.split('T')[0];
    const mergedData = {
      facilityId: user.facilityId || 'fac-main',
      reportingPeriod: 'Quarterly',
      periodStart: today,
      periodEnd: today,
      ...(record ? record.toObject() : {}),
      ...payload,
      organizationId: orgId
    };

    const modLower = moduleKey.toLowerCase();
    if (modLower === 'water') {
      if (mergedData.source === 'Municipal') mergedData.source = 'Municipal Water';
      if (!mergedData.source) mergedData.source = 'Municipal Water';
      if (mergedData.consumption === undefined) mergedData.consumption = mergedData.amount ? Number(mergedData.amount) : 0;
    } else if (modLower === 'energy') {
      if (!mergedData.readingDate) mergedData.readingDate = today;
      if (mergedData.previousReading === undefined) mergedData.previousReading = 0;
      if (mergedData.currentReading === undefined) mergedData.currentReading = 0;
      if (mergedData.consumption === undefined) {
        const c = Number(mergedData.currentReading);
        const p = Number(mergedData.previousReading);
        mergedData.consumption = c >= p ? (c - p) : 0;
      }
      if (!mergedData.sourceType) mergedData.sourceType = 'GRID';
      if (!mergedData.usageCategory) mergedData.usageCategory = 'PRODUCTION_MACHINERY';
    } else if (modLower === 'ghg') {
      if (!mergedData.scope) mergedData.scope = 1;
      if (!mergedData.category) mergedData.category = 'Stationary Combustion';
      if (!mergedData.sourceName) mergedData.sourceName = 'Primary Source';
      if (mergedData.activityValue === undefined) mergedData.activityValue = 0;
      if (!mergedData.activityUnit) mergedData.activityUnit = 'unit';
      if (mergedData.emissionFactor === undefined) mergedData.emissionFactor = 0.82;
      if (!mergedData.factorUnit) mergedData.factorUnit = 'kg CO2e / unit';
      if (!mergedData.factorSource) mergedData.factorSource = 'Standard Factor';
      if (mergedData.calculatedCO2e === undefined) {
        mergedData.calculatedCO2e = (Number(mergedData.activityValue) * Number(mergedData.emissionFactor)) / 1000;
      }
    } else if (modLower === 'waste') {
      const validWasteCats = ['Plastic', 'Paper', 'Metal', 'Glass', 'Organic', 'Chemical', 'Electronic', 'E-Waste', 'Construction', 'Other'];
      if (!validWasteCats.includes(mergedData.category)) mergedData.category = 'Other';
      if (!['HAZARDOUS', 'NON_HAZARDOUS'].includes(mergedData.wasteType)) {
        mergedData.wasteType = (mergedData.wasteType || '').toUpperCase().includes('HAZ') ? 'HAZARDOUS' : 'NON_HAZARDOUS';
      }
      if (mergedData.quantity === undefined) mergedData.quantity = mergedData.amount ? Number(mergedData.amount) : 0;
      if (!mergedData.unit) mergedData.unit = 'kg';
      const validDisposal = ['Recycling', 'Reuse', 'Recovery', 'Composting', 'Incineration', 'Landfill', 'Other'];
      if (!validDisposal.includes(mergedData.disposalMethod)) mergedData.disposalMethod = 'Recycling';
    } else if (modLower === 'pollution') {
      const validMediums = ['Air', 'Water', 'Soil', 'Incident'];
      if (!validMediums.includes(mergedData.medium)) mergedData.medium = 'Air';
      if (!mergedData.pollutantType) mergedData.pollutantType = 'NOx';
      if (mergedData.quantity === undefined) mergedData.quantity = 0;
      if (!mergedData.unit) mergedData.unit = 'ppm';
      if (!mergedData.source) mergedData.source = 'Furnace Stack';
      if (!mergedData.severity) mergedData.severity = 'Low';
      if (!mergedData.date) mergedData.date = today;
    } else if (modLower === 'biodiversity') {
      if (!mergedData.siteName) mergedData.siteName = 'Site 1';
      mergedData.siteArea = mergedData.siteArea !== undefined ? Number(mergedData.siteArea) : (mergedData.areaHectares !== undefined ? Number(mergedData.areaHectares) : 1);
      mergedData.updatedBy = user.email || user.id;
      if (!mergedData.habitatType) mergedData.habitatType = 'Wetland';
      if (!mergedData.condition) mergedData.condition = 'Good';
      if (!mergedData.assessmentDate) mergedData.assessmentDate = today;
    }

    // Pre-submission validation
    const validation = await validateRecord(moduleKey, mergedData, { isDraft: false });
    if (!validation.isValid) {
      const error = new Error('Submission blocked. Issues need to be fixed.');
      error.statusCode = 422;
      error.issues = validation.issues;
      throw error;
    }

    const prevStatus = record ? record.status : 'NEW';
    const isResubmission = prevStatus === 'CORRECTION_REQUIRED' || prevStatus === 'CHANGES_REQUESTED';
    const newStatus = 'SUBMITTED';

    if (record) {
      Object.assign(record, mergedData);
      record.status = newStatus;
      record.submittedAt = now;
      if (isResubmission) {
        record.correctionReason = '';
      }
      if (!record.submissionHistory) record.submissionHistory = [];
      record.submissionHistory.push({
        action: isResubmission ? 'Resubmitted' : 'Submitted',
        status: newStatus,
        user: user.email || user.id,
        timestamp: now,
        comment: payload.comment || (isResubmission ? 'Resubmitted after correction' : 'Submitted for formal review')
      });
      await record.save();
    } else {
      mergedData.status = newStatus;
      mergedData.submittedAt = now;
      mergedData.createdBy = user.email || user.id;
      mergedData.submissionHistory = [{
        action: 'Submitted',
        status: newStatus,
        user: user.email || user.id,
        timestamp: now,
        comment: payload.comment || 'Directly submitted for verification'
      }];
      record = await model.create(mergedData);
    }

    // Audit Event
    await AuditLog.create({
      organizationId: orgId,
      user: user.email || user.id,
      action: isResubmission ? 'ENVIRONMENTAL_RECORD_RESUBMITTED' : 'ENVIRONMENTAL_RECORD_SUBMITTED',
      module: name,
      recordId: record._id.toString(),
      oldValue: prevStatus,
      newValue: newStatus,
      timestamp: now
    });

    // Notify Reviewers / Verifiers
    try {
      await Notification.create({
        notificationId: `notif-sub-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        organizationId: orgId,
        title: `${name} Record ${isResubmission ? 'Resubmitted' : 'Submitted'}`,
        message: `${user.email || 'User'} has ${isResubmission ? 'resubmitted' : 'submitted'} a ${name} record for period ${record.reportingPeriod || 'current'}. Pending verification review.`,
        type: 'INFO',
        resourceType: name,
        resourceId: record._id.toString(),
        link: `/${moduleKey.toLowerCase()}`,
        createdAt: now
      });
    } catch (notifErr) {
      console.error('Notification creation non-fatal error:', notifErr.message);
    }

    return {
      success: true,
      message: 'Environmental record submitted successfully.',
      record
    };
  }

  /**
   * Workflow Status Transition (Reviewer / Verifier Lifecycle Gate)
   */
  async transitionStatus(moduleKey, recordId, orgId, user, targetStatus, { comment = '', reasonCode = '', evidenceId = null, updatedData = null } = {}) {
    const { model, name } = resolveModule(moduleKey);
    const now = new Date().toISOString();

    const record = await model.findOne({ _id: recordId });
    if (!record) {
      const error = new Error(`${name} record not found`);
      error.statusCode = 404;
      throw error;
    }

    // Enforce Tenant Isolation unless Super/Platform Admin or Verifier/Auditor
    const isPrivileged = isReviewerRole(user.role);
    if (!isPrivileged && record.organizationId !== orgId) {
      const error = new Error('Unauthorized: Tenant isolation violation');
      error.statusCode = 403;
      throw error;
    }

    // STRICT NON-SELF-VERIFICATION RULE
    // Submitting users / MSMEs cannot verify, review, or approve records
    const privilegedTargets = ['UNDER_REVIEW', 'VERIFIED', 'APPROVED', 'CORRECTION_REQUIRED', 'CHANGES_REQUESTED', 'REJECTED'];
    if (privilegedTargets.includes(targetStatus) && !isPrivileged) {
      const error = new Error(`Forbidden: Non-Self-Verification Rule Enforced. Role '${user.role}' cannot verify or request changes on records.`);
      error.statusCode = 403;
      throw error;
    }

    // Prevent verifying own record even if user happens to have verifier role
    if (['VERIFIED', 'APPROVED'].includes(targetStatus) && record.createdBy === user.email) {
      const error = new Error('Forbidden: Separation of duties violation. An author cannot verify their own environmental submission.');
      error.statusCode = 403;
      throw error;
    }

    const prevStatus = record.status;
    record.status = targetStatus;

    if (comment) record.reviewerComments = comment;
    if (reasonCode) record.correctionReason = reasonCode;
    if (evidenceId) record.evidenceId = evidenceId;
    if (updatedData) Object.assign(record, updatedData);

    if (targetStatus === 'VERIFIED') {
      record.verifiedAt = now;
      record.verifiedBy = user.email || user.id;
    } else if (targetStatus === 'REJECTED') {
      record.rejectedAt = now;
      record.rejectedBy = user.email || user.id;
    } else if (targetStatus === 'SUBMITTED' || targetStatus === 'RESUBMITTED') {
      record.submittedAt = now;
    }

    if (!record.submissionHistory) record.submissionHistory = [];
    
    let historyAction = targetStatus;
    if (targetStatus === 'UNDER_REVIEW') historyAction = 'Under Review';
    else if (targetStatus === 'CORRECTION_REQUIRED') historyAction = 'Correction Requested';
    else if (targetStatus === 'RESUBMITTED') historyAction = 'Resubmitted';
    else if (targetStatus === 'VERIFIED') historyAction = 'Verified';
    else if (targetStatus === 'REJECTED') historyAction = 'Rejected';

    record.submissionHistory.push({
      action: historyAction,
      status: targetStatus,
      user: user.email || user.id,
      timestamp: now,
      comment: comment || reasonCode || `Transitioned to ${targetStatus}`
    });

    await record.save();

    // Log to Audit Trail
    await AuditLog.create({
      organizationId: record.organizationId,
      user: user.email || user.id,
      action: `STATUS_${targetStatus}`,
      module: name,
      recordId: record._id.toString(),
      oldValue: prevStatus,
      newValue: targetStatus,
      metadata: { comment, reasonCode },
      timestamp: now
    });

    // Notify Submitting User
    try {
      if (targetStatus === 'CORRECTION_REQUIRED') {
        await Notification.create({
          notificationId: `notif-corr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          userId: record.createdBy,
          organizationId: record.organizationId,
          title: `${name} Record Correction Requested`,
          message: `Action Required: Reviewer requested corrections on ${name} record: "${comment || reasonCode || 'Review comments'}".`,
          type: 'WARNING',
          resourceType: name,
          resourceId: record._id.toString(),
          link: `/${moduleKey.toLowerCase()}`,
          createdAt: now
        });
      } else if (targetStatus === 'VERIFIED') {
        await Notification.create({
          notificationId: `notif-ver-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          userId: record.createdBy,
          organizationId: record.organizationId,
          title: `${name} Record Verified`,
          message: `Audit Clearance: Your ${name} record #${record._id} has been verified and approved by ${user.email}.`,
          type: 'SUCCESS',
          resourceType: name,
          resourceId: record._id.toString(),
          link: `/${moduleKey.toLowerCase()}`,
          createdAt: now
        });
      } else if (targetStatus === 'REJECTED') {
        await Notification.create({
          notificationId: `notif-rej-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          userId: record.createdBy,
          organizationId: record.organizationId,
          title: `${name} Record Rejected`,
          message: `Your ${name} record #${record._id} was rejected: "${comment || reasonCode || 'Did not meet criteria'}".`,
          type: 'ALERT',
          resourceType: name,
          resourceId: record._id.toString(),
          link: `/${moduleKey.toLowerCase()}`,
          createdAt: now
        });
      }
    } catch (notifErr) {
      console.error('Notification dispatch non-fatal error:', notifErr.message);
    }

    return {
      success: true,
      message: `Record successfully transitioned from ${prevStatus} to ${targetStatus}`,
      record
    };
  }

  /**
   * Get Submission History & Evidence Details for a Record
   */
  async getSubmissionHistory(moduleKey, recordId, orgId) {
    const { model } = resolveModule(moduleKey);
    const record = await model.findOne({ _id: recordId });
    if (!record) {
      const error = new Error('Record not found');
      error.statusCode = 404;
      throw error;
    }

    let evidence = null;
    if (record.evidenceId) {
      evidence = await Evidence.findOne({ _id: record.evidenceId });
    }

    return {
      recordId: record._id,
      module: moduleKey,
      status: record.status,
      history: record.submissionHistory || [],
      reviewerComments: record.reviewerComments,
      correctionReason: record.correctionReason,
      evidence
    };
  }
}

module.exports = new EnvironmentalSubmissionService();
module.exports.validateRecord = validateRecord;
module.exports.resolveModule = resolveModule;
module.exports.MODULE_MODEL_MAP = MODULE_MODEL_MAP;
