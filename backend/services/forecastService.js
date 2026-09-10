const { GHGRecord, EnvironmentalTarget } = require('../models/models');

async function getForecastingData(organizationId) {
  if (!organizationId) {
    throw new Error('organizationId is required for forecasting analysis');
  }

  const ghgRecords = await GHGRecord.find({ organizationId });
  const targets = await EnvironmentalTarget.find({ organizationId });
  
  // Aggregate emissions by year
  const emissionsByYear = {};
  ghgRecords.forEach(r => {
    const year = r.periodStart.split('-')[0];
    emissionsByYear[year] = (emissionsByYear[year] || 0) + r.calculatedCO2e;
  });

  const years = Object.keys(emissionsByYear).sort();
  let currentEmissions = 940; // Default fallback if no data
  let projected2030 = 1200; // Default fallback projection
  let slope = 35; // default yearly increase (tCO2e)

  if (years.length >= 2) {
    const dataPoints = years.map(y => ({ x: parseInt(y), y: emissionsByYear[y] }));
    const n = dataPoints.length;
    
    // Linear regression formula
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    dataPoints.forEach(p => {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumXX += p.x * p.x;
    });

    const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    if (!isNaN(m)) {
      slope = m;
      const latestYear = Math.max(...years.map(y => parseInt(y)));
      currentEmissions = Math.round(emissionsByYear[latestYear]);
      projected2030 = Math.round(currentEmissions + slope * (2030 - latestYear));
    }
  } else if (years.length === 1) {
    currentEmissions = Math.round(emissionsByYear[years[0]]);
    // If only one year, project with default slope
    projected2030 = Math.round(currentEmissions + slope * (2030 - parseInt(years[0])));
  }

  // Find GHG target
  const ghgTarget = targets.find(t => t.metric === 'GHG') || {
    targetValue: 840,
    currentValue: currentEmissions,
    targetYear: 2030,
    baselineValue: 1200
  };

  const targetValue = ghgTarget.targetValue;
  const targetYear = ghgTarget.targetYear || 2030;
  
  let targetStatus = '⚠️ Target unlikely to be achieved';
  let statusColor = 'warning';
  
  if (projected2030 <= targetValue) {
    targetStatus = '🟢 Target on track to be achieved';
    statusColor = 'success';
  } else if (projected2030 > targetValue * 1.3) {
    targetStatus = '🔴 Target highly unlikely to be achieved (Immediate Action Required)';
    statusColor = 'danger';
  }

  // Derive recommendations based on emissions data
  const recommendations = [];
  
  // Analyze emissions distribution
  let scope1Total = 0;
  let scope2Total = 0;
  let scope3Total = 0;
  
  ghgRecords.forEach(r => {
    if (r.scope === 1) scope1Total += r.calculatedCO2e;
    if (r.scope === 2) scope2Total += r.calculatedCO2e;
    if (r.scope === 3) scope3Total += r.calculatedCO2e;
  });

  const total = scope1Total + scope2Total + scope3Total || 1;
  const scope1Pct = (scope1Total / total) * 100;
  const scope2Pct = (scope2Total / total) * 100;
  const scope3Pct = (scope3Total / total) * 100;

  if (scope1Pct > 40 || scope1Total > 500) {
    recommendations.push({
      priority: 'High',
      category: 'Scope 1 Emissions',
      action: 'Electrify company fleet vehicles and transition stationary natural gas boilers to electric heat pumps.',
      impact: 'Est. reduction: 120 tCO2e/year'
    });
  }

  if (scope2Pct > 30 || scope2Total > 400) {
    recommendations.push({
      priority: 'High',
      category: 'Scope 2 Emissions',
      action: 'Install on-site solar PV arrays at Pune and Bangalore facilities and negotiate Power Purchase Agreements (PPAs) for 100% renewable electricity grid matching.',
      impact: 'Est. reduction: 250 tCO2e/year'
    });
  }

  if (scope3Pct > 50 || scope3Total > 800) {
    recommendations.push({
      priority: 'Medium',
      category: 'Scope 3 Emissions',
      action: 'Engage top 10 supply-chain partners to submit carbon disclosures and enforce low-carbon packaging requirements in procurement guidelines.',
      impact: 'Est. reduction: 180 tCO2e/year'
    });
  }

  // Energy suggestions
  recommendations.push({
    priority: 'Medium',
    category: 'Energy Efficiency',
    action: 'Conduct ASHRAE Level 2 Energy Audits and upgrade manufacturing equipment to energy-efficient models with smart variable frequency drives (VFDs).',
    impact: 'Est. reduction: 45,000 kWh/year'
  });

  // Water suggestions
  recommendations.push({
    priority: 'Low',
    category: 'Water Conservation',
    action: 'Implement closed-loop recycling loops for facility cooling systems and establish rainwater harvesting pits.',
    impact: 'Est. water saved: 1,500 m3/year'
  });

  return {
    currentCO2: currentEmissions,
    projected2030: projected2030,
    target: targetValue,
    targetYear,
    status: targetStatus,
    statusColor,
    recommendations,
    historicalData: years.map(y => ({ year: y, emissions: Math.round(emissionsByYear[y]) }))
  };
}

module.exports = {
  getForecastingData
};
