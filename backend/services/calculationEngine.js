/**
 * ESG Platform Centralized Calculation Engine Service
 */

/**
 * Calculates electricity consumption from readings
 * Handles standard rollover correction if required (e.g. meter resets after reaching max limit)
 */
function calculateConsumption(current, previous, rolloverLimit = null) {
  if (current >= previous) {
    return current - previous;
  }
  // Rollover adjustment
  if (rolloverLimit && rolloverLimit > previous) {
    return (rolloverLimit - previous) + current;
  }
  // Fallback (or exception)
  return 0; 
}

/**
 * Calculates Renewable Energy percentage share
 */
function calculateRenewableShare(renewableAmount, totalAmount) {
  if (!totalAmount || totalAmount <= 0) return 0;
  return Math.min(100, Math.max(0, (renewableAmount / totalAmount) * 100));
}

/**
 * Calculates Scope 2 emissions based on grid electricity consumption
 * @param {number} kwh Grid electricity in kWh
 * @param {number} emissionFactor Rate in kg CO2e / kWh
 * @returns {number} emissions in Metric Tonnes CO2e
 */
function calculateScope2CO2e(kwh, emissionFactor) {
  if (!kwh || kwh <= 0 || !emissionFactor || emissionFactor <= 0) return 0;
  return (kwh * emissionFactor) / 1000;
}

/**
 * Calculates Water Recycling percentage rate
 */
function calculateWaterRecyclingRate(recycledVolume, totalWithdrawals) {
  if (!totalWithdrawals || totalWithdrawals <= 0) return 0;
  return Math.min(100, Math.max(0, (recycledVolume / totalWithdrawals) * 100));
}

/**
 * Calculates Waste Diversion Rate
 * Diversion Rate = (Recycled + Reused + Recovered + Composted) / Total Waste Generated * 100
 */
function calculateWasteDiversionRate(divertedAmount, totalAmount) {
  if (!totalAmount || totalAmount <= 0) return 0;
  return Math.min(100, Math.max(0, (divertedAmount / totalAmount) * 100));
}

/**
 * Normalizes waste values into a single target unit (default: kg)
 */
function normalizeWasteToKg(amount, unit) {
  if (unit && unit.toLowerCase() === 'tonnes') {
    return amount * 1000;
  }
  return amount;
}

/**
 * Calculates target progress percentage based on metric direction (less is better vs more is better)
 */
function calculateTargetProgress(baseline, current, target) {
  if (baseline === target) return 100;
  const targetReduction = baseline > target;
  if (targetReduction) {
    // e.g. Baseline: 100, Target: 80, Current: 90
    // Progress: (100 - 90) / (100 - 80) = 50%
    const totalDiff = baseline - target;
    const currentDiff = baseline - current;
    return Math.min(100, Math.max(0, (currentDiff / totalDiff) * 100));
  } else {
    // e.g. Baseline: 10, Target: 50, Current: 30
    // Progress: (30 - 10) / (50 - 10) = 50%
    const totalDiff = target - baseline;
    const currentDiff = current - baseline;
    return Math.min(100, Math.max(0, (currentDiff / totalDiff) * 100));
  }
}

module.exports = {
  calculateConsumption,
  calculateRenewableShare,
  calculateScope2CO2e,
  calculateWaterRecyclingRate,
  calculateWasteDiversionRate,
  normalizeWasteToKg,
  calculateTargetProgress
};
