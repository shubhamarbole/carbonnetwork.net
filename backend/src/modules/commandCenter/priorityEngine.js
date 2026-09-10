/**
 * Deterministic Priority Calculation Engine (Phase 18)
 * Version: priority-calc-v1.0.0
 * 
 * Computes deterministic priority levels (P1_CRITICAL, P2_HIGH, P3_MEDIUM, P4_INFORMATIONAL)
 * across heterogeneous platform resources without LLM dependency.
 */

const ENGINE_VERSION = 'priority-calc-v1.0.0';

const PRIORITY_LEVELS = {
  P1_CRITICAL: 'P1_CRITICAL',
  P2_HIGH: 'P2_HIGH',
  P3_MEDIUM: 'P3_MEDIUM',
  P4_INFORMATIONAL: 'P4_INFORMATIONAL'
};

/**
 * Calculate deterministic priority score and rank
 * @param {Object} params
 * @param {string} [params.severity] - 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
 * @param {number} [params.urgency] - 0 to 100
 * @param {number} [params.criticalProbability] - 0.0 to 1.0
 * @param {string|Date} [params.dueAt] - Deadline ISO date or Date object
 * @param {number} [params.exposure] - 0 to 100
 * @param {string} [params.workflowStatus] - e.g. 'FAILED', 'ESCALATED', 'RUNNING'
 * @param {string} [params.approvalStatus] - e.g. 'PENDING', 'WAITING_FOR_APPROVAL'
 * @param {string} [params.type] - Resource/Action category
 */
function calculatePriority(params = {}) {
  let score = 0;
  const breakdown = [];

  // 1. Base Severity Contribution
  const sev = (params.severity || '').toUpperCase();
  if (sev === 'CRITICAL') {
    score += 75;
    breakdown.push({ factor: 'severity', value: 'CRITICAL', points: 75 });
  } else if (sev === 'HIGH') {
    score += 55;
    breakdown.push({ factor: 'severity', value: 'HIGH', points: 55 });
  } else if (sev === 'MEDIUM') {
    score += 35;
    breakdown.push({ factor: 'severity', value: 'MEDIUM', points: 35 });
  } else {
    score += 15;
    breakdown.push({ factor: 'severity', value: sev || 'LOW', points: 15 });
  }

  // 2. Urgency Factor
  const urgency = Number(params.urgency) || 0;
  if (urgency >= 80) {
    score += 15;
    breakdown.push({ factor: 'urgency', value: urgency, points: 15 });
  } else if (urgency >= 60) {
    score += 10;
    breakdown.push({ factor: 'urgency', value: urgency, points: 10 });
  }

  // 3. Predictive Probability
  const prob = Number(params.criticalProbability) || 0;
  if (prob >= 0.8) {
    score += 20;
    breakdown.push({ factor: 'criticalProbability', value: prob, points: 20 });
  } else if (prob >= 0.6) {
    score += 10;
    breakdown.push({ factor: 'criticalProbability', value: prob, points: 10 });
  }

  // 4. Deadline Proximity
  if (params.dueAt) {
    try {
      const now = Date.now();
      const dueDate = new Date(params.dueAt).getTime();
      const diffHours = (dueDate - now) / (1000 * 60 * 60);

      if (diffHours < 0) {
        score += 25; // Overdue
        breakdown.push({ factor: 'deadline', value: 'OVERDUE', points: 25 });
      } else if (diffHours <= 24) {
        score += 15; // Due within 24h
        breakdown.push({ factor: 'deadline', value: '<24h', points: 15 });
      } else if (diffHours <= 72) {
        score += 8; // Due within 72h
        breakdown.push({ factor: 'deadline', value: '<72h', points: 8 });
      }
    } catch (e) {
      // Ignore parse error
    }
  }

  // 5. Exposure Factor
  const exposure = Number(params.exposure) || 0;
  if (exposure >= 80) {
    score += 10;
    breakdown.push({ factor: 'exposure', value: exposure, points: 10 });
  }

  // 6. Workflow Status
  const wfStatus = (params.workflowStatus || '').toUpperCase();
  if (wfStatus === 'FAILED' || wfStatus === 'ESCALATED') {
    score += 20;
    breakdown.push({ factor: 'workflowStatus', value: wfStatus, points: 20 });
  } else if (wfStatus === 'PAUSED' || wfStatus === 'WAITING_FOR_APPROVAL') {
    score += 10;
    breakdown.push({ factor: 'workflowStatus', value: wfStatus, points: 10 });
  }

  // 7. Approval Status
  const appStatus = (params.approvalStatus || '').toUpperCase();
  if (appStatus === 'PENDING' || appStatus === 'WAITING_FOR_APPROVAL') {
    score += 15;
    breakdown.push({ factor: 'approvalStatus', value: appStatus, points: 15 });
  }

  // 8. Type overrides or minimum floors
  const actionType = (params.type || '').toUpperCase();
  if (actionType === 'CRITICAL_RISK' && score < 85) {
    score = Math.max(score, 85);
    breakdown.push({ factor: 'typeFloor', value: 'CRITICAL_RISK', points: 85 - score });
  } else if (actionType === 'APPROVAL_REQUIRED' && score < 70) {
    score = Math.max(score, 70);
    breakdown.push({ factor: 'typeFloor', value: 'APPROVAL_REQUIRED', points: 70 - score });
  }

  // Deterministic Threshold Mapping
  let priority = PRIORITY_LEVELS.P4_INFORMATIONAL;
  if (score >= 85) {
    priority = PRIORITY_LEVELS.P1_CRITICAL;
  } else if (score >= 65) {
    priority = PRIORITY_LEVELS.P2_HIGH;
  } else if (score >= 45) {
    priority = PRIORITY_LEVELS.P3_MEDIUM;
  }

  return {
    priority,
    score: Math.min(100, Math.max(0, score)),
    version: ENGINE_VERSION,
    breakdown
  };
}

module.exports = {
  calculatePriority,
  ENGINE_VERSION,
  PRIORITY_LEVELS
};
