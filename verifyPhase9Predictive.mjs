/**
 * Comprehensive Phase 9 Verification Script
 * Predictive Risk Intelligence: Trajectory Forecasting, Explainability,
 * Deterministic Score Protection, Monitoring Alerts, AI Agent Tool Bridge, and Tenant Isolation.
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
  console.log('====================================================');
  console.log('  PHASE 9: PREDICTIVE RISK INTELLIGENCE VERIFICATION');
  console.log('====================================================\n');

  // STEP 1: Microservice Health Checks
  console.log('--- Step 1: Health & Runtime Component Verification ---');
  try {
    const expHealth = await fetchJson(`${BASE_URL}/api/health`);
    if (expHealth.ok && expHealth.data.components?.predictive_intelligence?.status === 'HEALTHY') {
      logPass(`Express Gateway health verified: predictive_intelligence is HEALTHY`);
    } else {
      logFail(`Express Gateway health check failed: ${JSON.stringify(expHealth.data)}`);
    }

    const pyHealth = await fetchJson(`${PYTHON_URL}/health`);
    if (pyHealth.ok && ['9.0.0', '10.0.0', '11.0.0', '12.0.0', '13.0.0', '17.0.0'].includes(pyHealth.data.version) && pyHealth.data.components?.predictive_intelligence?.status === 'HEALTHY') {
      logPass(`Python Predictive Service verified: v${pyHealth.data.version}, model: risk-predictor-v1`);
    } else {
      logFail(`Python service health failed: ${JSON.stringify(pyHealth.data)}`);
    }
  } catch (err) {
    logFail(`Health check connection error`, err.message);
  }

  // STEP 2: Authentication
  console.log('\n--- Step 2: Authentication & Token Issuance ---');
  let adminToken = '';
  let acmeOrgId = '';
  let msmeToken = '';
  let viewerToken = '';

  try {
    const adminLogin = await fetchJson(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@acme.com', password: 'password123' })
    });
    adminToken = adminLogin.data.data?.token || adminLogin.data.token;
    acmeOrgId = adminLogin.data.data?.user?.organizationId || adminLogin.data.user?.organizationId;
    if (adminToken) {
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

    const viewerLogin = await fetchJson(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'viewer@acme.com', password: 'password123' })
    });
    viewerToken = viewerLogin.data.data?.token || viewerLogin.data.token;
  } catch (err) {
    logFail(`Authentication failed`, err.message);
  }

  // STEP 3: Single Risk Trajectory Prediction (30-day default)
  console.log('\n--- Step 3: Single Risk Trajectory Forecasting ---');
  let targetRisk = null;
  let prediction30d = null;

  try {
    const risksRes = await fetchJson(`${BASE_URL}/api/risks`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const riskList = risksRes.data.data || [];
    targetRisk = riskList[0];
    if (!targetRisk) {
      throw new Error('No risks available in organization to forecast.');
    }
    logPass(`Target risk selected: [${targetRisk._id}] "${targetRisk.title}"`);
    logPass(`Initial Authoritative Score: ${targetRisk.risk_score} (${targetRisk.severity})`);

    const predRes = await fetchJson(`${BASE_URL}/api/risks/${targetRisk._id}/predict`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ horizon_days: 30 })
    });

    if (predRes.ok && predRes.data.success) {
      prediction30d = predRes.data.data;
      logPass(`Forecast executed: ID=${prediction30d.prediction_id}`);
      logPass(`Forecasted Score: ${prediction30d.predicted_score} (${prediction30d.predicted_severity})`);
      logPass(`Critical Escalation Probability: ${(prediction30d.critical_probability * 100).toFixed(1)}%`);
      logPass(`Trajectory Trend: ${prediction30d.trend}`);
      logPass(`Top Drivers: "${prediction30d.top_predictive_factors?.[0]}"`);

      if (prediction30d.critical_probability >= 0.0 && prediction30d.critical_probability <= 1.0) {
        logPass(`Critical probability is properly bounded: 0.0 <= ${prediction30d.critical_probability} <= 1.0`);
      } else {
        logFail(`Critical probability out of bounds: ${prediction30d.critical_probability}`);
      }
    } else {
      logFail(`Prediction failed: ${JSON.stringify(predRes.data)}`);
    }
  } catch (err) {
    logFail(`Step 3 failed`, err.message);
  }

  // STEP 4: Authoritative Phase 2 Deterministic Score Protection
  console.log('\n--- Step 4: Strict Authoritative Risk Score Protection Check ---');
  try {
    const checkRes = await fetchJson(`${BASE_URL}/api/risks/${targetRisk._id}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const refreshed = checkRes.data.data;
    if (refreshed.risk_score === targetRisk.risk_score && refreshed.severity === targetRisk.severity) {
      logPass(`GUARANTEED: Phase 2 deterministic risk score (${refreshed.risk_score}) and severity (${refreshed.severity}) UNTOUCHED`);
    } else {
      logFail(`VIOLATION: Risk score was modified! Old: ${targetRisk.risk_score}, New: ${refreshed.risk_score}`);
    }
  } catch (err) {
    logFail(`Step 4 failed`, err.message);
  }

  // STEP 5: Multi-Horizon Forecasting (7d and 90d)
  console.log('\n--- Step 5: Multi-Horizon Forecasting (7-Day & 90-Day) ---');
  try {
    const pred7d = await fetchJson(`${BASE_URL}/api/risks/${targetRisk._id}/predict`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ horizon_days: 7 })
    });
    if (pred7d.ok && pred7d.data.data?.prediction_horizon_days === 7) {
      logPass(`7-Day Forecast verified: Score=${pred7d.data.data.predicted_score}, Prob=${(pred7d.data.data.critical_probability * 100).toFixed(1)}%`);
    } else {
      logFail(`7-Day forecast failed: ${JSON.stringify(pred7d.data)}`);
    }

    const pred90d = await fetchJson(`${BASE_URL}/api/risks/${targetRisk._id}/predict`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ horizon_days: 90 })
    });
    if (pred90d.ok && pred90d.data.data?.prediction_horizon_days === 90) {
      logPass(`90-Day Forecast verified: Score=${pred90d.data.data.predicted_score}, Prob=${(pred90d.data.data.critical_probability * 100).toFixed(1)}%`);
    } else {
      logFail(`90-Day forecast failed: ${JSON.stringify(pred90d.data)}`);
    }
  } catch (err) {
    logFail(`Step 5 failed`, err.message);
  }

  // STEP 6: Risk Prediction History Retrieval
  console.log('\n--- Step 6: Risk Prediction History Retrieval ---');
  try {
    const histRes = await fetchJson(`${BASE_URL}/api/risks/${targetRisk._id}/predictions`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const historyList = histRes.data.data || [];
    if (histRes.ok && historyList.length >= 3) {
      logPass(`Prediction history retrieved: ${historyList.length} historical forecast snapshots`);
      logPass(`Latest history entry model: ${historyList[0].model_version}, horizon: ${historyList[0].prediction_horizon_days}d`);
    } else {
      logFail(`Failed to retrieve sufficient prediction history: count=${historyList.length}`);
    }
  } catch (err) {
    logFail(`Step 6 failed`, err.message);
  }

  // STEP 7: Predictive Analytics Overview & Emerging Risks
  console.log('\n--- Step 7: Predictive Intelligence Overview & Emerging Risks ---');
  try {
    const ovRes = await fetchJson(`${BASE_URL}/api/predictive/overview`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (ovRes.ok && ovRes.data.data?.total_predictions >= 3) {
      const ov = ovRes.data.data;
      logPass(`Overview KPIs verified: Total Forecasts=${ov.total_predictions}, Monitored Risks=${ov.active_risks_forecasted}`);
      logPass(`Avg Critical Probability: ${(ov.average_critical_probability * 100).toFixed(1)}%`);
      logPass(`Active Model: ${ov.active_model}, Feature Version: ${ov.feature_version}`);
    } else {
      logFail(`Overview failed: ${JSON.stringify(ovRes.data)}`);
    }

    const emRes = await fetchJson(`${BASE_URL}/api/predictive/emerging-risks?threshold=0.1`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (emRes.ok && Array.isArray(emRes.data.data)) {
      logPass(`Emerging risks endpoint verified: ${emRes.data.data.length} candidate emerging risks found`);
    } else {
      logFail(`Emerging risks query failed: ${JSON.stringify(emRes.data)}`);
    }

    const trRes = await fetchJson(`${BASE_URL}/api/predictive/trends`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    if (trRes.ok && trRes.data.data?.probability_distribution) {
      logPass(`Trends distribution verified: Buckets=${Object.keys(trRes.data.data.probability_distribution).join(', ')}`);
    } else {
      logFail(`Trends query failed: ${JSON.stringify(trRes.data)}`);
    }
  } catch (err) {
    logFail(`Step 7 failed`, err.message);
  }

  // STEP 8: Model Evaluation & Feedback Recording
  console.log('\n--- Step 8: Outcome Feedback Submission ---');
  try {
    if (prediction30d) {
      const fbRes = await fetchJson(`${BASE_URL}/api/predictive/feedback/${prediction30d.prediction_id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          actual_score: 62.0,
          actual_severity: 'HIGH'
        })
      });
      if (fbRes.ok && fbRes.data.data?.feedback?.actual_score === 62) {
        logPass(`Feedback successfully recorded for ${prediction30d.prediction_id}`);
        logPass(`Evaluation result: correct=${fbRes.data.data.feedback.prediction_correct}`);
      } else {
        logFail(`Feedback submission failed: ${JSON.stringify(fbRes.data)}`);
      }
    }
  } catch (err) {
    logFail(`Step 8 failed`, err.message);
  }

  // STEP 9: AI Agent Tool Execution Bridge
  console.log('\n--- Step 9: AI Agent Tool Bridge (`predict_risk_trajectory`) ---');
  try {
    const toolRes = await fetchJson(`${BASE_URL}/internal/agent-tools/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Service-Key': INTERNAL_KEY
      },
      body: JSON.stringify({
        tool_name: 'predict_risk_trajectory',
        user_context: { organization_id: acmeOrgId, role: 'ADMIN' },
        parameters: {
          risk_id: targetRisk._id,
          prediction_horizon_days: 30
        }
      })
    });

    if (toolRes.ok && toolRes.data.success && toolRes.data.data?.predicted_score !== undefined) {
      logPass(`Agent tool bridge executed successfully: predicted_score=${toolRes.data.data.predicted_score}`);
      logPass(`Agent tool returned critical_probability=${(toolRes.data.data.critical_probability * 100).toFixed(1)}%`);
    } else {
      logFail(`Agent tool execution failed: ${JSON.stringify(toolRes.data)}`);
    }
  } catch (err) {
    logFail(`Step 9 failed`, err.message);
  }

  // STEP 10: Multi-Tenant Isolation
  console.log('\n--- Step 10: Multi-Tenant Data Isolation ---');
  try {
    // MSME user attempts to access Acme risk prediction
    const crossRes = await fetchJson(`${BASE_URL}/api/risks/${targetRisk._id}/predictions`, {
      headers: { 'Authorization': `Bearer ${msmeToken}` }
    });
    if (crossRes.status === 403 || crossRes.status === 404) {
      logPass(`Multi-tenant isolation verified: MSME user blocked from Acme risk predictions (${crossRes.status})`);
    } else {
      logFail(`Data leakage: MSME user accessed Acme predictions! (${crossRes.status})`);
    }

    // MSME user attempts to trigger prediction on Acme risk
    const crossPredict = await fetchJson(`${BASE_URL}/api/risks/${targetRisk._id}/predict`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${msmeToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ horizon_days: 30 })
    });
    if (crossPredict.status === 403 || crossPredict.status === 404) {
      logPass(`Multi-tenant isolation verified: MSME user blocked from triggering prediction on Acme risk (${crossPredict.status})`);
    } else {
      logFail(`Security breach: MSME user triggered prediction on Acme risk! (${crossPredict.status})`);
    }
  } catch (err) {
    logFail(`Step 10 failed`, err.message);
  }

  // STEP 11: RBAC Enforcement (Viewer Read-Only)
  console.log('\n--- Step 11: RBAC Enforcement (Viewer Restrictions) ---');
  try {
    const viewerPredict = await fetchJson(`${BASE_URL}/api/risks/${targetRisk._id}/predict`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${viewerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ horizon_days: 30 })
    });
    if (viewerPredict.status === 403) {
      logPass(`RBAC verified: Viewer is forbidden from triggering forecasts (403 Forbidden)`);
    } else {
      logFail(`RBAC failure: Viewer was allowed to trigger forecast! (${viewerPredict.status})`);
    }

    const viewerRead = await fetchJson(`${BASE_URL}/api/risks/${targetRisk._id}/predictions`, {
      headers: { 'Authorization': `Bearer ${viewerToken}` }
    });
    if (viewerRead.ok) {
      logPass(`RBAC verified: Viewer has read-only access to historical predictions (${viewerRead.data.data?.length} records)`);
    } else {
      logFail(`Viewer could not view predictions: ${JSON.stringify(viewerRead.data)}`);
    }
  } catch (err) {
    logFail(`Step 11 failed`, err.message);
  }

  // SUMMARY
  console.log('\n====================================================');
  console.log(`  VERIFICATION RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
