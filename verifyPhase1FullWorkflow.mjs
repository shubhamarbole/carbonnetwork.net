const BASE_URL = 'http://localhost:5050';

async function verifyAll() {
  console.log('====================================================');
  console.log('🛡️ PHASE 1 AI RISK MANAGER - END-TO-END VERIFICATION');
  console.log('====================================================\n');

  // Test 1: Verify Health & Existing Features
  console.log('--- Step 1: Verify Existing Infrastructure & Health ---');
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthJson = await healthRes.json();
  if (!healthRes.ok || healthJson.status !== 'healthy') {
    throw new Error(`Health check failed: ${JSON.stringify(healthJson)}`);
  }
  console.log('✅ Health endpoint is responsive and healthy.');

  // Test 2: Role Logins & Authentication
  console.log('\n--- Step 2: Role Authentication ---');
  const login = async (email, password = 'password123') => {
    const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(`Login failed for ${email}: ${json.message}`);
    return { token: json.data.token, user: json.data.user };
  };

  const superAdmin = await login('superadmin@esg.com');
  console.log(`✅ SUPER_ADMIN logged in (${superAdmin.user.email}, org: ${superAdmin.user.organizationId})`);

  const platformAdmin = await login('platformadmin@esg.com');
  console.log(`✅ PLATFORM_ADMIN logged in (${platformAdmin.user.email})`);

  const msmeUser = await login('msme@esg.com');
  console.log(`✅ MSME_USER logged in (${msmeUser.user.email}, org: ${msmeUser.user.organizationId})`);

  const acmeAdmin = await login('admin@acme.com');
  console.log(`✅ ACME ADMIN logged in (${acmeAdmin.user.email}, org: ${acmeAdmin.user.organizationId})`);

  const acmeViewer = await login('viewer@acme.com');
  console.log(`✅ VIEWER logged in (${acmeViewer.user.email})`);

  // Test 3: Existing Features Unbroken
  console.log('\n--- Step 3: Verify Existing Application Endpoints ---');
  const projectsRes = await fetch(`${BASE_URL}/api/projects`, {
    headers: { 'Authorization': `Bearer ${superAdmin.token}` }
  });
  if (!projectsRes.ok) throw new Error('Existing /api/projects endpoint failed');
  const projectsData = await projectsRes.json();
  console.log(`✅ Existing /api/projects works: returned ${projectsData.data?.length ?? 0} projects.`);

  // Test 4: Unauthenticated Access Protection
  console.log('\n--- Step 4: Verify Route & API Protection ---');
  const unauth = await fetch(`${BASE_URL}/api/risks`);
  if (unauth.status === 401) {
    console.log('✅ Unauthenticated request to /api/risks rejected with 401 Unauthorized.');
  } else {
    throw new Error(`Expected 401, received ${unauth.status}`);
  }

  // Test 5: Role-based Permission Enforcement on Viewer
  console.log('\n--- Step 5: Role-based Access - VIEWER Write Protection ---');
  const viewerCreate = await fetch(`${BASE_URL}/api/risks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${acmeViewer.token}`
    },
    body: JSON.stringify({
      title: 'Viewer Attempt',
      description: 'Must fail',
      category: 'Financial',
      probability: 50,
      impact: 50
    })
  });
  if (viewerCreate.status === 403) {
    console.log('✅ VIEWER create blocked with 403 Forbidden.');
  } else {
    throw new Error(`Expected 403 Forbidden for viewer create, got ${viewerCreate.status}`);
  }

  // Test 6: Input Validation (Probability & Impact 0-100, Title, Description, Category)
  console.log('\n--- Step 6: Input Validation & Bounds Checking ---');
  const badProb = await fetch(`${BASE_URL}/api/risks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${superAdmin.token}`
    },
    body: JSON.stringify({
      title: 'Invalid Prob Risk',
      description: 'Desc',
      category: 'Financial',
      probability: 110,
      impact: 50
    })
  });
  if (badProb.status === 400) {
    console.log('✅ Invalid probability (> 100) correctly rejected with 400.');
  } else {
    throw new Error(`Expected 400 for bad probability, got ${badProb.status}`);
  }

  const badCategory = await fetch(`${BASE_URL}/api/risks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${superAdmin.token}`
    },
    body: JSON.stringify({
      title: 'Invalid Category Risk',
      description: 'Desc',
      category: 'NotARealCategory',
      probability: 50,
      impact: 50
    })
  });
  if (badCategory.status === 400) {
    console.log('✅ Invalid category correctly rejected with 400.');
  } else {
    throw new Error(`Expected 400 for bad category, got ${badCategory.status}`);
  }

  // Test 7: Create Real Risks across Categories and Organizations
  console.log('\n--- Step 7: Create Real Multi-Tenant Risks ---');
  
  // Risk 1: Acme Corp ESG Risk created by Acme Admin
  const r1Res = await fetch(`${BASE_URL}/api/risks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${acmeAdmin.token}`
    },
    body: JSON.stringify({
      title: 'EU CBAM Export Tariff & Carbon Compliance Penalty',
      description: 'Impending Cross-Border Adjustment Mechanism regulation requires Scope 1 and Scope 2 emissions certified data for European export shipments.',
      category: 'Regulatory',
      probability: 75,
      impact: 85,
      severity: 'CRITICAL',
      status: 'OPEN'
    })
  });
  const r1 = (await r1Res.json()).data;
  if (!r1?._id) throw new Error('Failed to create Risk 1');
  console.log(`✅ Risk 1 created by Acme Admin (ID: ${r1._id}, Org: ${r1.organizationId})`);

  // Risk 2: Eco Corp MSME Operational Risk created by MSME User
  const r2Res = await fetch(`${BASE_URL}/api/risks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${msmeUser.token}`
    },
    body: JSON.stringify({
      title: 'Diesel Generator Backup Grid Transition Failure',
      description: 'Scheduled solar PV microgrid switchover risks 4-hour blackout without secondary battery inverter sync.',
      category: 'Operational',
      probability: 40,
      impact: 60,
      severity: 'MEDIUM',
      status: 'OPEN'
    })
  });
  const r2 = (await r2Res.json()).data;
  if (!r2?._id) throw new Error('Failed to create Risk 2');
  console.log(`✅ Risk 2 created by MSME User (ID: ${r2._id}, Org: ${r2.organizationId})`);

  // Risk 3: Cybersecurity Threat created by Super Admin
  const r3Res = await fetch(`${BASE_URL}/api/risks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${superAdmin.token}`
    },
    body: JSON.stringify({
      title: 'Smart Meter MQTT Broker Man-in-the-Middle Telemetry Spoofing',
      description: 'Firmware authentication vulnerability on edge telemetry sensors could allow arbitrary reading injection.',
      category: 'Cybersecurity',
      probability: 65,
      impact: 90,
      severity: 'CRITICAL',
      status: 'UNDER_REVIEW',
      organizationId: acmeAdmin.user.organizationId
    })
  });
  const r3 = (await r3Res.json()).data;
  if (!r3?._id) throw new Error('Failed to create Risk 3');
  console.log(`✅ Risk 3 created by Super Admin (ID: ${r3._id})`);

  // Test 8: Tenant Scoping & Isolation
  console.log('\n--- Step 8: Multi-Tenant Data Boundaries Verification ---');
  // MSME User should only see their own risks, NOT Acme Corp risks
  const msmeListRes = await fetch(`${BASE_URL}/api/risks`, {
    headers: { 'Authorization': `Bearer ${msmeUser.token}` }
  });
  const msmeList = (await msmeListRes.json()).data;
  const hasAcmeInMsme = msmeList.some(r => r._id === r1._id || r._id === r3._id);
  if (hasAcmeInMsme) {
    throw new Error('SECURITY VIOLATION: MSME User can see Acme Corporation risks!');
  }
  console.log(`✅ Strict Tenant Boundary Enforced: MSME user sees only MSME risks (${msmeList.length} in scope).`);

  // Super Admin should see all risks
  const adminListRes = await fetch(`${BASE_URL}/api/risks`, {
    headers: { 'Authorization': `Bearer ${superAdmin.token}` }
  });
  const adminList = (await adminListRes.json()).data;
  const hasBoth = adminList.some(r => r._id === r1._id) && adminList.some(r => r._id === r2._id);
  if (!hasBoth) {
    throw new Error('Super Admin did not retrieve all tenant risks.');
  }
  console.log(`✅ Super Admin global access verified: sees across organizations (${adminList.length} risks).`);

  // Test 9: Status Management & Transition
  console.log('\n--- Step 9: Status Transition & Audit Logging ---');
  const statusUpdateRes = await fetch(`${BASE_URL}/api/risks/${r1._id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${acmeAdmin.token}`
    },
    body: JSON.stringify({
      status: 'MITIGATION_IN_PROGRESS',
      reason: 'Engaged third-party BRSR verification auditor'
    })
  });
  const statusUpdateData = await statusUpdateRes.json();
  if (statusUpdateData.data?.status !== 'MITIGATION_IN_PROGRESS') {
    throw new Error(`Status update failed: ${JSON.stringify(statusUpdateData)}`);
  }
  console.log(`✅ Risk 1 status transitioned to MITIGATION_IN_PROGRESS.`);

  // Test 10: Owner Assignment
  console.log('\n--- Step 10: Owner Assignment ---');
  const assignOwnerRes = await fetch(`${BASE_URL}/api/risks/${r1._id}/owner`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${acmeAdmin.token}`
    },
    body: JSON.stringify({
      ownerId: acmeAdmin.user.id
    })
  });
  const assignData = await assignOwnerRes.json();
  if (!assignOwnerRes.ok || assignData.data?.ownerId !== acmeAdmin.user.id) {
    throw new Error(`Owner assignment failed: ${JSON.stringify(assignData)}`);
  }
  console.log(`✅ Risk 1 assigned to owner ${acmeAdmin.user.name}.`);

  // Test 11: Edit Risk
  console.log('\n--- Step 11: Edit Risk Details ---');
  const editRes = await fetch(`${BASE_URL}/api/risks/${r1._id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${acmeAdmin.token}`
    },
    body: JSON.stringify({
      probability: 60,
      impact: 80,
      description: 'Updated with active mitigation schedule and auditor review.'
    })
  });
  const editData = await editRes.json();
  if (editData.data?.probability !== 60) {
    throw new Error('Edit risk probability update failed');
  }
  console.log('✅ Risk 1 edited successfully.');

  // Test 12: Real Dashboard Metrics
  console.log('\n--- Step 12: Real Database Dashboard Metrics Verification ---');
  const dashRes = await fetch(`${BASE_URL}/api/risks`, {
    headers: { 'Authorization': `Bearer ${superAdmin.token}` }
  });
  const dashJson = await dashRes.json();
  const summary = dashJson.summary;
  console.log('📊 Real Dashboard Metrics Calculated from Database:');
  console.log(`   - Total Risks: ${summary.totalRisks}`);
  console.log(`   - Open Risks: ${summary.openRisks}`);
  console.log(`   - Under Review: ${summary.underReview}`);
  console.log(`   - High Risks: ${summary.highRisks}`);
  console.log(`   - Critical Risks: ${summary.criticalRisks}`);
  console.log(`   - Mitigated: ${summary.mitigatedRisks}`);
  console.log(`   - Closed: ${summary.closedRisks}`);
  if (summary.totalRisks < 3) {
    throw new Error('Expected at least 3 total risks in database summary.');
  }

  // Test 13: Search & Filters
  console.log('\n--- Step 13: Search and Filter Engine ---');
  const searchRes = await fetch(`${BASE_URL}/api/risks?search=telemetry`, {
    headers: { 'Authorization': `Bearer ${superAdmin.token}` }
  });
  const searchData = await searchRes.json();
  if (!searchData.data.some(r => r._id === r3._id)) {
    throw new Error('Search query "telemetry" failed to find Risk 3');
  }
  console.log('✅ Search filter successfully matched keyword in risk description.');

  const catFilterRes = await fetch(`${BASE_URL}/api/risks?category=Operational`, {
    headers: { 'Authorization': `Bearer ${superAdmin.token}` }
  });
  const catData = await catFilterRes.json();
  if (!catData.data.every(r => r.category === 'Operational')) {
    throw new Error('Category filter returned non-operational records');
  }
  console.log(`✅ Category filter verified: returned ${catData.data.length} Operational risks.`);

  // Test 14: Audit Logs Verification
  console.log('\n--- Step 14: Audit Log Verification ---');
  const auditRes = await fetch(`${BASE_URL}/api/risks/audit-logs?riskId=${r1._id}`, {
    headers: { 'Authorization': `Bearer ${acmeAdmin.token}` }
  });
  const auditJson = await auditRes.json();
  const auditActions = auditJson.data.map(l => l.action);
  console.log('📋 Recorded Audit Trail Actions for Risk 1:', auditActions);
  if (!auditActions.includes('RISK_CREATED') || !auditActions.includes('RISK_STATUS_CHANGED') || !auditActions.includes('RISK_ASSIGNED')) {
    throw new Error('Audit trail is missing expected risk lifecycle actions!');
  }
  console.log('✅ Complete audit lifecycle verified for Risk 1.');

  // Test 15: Delete Authorization & Audit
  console.log('\n--- Step 15: Delete Authorization & Audit Trail ---');
  // Viewer cannot delete
  const viewerDelete = await fetch(`${BASE_URL}/api/risks/${r2._id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${acmeViewer.token}` }
  });
  if (viewerDelete.status === 403) {
    console.log('✅ VIEWER delete attempt rejected with 403 Forbidden.');
  } else {
    throw new Error(`Expected 403 for viewer delete, got ${viewerDelete.status}`);
  }

  // Super Admin deletes test Risk 3
  const adminDelete = await fetch(`${BASE_URL}/api/risks/${r3._id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${superAdmin.token}` }
  });
  if (adminDelete.status !== 200) {
    throw new Error('Super Admin delete failed');
  }
  console.log(`✅ Risk 3 successfully deleted by Super Admin.`);

  // Verify RISK_DELETED logged
  const deletedAuditRes = await fetch(`${BASE_URL}/api/risks/audit-logs?riskId=${r3._id}`, {
    headers: { 'Authorization': `Bearer ${superAdmin.token}` }
  });
  const deletedAuditJson = await deletedAuditRes.json();
  const hasDeleteAction = deletedAuditJson.data.some(l => l.action === 'RISK_DELETED');
  if (!hasDeleteAction) {
    throw new Error('RISK_DELETED audit record missing!');
  }
  console.log('✅ RISK_DELETED audit log verified.');

  console.log('\n====================================================');
  console.log('🎉 ALL 15 DEFINITION OF DONE VERIFICATION STEPS PASSED!');
  console.log('====================================================');
}

verifyAll().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
