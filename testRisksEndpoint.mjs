const BASE_URL = 'http://localhost:5050';

async function runApiTests() {
  console.log('🚀 Running end-to-end Risk API tests against http://localhost:5050...');

  // 1. Authenticate Super Admin
  const adminLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'superadmin@esg.com', password: 'password123' })
  });
  const adminLoginData = await adminLoginRes.json();
  if (!adminLoginRes.ok || !adminLoginData.data?.token) {
    throw new Error(`Super Admin login failed: ${JSON.stringify(adminLoginData)}`);
  }
  const adminToken = adminLoginData.data.token;
  console.log('✅ 1. Super Admin logged in successfully.');

  // 2. Authenticate Viewer
  const viewerLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'viewer@acme.com', password: 'password123' })
  });
  const viewerLoginData = await viewerLoginRes.json();
  const viewerToken = viewerLoginData.data?.token;
  console.log('✅ 2. Viewer logged in successfully.');

  // 3. Authenticate MSME
  const msmeLoginRes = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'msme@esg.com', password: 'password123' })
  });
  const msmeLoginData = await msmeLoginRes.json();
  const msmeToken = msmeLoginData.data?.token;
  console.log('✅ 3. MSME user logged in successfully.');

  // 4. Test Unauthenticated access to /api/risks -> must return 401
  const unauthRes = await fetch(`${BASE_URL}/api/risks`);
  if (unauthRes.status === 401) {
    console.log('✅ 4. Unauthenticated access correctly rejected with 401.');
  } else {
    throw new Error(`Expected 401 for unauthenticated request, got ${unauthRes.status}`);
  }

  // 5. Test Viewer attempting to create risk -> must return 403
  const viewerCreateRes = await fetch(`${BASE_URL}/api/risks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${viewerToken}`
    },
    body: JSON.stringify({
      title: 'Viewer Risk',
      description: 'Should be rejected',
      category: 'Financial',
      probability: 50,
      impact: 50,
      severity: 'MEDIUM'
    })
  });
  if (viewerCreateRes.status === 403) {
    console.log('✅ 5. Viewer creation attempt correctly rejected with 403 Forbidden.');
  } else {
    throw new Error(`Expected 403 for viewer create, got ${viewerCreateRes.status}`);
  }

  // 6. Test Invalid input (probability > 100) -> must return 400
  const invalidProbRes = await fetch(`${BASE_URL}/api/risks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      title: 'Invalid Prob Risk',
      description: 'Probability 150',
      category: 'Financial',
      probability: 150,
      impact: 50,
      severity: 'HIGH'
    })
  });
  if (invalidProbRes.status === 400) {
    console.log('✅ 6. Invalid probability (> 100) correctly rejected with 400.');
  } else {
    throw new Error(`Expected 400 for invalid probability, got ${invalidProbRes.status}`);
  }

  // 7. Test Valid Risk Creation by Super Admin
  const createRes = await fetch(`${BASE_URL}/api/risks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      title: 'E2E Automated Test Risk - Grid Surge',
      description: 'Electrical transformer voltage surge hazard affecting manufacturing plant facilities.',
      category: 'Operational',
      probability: 60,
      impact: 75,
      severity: 'HIGH',
      status: 'OPEN'
    })
  });
  const createData = await createRes.json();
  if (createRes.status !== 201 || !createData.data?._id) {
    throw new Error(`Failed to create valid risk: ${JSON.stringify(createData)}`);
  }
  const createdRiskId = createData.data._id;
  console.log(`✅ 7. Valid risk created successfully with ID: ${createdRiskId}`);

  // 8. Test GET /api/risks/:id
  const getSingleRes = await fetch(`${BASE_URL}/api/risks/${createdRiskId}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const getSingleData = await getSingleRes.json();
  if (getSingleRes.status !== 200 || getSingleData.data?.title !== 'E2E Automated Test Risk - Grid Surge') {
    throw new Error(`Failed to get single risk: ${JSON.stringify(getSingleData)}`);
  }
  console.log('✅ 8. Single risk retrieval succeeded with accurate details.');

  // 9. Test PATCH /api/risks/:id/status
  const statusRes = await fetch(`${BASE_URL}/api/risks/${createdRiskId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ status: 'UNDER_REVIEW', reason: 'Assigned to engineering team' })
  });
  const statusData = await statusRes.json();
  if (statusRes.status !== 200 || statusData.data?.status !== 'UNDER_REVIEW') {
    throw new Error(`Status transition failed: ${JSON.stringify(statusData)}`);
  }
  console.log('✅ 9. Status transition to UNDER_REVIEW succeeded.');

  // 10. Test PATCH /api/risks/:id/owner
  const ownerRes = await fetch(`${BASE_URL}/api/risks/${createdRiskId}/owner`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ ownerId: adminLoginData.data.user.id })
  });
  const ownerData = await ownerRes.json();
  if (ownerRes.status !== 200) {
    throw new Error(`Owner assignment failed: ${JSON.stringify(ownerData)}`);
  }
  console.log('✅ 10. Owner assignment succeeded.');

  // 11. Test PATCH /api/risks/:id (General edit)
  const editRes = await fetch(`${BASE_URL}/api/risks/${createdRiskId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      probability: 70,
      impact: 85,
      severity: 'CRITICAL',
      description: 'Updated description with enhanced mitigation measures.'
    })
  });
  const editData = await editRes.json();
  if (editRes.status !== 200 || editData.data?.severity !== 'CRITICAL') {
    throw new Error(`General edit failed: ${JSON.stringify(editData)}`);
  }
  console.log('✅ 11. General risk edit succeeded and severity updated to CRITICAL.');

  // 12. Test GET /api/risks list with summary stats
  const listRes = await fetch(`${BASE_URL}/api/risks`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const listData = await listRes.json();
  if (listRes.status !== 200 || !listData.summary || listData.summary.totalRisks < 1) {
    throw new Error(`List retrieval failed: ${JSON.stringify(listData)}`);
  }
  console.log(`✅ 12. List retrieved with ${listData.summary.totalRisks} total risks. Metrics:`, {
    criticalRisks: listData.summary.criticalRisks,
    underReview: listData.summary.underReview
  });

  // 13. Test GET /api/risks/audit-logs
  const auditRes = await fetch(`${BASE_URL}/api/risks/audit-logs?riskId=${createdRiskId}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const auditData = await auditRes.json();
  if (auditRes.status !== 200 || auditData.data.length < 4) {
    throw new Error(`Audit log retrieval failed or missing actions: count=${auditData.data?.length}`);
  }
  const loggedActions = auditData.data.map(l => l.action);
  console.log('✅ 13. Audit logs verified for risk actions:', loggedActions);

  // 14. Test Viewer trying to delete risk -> 403 Forbidden
  const viewerDeleteRes = await fetch(`${BASE_URL}/api/risks/${createdRiskId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${viewerToken}` }
  });
  if (viewerDeleteRes.status === 403) {
    console.log('✅ 14. Viewer delete attempt rejected with 403 Forbidden.');
  } else {
    throw new Error(`Expected 403 for viewer delete, got ${viewerDeleteRes.status}`);
  }

  // 15. Test Super Admin deleting risk -> 200 OK
  const deleteRes = await fetch(`${BASE_URL}/api/risks/${createdRiskId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const deleteData = await deleteRes.json();
  if (deleteRes.status !== 200) {
    throw new Error(`Delete risk failed: ${JSON.stringify(deleteData)}`);
  }
  console.log('✅ 15. Super Admin successfully deleted risk record.');

  // 16. Verify RISK_DELETED in audit logs
  const finalAuditRes = await fetch(`${BASE_URL}/api/risks/audit-logs?riskId=${createdRiskId}`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const finalAuditData = await finalAuditRes.json();
  const hasDeleteAudit = finalAuditData.data.some(l => l.action === 'RISK_DELETED');
  if (hasDeleteAudit) {
    console.log('✅ 16. RISK_DELETED audit record verified.');
  } else {
    throw new Error('RISK_DELETED audit log entry was not found!');
  }

  console.log('🎉 ALL 16 BACKEND API TESTS PASSED FLAWLESSLY!');
}

runApiTests().catch(err => {
  console.error('❌ E2E API Test failed:', err);
  process.exit(1);
});
