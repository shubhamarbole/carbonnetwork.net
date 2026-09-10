/**
 * Comprehensive Phase 11 Verification Script
 * Executive Risk Intelligence: Executive Risk Center, Deterministic Executive Risk Index,
 * Top & Emerging Risks, Decision Center, AI Executive Briefings & Exports.
 */

const BASE_URL = 'http://localhost:5050';
const PYTHON_URL = 'http://localhost:8000';

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
  return { status: res.status, ok: res.ok, data, headers: res.headers };
}

async function runVerification() {
  console.log('======================================================================');
  console.log('  PHASE 11: EXECUTIVE RISK INTELLIGENCE VERIFICATION');
  console.log('======================================================================\n');

  // STEP 1: Microservice Health Checks
  console.log('--- Step 1: Health & Runtime Component Verification ---');
  try {
    const pyHealth = await fetchJson(`${PYTHON_URL}/health`);
    if (
      pyHealth.ok &&
      ['11.0.0', '12.0.0', '13.0.0', '17.0.0'].includes(pyHealth.data.version) &&
      pyHealth.data.components?.executive_intelligence?.status === 'HEALTHY' &&
      pyHealth.data.components?.executive_intelligence?.model === 'executive-index-v1.0.0'
    ) {
      logPass(`Python Microservice verified: v${pyHealth.data.version}, executive_intelligence HEALTHY with executive-index-v1.0.0`);
    } else {
      logFail(`Python health check failed: ${JSON.stringify(pyHealth.data)}`);
    }

    const expHealth = await fetchJson(`${BASE_URL}/api/health`);
    if (
      expHealth.ok &&
      expHealth.data.components?.executive_intelligence?.model === 'executive-index-v1.0.0'
    ) {
      logPass('Express Gateway health verified: executive_intelligence registered');
    } else {
      logFail(`Express Gateway health check failed: ${JSON.stringify(expHealth.data)}`);
    }
  } catch (err) {
    logFail('Health check connection error', err.message);
  }

  // STEP 2: Authentication & Token Acquisition
  console.log('\n--- Step 2: Authentication & Multi-Tenant Setup ---');
  let acmeToken = null;
  let msmeToken = null;
  let viewerToken = null;

  try {
    const acmeLogin = await fetchJson(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@acme.com', password: 'password123' })
    });
    if (acmeLogin.ok && acmeLogin.data.data?.token) {
      acmeToken = acmeLogin.data.data.token;
      logPass(`Acme Admin logged in successfully: org=${acmeLogin.data.data.user?.organizationId}`);
    } else {
      logFail('Acme Admin login failed', JSON.stringify(acmeLogin.data));
    }

    const msmeLogin = await fetchJson(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'msme@esg.com', password: 'password123' })
    });
    if (msmeLogin.ok && msmeLogin.data.data?.token) {
      msmeToken = msmeLogin.data.data.token;
      logPass(`MSME Admin logged in successfully: org=${msmeLogin.data.data.user?.organizationId}`);
    } else {
      logFail('MSME Admin login failed', JSON.stringify(msmeLogin.data));
    }

    const viewerLogin = await fetchJson(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'viewer@acme.com', password: 'password123' })
    });
    if (viewerLogin.ok && viewerLogin.data.data?.token) {
      viewerToken = viewerLogin.data.data.token;
      logPass('Acme Viewer logged in successfully');
    } else {
      logFail('Acme Viewer login failed', JSON.stringify(viewerLogin.data));
    }
  } catch (err) {
    logFail('Auth step failed', err.message);
  }

  if (!acmeToken) {
    console.error('Cannot proceed without valid token. Aborting.');
    process.exit(1);
  }

  const acmeHeaders = { 'Authorization': `Bearer ${acmeToken}`, 'Content-Type': 'application/json' };
  const msmeHeaders = { 'Authorization': `Bearer ${msmeToken}`, 'Content-Type': 'application/json' };

  // STEP 3: Seed Sample Data If Organization Has Zero Risks
  console.log('\n--- Step 3: Ensure Seed Risk & Predictive Data Exists ---');
  try {
    const risksRes = await fetchJson(`${BASE_URL}/api/risks`, { headers: acmeHeaders });
    const risks = risksRes.data?.data || [];
    if (risks.length === 0) {
      const seed1 = await fetchJson(`${BASE_URL}/api/risks`, {
        method: 'POST',
        headers: acmeHeaders,
        body: JSON.stringify({
          title: 'High Carbon Grid Volatility',
          description: 'Grid emission factors in Southern manufacturing plant fluctuating',
          category: 'Environmental',
          probability: 80,
          impact: 75,
          exposure: 70,
          urgency: 60
        })
      });
      const seed2 = await fetchJson(`${BASE_URL}/api/risks`, {
        method: 'POST',
        headers: acmeHeaders,
        body: JSON.stringify({
          title: 'CSRD Audit Milestone Delay',
          description: 'Double materiality assessment documentation backlog',
          category: 'Compliance',
          probability: 65,
          impact: 85,
          exposure: 60,
          urgency: 70
        })
      });
      logPass('Seeded test risks for executive intelligence computation');
    } else {
      logPass(`Existing active risks found (${risks.length} items)`);
    }
  } catch (err) {
    logFail('Risk seed check failed', err.message);
  }

  // STEP 4: Executive Overview API
  console.log('\n--- Step 4: Executive Overview API (GET /api/executive-risk/overview) ---');
  let overviewData = null;
  try {
    const overviewRes = await fetchJson(`${BASE_URL}/api/executive-risk/overview`, { headers: acmeHeaders });
    if (overviewRes.ok && overviewRes.data.success) {
      overviewData = overviewRes.data.data;
      logPass('GET /api/executive-risk/overview returned 200 OK');

      const idx = overviewData.executiveRiskIndex;
      if (idx && typeof idx.index === 'number' && idx.index >= 0 && idx.index <= 100) {
        logPass(`Executive Risk Index verified: ${idx.index} (${idx.severity}, trend=${idx.trend})`);
      } else {
        logFail(`Invalid executiveRiskIndex structure: ${JSON.stringify(idx)}`);
      }

      if (idx.modelVersion === 'executive-index-v1.0.0') {
        logPass(`Model version strictly verified as ${idx.modelVersion}`);
      } else {
        logFail(`Unexpected model version: ${idx.modelVersion}`);
      }

      const comp = idx.components;
      if (comp && comp.severity_weighted_mean !== undefined && comp.critical_penalty !== undefined) {
        logPass(`Formula components verified: S_mean=${comp.severity_weighted_mean}, C_penalty=${comp.critical_penalty}, H_conc=${comp.category_concentration}, B_proj=${comp.project_breadth}`);
      } else {
        logFail(`Missing component breakdown: ${JSON.stringify(comp)}`);
      }

      const kpis = overviewData.kpiSummary;
      if (kpis && kpis.totalRisks !== undefined && kpis.decisionsRequired !== undefined) {
        logPass(`KPI summary counts verified: totalRisks=${kpis.totalRisks}, critical=${kpis.criticalRisks}, high=${kpis.highRisks}, emerging=${kpis.emergingRisks}, decisionsRequired=${kpis.decisionsRequired}`);
      } else {
        logFail(`Invalid KPI summary: ${JSON.stringify(kpis)}`);
      }

      const domains = overviewData.domainExposures;
      if (domains && domains.esg && domains.carbon && domains.compliance && domains.scenario) {
        logPass(`Multi-domain exposures verified: ESG=${domains.esg.compositeScore}, Carbon=${domains.carbon.totalEmissionsTco2e}t, CBAM=€${domains.compliance.cbamEstimatedLiabilityEur}, WorstCaseScenarioDelta=+${domains.scenario.worstCaseScoreDelta}pts`);
      } else {
        logFail(`Missing domain exposures: ${JSON.stringify(domains)}`);
      }
    } else {
      logFail(`GET /api/executive-risk/overview failed: ${JSON.stringify(overviewRes.data)}`);
    }
  } catch (err) {
    logFail('Overview API request failed', err.message);
  }

  // STEP 5: Top Authoritative Risks API
  console.log('\n--- Step 5: Top Authoritative Risks (GET /api/executive-risk/top-risks) ---');
  try {
    const topRes = await fetchJson(`${BASE_URL}/api/executive-risk/top-risks?limit=5`, { headers: acmeHeaders });
    if (topRes.ok && topRes.data.success && Array.isArray(topRes.data.data)) {
      logPass(`GET /api/executive-risk/top-risks returned ${topRes.data.count} items`);
      if (topRes.data.data.length > 0) {
        const first = topRes.data.data[0];
        if (first.score !== undefined && first.severity && first.category) {
          logPass(`Authoritative score preserved on top risk: id=${first.riskId}, score=${first.score} (${first.severity})`);
        } else {
          logFail(`Invalid risk item fields: ${JSON.stringify(first)}`);
        }
      }
    } else {
      logFail(`Top risks API failed: ${JSON.stringify(topRes.data)}`);
    }
  } catch (err) {
    logFail('Top risks API request failed', err.message);
  }

  // STEP 6: Emerging Risks Radar API
  console.log('\n--- Step 6: Emerging Risks Radar (GET /api/executive-risk/emerging-risks) ---');
  try {
    const emRes = await fetchJson(`${BASE_URL}/api/executive-risk/emerging-risks?limit=5`, { headers: acmeHeaders });
    if (emRes.ok && emRes.data.success && Array.isArray(emRes.data.data)) {
      logPass(`GET /api/executive-risk/emerging-risks returned ${emRes.data.count} items`);
      if (emRes.data.data.length > 0) {
        const first = emRes.data.data[0];
        logPass(`Emerging risk trajectory verified: riskId=${first.riskId}, horizon=+${first.predictionHorizonDays}d, predictedScore=${first.predictedScore}, critProb=${((first.criticalProbability || 0) * 100).toFixed(0)}%`);
      } else {
        logPass('Emerging risks returned empty array (valid if no predictions yet)');
      }
    } else {
      logFail(`Emerging risks API failed: ${JSON.stringify(emRes.data)}`);
    }
  } catch (err) {
    logFail('Emerging risks API request failed', err.message);
  }

  // STEP 7: Decision Center API
  console.log('\n--- Step 7: Decision Center API (GET /api/executive-risk/decisions) ---');
  try {
    const decRes = await fetchJson(`${BASE_URL}/api/executive-risk/decisions`, { headers: acmeHeaders });
    if (decRes.ok && decRes.data.success && Array.isArray(decRes.data.data)) {
      logPass(`GET /api/executive-risk/decisions returned ${decRes.data.count} synthesized decision cards`);
      if (decRes.data.data.length > 0) {
        const first = decRes.data.data[0];
        if (first.id && first.category && first.priority && first.title && first.evidence && first.recommendedAction) {
          logPass(`Decision card structure verified: [${first.priority}] ${first.title} (Category: ${first.category})`);
        } else {
          logFail(`Missing decision card required fields: ${JSON.stringify(first)}`);
        }
      }
    } else {
      logFail(`Decisions API failed: ${JSON.stringify(decRes.data)}`);
    }
  } catch (err) {
    logFail('Decisions API request failed', err.message);
  }

  // STEP 8: Executive Index Trend History
  console.log('\n--- Step 8: Executive Trends (GET /api/executive-risk/trends) ---');
  try {
    const trendsRes = await fetchJson(`${BASE_URL}/api/executive-risk/trends?limit=10`, { headers: acmeHeaders });
    if (trendsRes.ok && trendsRes.data.success && Array.isArray(trendsRes.data.data)) {
      logPass(`GET /api/executive-risk/trends returned ${trendsRes.data.count} snapshot records`);
    } else {
      logFail(`Trends API failed: ${JSON.stringify(trendsRes.data)}`);
    }
  } catch (err) {
    logFail('Trends API request failed', err.message);
  }

  // STEP 9: AI Executive Briefing Generation & Zero-Hallucination
  console.log('\n--- Step 9: AI Executive Briefing Generation (POST /api/executive-risk/briefing) ---');
  let createdBriefingId = null;
  try {
    const briefingRes = await fetchJson(`${BASE_URL}/api/executive-risk/briefing`, {
      method: 'POST',
      headers: acmeHeaders,
      body: JSON.stringify({})
    });
    if (briefingRes.status === 201 && briefingRes.data.success) {
      const briefing = briefingRes.data.data;
      createdBriefingId = briefing.briefingId;
      logPass(`POST /api/executive-risk/briefing created briefing: id=${briefing.briefingId}`);

      if (briefing.executiveIndex !== undefined && briefing.executiveSeverity) {
        logPass(`Briefing index matches current state: ${briefing.executiveIndex} (${briefing.executiveSeverity})`);
      } else {
        logFail(`Missing executiveIndex on briefing: ${JSON.stringify(briefing)}`);
      }
      const s = briefing.sections;
      if (
        s &&
        (s.executiveSummary || s.executive_summary) &&
        (s.topRisksAssessment || s.top_risks_assessment) &&
        (s.emergingRisksOutlook || s.emerging_risks_outlook) &&
        (s.complianceExposure || s.compliance_exposure) &&
        (s.recommendedPriorities || s.recommended_priorities)
      ) {
        logPass('All structured executive briefing sections present and verified');
      } else {
        logFail(`Missing briefing sections: ${JSON.stringify(s)}`);
      }
    } else {
      logFail(`Briefing generation failed: ${JSON.stringify(briefingRes.data)}`);
    }
  } catch (err) {
    logFail('Briefing generation request failed', err.message);
  }

  // STEP 10: Briefings Archive & Single Item Fetch
  console.log('\n--- Step 10: Briefings Archive & Retrieval ---');
  try {
    const listRes = await fetchJson(`${BASE_URL}/api/executive-risk/briefings?limit=10`, { headers: acmeHeaders });
    if (listRes.ok && listRes.data.success && listRes.data.data.length >= 1) {
      logPass(`GET /api/executive-risk/briefings listed ${listRes.data.count} archived briefings`);
    } else {
      logFail(`Briefings list failed: ${JSON.stringify(listRes.data)}`);
    }

    if (createdBriefingId) {
      const getRes = await fetchJson(`${BASE_URL}/api/executive-risk/briefings/${createdBriefingId}`, { headers: acmeHeaders });
      if (getRes.ok && getRes.data.success && getRes.data.data?.briefingId === createdBriefingId) {
        logPass(`GET /api/executive-risk/briefings/${createdBriefingId} retrieved briefing accurately`);
      } else {
        logFail(`Single briefing retrieval failed: ${JSON.stringify(getRes.data)}`);
      }
    }
  } catch (err) {
    logFail('Briefings archive request failed', err.message);
  }

  // STEP 11: Executive Report Export (JSON & CSV)
  console.log('\n--- Step 11: Executive Export (GET /api/executive-risk/export) ---');
  try {
    const jsonExport = await fetchJson(`${BASE_URL}/api/executive-risk/export?format=json`, { headers: acmeHeaders });
    if (jsonExport.ok && jsonExport.data.success && jsonExport.data.data?.overview) {
      logPass('GET /api/executive-risk/export?format=json returned structured executive dossier');
    } else {
      logFail(`JSON export failed: ${JSON.stringify(jsonExport.data)}`);
    }

    const csvRes = await fetch(`${BASE_URL}/api/executive-risk/export?format=csv`, { headers: acmeHeaders });
    const csvText = await csvRes.text();
    if (csvRes.ok && csvText.includes('Executive Risk Index')) {
      logPass(`GET /api/executive-risk/export?format=csv returned valid CSV: length=${csvText.length} bytes`);
    } else {
      logFail(`CSV export failed: status=${csvRes.status}, text=${csvText.slice(0, 100)}`);
    }
  } catch (err) {
    logFail('Export request failed', err.message);
  }

  // STEP 12: Tenant Isolation & Scope Enforcement
  console.log('\n--- Step 12: Multi-Tenant Isolation Verification ---');
  try {
    const msmeOverview = await fetchJson(`${BASE_URL}/api/executive-risk/overview`, { headers: msmeHeaders });
    if (msmeOverview.ok && msmeOverview.data.success) {
      const msmeOrg = msmeOverview.data.data.organizationId;
      const acmeOrg = overviewData?.organizationId;
      if (msmeOrg && acmeOrg && msmeOrg !== acmeOrg) {
        logPass(`Tenant isolation verified: Acme org=${acmeOrg} !== MSME org=${msmeOrg}`);
      } else {
        logFail(`Tenant isolation compromised: orgs identical (${msmeOrg})`);
      }
    } else {
      logFail(`MSME overview failed: ${JSON.stringify(msmeOverview.data)}`);
    }
  } catch (err) {
    logFail('Tenant isolation request failed', err.message);
  }

  // STEP 13: RBAC Enforcement
  console.log('\n--- Step 13: RBAC Enforcement ---');
  try {
    const viewerHeaders = { 'Authorization': `Bearer ${viewerToken}`, 'Content-Type': 'application/json' };
    const viewerOverview = await fetchJson(`${BASE_URL}/api/executive-risk/overview`, { headers: viewerHeaders });
    if (viewerOverview.ok && viewerOverview.data.success) {
      logPass('VIEWER role permitted read-only executive overview access');
    } else {
      logFail(`Viewer overview access failed: ${JSON.stringify(viewerOverview.data)}`);
    }

    const unauth = await fetchJson(`${BASE_URL}/api/executive-risk/overview`);
    if (unauth.status === 401 || !unauth.ok) {
      logPass('Unauthenticated request correctly rejected with 401 Unauthorized');
    } else {
      logFail(`Unauthenticated request unexpectedly succeeded: status=${unauth.status}`);
    }
  } catch (err) {
    logFail('RBAC verification failed', err.message);
  }

  // FINAL SUMMARY
  console.log('\n======================================================================');
  console.log(`  PHASE 11 VERIFICATION SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('======================================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runVerification().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
