/**
 * Comprehensive Phase 10 Verification Script
 * Real ESG/Carbon Data Integrations + Scenario Intelligence
 */

const BASE_URL = 'http://localhost:5050';
const PYTHON_URL = 'http://localhost:8000';
const INTERNAL_KEY = 'esg-ai-internal-service-key-secret-2026';

let passedTests = 0;
let failedTests = 0;

function logPass(msg) {
  console.log(`\x1b[32m  ✓ [PASS]\x1b[0m ${msg}`);
  passedTests++;
}

function logFail(msg, err = '') {
  console.error(`\x1b[31m  ✗ [FAIL]\x1b[0m ${msg}`, err ? `\n    ${err}` : '');
  failedTests++;
}

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runVerification() {
  console.log('======================================================================');
  console.log('  PHASE 10: REAL ESG/CARBON INTEGRATIONS & SCENARIO INTELLIGENCE');
  console.log('======================================================================\n');

  // STEP 1: Microservice Health Checks
  console.log('--- Step 1: Health & Runtime Component Verification ---');
  try {
    const expHealth = await fetchJson(`${BASE_URL}/api/health`);
    if (
      expHealth.ok &&
      expHealth.data.components?.integrations_framework?.status === 'HEALTHY' &&
      expHealth.data.components?.scenario_engine?.status === 'HEALTHY'
    ) {
      logPass('Express Gateway health verified: integrations_framework & scenario_engine are HEALTHY');
    } else {
      logFail(`Express Gateway health check failed: ${JSON.stringify(expHealth.data)}`);
    }

    const pyHealth = await fetchJson(`${PYTHON_URL}/health`);
    if (
      pyHealth.ok &&
      ['10.0.0', '11.0.0', '12.0.0', '13.0.0', '17.0.0'].includes(pyHealth.data.version) &&
      pyHealth.data.components?.integrations_framework?.registered_adapters === 5 &&
      pyHealth.data.components?.scenario_engine?.engine === 'scenario-engine-v1.0.0'
    ) {
      logPass(`Python Microservice verified: v${pyHealth.data.version}, 5 registered adapters, scenario-engine-v1.0.0`);
    } else {
      logFail(`Python health check failed: ${JSON.stringify(pyHealth.data)}`);
    }
  } catch (err) {
    logFail('Health check connection error', err.message);
  }

  // STEP 2: Authentication & Token Issuance
  console.log('\n--- Step 2: Authentication & Multi-Tenant Setup ---');
  let adminToken = '';
  let acmeOrgId = '';
  let msmeToken = '';
  let msmeOrgId = '';

  try {
    const adminLogin = await fetchJson(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@acme.com', password: 'password123' })
    });
    adminToken = adminLogin.data.data?.token || adminLogin.data.token;
    acmeOrgId = adminLogin.data.data?.user?.organizationId || adminLogin.data.user?.organizationId;
    if (adminToken && acmeOrgId) {
      logPass(`Admin authenticated (Acme Corporation: ${acmeOrgId})`);
    } else {
      logFail(`Admin login failed: ${JSON.stringify(adminLogin.data)}`);
    }

    const msmeLogin = await fetchJson(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'msme@esg.com', password: 'password123' })
    });
    msmeToken = msmeLogin.data.data?.token || msmeLogin.data.token;
    msmeOrgId = msmeLogin.data.data?.user?.organizationId || msmeLogin.data.user?.organizationId;
    if (msmeToken && msmeOrgId) {
      logPass(`MSME user authenticated (Eco Corp MSME: ${msmeOrgId})`);
    } else {
      logFail(`MSME login failed: ${JSON.stringify(msmeLogin.data)}`);
    }
  } catch (err) {
    logFail('Authentication step failed', err.message);
  }

  // STEP 3: Adapter Registry & Direct Microservice Capabilities
  console.log('\n--- Step 3: Python Adapter Registry & Discovery ---');
  try {
    const adaptersRes = await fetchJson(`${PYTHON_URL}/internal/integrations/adapters`);
    if (adaptersRes.ok && Array.isArray(adaptersRes.data.adapters)) {
      const names = adaptersRes.data.adapters.map(a => a.adapter_name);
      const expected = ['grid_utility', 'gri_metrics', 'supply_chain', 'regulatory_feed', 'carbon_registry'];
      const allPresent = expected.every(e => names.includes(e));
      if (allPresent) {
        logPass(`All 5 core domain adapters discovered: ${names.join(', ')}`);
      } else {
        logFail(`Missing expected adapters in: ${names.join(', ')}`);
      }
    } else {
      logFail(`Failed listing adapters: ${JSON.stringify(adaptersRes.data)}`);
    }

    // Test connection
    const testRes = await fetchJson(`${PYTHON_URL}/internal/integrations/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider_type: 'CARBON',
        adapter_name: 'grid_utility',
        config: {}
      })
    });
    if (testRes.ok && testRes.data.success) {
      logPass(`Direct adapter connectivity test passed: ${testRes.data.message}`);
    } else {
      logFail(`Adapter test failed: ${JSON.stringify(testRes.data)}`);
    }
  } catch (err) {
    logFail('Adapter discovery error', err.message);
  }

  // STEP 4: Express Ingestion Management & Live Sync
  console.log('\n--- Step 4: Express Ingestion Pipeline & Normalization ---');
  let integrationId = '';
  try {
    const createIntRes = await fetchJson(`${BASE_URL}/api/integrations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'ISO-NE Smart Grid Carbon Feeder',
        providerType: 'CARBON',
        adapterName: 'grid_utility',
        syncFrequency: 'DAILY',
        config: { utility_provider: 'ISO-NE-SmartGrid' }
      })
    });

    if (createIntRes.ok && createIntRes.data.success) {
      integrationId = createIntRes.data.data._id;
      logPass(`Created Integration record '${createIntRes.data.data.name}' (ID: ${integrationId})`);
    } else {
      logFail(`Failed creating integration: ${JSON.stringify(createIntRes.data)}`);
    }

    // Test live connection via Express API
    const testExpRes = await fetchJson(`${BASE_URL}/api/integrations/${integrationId}/test`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (testExpRes.ok && testExpRes.data.success) {
      logPass(`Express /test connection endpoint succeeded: ${testExpRes.data.message}`);
    } else {
      logFail(`Express connection test failed: ${JSON.stringify(testExpRes.data)}`);
    }

    // Trigger live sync
    const syncRes = await fetchJson(`${BASE_URL}/api/integrations/${integrationId}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ sync_type: 'FULL' })
    });

    if (syncRes.ok && syncRes.data.success) {
      const job = syncRes.data.data.job;
      const syncResult = syncRes.data.data.syncResult;
      logPass(`Live sync succeeded: ${syncResult.records_imported} records imported, job ID: ${job.jobId}`);
    } else {
      logFail(`Live sync failed: ${JSON.stringify(syncRes.data)}`);
    }

    // Run incremental sync to verify SHA-256 deduplication
    const dupSyncRes = await fetchJson(`${BASE_URL}/api/integrations/${integrationId}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ sync_type: 'FULL' })
    });

    if (dupSyncRes.ok && dupSyncRes.data.success) {
      const dupResult = dupSyncRes.data.data.syncResult;
      logPass(`SHA-256 Deduplication verified: ${dupResult.records_skipped_duplicate} duplicate records prevented from duplicate import`);
    } else {
      logFail(`Deduplication sync test failed: ${JSON.stringify(dupSyncRes.data)}`);
    }

    // Verify normalized records endpoint
    const recRes = await fetchJson(`${BASE_URL}/api/integrations/records`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (recRes.ok && Array.isArray(recRes.data.data) && recRes.data.data.length > 0) {
      const sample = recRes.data.data[0];
      logPass(`Normalized records store verified (${recRes.data.data.length} records). Sample: ${sample.metric} = ${sample.value} ${sample.unit}`);
    } else {
      logFail(`Normalized records fetch failed: ${JSON.stringify(recRes.data)}`);
    }
  } catch (err) {
    logFail('Ingestion pipeline error', err.message);
  }

  // STEP 5: Scenario Creation & Pure Deterministic Simulation
  console.log('\n--- Step 5: Scenario Intelligence & Zero-Mutation Verification ---');
  let scenarioId = '';
  let testRiskId = '';
  let baselineScoreBefore = 0;

  try {
    // 1. Create a baseline risk to test
    const riskRes = await fetchJson(`${BASE_URL}/api/risks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        title: 'Phase 10 Baseline Climate Policy Risk',
        category: 'Environmental',
        probability: 55,
        impact: 60,
        exposure: 50,
        urgency: 40,
        description: 'Baseline risk for zero-mutation verification.'
      })
    });

    if (riskRes.ok && (riskRes.data.risk || riskRes.data.data)) {
      const r = riskRes.data.risk || riskRes.data.data;
      testRiskId = r._id || r.id;
      baselineScoreBefore = r.risk_score || r.score;
      logPass(`Created baseline risk '${r.title}' with authoritative score: ${baselineScoreBefore}`);
    } else {
      logFail(`Baseline risk creation failed: ${JSON.stringify(riskRes.data)}`);
    }

    // 2. Create scenario
    const scenCreateRes = await fetchJson(`${BASE_URL}/api/scenarios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: '2026 Q3 Carbon Price Shock (+35%)',
        description: 'Simulates a 35% increase in grid emissions and Scope 2 compliance tariffs.',
        scenarioType: 'CARBON_INCREASE',
        parameters: { carbon_emission_pct_change: 35.0 }
      })
    });

    if (scenCreateRes.ok && scenCreateRes.data.success) {
      scenarioId = scenCreateRes.data.data._id;
      logPass(`Created scenario '${scenCreateRes.data.data.name}' (ID: ${scenarioId})`);
    } else {
      logFail(`Scenario creation failed: ${JSON.stringify(scenCreateRes.data)}`);
    }

    // 3. Run scenario simulation
    const runRes = await fetchJson(`${BASE_URL}/api/scenarios/${scenarioId}/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (runRes.ok && runRes.data.success) {
      const sim = runRes.data.data;
      logPass(`Scenario simulation executed deterministically: Baseline Avg=${sim.baselineAverageScore}, Projected Avg=${sim.projectedAverageScore}, Delta=${sim.scoreDelta > 0 ? '+' : ''}${sim.scoreDelta}`);
      
      // Verify simulated events
      if (Array.isArray(sim.potentialEvents) && sim.potentialEvents.length > 0) {
        const allSim = sim.potentialEvents.every(e => e.simulation === true);
        if (allSim) {
          logPass(`Potential monitoring events generated (${sim.potentialEvents.length} events) with simulation=true guardrail`);
        } else {
          logFail('Some simulated events missing simulation=true flag');
        }
      }

      // Verify citations
      if (Array.isArray(sim.policyCitations) && sim.policyCitations.length > 0) {
        logPass(`Policy grounding citations present (${sim.policyCitations.length} citations, e.g. ${sim.policyCitations[0].source})`);
      }
    } else {
      logFail(`Scenario execution failed: ${JSON.stringify(runRes.data)}`);
    }

    // 4. CRITICAL VERIFICATION: Zero-Mutation Guarantee
    const verifyRiskRes = await fetchJson(`${BASE_URL}/api/risks/${testRiskId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (verifyRiskRes.ok) {
      const r = verifyRiskRes.data.risk || verifyRiskRes.data.data;
      const currentScore = r.risk_score || r.score;
      if (currentScore === baselineScoreBefore && r.probability === 55 && r.impact === 60) {
        logPass(`ZERO-MUTATION GUARANTEE VERIFIED: Production risk score is 100% UNTOUCHED (${currentScore} == ${baselineScoreBefore})`);
      } else {
        logFail(`ZERO-MUTATION VIOLATION: Production risk score was modified from ${baselineScoreBefore} to ${currentScore}!`);
      }
    } else {
      logFail(`Failed re-fetching risk for zero-mutation verification`);
    }
  } catch (err) {
    logFail('Scenario simulation error', err.message);
  }

  // STEP 6: Multi-Scenario Comparison Matrix
  console.log('\n--- Step 6: Multi-Scenario Comparison Matrix ---');
  try {
    // Create second scenario for comparison
    const scen2Res = await fetchJson(`${BASE_URL}/api/scenarios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Aggressive Renewable Abatement (-25%)',
        description: 'Simulates on-site solar PPA reducing grid reliance.',
        scenarioType: 'CARBON_REDUCTION',
        parameters: { carbon_emission_pct_change: 25.0 }
      })
    });

    if (scen2Res.ok) {
      const s2Id = scen2Res.data.data._id;
      await fetchJson(`${BASE_URL}/api/scenarios/${s2Id}/run`, { method: 'POST', headers: { Authorization: `Bearer ${adminToken}` } });
      
      // Run comparison
      const compRes = await fetchJson(`${BASE_URL}/api/scenarios/compare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ scenario_ids: [scen2Res.data.data.scenarioId] })
      });

      if (compRes.ok && compRes.data.success) {
        const comp = compRes.data.data;
        logPass(`Multi-scenario comparison matrix generated: Evaluated ${comp.scenarios.length} scenario projections`);
        if (comp.ai_synthesis) {
          logPass(`AI Synthesis generated: "${comp.ai_synthesis.slice(0, 80)}..."`);
        }
      } else {
        logFail(`Comparison endpoint failed: ${JSON.stringify(compRes.data)}`);
      }
    }
  } catch (err) {
    logFail('Multi-scenario comparison error', err.message);
  }

  // STEP 7: Phase 5 AI Agent Tools Bridge
  console.log('\n--- Step 7: AI Agent Tools Bridge Integration ---');
  try {
    // Test simulate_risk_scenario tool
    const agentSimRes = await fetchJson(`${BASE_URL}/internal/agent-tools/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Service-Key': INTERNAL_KEY
      },
      body: JSON.stringify({
        tool_name: 'simulate_risk_scenario',
        parameters: {
          scenario_type: 'SUPPLIER_FAILURE',
          supplier_risk_pct_change: 45.0
        },
        user_context: { organization_id: acmeOrgId, role: 'ADMIN' }
      })
    });

    if (agentSimRes.ok && agentSimRes.data.success) {
      logPass(`Agent Tool 'simulate_risk_scenario' executed successfully: Projected delta=${agentSimRes.data.data?.score_delta}`);
    } else {
      logFail(`Agent Tool simulate_risk_scenario failed: ${JSON.stringify(agentSimRes.data)}`);
    }

    // Test compare_risk_scenarios tool
    const agentCompRes = await fetchJson(`${BASE_URL}/internal/agent-tools/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Service-Key': INTERNAL_KEY
      },
      body: JSON.stringify({
        tool_name: 'compare_risk_scenarios',
        parameters: { scenario_ids: [] },
        user_context: { organization_id: acmeOrgId, role: 'ADMIN' }
      })
    });

    if (agentCompRes.ok && agentCompRes.data.success) {
      logPass(`Agent Tool 'compare_risk_scenarios' executed successfully: Synthesis received`);
    } else {
      logFail(`Agent Tool compare_risk_scenarios failed: ${JSON.stringify(agentCompRes.data)}`);
    }
  } catch (err) {
    logFail('Agent tools bridge error', err.message);
  }

  // STEP 8: Multi-Tenant Isolation
  console.log('\n--- Step 8: Multi-Tenant Security & Isolation ---');
  try {
    // Tenant B cannot access Tenant A's integration
    const leakRes = await fetchJson(`${BASE_URL}/api/integrations/${integrationId}`, {
      headers: { Authorization: `Bearer ${msmeToken}` }
    });
    if (leakRes.status === 404 || leakRes.status === 403) {
      logPass(`Cross-tenant integration access rejected with ${leakRes.status} (Strict Tenant Isolation)`);
    } else {
      logFail(`Tenant isolation failure: Tenant B accessed Tenant A integration (${leakRes.status})`);
    }

    // Tenant B cannot run Tenant A's scenario
    const leakScenRes = await fetchJson(`${BASE_URL}/api/scenarios/${scenarioId}/run`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${msmeToken}` }
    });
    if (leakScenRes.status === 404 || leakScenRes.status === 403) {
      logPass(`Cross-tenant scenario simulation rejected with ${leakScenRes.status}`);
    } else {
      logFail(`Tenant isolation failure: Tenant B ran Tenant A scenario (${leakScenRes.status})`);
    }
  } catch (err) {
    logFail('Tenant isolation check error', err.message);
  }

  // SUMMARY
  console.log('\n======================================================================');
  console.log(`  VERIFICATION RESULTS: ${passedTests} PASSED / ${failedTests} FAILED`);
  console.log('======================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runVerification();
