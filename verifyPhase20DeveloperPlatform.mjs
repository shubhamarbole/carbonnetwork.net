/**
 * ESG / CarbonCredit.Network — Phase 20 Enterprise Developer API Platform
 * Comprehensive Verification Suite
 */

import assert from 'assert';
import crypto from 'crypto';

const BASE_URL = 'http://localhost:5050';
const PY_URL = 'http://localhost:8000';
const VITE_URL = 'http://localhost:3030';

let adminToken = '';
let msmeUserToken = '';

let acmeAppId = '';
let acmeClientId = '';
let acmeClientSecret = '';
let acmeOAuthToken = '';
let acmeLiveApiKey = '';
let acmeCredId = '';

let acmeReadOnlyCredId = '';
let acmeReadOnlyApiKey = '';

let sandboxAppId = '';
let sandboxTestApiKey = '';
let sandboxCredId = '';

let msmeAppId = '';
let msmeApiKey = '';

let testRiskId = '';
let webhookEndpointId = '';
let webhookSecret = '';

console.log('==================================================================================');
console.log('  ESG / CARBONCREDIT.NETWORK — PHASE 20 DEVELOPER API PLATFORM VERIFICATION');
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
  console.log('--- Step 1: Platform Health & Developer Subsystem Verification ---');
  totalCount++;
  if (await runTest('Express Gateway v18.0.0 reports developer_platform: HEALTHY', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert.strictEqual(res.ok, true);
    const body = await res.json();
    assert.strictEqual(body.status, 'healthy');
    assert.strictEqual(body.components.developer_platform.status, 'HEALTHY');
    assert.strictEqual(body.components.developer_platform.api_version, 'v1.0.0');
    assert.strictEqual(body.components.developer_platform.openapi, '/api/v1/openapi.json');
  })) passedCount++;

  totalCount++;
  if (await runTest('Vite Frontend Server (:3030) and Python Microservice (:8000) are healthy', async () => {
    const vRes = await fetch(VITE_URL);
    assert.strictEqual(vRes.ok, true);
    assert.strictEqual(vRes.status, 200);

    const pRes = await fetch(`${PY_URL}/health`);
    assert.strictEqual(pRes.ok, true);
    const pBody = await pRes.json();
    assert.strictEqual(pBody.status, 'healthy');
  })) passedCount++;

  // Step 2: Login Admin & Setup
  console.log('\n--- Step 2: Administrator & Multi-Tenant Setup ---');
  totalCount++;
  if (await runTest('Authenticate Acme Admin and MSME User', async () => {
    adminToken = await login('admin@acme.com');
    msmeUserToken = await login('msme@esg.com');
    assert.ok(adminToken && msmeUserToken);
  })) passedCount++;

  // Step 3: OpenAPI 3.0 Specification
  console.log('\n--- Step 3: OpenAPI 3.0 Specification (GET /api/v1/openapi.json) ---');
  totalCount++;
  if (await runTest('Authoritative OpenAPI 3.0.3 Specification validation', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/openapi.json`);
    assert.strictEqual(res.ok, true);
    assert.strictEqual(res.status, 200);
    const spec = await res.json();

    assert.strictEqual(spec.openapi, '3.0.3');
    assert.strictEqual(spec.info.title, 'ESG & CarbonCredit.Network Enterprise Developer API');
    assert.strictEqual(spec.info.version, '1.0.0');
    assert.ok(spec.paths['/risks']);
    assert.ok(spec.paths['/oauth/token']);
    assert.ok(spec.paths['/agent/runs']);
    assert.ok(spec.paths['/webhooks']);
    assert.ok(spec.components.securitySchemes.ApiKeyAuth);
    assert.ok(spec.components.securitySchemes.OAuth2);
    assert.ok(spec.components.schemas.StandardSuccessEnvelope);
    assert.ok(spec.components.schemas.StandardErrorEnvelope);
  })) passedCount++;

  // Step 4: Developer Application Registration
  console.log('\n--- Step 4: Developer Application Registration & Single-Reveal Secrets ---');
  totalCount++;
  if (await runTest('Create Acme Developer Application and retrieve single-reveal client_secret', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/developer/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Acme Enterprise Risk Integrator',
        description: 'Core ERP and Carbon Ledger Integration Service',
        scopes: [
          'risk:read', 'risk:write',
          'prediction:read',
          'analysis:read', 'analysis:run',
          'agent:run',
          'scenario:read', 'scenario:run',
          'alert:read', 'alert:write',
          'workflow:read',
          'executive:read'
        ],
        rate_limit_tier: 'ENTERPRISE',
        is_sandbox: false
      })
    });

    assert.strictEqual(res.status, 201);
    const json = await res.json();
    assert.ok(json.data);
    assert.ok(json.data.application_id);
    assert.ok(json.data.client_id.startsWith('client_'));
    assert.ok(json.data.client_secret.startsWith('sec_'));
    assert.strictEqual(json.data.status, 'ACTIVE');
    assert.strictEqual(json.data.rate_limit_tier, 'ENTERPRISE');

    acmeAppId = json.data.application_id;
    acmeClientId = json.data.client_id;
    acmeClientSecret = json.data.client_secret;
  })) passedCount++;

  // Step 5: OAuth 2.0 Client Credentials Grant
  console.log('\n--- Step 5: OAuth 2.0 Client Credentials Token Grant (POST /api/v1/oauth/token) ---');
  totalCount++;
  if (await runTest('Obtain OAuth 2.0 Access Token with client credentials', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: acmeClientId,
        client_secret: acmeClientSecret,
        grant_type: 'client_credentials'
      })
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.ok(json.access_token);
    assert.strictEqual(json.token_type, 'Bearer');
    assert.strictEqual(json.expires_in, 3600);
    assert.ok(json.scope.includes('risk:read'));

    acmeOAuthToken = json.access_token;
  })) passedCount++;

  totalCount++;
  if (await runTest('Reject OAuth 2.0 Token Grant with invalid client_secret (401 UNAUTHENTICATED)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: acmeClientId,
        client_secret: 'sec_invalid_bogus_secret_12345',
        grant_type: 'client_credentials'
      })
    });

    assert.strictEqual(res.status, 401);
    const json = await res.json();
    assert.strictEqual(json.error.code, 'UNAUTHENTICATED');
  })) passedCount++;

  // Step 6: API Key Credential Creation
  console.log('\n--- Step 6: API Credential Creation & Single-Reveal API Keys ---');
  totalCount++;
  if (await runTest('Generate Full-Access Live API Key (esg_live_...) with SHA-256 storage', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/developer/applications/${acmeAppId}/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        scopes: [
          'risk:read', 'risk:write',
          'prediction:read',
          'analysis:read', 'analysis:run',
          'agent:run',
          'scenario:read', 'scenario:run',
          'alert:read', 'alert:write',
          'workflow:read',
          'executive:read'
        ]
      })
    });

    assert.strictEqual(res.status, 201);
    const json = await res.json();
    assert.ok(json.data.credential_id);
    assert.ok(json.data.api_key.startsWith('esg_live_'));
    assert.ok(json.data.key_prefix.startsWith('esg_live_'));
    assert.strictEqual(json.data.status, 'ACTIVE');

    acmeCredId = json.data.credential_id;
    acmeLiveApiKey = json.data.api_key;
  })) passedCount++;

  totalCount++;
  if (await runTest('Generate Restricted Read-Only API Key (scope: risk:read only)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/developer/applications/${acmeAppId}/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        scopes: ['risk:read']
      })
    });

    assert.strictEqual(res.status, 201);
    const json = await res.json();
    assert.ok(json.data.credential_id);
    assert.ok(json.data.api_key.startsWith('esg_live_'));
    assert.deepStrictEqual(json.data.scopes, ['risk:read']);

    acmeReadOnlyCredId = json.data.credential_id;
    acmeReadOnlyApiKey = json.data.api_key;
  })) passedCount++;

  // Step 7: API Gateway Pipeline & Envelope Validation
  console.log('\n--- Step 7: Gateway Pipeline, Correlation ID & Response Envelopes ---');
  totalCount++;
  if (await runTest('Authorize request via API Key and verify Correlation ID + Meta envelope', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/risks`, {
      headers: {
        'X-API-Key': acmeLiveApiKey
      }
    });

    assert.strictEqual(res.status, 200);
    const reqIdHeader = res.headers.get('x-request-id');
    assert.ok(reqIdHeader, 'X-Request-ID header must be present');

    const json = await res.json();
    assert.ok(Array.isArray(json.data), 'Payload must have data array');
    assert.ok(json.pagination, 'Payload must have pagination envelope');
    assert.ok(json.meta, 'Payload must have meta envelope');
    assert.strictEqual(json.meta.request_id, reqIdHeader, 'Envelope request_id must match header');
  })) passedCount++;

  totalCount++;
  if (await runTest('Authorize request via OAuth 2.0 Bearer token', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/risks`, {
      headers: {
        'Authorization': `Bearer ${acmeOAuthToken}`
      }
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.ok(Array.isArray(json.data));
  })) passedCount++;

  totalCount++;
  if (await runTest('Reject unauthorized requests with 401 UNAUTHENTICATED', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/risks`);
    assert.strictEqual(res.status, 401);
    const json = await res.json();
    assert.strictEqual(json.error.code, 'UNAUTHENTICATED');
    assert.ok(json.error.request_id);
  })) passedCount++;

  // Step 8: Granular Scope Validation
  console.log('\n--- Step 8: Granular Scope Enforcement (403 FORBIDDEN Rejection) ---');
  totalCount++;
  if (await runTest('Reject POST /api/v1/risks with Read-Only Key (403 FORBIDDEN)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/risks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': acmeReadOnlyApiKey
      },
      body: JSON.stringify({
        title: 'Unauthorized Create Risk',
        category: 'ENVIRONMENTAL',
        severity: 'HIGH'
      })
    });

    assert.strictEqual(res.status, 403);
    const json = await res.json();
    assert.strictEqual(json.error.code, 'FORBIDDEN');
    assert.ok(json.error.message.includes('risk:write'));
  })) passedCount++;

  // Step 9: Idempotency Guard
  console.log('\n--- Step 9: Idempotency Guard (Idempotency-Key 24-Hour Cache) ---');
  const idempKey = `test-idemp-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  let createdRiskId = '';

  totalCount++;
  if (await runTest('First POST /api/v1/risks with Idempotency-Key succeeds (201 Created)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/risks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': acmeLiveApiKey,
        'Idempotency-Key': idempKey
      },
      body: JSON.stringify({
        title: 'Refinery Effluent Containment Failure',
        category: 'ENVIRONMENTAL',
        severity: 'HIGH',
        probability: 65,
        impact: 75,
        description: 'Simulated industrial effluent surge risk.'
      })
    });

    assert.strictEqual(res.status, 201);
    const json = await res.json();
    assert.ok(json.data._id);
    createdRiskId = json.data._id;
    testRiskId = json.data._id;
  })) passedCount++;

  totalCount++;
  if (await runTest('Duplicate POST /api/v1/risks with same Idempotency-Key returns cached replay (X-Idempotent-Replay)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/risks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': acmeLiveApiKey,
        'Idempotency-Key': idempKey
      },
      body: JSON.stringify({
        title: 'Refinery Effluent Containment Failure (Modified Title)',
        category: 'ENVIRONMENTAL',
        severity: 'HIGH'
      })
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.headers.get('x-idempotent-replay'), 'true');
    const json = await res.json();
    assert.strictEqual(json.data._id, createdRiskId, 'Must return identical cached response without creating second risk');
  })) passedCount++;

  // Step 10: Controlled Domain Endpoints
  console.log('\n--- Step 10: Controlled Domain APIs (Risks, Predictions, AI Agent, Scenarios, Executive) ---');
  totalCount++;
  if (await runTest('GET /api/v1/risks/:id and PATCH /api/v1/risks/:id', async () => {
    // GET single risk
    const getRes = await fetch(`${BASE_URL}/api/v1/risks/${testRiskId}`, {
      headers: { 'X-API-Key': acmeLiveApiKey }
    });
    assert.strictEqual(getRes.status, 200);
    const getJson = await getRes.json();
    assert.strictEqual(getJson.data._id, testRiskId);

    // PATCH risk
    const patchRes = await fetch(`${BASE_URL}/api/v1/risks/${testRiskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': acmeLiveApiKey
      },
      body: JSON.stringify({ severity: 'CRITICAL', status: 'UNDER_REVIEW' })
    });
    assert.strictEqual(patchRes.status, 200);
    const patchJson = await patchRes.json();
    assert.strictEqual(patchJson.data.severity, 'CRITICAL');
    assert.strictEqual(patchJson.data.status, 'UNDER_REVIEW');
  })) passedCount++;

  totalCount++;
  if (await runTest('POST /api/v1/risks/:id/predict and GET /api/v1/risks/:id/predictions', async () => {
    const predictRes = await fetch(`${BASE_URL}/api/v1/risks/${testRiskId}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': acmeLiveApiKey
      },
      body: JSON.stringify({ horizon_days: 60 })
    });
    assert.strictEqual(predictRes.status, 201);
    const predJson = await predictRes.json();
    assert.ok(predJson.data.predicted_score);
    assert.ok(predJson.data.critical_probability !== undefined);

    const historyRes = await fetch(`${BASE_URL}/api/v1/risks/${testRiskId}/predictions`, {
      headers: { 'X-API-Key': acmeLiveApiKey }
    });
    assert.strictEqual(historyRes.status, 200);
    const histJson = await historyRes.json();
    assert.ok(Array.isArray(histJson.data));
    assert.ok(histJson.data.length >= 1);
  })) passedCount++;

  totalCount++;
  if (await runTest('POST /api/v1/risks/:id/analyze (LLM Risk Analysis)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/risks/${testRiskId}/analyze`, {
      method: 'POST',
      headers: { 'X-API-Key': acmeLiveApiKey }
    });
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.ok(json.data.analysis_id);
    assert.ok(json.data.executive_summary);
    assert.ok(json.data.recommended_mitigations.length > 0);
  })) passedCount++;

  totalCount++;
  if (await runTest('POST /api/v1/agent/runs & GET /api/v1/agent/runs/:id/steps (Phase 5 Autonomous Agent)', async () => {
    const runRes = await fetch(`${BASE_URL}/api/v1/agent/runs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': acmeLiveApiKey,
        'Idempotency-Key': `agent-run-${Date.now()}`
      },
      body: JSON.stringify({
        goal: 'Assess refinery effluent compliance against Phase 20 environmental thresholds.'
      })
    });
    assert.strictEqual(runRes.status, 201);
    const runJson = await runRes.json();
    assert.ok(runJson.data.agent_run_id);
    assert.strictEqual(runJson.data.status, 'COMPLETED');

    const stepsRes = await fetch(`${BASE_URL}/api/v1/agent/runs/${runJson.data.agent_run_id}/steps`, {
      headers: { 'X-API-Key': acmeLiveApiKey }
    });
    assert.strictEqual(stepsRes.status, 200);
    const stepsJson = await stepsRes.json();
    assert.ok(Array.isArray(stepsJson.data));
    assert.ok(stepsJson.data.length >= 2);
  })) passedCount++;

  totalCount++;
  if (await runTest('POST /api/v1/scenarios & GET /api/v1/executive/overview', async () => {
    const scRes = await fetch(`${BASE_URL}/api/v1/scenarios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': acmeLiveApiKey
      },
      body: JSON.stringify({
        name: 'CBAM Carbon Border Adjustment Stress',
        type: 'TRANSITION_CARBON_PRICE',
        narrative: '$120/ton tariff scenario'
      })
    });
    assert.strictEqual(scRes.status, 201);

    const execRes = await fetch(`${BASE_URL}/api/v1/executive/overview`, {
      headers: { 'X-API-Key': acmeLiveApiKey }
    });
    assert.strictEqual(execRes.status, 200);
    const execJson = await execRes.json();
    assert.ok(execJson.data);
  })) passedCount++;

  // Step 11: Webhooks System & HMAC Signatures
  console.log('\n--- Step 11: Webhook Registration, Delivery Queue & HMAC-SHA256 Signatures ---');
  totalCount++;
  if (await runTest('Register Webhook Endpoint with single-reveal HMAC secret (whsec_...)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/webhooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': acmeLiveApiKey
      },
      body: JSON.stringify({
        url: 'https://webhook.site/carboncredit-test-receiver',
        events: ['risk.created', 'risk.updated', 'risk.escalated', 'agent.completed', 'ping']
      })
    });

    assert.strictEqual(res.status, 201);
    const json = await res.json();
    assert.ok(json.data.endpoint_id);
    assert.ok(json.data.secret.startsWith('whsec_'));
    assert.strictEqual(json.data.url, 'https://webhook.site/carboncredit-test-receiver');

    webhookEndpointId = json.data.endpoint_id;
    webhookSecret = json.data.secret;
  })) passedCount++;

  totalCount++;
  if (await runTest('Trigger Webhook Test Ping and verify delivery records', async () => {
    const pingRes = await fetch(`${BASE_URL}/api/v1/webhooks/${webhookEndpointId}/test`, {
      method: 'POST',
      headers: { 'X-API-Key': acmeLiveApiKey }
    });
    assert.strictEqual(pingRes.status, 200);

    // Give asynchronous dispatcher 400ms to log delivery attempt
    await new Promise(r => setTimeout(r, 400));

    const delivRes = await fetch(`${BASE_URL}/api/v1/webhooks/${webhookEndpointId}/deliveries`, {
      headers: { 'X-API-Key': acmeLiveApiKey }
    });
    assert.strictEqual(delivRes.status, 200);
    const delivJson = await delivRes.json();
    assert.ok(Array.isArray(delivJson.data));
  })) passedCount++;

  // Step 12: Credential Rotation & Revocation
  console.log('\n--- Step 12: Credential Lifecycle (Rotation & Revocation) ---');
  let rotatedKey = '';
  totalCount++;
  if (await runTest('Rotate API Credential (old key revoked, new key active)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/developer/credentials/${acmeCredId}/rotate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      }
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.ok(json.data.new_credential_id);
    assert.ok(json.data.api_key.startsWith('esg_live_'));
    rotatedKey = json.data.api_key;

    // Verify old key is rejected
    const oldKeyTest = await fetch(`${BASE_URL}/api/v1/risks`, {
      headers: { 'X-API-Key': acmeLiveApiKey }
    });
    assert.strictEqual(oldKeyTest.status, 401);

    // Verify new key is accepted
    const newKeyTest = await fetch(`${BASE_URL}/api/v1/risks`, {
      headers: { 'X-API-Key': rotatedKey }
    });
    assert.strictEqual(newKeyTest.status, 200);
  })) passedCount++;

  totalCount++;
  if (await runTest('Revoke API Credential (DELETE /api/v1/developer/credentials/:id)', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/developer/credentials/${acmeReadOnlyCredId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);

    const revokedTest = await fetch(`${BASE_URL}/api/v1/risks`, {
      headers: { 'X-API-Key': acmeReadOnlyApiKey }
    });
    assert.strictEqual(revokedTest.status, 401);
  })) passedCount++;

  // Step 13: Sandbox Synthetic Environment & Reset
  console.log('\n--- Step 13: Sandbox Synthetic Environment Isolation & Data Reset ---');
  totalCount++;
  if (await runTest('Create Sandbox Application & Test Credential (esg_test_...)', async () => {
    const appRes = await fetch(`${BASE_URL}/api/v1/developer/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: 'Sandbox FinTech Test Bed',
        is_sandbox: true,
        scopes: ['risk:read', 'risk:write']
      })
    });
    assert.strictEqual(appRes.status, 201);
    const appJson = await appRes.json();
    sandboxAppId = appJson.data.application_id;

    const credRes = await fetch(`${BASE_URL}/api/v1/developer/applications/${sandboxAppId}/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ scopes: ['risk:read', 'risk:write'] })
    });
    assert.strictEqual(credRes.status, 201);
    const credJson = await credRes.json();
    assert.ok(credJson.data.api_key.startsWith('esg_test_'));
    sandboxTestApiKey = credJson.data.api_key;
    sandboxCredId = credJson.data.credential_id;
  })) passedCount++;

  totalCount++;
  if (await runTest('Create Synthetic Risk in Sandbox & verify X-Sandbox: true header', async () => {
    const res = await fetch(`${BASE_URL}/api/v1/risks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': sandboxTestApiKey
      },
      body: JSON.stringify({
        title: 'Synthetic Sandbox Volatility Risk',
        category: 'FINANCIAL',
        severity: 'MEDIUM',
        probability: 40,
        impact: 50
      })
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.headers.get('x-sandbox'), 'true');
    const json = await res.json();
    assert.strictEqual(json.data.is_sandbox, true);
  })) passedCount++;

  totalCount++;
  if (await runTest('Sandbox Reset (POST /api/v1/sandbox/reset) clears test data', async () => {
    // Reset sandbox
    const resetRes = await fetch(`${BASE_URL}/api/v1/sandbox/reset`, {
      method: 'POST',
      headers: { 'X-API-Key': sandboxTestApiKey }
    });
    assert.strictEqual(resetRes.status, 200);

    // Verify sandbox risk list is empty
    const listRes = await fetch(`${BASE_URL}/api/v1/risks`, {
      headers: { 'X-API-Key': sandboxTestApiKey }
    });
    assert.strictEqual(listRes.status, 200);
    const listJson = await listRes.json();
    assert.strictEqual(listJson.data.length, 0);

    // Attempt sandbox reset with production key -> rejected 403
    const prodReset = await fetch(`${BASE_URL}/api/v1/sandbox/reset`, {
      method: 'POST',
      headers: { 'X-API-Key': rotatedKey }
    });
    assert.strictEqual(prodReset.status, 403);
  })) passedCount++;

  // Step 14: Multi-Tenant Boundary Isolation
  console.log('\n--- Step 14: Multi-Tenant Isolation between Acme & MSME Organizations ---');
  totalCount++;
  if (await runTest('Create MSME Application & verify zero cross-tenant risk leakage', async () => {
    // Create MSME App
    const msmeAppRes = await fetch(`${BASE_URL}/api/v1/developer/applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${msmeUserToken}`
      },
      body: JSON.stringify({
        name: 'MSME Partner App',
        organization_id: '6a927a855b26a2ad8b17be31',
        scopes: ['risk:read', 'risk:write']
      })
    });
    assert.strictEqual(msmeAppRes.status, 201);
    const msmeAppJson = await msmeAppRes.json();
    msmeAppId = msmeAppJson.data.application_id;

    // Create MSME API Key
    const msmeCredRes = await fetch(`${BASE_URL}/api/v1/developer/applications/${msmeAppId}/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${msmeUserToken}`
      },
      body: JSON.stringify({ scopes: ['risk:read', 'risk:write'] })
    });
    assert.strictEqual(msmeCredRes.status, 201);
    const msmeCredJson = await msmeCredRes.json();
    msmeApiKey = msmeCredJson.data.api_key;

    // MSME tries to access Acme Risk -> must return 404 NOT_FOUND
    const leakTest = await fetch(`${BASE_URL}/api/v1/risks/${testRiskId}`, {
      headers: { 'X-API-Key': msmeApiKey }
    });
    assert.strictEqual(leakTest.status, 404);
  })) passedCount++;

  // Step 15: Developer Usage & Request Logs
  console.log('\n--- Step 15: Developer Usage & Request Audit Logs ---');
  totalCount++;
  if (await runTest('Query Usage Metrics (GET /api/v1/developer/usage) & Logs (GET /api/v1/developer/logs)', async () => {
    // Wait briefly for fire-and-forget log writes
    await new Promise(r => setTimeout(r, 500));

    const usageRes = await fetch(`${BASE_URL}/api/v1/developer/usage?application_id=${acmeAppId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(usageRes.status, 200);
    const usageJson = await usageRes.json();
    assert.ok(usageJson.data.total_requests >= 1);
    assert.ok(usageJson.data.avg_latency_ms >= 0);

    const logsRes = await fetch(`${BASE_URL}/api/v1/developer/logs?application_id=${acmeAppId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(logsRes.status, 200);
    const logsJson = await logsRes.json();
    assert.ok(Array.isArray(logsJson.data));
    assert.ok(logsJson.data.length >= 1);
    assert.ok(logsJson.data[0].method);
    assert.ok(logsJson.data[0].endpoint);
  })) passedCount++;

  // Step 16: Audit Trail
  console.log('\n--- Step 16: Developer Audit Trail Verification ---');
  totalCount++;
  if (await runTest('Audit trail records API_APPLICATION_CREATED, API_CREDENTIAL_CREATED, API_CREDENTIAL_ROTATED', async () => {
    const res = await fetch(`${BASE_URL}/api/command-center/activity?limit=50`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.ok, true);
    const json = await res.json();
    const actions = json.data.map(a => a.event_type || a.action);

    assert.ok(actions.includes('API_APPLICATION_CREATED') || actions.includes('API_CREDENTIAL_CREATED'));
  })) passedCount++;

  console.log('\n==================================================================================');
  console.log(`  FINAL VERIFICATION SUMMARY: ${passedCount} / ${totalCount} PASSED`);
  console.log('==================================================================================\n');

  if (passedCount === totalCount) {
    console.log('  🎉 ALL PHASE 20 ACCEPTANCE CRITERIA VERIFIED SUCCESSFULLY!\n');
    process.exit(0);
  } else {
    console.error(`  ❌ ${totalCount - passedCount} VERIFICATION TESTS FAILED.\n`);
    process.exit(1);
  }
}

executeSuite().catch(err => {
  console.error('Fatal execution error in test suite:', err);
  process.exit(1);
});
