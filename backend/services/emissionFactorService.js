const { EmissionFactor } = require('../models/models');

/**
 * Resolves emission factor value and metadata from the database registry.
 */
async function resolveEmissionFactor(category, activityType, date) {
  const factors = await EmissionFactor.find({ category, activityType, isActive: true });
  
  if (!factors || factors.length === 0) {
    // Standard default fallbacks to prevent crashes
    let value = 1.0;
    let unit = 'kg CO2e / unit';
    let source = 'Default Fallback';
    
    if (activityType === 'Electricity') { value = 0.82; unit = 'kg CO2e / kWh'; source = 'CEA India 2025'; }
    else if (activityType === 'Diesel') { value = 2.68; unit = 'kg CO2e / Liter'; source = 'DEFRA 2025'; }
    else if (activityType === 'Natural Gas') { value = 2.02; unit = 'kg CO2e / m3'; source = 'DEFRA 2025'; }
    else if (activityType === 'Petrol') { value = 2.31; unit = 'kg CO2e / Liter'; source = 'GHG Protocol 2025'; }
    else if (activityType === 'LPG') { value = 1.51; unit = 'kg CO2e / Liter'; source = 'EPA 2025'; }
    
    return { value, unit, source, methodology: 'GHG Protocol Standard' };
  }

  // Filter by date check if date is provided
  if (date) {
    const matched = factors.find(f => {
      const fromCheck = !f.effectiveFrom || date >= f.effectiveFrom;
      const toCheck = !f.effectiveTo || date <= f.effectiveTo;
      return fromCheck && toCheck;
    });
    if (matched) return matched;
  }

  // Fallback to the latest active version
  return factors[0];
}

module.exports = {
  resolveEmissionFactor
};
