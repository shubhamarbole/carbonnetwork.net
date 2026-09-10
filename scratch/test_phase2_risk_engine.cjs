const { 
  ElectricityReading, EmissionRecord, WaterRecord, 
  WasteRecord, PollutionRecord, BiodiversityAssessment, 
  Evidence, AuditLog, RiskAssessment, Facility, User
} = require('../backend/models/models.js');
const connectDB = require('../backend/src/config/db.js');
const mongoose = require('../backend/node_modules/mongoose');

async function runPhase2TestSuite() {
  console.log('================================================================');
  console.log('   PHASE 2 ENVIRONMENTAL AI RISK ENGINE TEST SUITE');
  console.log('================================================================\n');

  await connectDB();

  let passed = 0;
  let failed = 0;

  function assert(testName, condition, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  // 1. Authenticate as Superadmin
  console.log('1. Authenticating test credentials...');
  const loginRes = await fetch('http://localhost:5050/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@esg.com', password: 'password123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.data?.token || loginData.token;
  const orgId = loginData.data?.user?.organizationId || loginData.user?.organizationId || 'org-acme-corp';

  assert('Superadmin authentication succeeded', Boolean(token), `Token: ${token ? 'OK' : 'Missing'}`);

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // 2. Ensure test facility exists in MongoDB for clean multi-tenant operations
  console.log('\n2. Ensuring test facilities and evidence records exist...');
  let testFac = await Facility.findOne({ organizationId: orgId, name: 'Risk Test Facility' });
  if (!testFac) {
    testFac = await Facility.create({
      organizationId: orgId,
      name: 'Risk Test Facility',
      location: 'California, USA',
      area: 2500,
      description: 'Test manufacturing facility for automated assurance',
      createdAt: new Date().toISOString()
    });
  }
  const facilityId = testFac._id.toString();

  // Create valid test evidence
  let testEv = await Evidence.findOne({ organizationId: orgId, fileName: 'verified_audit_log_2026.pdf' });
  if (!testEv) {
    testEv = await Evidence.create({
      organizationId: orgId,
      facilityId,
      category: 'Energy',
      recordId: 'rec-test-1',
      recordModel: 'ElectricityReading',
      fileName: 'verified_audit_log_2026.pdf',
      fileType: 'application/pdf',
      fileSize: 1048576,
      filePath: '/uploads/evidence/verified_audit_log_2026.pdf',
      uploadedBy: 'superadmin@esg.com',
      uploadedAt: new Date().toISOString(),
      verificationStatus: 'VERIFIED'
    });
  }
  const evidenceId = testEv._id.toString();

  // -------------------------------------------------------------
  // TEST SUITE 1: CLEAN SUBMISSION ON ALL 6 MODULES (LOW RISK <= 24)
  // -------------------------------------------------------------
  console.log('\n3. Testing Clean Submissions across all 6 modules (Should be LOW severity <= 24)...');

  const cleanPayloads = [
    {
      module: 'energy',
      name: 'Energy',
      data: {
        facilityId,
        previousReading: 5000,
        currentReading: 8000,
        consumption: 3000,
        readingDate: '2026-09-01',
        reportingPeriod: 'Quarterly',
        sourceType: 'GRID',
        dataQuality: 'Actual',
        unit: 'kWh',
        evidenceId
      }
    },
    {
      module: 'ghg',
      name: 'GHG Emissions',
      data: {
        facilityId,
        scope: 1,
        sourceName: 'Natural Gas Boiler',
        activityValue: 2500,
        activityUnit: 'm3',
        emissionFactor: 1.88,
        factorUnit: 'kg CO2e / m3',
        calculatedCO2e: 4.7,
        reportingPeriod: 'Quarterly',
        periodEnd: '2026-09-01',
        dataQuality: 'Actual',
        evidenceId
      }
    },
    {
      module: 'water',
      name: 'Water',
      data: {
        facilityId,
        source: 'Municipal Water',
        amount: 1200,
        recycledAmount: 300,
        reportingPeriod: 'Quarterly',
        periodEnd: '2026-09-01',
        dataQuality: 'Actual',
        unit: 'm³',
        evidenceId
      }
    },
    {
      module: 'waste',
      name: 'Waste',
      data: {
        facilityId,
        category: 'Metal',
        wasteType: 'NON_HAZARDOUS',
        quantity: 450,
        disposalMethod: 'Recycling',
        reportingPeriod: 'Quarterly',
        dataQuality: 'Actual',
        unit: 'kg',
        evidenceId
      }
    },
    {
      module: 'pollution',
      name: 'Pollution Prevention',
      data: {
        facilityId,
        medium: 'Air',
        pollutantType: 'NOx',
        actualValue: 18.5,
        legalLimit: 50.0,
        complianceStatus: 'COMPLIANT',
        date: '2026-09-01',
        reportingPeriod: 'Quarterly',
        dataQuality: 'Actual',
        unit: 'ppm'
      }
    },
    {
      module: 'biodiversity',
      name: 'Biodiversity',
      data: {
        facilityId,
        siteArea: 14.5,
        environmentalSensitivity: 'LOW',
        habitatType: 'Meadow',
        condition: 'Good',
        assessmentDate: '2026-09-01',
        reportingPeriod: 'Quarterly',
        dataQuality: 'Actual',
        unit: 'ha'
      }
    }
  ];

  for (const item of cleanPayloads) {
    const res = await fetch('http://localhost:5050/api/environment/submission/risk-check', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        module: item.module,
        recordId: `clean-test-${item.module}`,
        data: item.data
      })
    });

    const json = await res.json();
    assert(`${item.name} HTTP 200 returned`, res.status === 200, `Status: ${res.status}`);
    assert(`${item.name} assessment exists`, Boolean(json.assessment || json.riskAssessment));
    const asmt = json.assessment || json.riskAssessment;
    assert(`${item.name} Risk Score is LOW (0-24)`, asmt.riskScore <= 24, `Score: ${asmt.riskScore}`);
    assert(`${item.name} Severity is LOW`, asmt.severity === 'LOW', `Severity: ${asmt.severity}`);
    assert(`${item.name} Workflow action is NORMAL_REVIEW`, asmt.workflowAction === 'NORMAL_REVIEW', `Action: ${asmt.workflowAction}`);
    assert(`${item.name} EngineType is deterministic`, asmt.engineType === 'deterministic', `Type: ${asmt.engineType}`);
    assert(`${item.name} Ruleset is v1`, asmt.rulesetVersion === 'v1', `Ruleset: ${asmt.rulesetVersion}`);
    assert(`${item.name} ModelVersion is deterministic-v1`, asmt.modelVersion === 'deterministic-v1', `Model: ${asmt.modelVersion}`);
    assert(`${item.name} Snapshot SHA-256 hash generated`, typeof asmt.inputSnapshotHash === 'string' && asmt.inputSnapshotHash.length === 64);
  }

  // -------------------------------------------------------------
  // TEST SUITE 2: DATA QUALITY & COMPLETENESS FAILURES
  // -------------------------------------------------------------
  console.log('\n4. Testing Data Quality & Completeness Engine...');

  // 2.1 Missing required field
  const missingFieldRes = await fetch('http://localhost:5050/api/environment/submission/risk-check', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      module: 'energy',
      recordId: 'err-missing-date',
      data: {
        facilityId,
        currentReading: 1000,
        consumption: 500,
        reportingPeriod: 'Quarterly',
        evidenceId
        // readingDate missing
      }
    })
  });
  const missingJson = await missingFieldRes.json();
  const missingAsmt = missingJson.assessment;
  const dqFinding = missingAsmt?.findings?.find(f => f.category === 'DATA_COMPLETENESS');
  assert('Missing required field detected', Boolean(dqFinding));
  assert('Affected fields includes readingDate', dqFinding?.affectedFields?.includes('readingDate'));

  // 2.2 Negative numeric value
  const negValRes = await fetch('http://localhost:5050/api/environment/submission/risk-check', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      module: 'water',
      recordId: 'err-neg-water',
      data: {
        facilityId,
        source: 'Municipal Water',
        amount: -500, // Invalid negative
        reportingPeriod: 'Quarterly',
        periodEnd: '2026-09-01',
        evidenceId
      }
    })
  });
  const negJson = await negValRes.json();
  const negFinding = negJson.assessment?.findings?.find(f => f.category === 'DATA_VALIDITY');
  assert('Negative numeric value identified as DATA_VALIDITY finding', Boolean(negFinding));
  assert('Negative water affectedFields includes amount', negFinding?.affectedFields?.includes('amount'));

  // 2.3 Post-dated observation
  const futureRes = await fetch('http://localhost:5050/api/environment/submission/risk-check', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      module: 'pollution',
      recordId: 'err-future-date',
      data: {
        facilityId,
        medium: 'Air',
        pollutantType: 'SO2',
        actualValue: 20,
        date: '2099-01-01', // Future date
        reportingPeriod: 'Quarterly'
      }
    })
  });
  const futureJson = await futureRes.json();
  const futureFinding = futureJson.assessment?.findings?.find(f => f.title.includes('Post-Dated'));
  assert('Post-dated observation detected', Boolean(futureFinding));

  // -------------------------------------------------------------
  // TEST SUITE 3: EVIDENCE INTEGRITY FAILURES
  // -------------------------------------------------------------
  console.log('\n5. Testing Evidence Integrity Engine...');

  // 3.1 Missing mandatory evidence
  const noEvRes = await fetch('http://localhost:5050/api/environment/submission/risk-check', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      module: 'waste',
      recordId: 'err-no-evidence',
      data: {
        facilityId,
        category: 'Plastic',
        wasteType: 'NON_HAZARDOUS',
        quantity: 200,
        disposalMethod: 'Recycling',
        reportingPeriod: 'Quarterly'
        // No evidence attached
      }
    })
  });
  const noEvJson = await noEvRes.json();
  const noEvFinding = noEvJson.assessment?.findings?.find(f => f.category === 'EVIDENCE' && f.title.includes('Missing'));
  assert('Missing mandatory evidence flagged as EVIDENCE finding', Boolean(noEvFinding));
  assert('Evidence penalty is 20 points', noEvJson.assessment?.componentScores?.evidenceIntegrity === 20);

  // 3.2 Unresolved evidence ID
  const badEvRes = await fetch('http://localhost:5050/api/environment/submission/risk-check', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      module: 'energy',
      recordId: 'err-bad-evidence-id',
      data: {
        facilityId,
        currentReading: 1200,
        consumption: 500,
        readingDate: '2026-09-01',
        reportingPeriod: 'Quarterly',
        evidenceId: '000000000000000000000000' // Non-existent ID
      }
    })
  });
  const badEvJson = await badEvRes.json();
  const badEvFinding = badEvJson.assessment?.findings?.find(f => f.title.includes('Unresolved Evidence'));
  assert('Unresolved evidence reference detected', Boolean(badEvFinding));

  // -------------------------------------------------------------
  // TEST SUITE 4: HISTORICAL & STATISTICAL ANOMALY ENGINE
  // -------------------------------------------------------------
  console.log('\n6. Testing Historical Baseline & Anomaly Engine...');

  // Clean historical records for a fresh isolated facility to test INSUFFICIENT_HISTORY
  const freshFacId = 'fac-fresh-test-' + Date.now();
  const freshRes = await fetch('http://localhost:5050/api/environment/submission/risk-check', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      module: 'energy',
      recordId: 'test-fresh-insufficient',
      data: {
        facilityId: freshFacId,
        currentReading: 1000,
        consumption: 500,
        readingDate: '2026-09-01',
        reportingPeriod: 'Quarterly',
        evidenceId
      }
    })
  });
  const freshJson = await freshRes.json();
  const insuffFinding = freshJson.assessment?.findings?.find(f => f.title.includes('Insufficient Historical Baseline'));
  assert('Fewer than 3 records triggers INSUFFICIENT_HISTORY finding', Boolean(insuffFinding));
  assert('Insufficient history finding has severity INFO', insuffFinding?.severity === 'INFO');
  assert('Anomaly component penalty is 0 under insufficient baseline', freshJson.assessment?.componentScores?.anomalyDetection === 0);

  // Now seed 5 historical baseline records for an anomaly test facility
  const anomFacId = 'fac-anom-test-' + Date.now();
  console.log(`Seeding 5 baseline electricity readings for ${anomFacId} (Mean: 1000 kWh)...`);
  for (let i = 1; i <= 5; i++) {
    await ElectricityReading.create({
      organizationId: orgId,
      facilityId: anomFacId,
      readingDate: `2026-0${i}-01`,
      reportingPeriod: 'Quarterly',
      previousReading: (i - 1) * 1000,
      currentReading: i * 1000,
      consumption: 1000, // Consistent baseline
      status: 'VERIFIED',
      createdBy: 'superadmin@esg.com'
    });
  }

  // Now submit an extreme anomaly: 50,000 kWh (50x historical mean)
  const anomRes = await fetch('http://localhost:5050/api/environment/submission/risk-check', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      module: 'energy',
      recordId: 'test-extreme-spike',
      data: {
        facilityId: anomFacId,
        currentReading: 55000,
        previousReading: 5000,
        consumption: 50000, // 50x spike
        readingDate: '2026-09-01',
        reportingPeriod: 'Quarterly',
        evidenceId
      }
    })
  });
  const anomJson = await anomRes.json();
  const anomFinding = anomJson.assessment?.findings?.find(f => f.category === 'ANOMALY' && f.severity === 'CRITICAL');
  assert('Extreme statistical anomaly detected (CRITICAL)', Boolean(anomFinding));
  assert('Anomaly penalty is 25 points', anomJson.assessment?.componentScores?.anomalyDetection === 25);
  assert('Baseline reference includes mean and zScore', anomFinding?.baselineReference?.mean === 1000 && anomFinding?.baselineReference?.sampleCount === 5);
  assert('Description uses objective phrasing', anomFinding?.description.includes('Potential anomaly detected'));

  // -------------------------------------------------------------
  // TEST SUITE 5: CROSS-MODULE CONSISTENCY ENGINE
  // -------------------------------------------------------------
  console.log('\n7. Testing Cross-Module Consistency Engine...');

  // Water mass balance violation: Recycled > Withdrawal
  const waterBalanceRes = await fetch('http://localhost:5050/api/environment/submission/risk-check', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      module: 'water',
      recordId: 'err-water-balance',
      data: {
        facilityId,
        source: 'Municipal Water',
        amount: 500, // 500 m3 withdrawal
        recycledAmount: 1200, // 1200 m3 recycled (impossible without external circular flows)
        reportingPeriod: 'Quarterly',
        periodEnd: '2026-09-01',
        evidenceId
      }
    })
  });
  const waterBalJson = await waterBalanceRes.json();
  const crossFinding = waterBalJson.assessment?.findings?.find(f => f.category === 'CROSS_MODULE');
  assert('Water mass balance violation detected as CROSS_MODULE finding', Boolean(crossFinding));
  assert('Cross-module penalty applied (15 pts)', waterBalJson.assessment?.componentScores?.crossModuleConsistency === 15);

  // -------------------------------------------------------------
  // TEST SUITE 6: REST API ENDPOINTS & PATH VARIATIONS
  // -------------------------------------------------------------
  console.log('\n8. Testing REST API Endpoints (POST /api/environmental/submissions/:id/risk-check)...');

  // Test standard Phase 2 route: POST /api/environmental/submissions/:id/risk-check
  const subIdRes = await fetch(`http://localhost:5050/api/environmental/submissions/test-sub-001/risk-check`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      module: 'energy',
      data: {
        facilityId,
        currentReading: 1200,
        consumption: 200,
        readingDate: '2026-09-01',
        reportingPeriod: 'Quarterly',
        evidenceId
      }
    })
  });
  assert('POST /api/environmental/submissions/:id/risk-check returns 200', subIdRes.status === 200);
  const subIdJson = await subIdRes.json();
  assert('Response contains riskAssessment and assessment', Boolean(subIdJson.riskAssessment) && Boolean(subIdJson.assessment));
  assert('submissionId is mapped to test-sub-001', subIdJson.riskAssessment?.submissionId === 'test-sub-001');

  // Test retrieval: GET /api/environmental/submissions/:id/risk-assessment
  const getAsmtRes = await fetch(`http://localhost:5050/api/environmental/submissions/test-sub-001/risk-assessment`, {
    headers
  });
  assert('GET /api/environmental/submissions/:id/risk-assessment returns 200', getAsmtRes.status === 200);
  const getAsmtJson = await getAsmtRes.json();
  assert('Retrieved assessment matches submissionId', getAsmtJson.riskAssessment?.submissionId === 'test-sub-001');

  // -------------------------------------------------------------
  // TEST SUITE 7: MULTI-TENANT SECURITY & FACILITY ISOLATION
  // -------------------------------------------------------------
  console.log('\n9. Testing Multi-Tenant & Facility Isolation...');

  // Create restricted DATA_ENTRY user assigned to specific facility
  const restrictedEmail = `dataentry_${Date.now()}@tenant2.com`;
  const tenant2OrgId = new mongoose.Types.ObjectId();
  const tenant2FacId = 'fac-tenant-2-alpha';

  const dataEntryUser = await User.create({
    organizationId: tenant2OrgId,
    facilityId: tenant2FacId,
    email: restrictedEmail,
    password: 'password123',
    role: 'DATA_ENTRY',
    name: 'Restricted Operator'
  });

  const jwt = require('../backend/node_modules/jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'environmental-esg-secret-key-98765';
  const dataEntryToken = jwt.sign(
    { id: dataEntryUser._id.toString(), email: restrictedEmail, role: 'DATA_ENTRY', organizationId: tenant2OrgId.toString(), facilityId: tenant2FacId },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Attempt evaluation on forbidden facility
  const crossFacRes = await fetch('http://localhost:5050/api/environment/submission/risk-check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${dataEntryToken}`
    },
    body: JSON.stringify({
      module: 'energy',
      recordId: 'cross-fac-attempt',
      data: {
        facilityId: 'fac-forbidden-beta', // Unauthorized facility
        currentReading: 1000,
        consumption: 500,
        readingDate: '2026-09-01',
        reportingPeriod: 'Quarterly'
      }
    })
  });

  assert('Cross-facility access by restricted user returns 403 Forbidden', crossFacRes.status === 403, `Status: ${crossFacRes.status}`);

  // -------------------------------------------------------------
  // TEST SUITE 8: DATABASE PERSISTENCE & IMMUTABLE AUDIT TRAIL
  // -------------------------------------------------------------
  console.log('\n10. Verifying Database Persistence & Audit Trail...');

  const dbAssessment = await RiskAssessment.findOne({ submissionId: 'test-sub-001' }).lean();
  assert('RiskAssessment document saved in MongoDB', Boolean(dbAssessment));
  assert('Saved RiskAssessment has inputSnapshotHash', typeof dbAssessment?.inputSnapshotHash === 'string' && dbAssessment.inputSnapshotHash.length === 64);
  assert('Saved RiskAssessment has rulesetVersion v1', dbAssessment?.rulesetVersion === 'v1');

  const auditLogEntry = await AuditLog.findOne({ action: 'AI_RISK_CHECK', recordId: 'test-sub-001' }).lean();
  assert('AuditLog entry AI_RISK_CHECK created', Boolean(auditLogEntry));
  assert('AuditLog metadata contains score and severity', typeof auditLogEntry?.metadata?.score === 'number' && typeof auditLogEntry?.metadata?.severity === 'string');

  // Clean up test user
  await User.deleteOne({ _id: dataEntryUser._id });
  await mongoose.disconnect();

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPhase2TestSuite().catch(err => {
  console.error('Test execution failed with unhandled error:', err);
  process.exit(1);
});
