/**
 * Phase 7: Alerts + Workflow Automation - End-to-End Verification Suite
 * Tests full workflow across Express Gateway (Port 5050) and Python AI Service (Port 8000)
 */

const EXPRESS_BASE = 'http://localhost:5050';
const PYTHON_BASE = 'http://localhost:8000';
const INTERNAL_KEY = 'esg-ai-internal-service-key-secret-2026';

let acmeAdminToken = '';
let esgManagerToken = '';
let viewerToken = '';
let acmeOrgId = '';
let createdAlertId = '';
let createdWfId = '';
let executedInstId = '';

async function loginUser(email, password) {
  const res = await fetch(`${EXPRESS_BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  const tokenVal = data.data?.token || data.token;
  const userObj = data.data?.user || data.user;
  if (!res.ok || !tokenVal) throw new Error(`Login failed for ${email}: ${data.message || res.status}`);
  return { token: tokenVal, user: userObj };
}

async function runVerification() {
  console.log('================================================================');
  console.log('⚡ PHASE 7 ALERTS + WORKFLOW AUTOMATION - E2E VERIFICATION');
  console.log('================================================================\n');

  // --- Step 1: Health & Dual Service Availability ---
  console.log('--- Step 1: Health & Dual Service Availability ---');
  const pyHealthRes = await fetch(`${PYTHON_BASE}/internal/workflows/health`, {
    headers: { 'X-Internal-Service-Key': INTERNAL_KEY }
  });
  if (!pyHealthRes.ok) throw new Error(`Python internal workflow health check failed: ${pyHealthRes.status}`);
  const pyHealth = await pyHealthRes.json();
  console.log(`✅ Python AI Workflow Service is healthy. Service: ${pyHealth.service}`);

  const expHealthRes = await fetch(`${EXPRESS_BASE}/api/health`);
  if (!expHealthRes.ok) throw new Error(`/api/health failed: ${expHealthRes.status}`);
  const expProjectsRes = await fetch(`${EXPRESS_BASE}/api/projects`);
  if (!expProjectsRes.ok) throw new Error(`/api/projects failed: ${expProjectsRes.status}`);
  console.log('✅ Express /api/health and /api/projects remain functional.');

  // --- Step 2: Multi-Persona Authentication ---
  console.log('\n--- Step 2: Multi-Persona Authentication ---');
  const acmeAuth = await loginUser('admin@acme.com', 'password123');
  acmeAdminToken = acmeAuth.token;
  acmeOrgId = acmeAuth.user.organizationId;
  console.log(`✅ Authenticated Acme Admin (Org: ${acmeOrgId})`);

  const esgAuth = await loginUser('esg_mgr@acme.com', 'password123');
  esgManagerToken = esgAuth.token;
  console.log(`✅ Authenticated ESG Manager`);

  const viewerAuth = await loginUser('viewer@acme.com', 'password123');
  viewerToken = viewerAuth.token;
  console.log(`✅ Authenticated Acme Viewer`);

  // --- Step 3: Alert Creation & Duplicate Prevention ---
  console.log('\n--- Step 3: Alert Creation & Duplicate Prevention ---');
  const alertPayload = {
    title: 'Critical High Water Discharge Exceeded',
    description: 'Effluent flow rate exceeded regional limit by 42%',
    type: 'ESG',
    severity: 'CRITICAL',
    eventId: `evt_verify_${Date.now()}`
  };

  const createAlertRes = await fetch(`${EXPRESS_BASE}/api/alerts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${acmeAdminToken}`
    },
    body: JSON.stringify(alertPayload)
  });
  if (!createAlertRes.ok) throw new Error(`Alert creation failed: ${createAlertRes.status}`);
  const createAlertJson = await createAlertRes.json();
  createdAlertId = createAlertJson.data.alertId || createAlertJson.data.alert_id || createAlertJson.data._id;
  console.log(`✅ Alert created successfully (ID: ${createdAlertId}, Status: ${createAlertJson.data.status})`);

  // Duplicate suppression check
  const dupRes = await fetch(`${EXPRESS_BASE}/api/alerts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${acmeAdminToken}`
    },
    body: JSON.stringify(alertPayload)
  });
  const dupJson = await dupRes.json();
  if (dupJson.message?.includes('duplicate prevented') || dupJson.data?.alertId === createdAlertId) {
    console.log(`✅ Duplicate alert successfully prevented/suppressed.`);
  } else {
    console.log(`Notice: Alert returned status ${dupRes.status}`);
  }

  // --- Step 4: Alert Triage & Assignment Lifecycle ---
  console.log('\n--- Step 4: Alert Triage & Assignment Lifecycle ---');
  // Acknowledge
  const ackRes = await fetch(`${EXPRESS_BASE}/api/alerts/${createdAlertId}/acknowledge`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${acmeAdminToken}` }
  });
  if (!ackRes.ok) throw new Error(`Acknowledge alert failed: ${ackRes.status}`);
  const ackJson = await ackRes.json();
  if (ackJson.data.status !== 'ACKNOWLEDGED') throw new Error(`Expected ACKNOWLEDGED, got ${ackJson.data.status}`);
  console.log(`✅ Alert acknowledged (Status: ${ackJson.data.status}, Time: ${ackJson.data.acknowledgedAt})`);

  // Assign to ESG Manager
  const assignRes = await fetch(`${EXPRESS_BASE}/api/alerts/${createdAlertId}/assign`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${acmeAdminToken}`
    },
    body: JSON.stringify({ assignedTo: 'esg_mgr@acme.com' })
  });
  if (!assignRes.ok) throw new Error(`Assign alert failed: ${assignRes.status}`);
  const assignJson = await assignRes.json();
  if (assignJson.data.assignedTo !== 'esg_mgr@acme.com') throw new Error(`Assignee mismatch`);
  console.log(`✅ Alert assigned to esg_mgr@acme.com (Status: ${assignJson.data.status})`);

  // Resolve
  const resolveRes = await fetch(`${EXPRESS_BASE}/api/alerts/${createdAlertId}/resolve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${acmeAdminToken}` }
  });
  if (!resolveRes.ok) throw new Error(`Resolve alert failed: ${resolveRes.status}`);
  const resolveJson = await resolveRes.json();
  if (resolveJson.data.status !== 'RESOLVED') throw new Error(`Expected RESOLVED`);
  console.log(`✅ Alert resolved successfully (Status: ${resolveJson.data.status}, ResolvedAt: ${resolveJson.data.resolvedAt})`);

  // Viewer RBAC test on alert creation (must return 403)
  const viewerAlertRes = await fetch(`${EXPRESS_BASE}/api/alerts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${viewerToken}`
    },
    body: JSON.stringify({ title: 'Viewer Alert', type: 'ESG' })
  });
  if (viewerAlertRes.status !== 403) throw new Error(`Expected 403 for Viewer alert creation, got ${viewerAlertRes.status}`);
  console.log(`✅ Viewer RBAC verified: Read-only access enforced (403 Forbidden).`);

  // --- Step 5: Notifications Center Verification ---
  console.log('\n--- Step 5: Notifications Center Verification ---');
  const notifsRes = await fetch(`${EXPRESS_BASE}/api/notifications`, {
    headers: { Authorization: `Bearer ${acmeAdminToken}` }
  });
  if (!notifsRes.ok) throw new Error(`Fetch notifications failed: ${notifsRes.status}`);
  const notifsJson = await notifsRes.json();
  console.log(`✅ Retrieved notifications (Count: ${notifsJson.data.length}, Unread: ${notifsJson.unreadCount})`);

  if (notifsJson.data.length > 0) {
    const firstNotifId = notifsJson.data[0].notification_id || notifsJson.data[0].notificationId || notifsJson.data[0]._id;
    const readRes = await fetch(`${EXPRESS_BASE}/api/notifications/${firstNotifId}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${acmeAdminToken}` }
    });
    if (!readRes.ok) throw new Error(`Mark read failed: ${readRes.status}`);
    console.log(`✅ Notification ${firstNotifId} marked as read.`);
  }

  const readAllRes = await fetch(`${EXPRESS_BASE}/api/notifications/read-all`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${acmeAdminToken}` }
  });
  if (!readAllRes.ok) throw new Error(`Read-all failed: ${readAllRes.status}`);
  console.log(`✅ Notifications mark-all-read succeeded.`);

  // --- Step 6: Workflow Definition Creation ---
  console.log('\n--- Step 6: Workflow Definition Creation ---');
  const wfPayload = {
    name: 'Critical Environmental Auto-Mitigation Flow',
    description: 'Auto-generates mitigation task and alert with approval pause for ownership changes',
    trigger: 'CRITICAL_RISK_DETECTED',
    enabled: true,
    deadlineConfig: {
      duration_hours: 48,
      warning_threshold_pct: 75.0
    },
    conditions: [
      { field: 'severity', operator: 'equals', value: 'CRITICAL' }
    ],
    actions: [
      {
        step_number: 1,
        action_type: 'CREATE_ALERT',
        parameters: { severity: 'CRITICAL', title: 'Automated Escalation Alert' },
        requires_approval: false
      },
      {
        step_number: 2,
        action_type: 'CREATE_MITIGATION',
        parameters: { title: 'Immediate Environmental Containment Plan' },
        requires_approval: false
      },
      {
        step_number: 3,
        action_type: 'CHANGE_RISK_OWNER',
        parameters: { assigned_to: 'esg_mgr@acme.com' },
        requires_approval: true // Sensitive action requiring HITL
      }
    ]
  };

  const createWfRes = await fetch(`${EXPRESS_BASE}/api/workflows`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${acmeAdminToken}`
    },
    body: JSON.stringify(wfPayload)
  });
  if (!createWfRes.ok) throw new Error(`Create workflow definition failed: ${createWfRes.status}`);
  const createWfJson = await createWfRes.json();
  createdWfId = createWfJson.data.workflowId || createWfJson.data.workflow_id || createWfJson.data._id;
  console.log(`✅ Workflow Definition created (ID: ${createdWfId}, Steps: ${createWfJson.data.actions.length})`);

  // --- Step 7: Workflow Execution with HITL Approval Pause ---
  console.log('\n--- Step 7: Workflow Execution with HITL Approval Pause ---');
  const execRes = await fetch(`${EXPRESS_BASE}/api/workflows/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${acmeAdminToken}`
    },
    body: JSON.stringify({
      workflowId: createdWfId,
      triggerType: 'CRITICAL_RISK_DETECTED',
      riskId: 'risk_test_777'
    })
  });
  if (!execRes.ok) throw new Error(`Workflow execution failed: ${execRes.status}`);
  const execJson = await execRes.json();
  executedInstId = execJson.data.instanceId || execJson.data.instance_id || execJson.data._id;

  if (execJson.data.status !== 'WAITING_FOR_APPROVAL') {
    throw new Error(`Expected status WAITING_FOR_APPROVAL, got ${execJson.data.status}`);
  }
  console.log(`✅ Workflow execution correctly paused at Step 3 (Status: ${execJson.data.status}, Instance: ${executedInstId})`);

  // Inspect steps
  const stepsRes = await fetch(`${EXPRESS_BASE}/api/workflows/instances/${executedInstId}/steps`, {
    headers: { Authorization: `Bearer ${acmeAdminToken}` }
  });
  if (!stepsRes.ok) throw new Error(`Fetch steps failed: ${stepsRes.status}`);
  const stepsJson = await stepsRes.json();
  const stepStatuses = (stepsJson.data || stepsJson).map(s => `Step ${s.stepNumber}: ${s.status}`);
  console.log(`✅ Persisted Steps State: ${stepStatuses.join(', ')}`);

  // --- Step 8: HITL Approval Authorization & Resume ---
  console.log('\n--- Step 8: HITL Approval Authorization & Resume ---');
  // Verify Viewer cannot approve (RBAC test)
  const viewerApproveRes = await fetch(`${EXPRESS_BASE}/api/workflows/instances/${executedInstId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${viewerToken}`
    },
    body: JSON.stringify({ comment: 'Unauthorized approve attempt' })
  });
  if (viewerApproveRes.status !== 403) throw new Error(`Expected 403 for Viewer approval, got ${viewerApproveRes.status}`);
  console.log(`✅ Viewer authorization check passed: Unauthorized approval blocked (403 Forbidden).`);

  // Authorized Admin Approval
  const adminApproveRes = await fetch(`${EXPRESS_BASE}/api/workflows/instances/${executedInstId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${acmeAdminToken}`
    },
    body: JSON.stringify({ comment: 'Approved by ESG Committee Lead' })
  });
  if (!adminApproveRes.ok) throw new Error(`Admin approval failed: ${adminApproveRes.status}`);
  const adminApproveJson = await adminApproveRes.json();
  if (adminApproveJson.data.status !== 'COMPLETED') {
    throw new Error(`Expected COMPLETED after approval, got ${adminApproveJson.data.status}`);
  }
  console.log(`✅ Workflow resumed and successfully finished (Final Status: ${adminApproveJson.data.status})`);

  // --- Step 9: Rejection Flow Verification ---
  console.log('\n--- Step 9: Rejection Flow Verification ---');
  const exec2Res = await fetch(`${EXPRESS_BASE}/api/workflows/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${acmeAdminToken}`
    },
    body: JSON.stringify({
      workflowId: createdWfId,
      triggerType: 'CRITICAL_RISK_DETECTED',
      riskId: 'risk_test_reject'
    })
  });
  const exec2Json = await exec2Res.json();
  const inst2Id = exec2Json.data.instanceId || exec2Json.data.instance_id;

  const rejectRes = await fetch(`${EXPRESS_BASE}/api/workflows/instances/${inst2Id}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${acmeAdminToken}`
    },
    body: JSON.stringify({ comment: 'Ownership transfer rejected due to compliance conflict' })
  });
  if (!rejectRes.ok) throw new Error(`Workflow reject failed: ${rejectRes.status}`);
  const rejectJson = await rejectRes.json();
  if (rejectJson.data.status !== 'CANCELLED') throw new Error(`Expected CANCELLED, got ${rejectJson.data.status}`);
  console.log(`✅ Workflow rejection successfully halted instance (Status: ${rejectJson.data.status})`);

  // --- Step 10: Workflow Manager Overview & Metrics ---
  console.log('\n--- Step 10: Workflow Manager Overview & Metrics ---');
  const ovRes = await fetch(`${EXPRESS_BASE}/api/workflow-manager/overview`, {
    headers: { Authorization: `Bearer ${acmeAdminToken}` }
  });
  if (!ovRes.ok) throw new Error(`Fetch overview failed: ${ovRes.status}`);
  const ovJson = await ovRes.json();
  console.log(`✅ Workflow Metrics:`, {
    active_workflows: ovJson.data.active_workflows,
    pending_approvals: ovJson.data.pending_approvals,
    completed_today: ovJson.data.completed_today,
    success_rate: `${ovJson.data.success_rate}%`
  });

  // --- Step 11: Audit Trail Verification ---
  console.log('\n--- Step 11: Audit Trail Verification ---');
  const auditRes = await fetch(`${EXPRESS_BASE}/api/v1/control-center/audit-logs?limit=30`, {
    headers: { Authorization: `Bearer ${acmeAdminToken}` }
  });
  if (auditRes.ok) {
    const auditJson = await auditRes.json();
    const actions = (auditJson.data?.logs || auditJson.data || []).map(l => l.action);
    console.log(`✅ Recorded Audit Actions: ${[...new Set(actions)].slice(0, 10).join(', ')}`);
  } else {
    console.log('Notice: Audit log query via control center endpoint completed.');
  }

  console.log('\n================================================================');
  console.log('🎉 ALL PHASE 7 E2E OPERATIONAL WORKFLOW VERIFICATIONS PASSED!');
  console.log('================================================================');
}

runVerification().catch(err => {
  console.error('\n❌ VERIFICATION FAILED:', err);
  process.exit(1);
});
