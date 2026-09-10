const { GHGRecord, EnergyRecord, WaterRecord, WasteRecord, ClimateRisk, EnvironmentalTarget } = require('../models/models');

async function calculateEnvironmentalScore(organizationId) {
  if (!organizationId) {
    throw new Error('organizationId is required for score calculations');
  }

  // Query records isolated by organizationId
  const ghgRecords = await GHGRecord.find({ organizationId });
  const energyRecords = await EnergyRecord.find({ organizationId });
  const waterRecords = await WaterRecord.find({ organizationId });
  const wasteRecords = await WasteRecord.find({ organizationId });
  const climateRiskRecords = await ClimateRisk.find({ organizationId });

  // 1. GHG Emissions Score (Weight: 30%)
  let ghgScore = 75;
  let totalEmissions = 0;
  let scope1 = 0, scope2 = 0, scope3 = 0;
  ghgRecords.forEach(r => {
    totalEmissions += r.calculatedCO2e;
    if (r.scope === 1) scope1 += r.calculatedCO2e;
    if (r.scope === 2) scope2 += r.calculatedCO2e;
    if (r.scope === 3) scope3 += r.calculatedCO2e;
  });

  const ghgTarget = await EnvironmentalTarget.findOne({ organizationId, metric: 'GHG' });
  if (ghgTarget) {
    const ratio = ghgTarget.currentValue / (ghgTarget.targetValue || 1);
    if (ratio <= 1.0) {
      ghgScore = 85 + (1.0 - ratio) * 15; // 85 to 100
    } else {
      ghgScore = Math.max(30, 85 - (ratio - 1.0) * 50); // decreases as it exceeds target
    }
  }

  // 2. Energy Score (Weight: 20%)
  let energyScore = 70;
  let totalEnergy = 0;
  let renewableEnergy = 0;
  energyRecords.forEach(r => {
    totalEnergy += r.calculatedkWh;
    if (r.isRenewable) {
      renewableEnergy += r.calculatedkWh;
    }
  });
  const renewablePct = totalEnergy > 0 ? (renewableEnergy / totalEnergy) * 100 : 0;
  if (totalEnergy > 0) {
    energyScore = Math.min(100, Math.max(40, 60 + renewablePct * 0.8));
  }

  // 3. Water Score (Weight: 15%)
  let waterScore = 80;
  let totalWithdrawal = 0;
  let recycledWater = 0;
  waterRecords.forEach(r => {
    if (r.actionType === 'Withdrawal') totalWithdrawal += r.amount;
    if (r.actionType === 'Reuse' || r.source.toLowerCase().includes('recycle')) {
      recycledWater += r.amount;
    }
  });
  const recyclePct = totalWithdrawal > 0 ? (recycledWater / totalWithdrawal) * 100 : 0;
  if (totalWithdrawal > 0) {
    waterScore = Math.min(100, Math.max(50, 75 + recyclePct * 0.25));
  }

  // 4. Waste Score (Weight: 15%)
  let wasteScore = 72;
  let totalWaste = 0;
  let recycledWaste = 0;
  wasteRecords.forEach(r => {
    totalWaste += r.amount;
    if (['Recycled', 'Reused', 'Composted'].includes(r.treatment)) {
      recycledWaste += r.amount;
    }
  });
  const wasteRecyclePct = totalWaste > 0 ? (recycledWaste / totalWaste) * 100 : 0;
  if (totalWaste > 0) {
    wasteScore = Math.min(100, Math.max(30, 50 + wasteRecyclePct * 0.5));
  }

  // 5. Climate Adaptation Score (Weight: 20%)
  // Based on unmitigated climate risk severities
  let climateScore = 100;
  if (climateRiskRecords.length > 0) {
    const unmitigated = climateRiskRecords.filter(r => r.status !== 'Mitigated' && r.status !== 'Closed');
    if (unmitigated.length > 0) {
      const avgRiskScore = unmitigated.reduce((acc, r) => acc + r.riskScore, 0) / unmitigated.length;
      // avgRiskScore is 1 to 25. We normalize so that 25 (max risk) yields a subtraction of 70 points
      climateScore = Math.max(30, 100 - (avgRiskScore * 2.8));
    }
  }

  // Weighted Overall Score - GHG: 30%, Energy: 20%, Water: 15%, Waste: 15%, Climate: 20%
  const overallScore = Math.round(
    (ghgScore * 0.30) +
    (energyScore * 0.20) +
    (waterScore * 0.15) +
    (wasteScore * 0.15) +
    (climateScore * 0.20)
  );

  return {
    overallScore: overallScore || 78,
    breakdown: {
      ghg: Math.round(ghgScore),
      energy: Math.round(energyScore),
      water: Math.round(waterScore),
      waste: Math.round(wasteScore),
      climate: Math.round(climateScore)
    },
    metrics: {
      totalEmissions,
      scope1,
      scope2,
      scope3,
      totalEnergy,
      renewablePct,
      totalWithdrawal,
      recyclePct,
      totalWaste,
      wasteRecyclePct
    }
  };
}

module.exports = {
  calculateEnvironmentalScore
};
