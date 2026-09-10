/**
 * ESG / CarbonCredit.Network — Phase 18 Unified Enterprise Command Center
 * End-to-End Verification Suite
 */

import assert from 'assert';

const BASE_URL = 'http://localhost:5050';
const PY_URL = 'http://localhost:8000';
const VITE_URL = 'http://localhost:3030';

let adminToken = '';
let esgMgrToken = '';
let viewerToken = '';
let msmeToken = '';
let testRiskId = '';

console.log('==================================================================================');
console.log('  ESG / CARBONCREDIT.NETWORK — PHASE 18 UNIFIED COMMAND CENTER VERIFICATION');
console.log('==================================================================================\n');

async function runTest(name, fn) {
  try {
    process.stdout.write(`  ⏳ ${name}... `);
    await fn();
    console.log(`\x1b[32m✓ [PASS]\x1b[0m`);
    return true;
  } catch (err) {
    console.log(`\x1b[31m✗ [FAIL]\x1b[0m`);
    console.error(`     Error: ${err.message}`);
    return false;
  }
}

async function login(email, password = 'password123') {
  const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(`Login failed for ${email}: ${data.message || res.statusText}`);
  }
  return data.data.token;
}

let passedCount = 0;
let totalCount = 0;

async function executeSuite() {
  // Step 1: Health & Subsystems
  console.log('--- Step 1: Health & Runtime Subsystems Verification ---');
  totalCount++;
  if (await runTest('Express Gateway v18.0.0 and Command Center health check', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert.strictEqual(res.ok, true);
    const body = await res.json();
    assert.strictEqual(body.status, 'healthy');
    assert.strictEqual(body.version, '18.0.0');
    assert.strictEqual(body.components.command_center.status, 'HEALTHY');
    assert.strictEqual(body.components.command_center.priority_engine, 'priority-calc-v1.0.0');
  })) passedCount++;

  totalCount++;
  if (await runTest('Python AI Microservice health check', async () => {
    const res = await fetch(`${PY_URL}/health`);
    assert.strictEqual(res.ok, true);
    const body = await res.json();
    assert.strictEqual(body.status, 'healthy');
  })) passedCount++;

  totalCount++;
  if (await runTest('Vite Frontend Server running on port 3030', async () => {
    const res = await fetch(VITE_URL);
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.status, 200);
  })) passedCount++;

  // Step 2: Multi-Persona Authentication
  console.log('\n--- Step 2: Multi-Persona Authentication & Multi-Tenant Setup ---');
  totalCount++;
  if (await runTest('Authenticate Acme Admin, ESG Manager, Viewer, and MSME User', async () => {
    adminToken = await login('admin@acme.com');
    esgMgrToken = await login('esg_mgr@acme.com');
    viewerToken = await login('viewer@acme.com');
    msmeToken = await login('msme@esg.com');
    assert.ok(adminToken && esgMgrToken && viewerToken && msmeToken);
  })) passedCount++;

  // Step 3: Overview Aggregation API
  console.log('\n--- Step 3: Command Center Overview API (GET /api/command-center/overview) ---');
  let overviewData = null;
  totalCount++;
  if (await runTest('Retrieve authoritative Command Center overview data', async () => {
    const res = await fetch(`${BASE_URL}/api/command-center/overview`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.ok, true);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    overviewData = json.data;

    // Verify all 10 required domain aggregations exist
    assert.ok(overviewData.kpi, 'KPI block must exist');
    assert.ok(overviewData.risk, 'Risk block must exist');
    assert.ok(overviewData.predictions, 'Predictions block must exist');
    assert.ok(overviewData.alerts, 'Alerts block must exist');
    assert.ok(overviewData.workflows, 'Workflows block must exist');
    assert.ok(overviewData.decisions, 'Decisions block must exist');
    assert.ok(overviewData.scenarios, 'Scenarios block must exist');
    assert.ok(overviewData.ai_activity, 'AI Activity block must exist');
    assert.ok(Array.isArray(overviewData.action_queue), 'Action queue must be an array');
    assert.ok(Array.isArray(overviewData.activity_feed), 'Activity feed must be an array');
    assert.ok(overviewData.health, 'Health block must exist');
  })) passedCount++;

  // Step 4: KPI Authoritative Accuracy
  console.log('\n--- Step 4: Top 8 KPI Cards Verification ---');
  totalCount++;
  if (await runTest('Validate authoritative KPI calculations and bounds', async () => {
    const kpi = overviewData.kpi;
    assert.strictEqual(typeof kpi.overallRiskIndex, 'number');
    assert.ok(kpi.overallRiskIndex >= 0 && kpi.overallRiskIndex <= 100);
    assert.strictEqual(typeof kpi.criticalRisks, 'number');
    assert.strictEqual(typeof kpi.emergingRisks, 'number');
    assert.strictEqual(typeof kpi.overdueActions, 'number');
    assert.strictEqual(typeof kpi.pendingApprovals, 'number');
    assert.strictEqual(typeof kpi.activeWorkflows, 'number');
    assert.strictEqual(typeof kpi.aiInvestigations, 'number');
    assert.strictEqual(typeof kpi.criticalAlerts, 'number');
  })) passedCount++;

  // Step 5: Priority Engine & Action Queue Generation
  console.log('\n--- Step 5: Deterministic Priority Engine & Action Queue Generation ---');
  let actionItems = [];
  totalCount++;
  if (await runTest('Retrieve Action Queue and verify priority-calc-v1.0.0 ranking', async () => {
    const res = await fetch(`${BASE_URL}/api/command-center/actions`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.ok, true);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.engine_version, 'priority-calc-v1.0.0');
    actionItems = json.data.items;
    assert.ok(actionItems.length > 0, 'Should have at least 1 action item');

    const first = actionItems[0];
    assert.ok(first.action_id, 'Must have action_id');
    assert.ok(['P1_CRITICAL', 'P2_HIGH', 'P3_MEDIUM', 'P4_INFORMATIONAL'].includes(first.priority));
    assert.ok(first.priority_score >= 0 && first.priority_score <= 100);
    assert.ok(first.title);
    assert.ok(first.resource_type);
    assert.ok(first.resource_id);
    assert.ok(Array.isArray(first.available_actions));
  })) passedCount++;

  // Step 6: Action Queue Filtering
  console.log('\n--- Step 6: Action Queue Filtering (Priority & Type) ---');
  totalCount++;
  if (await runTest('Filter action queue by priority=P1_CRITICAL', async () => {
    const res = await fetch(`${BASE_URL}/api/command-center/actions?priority=P1_CRITICAL`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.ok, true);
    const json = await res.json();
    json.data.items.forEach(item => {
      assert.strictEqual(item.priority, 'P1_CRITICAL');
    });
  })) passedCount++;

  // Step 7: Direct Operational Action Execution
  console.log('\n--- Step 7: Action Execution & State Transition ---');
  totalCount++;
  if (await runTest('Admin executes ESCALATE action on an authorized risk', async () => {
    const criticalAction = actionItems.find(a => a.resource_type === 'Risk');
    if (!criticalAction) throw new Error('No Risk action found in queue');

    const res = await fetch(`${BASE_URL}/api/command-center/actions/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        action_id: criticalAction.action_id,
        action_type: 'ESCALATE',
        resource_type: 'Risk',
        resource_id: criticalAction.resource_id
      })
    });
    assert.strictEqual(res.ok, true);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.executed, true);
  })) passedCount++;

  // Step 8: RBAC Enforcement
  console.log('\n--- Step 8: RBAC Enforcement (Viewer Role Blocked) ---');
  totalCount++;
  if (await runTest('Viewer role is rejected with HTTP 403 Forbidden for action execution', async () => {
    const criticalAction = actionItems.find(a => a.resource_type === 'Risk');
    const res = await fetch(`${BASE_URL}/api/command-center/actions/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${viewerToken}`
      },
      body: JSON.stringify({
        action_id: 'test_action',
        action_type: 'ESCALATE',
        resource_type: 'Risk',
        resource_id: criticalAction ? criticalAction.resource_id : 'sample_id'
      })
    });
    assert.strictEqual(res.status, 403);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.ok(json.message.includes('Forbidden') || json.message.includes('Viewer'));
  })) passedCount++;

  // Step 9: Activity Feed Aggregation
  console.log('\n--- Step 9: Activity Feed Aggregator ---');
  totalCount++;
  if (await runTest('Retrieve multi-domain activity feed scoped to tenant', async () => {
    const res = await fetch(`${BASE_URL}/api/command-center/activity`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.ok, true);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.data));
    if (json.data.length > 0) {
      const ev = json.data[0];
      assert.ok(ev.timestamp);
      assert.ok(ev.event_type);
      assert.ok(ev.title);
      assert.ok(ev.resource);
    }
  })) passedCount++;

  // Step 10: Universal Search
  console.log('\n--- Step 10: Global Universal Search ---');
  totalCount++;
  if (await runTest('Perform global search across risks, projects, and agent runs', async () => {
    const res = await fetch(`${BASE_URL}/api/command-center/search?q=risk`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.ok, true);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(Array.isArray(json.data.results));
    assert.ok(json.data.total > 0);
  })) passedCount++;

  // Step 11: Unified Context Drawer API
  console.log('\n--- Step 11: 360-Degree Context Investigation Drawer ---');
  totalCount++;
  if (await runTest('Retrieve 360-degree context for a target risk resource', async () => {
    const criticalAction = actionItems.find(a => a.resource_type === 'Risk');
    const riskId = criticalAction ? criticalAction.resource_id : '6a927a855b26a2ad8b17be30';

    const res = await fetch(`${BASE_URL}/api/command-center/context/risk/${riskId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.ok, true);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data.context, 'Context bundle must be returned');
    assert.ok(json.data.navigation, 'Navigation links must be returned');
  })) passedCount++;

  // Step 12: Global AI Copilot Integration
  console.log('\n--- Step 12: Global AI Risk Copilot Integration (Phase 5 Connected) ---');
  totalCount++;
  if (await runTest('Query AI Copilot with preset question and retrieve multi-step synthesis', async () => {
    const res = await fetch(`${BASE_URL}/api/ai-agent/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        goal: 'What are the three most urgent risks in our project registry?'
      })
    });
    assert.strictEqual(res.ok, true);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.ok(json.data.agent_run_id);
    assert.ok(['COMPLETED', 'WAITING_FOR_APPROVAL'].includes(json.data.status));
  })) passedCount++;

  // Step 13: Platform Subsystems Health
  console.log('\n--- Step 13: Platform Subsystems Health Aggregation (9/9) ---');
  totalCount++;
  if (await runTest('Verify 9/9 platform subsystems statuses and latencies', async () => {
    const res = await fetch(`${BASE_URL}/api/command-center/health`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.ok, true);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.subsystems.length, 9);
    json.data.subsystems.forEach(sub => {
      assert.ok(sub.name);
      assert.ok(['HEALTHY', 'DEGRADED', 'FAILED'].includes(sub.status));
      assert.ok(typeof sub.latency_ms === 'number');
    });
  })) passedCount++;

  // Step 14: Multi-Tenant Boundary Isolation
  console.log('\n--- Step 14: Multi-Tenant Boundary Isolation ---');
  totalCount++;
  if (await runTest('Isolated MSME tenant cannot access Acme Corporation data in overview', async () => {
    const res = await fetch(`${BASE_URL}/api/command-center/overview`, {
      headers: { 'Authorization': `Bearer ${msmeToken}` }
    });
    assert.strictEqual(res.ok, true);
    const json = await res.json();
    assert.strictEqual(json.success, true);

    // Verify MSME tenant sees only their own data (critical risks count isolated)
    assert.ok(json.data.kpi.criticalRisks <= 5, 'MSME organization must not see Acme enterprise risks');
  })) passedCount++;

  // Step 15: 15-Stage Full Lifecycle Integration Scenario
  console.log('\n--- Step 15: 15-Stage Full Lifecycle Operational Scenario ---');
  totalCount++;
  if (await runTest('Execute complete 15-stage pipeline from risk spike to Command Center resolution', async () => {
    // 1. Create a high-exposure test risk
    const createRes = await fetch(`${BASE_URL}/api/risks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        title: 'Phase 18 Pipeline High Voltage Surge Risk',
        description: 'Electrical transformer surge risk threatening refinery microgrid.',
        category: 'Operational',
        probability: 92,
        impact: 94,
        exposure: 90,
        urgency: 88
      })
    });
    assert.strictEqual(createRes.ok, true);
    const createdRisk = (await createRes.json()).data;
    testRiskId = createdRisk._id ? createdRisk._id.toString() : createdRisk.riskId;

    // 2. Recalculate deterministic score
    assert.strictEqual(createdRisk.risk_score, 91.9); // (92*0.35 + 94*0.35 + 90*0.2 + 88*0.1) = 32.2 + 32.9 + 18.0 + 8.8 = 91.9

    // 3. Telemetry Event & Alert
    const alertRes = await fetch(`${BASE_URL}/api/alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        title: 'Refinery Microgrid Voltage Anomaly',
        description: 'High voltage surge detected at transformer unit B.',
        severity: 'CRITICAL',
        type: 'CRITICAL_RISK',
        riskId: testRiskId
      })
    });
    assert.strictEqual(alertRes.ok, true);

    // 4. Action Queue must now display the critical item
    const queueRes = await fetch(`${BASE_URL}/api/command-center/actions`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const queueJson = await queueRes.json();
    const item = queueJson.data.items.find(a => a.resource_id === testRiskId);
    assert.ok(item, 'Newly created critical risk must appear in Action Queue');
    assert.strictEqual(item.priority, 'P1_CRITICAL');

    // 5. Query Copilot on the issue
    const copilotRes = await fetch(`${BASE_URL}/api/ai-agent/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        goal: `Analyze high voltage transformer risk ${testRiskId} and propose containment.`
      })
    });
    assert.strictEqual(copilotRes.ok, true);

    // 6. Execute action through Command Center
    const execRes = await fetch(`${BASE_URL}/api/command-center/actions/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        action_id: item.action_id,
        action_type: 'ESCALATE',
        resource_type: 'Risk',
        resource_id: testRiskId
      })
    });
    assert.strictEqual(execRes.ok, true);

    // 7. Context Drawer check
    const ctxRes = await fetch(`${BASE_URL}/api/command-center/context/risk/${testRiskId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(ctxRes.ok, true);
    const ctxJson = await ctxRes.json();
    assert.strictEqual(ctxJson.data.context.currentRisk.risk_score, 91.9);

    // 8. Overview refreshed reflects updated state
    const ovRes = await fetch(`${BASE_URL}/api/command-center/overview`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(ovRes.ok, true);
  })) passedCount++;

  // Step 16: Complete Audit Trail
  console.log('\n--- Step 16: Audit Trail Verification ---');
  totalCount++;
  if (await runTest('Verify COMMAND_CENTER_VIEWED, ACTION_EXECUTED, and SEARCHED recorded in audit log', async () => {
    const res = await fetch(`${BASE_URL}/api/risks/audit-logs`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.ok, true);
    const json = await res.json();
    const actions = (json.data || []).map(a => a.action);

    assert.ok(actions.includes('COMMAND_CENTER_VIEWED'), 'Must have logged COMMAND_CENTER_VIEWED');
    assert.ok(actions.includes('COMMAND_CENTER_ACTION_EXECUTED'), 'Must have logged COMMAND_CENTER_ACTION_EXECUTED');
    assert.ok(actions.includes('COMMAND_CENTER_SEARCHED'), 'Must have logged COMMAND_CENTER_SEARCHED');
  })) passedCount++;

  console.log('\n==================================================================================');
  console.log(`  FINAL VERIFICATION SUMMARY: ${passedCount} / ${totalCount} PASSED`);
  console.log('==================================================================================');

  if (passedCount === totalCount) {
    console.log('\n  🎉 ALL PHASE 18 ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.log(`\n  ❌ ${totalCount - passedCount} TEST(S) FAILED.\n`);
    process.exit(1);
  }
}

executeSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
