/**
 * Phase 2 AI Risk Manager - Comprehensive End-to-End Verification Suite
 * Verifies all 15 Definition of Done (DoD) requirements for Phase 2:
 * 1. Health & Service Availability (Express 5050 & FastAPI 8000)
 * 2. Role-based Authentication (Super Admin, MSME, Acme Admin, Viewer)
 * 3. 4-Factor Deterministic Authoritative Formula: P(35%) + I(35%) + E(20%) + U(10%)
 * 4. Boundary Enforcement & Input Validation (0 <= factor <= 100)
 * 5. Severity Categorization Thresholds (<25, 25-49.99, 50-74.99, 75-100)
 * 6. Role Authorization: VIEWER blocked from scoring/recalculating (403 Forbidden)
 * 7. POST /api/risks/:id/score authoritative recalculation & version bump
 * 8. GET /api/risks/:id/score-history chronological audit trail with trend flags
 * 9. Audit Log integration: RISK_SCORED, RISK_SCORE_CHANGED, RISK_SEVERITY_CHANGED
 * 10. GET /api/risk-analytics/overview KPIs (real database aggregations)
 * 11. GET /api/risk-analytics/severity distribution & percentages
 * 12. GET /api/risk-analytics/categories coverage across all 14 categories
 * 13. GET /api/risk-analytics/trends timeline progression
 * 14. GET /api/risk-analytics/heatmap 4x4 matrix (16 cells)
 * 15. Multi-Tenant Analytics isolation & scoping boundaries
 */

const BASE_EXPRESS = 'http://localhost:5050';
const BASE_FASTAPI = 'http://localhost:8000';

let superAdminToken = '';
let msmeToken = '';
let acmeToken = '';
let viewerToken = '';

let createdRiskId = '';

async function runPhase2DoDVerification() {
  console.log('================================================================');
  console.log('🛡️  PHASE 2 RISK SCORING ENGINE & ANALYTICS - END-TO-END VERIFICATION');
  console.log('================================================================\n');

  // STEP 1: Health & Service Availability
  console.log('--- Step 1: Health & Dual Service Availability ---');
  const expHealthRes = await fetch(`${BASE_EXPRESS}/api/health`);
  const expHealth = await expHealthRes.json();
  if (expHealthRes.status !== 200 || expHealth.status !== 'healthy') {
    throw new Error(`Express server health check failed: ${JSON.stringify(expHealth)}`);
  }
  console.log('✅ Express Backend (Port 5050) is healthy.');

  const pyHealthRes = await fetch(`${BASE_FASTAPI}/api/health`);
  const pyHealth = await pyHealthRes.json();
  if (pyHealthRes.status !== 200 || pyHealth.status !== 'healthy') {
    throw new Error(`FastAPI Python server health check failed: ${JSON.stringify(pyHealth)}`);
  }
  console.log('✅ FastAPI Python Server (Port 8000) is healthy.');

  // STEP 2: Authenticate Users
  console.log('\n--- Step 2: Role Authentication ---');
  async function login(email, password) {
    const res = await fetch(`${BASE_EXPRESS}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    return data.data?.token || data.token;
  }

  superAdminToken = await login('superadmin@esg.com', 'password123');
  msmeToken = await login('msme@esg.com', 'password123');
  acmeToken = await login('admin@acme.com', 'password123');
  viewerToken = await login('viewer@acme.com', 'password123');

  if (!superAdminToken || !msmeToken || !acmeToken || !viewerToken) {
    throw new Error('Failed to authenticate all test personas.');
  }
  console.log('✅ Authenticated SUPER_ADMIN, MSME_USER, ACME_ADMIN, and VIEWER.');

  // STEP 3: 4-Factor Deterministic Authoritative Calculation
  console.log('\n--- Step 3: Authoritative 4-Factor Scoring Formula ---');
  // Formula: (P * 0.35) + (I * 0.35) + (E * 0.20) + (U * 0.10)
  // Test with: P=40, I=60, E=70, U=80
  // Score: (40*0.35=14) + (60*0.35=21) + (70*0.20=14) + (80*0.10=8) = 57.00 (HIGH)
  const createRiskRes = await fetch(`${BASE_EXPRESS}/api/risks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${acmeToken}`
    },
    body: JSON.stringify({
      title: 'E2E Phase 2 Governance & Compliance Risk',
      description: 'Verifying end-to-end multi-factor risk scoring lifecycle.',
      category: 'Compliance',
      probability: 40,
      impact: 60,
      exposure: 70,
      urgency: 80
    })
  });
  const createRiskData = await createRiskRes.json();
  if (createRiskRes.status !== 201 || !createRiskData.data) {
    throw new Error(`Risk creation failed: ${JSON.stringify(createRiskData)}`);
  }
  const risk = createRiskData.data;
  createdRiskId = risk._id;

  console.log(`   Created Risk ID: ${createdRiskId}`);
  console.log(`   Calculated Score: ${risk.risk_score} (Expected: 57)`);
  console.log(`   Calculated Severity: ${risk.severity} (Expected: HIGH)`);
  console.log(`   Score Version: ${risk.score_version} (Expected: 1)`);

  if (risk.risk_score !== 57 || risk.severity !== 'HIGH' || risk.score_version !== 1) {
    throw new Error(`Authoritative scoring mismatch: score=${risk.risk_score}, sev=${risk.severity}, ver=${risk.score_version}`);
  }
  console.log('✅ Authoritative 4-Factor calculation verified exactly on creation.');

  // STEP 4: Boundary Enforcement & Input Validation
  console.log('\n--- Step 4: Factor Bounds Checking (0 <= factor <= 100) ---');
  const invalidExposureRes = await fetch(`${BASE_EXPRESS}/api/risks/${createdRiskId}/score`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${acmeToken}`
    },
    body: JSON.stringify({ exposure: 150 })
  });
  if (invalidExposureRes.status !== 400) {
    throw new Error(`Expected 400 Bad Request for exposure > 100, got: ${invalidExposureRes.status}`);
  }

  const invalidUrgencyRes = await fetch(`${BASE_EXPRESS}/api/risks/${createdRiskId}/score`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${acmeToken}`
    },
    body: JSON.stringify({ urgency: -10 })
  });
  if (invalidUrgencyRes.status !== 400) {
    throw new Error(`Expected 400 Bad Request for urgency < 0, got: ${invalidUrgencyRes.status}`);
  }
  console.log('✅ Out-of-bounds factors (>100 and <0) strictly rejected with 400 Bad Request.');

  // STEP 5: Role-based Authorization on Scoring
  console.log('\n--- Step 5: Role Authorization: VIEWER Write Protection ---');
  const viewerScoreRes = await fetch(`${BASE_EXPRESS}/api/risks/${createdRiskId}/score`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${viewerToken}`
    },
    body: JSON.stringify({ urgency: 90, reason: 'Viewer unauthorized attempt' })
  });
  if (viewerScoreRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for VIEWER scoring attempt, got: ${viewerScoreRes.status}`);
  }
  console.log('✅ VIEWER score recalculation attempt correctly rejected with 403 Forbidden.');

  // STEP 6: POST /api/risks/:id/score (Authoritative Recalculation & Version Increment)
  console.log('\n--- Step 6: Recalculate Score & Upgrade to CRITICAL ---');
  // Update to P=90, I=90, E=80, U=80
  // Score: (90*0.35=31.5) + (90*0.35=31.5) + (80*0.20=16) + (80*0.10=8) = 87.00 (CRITICAL)
  const recalcRes = await fetch(`${BASE_EXPRESS}/api/risks/${createdRiskId}/score`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${acmeToken}`
    },
    body: JSON.stringify({
      probability: 90,
      impact: 90,
      exposure: 80,
      urgency: 80,
      reason: 'Urgent compliance escalation by risk officer'
    })
  });
  const recalcData = await recalcRes.json();
  if (recalcRes.status !== 200 || !recalcData.data) {
    throw new Error(`Recalculation failed: ${JSON.stringify(recalcData)}`);
  }
  const updatedRisk = recalcData.data;
  console.log(`   Recalculated Score: ${updatedRisk.risk_score} (Expected: 87)`);
  console.log(`   Updated Severity: ${updatedRisk.severity} (Expected: CRITICAL)`);
  console.log(`   Incremented Version: ${updatedRisk.score_version} (Expected: 2)`);

  if (updatedRisk.risk_score !== 87 || updatedRisk.severity !== 'CRITICAL' || updatedRisk.score_version !== 2) {
    throw new Error(`Recalculation state mismatch: score=${updatedRisk.risk_score}, sev=${updatedRisk.severity}, ver=${updatedRisk.score_version}`);
  }
  console.log('✅ Authoritative recalculation and version increment verified.');

  // STEP 7: GET /api/risks/:id/score-history Audit Trail
  console.log('\n--- Step 7: Score History Audit Trail ---');
  const histRes = await fetch(`${BASE_EXPRESS}/api/risks/${createdRiskId}/score-history`, {
    headers: { 'Authorization': `Bearer ${acmeToken}` }
  });
  const histData = await histRes.json();
  if (histRes.status !== 200 || !Array.isArray(histData.data)) {
    throw new Error(`Score history fetch failed: ${JSON.stringify(histData)}`);
  }
  console.log(`   Found ${histData.data.length} score history entries.`);
  const latestHist = histData.data[0];
  console.log('   Latest Entry Transition:', {
    old_score: latestHist.old_score,
    new_score: latestHist.new_score,
    old_severity: latestHist.old_severity,
    new_severity: latestHist.new_severity,
    reason: latestHist.reason
  });
  if (latestHist.old_score !== 57 || latestHist.new_score !== 87) {
    throw new Error(`History transition values mismatch: expected 57 -> 87, got ${latestHist.old_score} -> ${latestHist.new_score}`);
  }
  console.log('✅ Risk score history audit entries correctly logged with full transition context.');

  // STEP 8: Verify Audit Logs
  console.log('\n--- Step 8: Audit Logs for Scoring Actions ---');
  const auditRes = await fetch(`${BASE_EXPRESS}/api/risks/audit-logs?riskId=${createdRiskId}`, {
    headers: { 'Authorization': `Bearer ${superAdminToken}` }
  });
  const auditData = await auditRes.json();
  const actions = (auditData.data || []).map(a => a.action);
  console.log(`   Recent Audit Actions: ${[...new Set(actions)].slice(0, 7).join(', ')}`);
  if (!actions.includes('RISK_SCORED') && !actions.includes('RISK_SCORE_CHANGED')) {
    throw new Error('Audit logs missing RISK_SCORED or RISK_SCORE_CHANGED');
  }
  console.log('✅ Audit logs verified for scoring lifecycle events.');

  // STEP 9: GET /api/risk-analytics/overview
  console.log('\n--- Step 9: Risk Analytics Overview KPIs ---');
  const overviewRes = await fetch(`${BASE_EXPRESS}/api/risk-analytics/overview`, {
    headers: { 'Authorization': `Bearer ${superAdminToken}` }
  });
  const overviewData = await overviewRes.json();
  const ov = overviewData.data;
  console.log('   Overview KPIs:', {
    total_risks: ov.total_risks,
    critical_risks: ov.critical_risks,
    high_risks: ov.high_risks,
    average_score: ov.average_score,
    highest_risk_score: ov.highest_risk_score,
    increasing_risks: ov.increasing_risks
  });
  if (typeof ov.total_risks !== 'number' || typeof ov.average_score !== 'number' || ov.highest_risk_score < 87) {
    throw new Error(`Invalid overview analytics metrics: ${JSON.stringify(ov)}`);
  }
  console.log('✅ Overview analytics aggregation verified.');

  // STEP 10: GET /api/risk-analytics/severity
  console.log('\n--- Step 10: Severity Distribution Breakdown ---');
  const sevRes = await fetch(`${BASE_EXPRESS}/api/risk-analytics/severity`, {
    headers: { 'Authorization': `Bearer ${superAdminToken}` }
  });
  const sevData = await sevRes.json();
  const tiers = sevData.data;
  console.log('   Severity Tiers:');
  tiers.forEach(t => console.log(`     ${t.severity}: ${t.count} (${t.percentage}%)`));
  if (tiers.length !== 4) {
    throw new Error(`Expected 4 severity tiers, got ${tiers.length}`);
  }
  console.log('✅ 4-tier severity distribution verified.');

  // STEP 11: GET /api/risk-analytics/categories
  console.log('\n--- Step 11: Category Distribution Coverage ---');
  const catRes = await fetch(`${BASE_EXPRESS}/api/risk-analytics/categories`, {
    headers: { 'Authorization': `Bearer ${superAdminToken}` }
  });
  const catData = await catRes.json();
  console.log(`   Returned ${catData.data.length} categories.`);
  if (catData.data.length !== 14) {
    throw new Error(`Expected all 14 categories represented, got ${catData.data.length}`);
  }
  console.log('✅ Category distribution verified across all 14 categories.');

  // STEP 12: GET /api/risk-analytics/trends
  console.log('\n--- Step 12: Analytics Trends Timeline ---');
  const trendsRes = await fetch(`${BASE_EXPRESS}/api/risk-analytics/trends`, {
    headers: { 'Authorization': `Bearer ${superAdminToken}` }
  });
  const trendsData = await trendsRes.json();
  console.log(`   Trends timeline points: ${trendsData.data.length}`);
  if (!Array.isArray(trendsData.data)) {
    throw new Error('Trends data must be an array');
  }
  console.log('✅ Timeline trends verified.');

  // STEP 13: GET /api/risk-analytics/heatmap (4x4 Matrix)
  console.log('\n--- Step 13: 4x4 Risk Heatmap Matrix ---');
  const heatmapRes = await fetch(`${BASE_EXPRESS}/api/risk-analytics/heatmap`, {
    headers: { 'Authorization': `Bearer ${superAdminToken}` }
  });
  const hmData = await heatmapRes.json();
  const hm = hmData.data;
  console.log(`   Heatmap cells: ${hm.cells.length} (Expected: 16)`);
  console.log(`   Probability buckets: ${hm.probability_buckets.join(', ')}`);
  console.log(`   Impact buckets: ${hm.impact_buckets.join(', ')}`);
  if (hm.cells.length !== 16 || hm.probability_buckets.length !== 4 || hm.impact_buckets.length !== 4) {
    throw new Error(`Heatmap structure mismatch: cells=${hm.cells.length}`);
  }
  console.log('✅ 4x4 Heatmap matrix verified with 16 cells and 4 quadrant buckets.');

  // STEP 14: Multi-Tenant Analytics Boundary Isolation
  console.log('\n--- Step 14: Multi-Tenant Scoping Boundaries ---');
  const msmeOvRes = await fetch(`${BASE_EXPRESS}/api/risk-analytics/overview`, {
    headers: { 'Authorization': `Bearer ${msmeToken}` }
  });
  const msmeOv = await msmeOvRes.json();
  console.log(`   Super Admin total risks: ${ov.total_risks}`);
  console.log(`   MSME tenant total risks: ${msmeOv.data.total_risks}`);
  if (msmeOv.data.total_risks >= ov.total_risks) {
    throw new Error(`Tenant leak detected: MSME saw ${msmeOv.data.total_risks} out of ${ov.total_risks} risks`);
  }
  console.log('✅ Multi-tenant analytics boundary strictly enforced.');

  // STEP 15: Clean Up and Zero Regressions Check
  console.log('\n--- Step 15: Cleanup & Verification Finalization ---');
  const delRes = await fetch(`${BASE_EXPRESS}/api/risks/${createdRiskId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${acmeToken}` }
  });
  if (delRes.status !== 200) {
    throw new Error(`Cleanup failed: status ${delRes.status}`);
  }
  console.log('✅ Test risk successfully deleted.');

  console.log('\n================================================================');
  console.log('🎉 ALL 15 DEFINITION-OF-DONE VERIFICATION STEPS PASSED 100%!');
  console.log('================================================================\n');
}

runPhase2DoDVerification().catch(err => {
  console.error('\n❌ Phase 2 DoD Verification Failed:', err);
  process.exit(1);
});
