/**
 * AI Agent Gateway Controller
 * Manages agent run execution, status polling, approvals,
 * and internal tool execution bridge with tenant isolation.
 * Phase 5: AI Agent + Tool Calling
 */

const crypto = require('crypto');
const { 
  AgentRun, 
  AgentStep, 
  AgentToolCall, 
  AgentApproval, 
  MitigationPlan,
  Risk, 
  RiskHistory, 
  Project, 
  ComplianceRecord, 
  SupplyChainRecord, 
  ElectricityReading, 
  EmissionRecord, 
  EnvironmentalAlert,
  AuditLog,
  PredictionHistory
} = require('../../../models/models');

const pythonServiceUrl = process.env.PYTHON_AI_URL || 'http://localhost:8000';
const internalKey = process.env.INTERNAL_SERVICE_KEY || 'esg-ai-internal-service-key-secret-2026';

// Helper to check write permission for approvals
function canManageRisks(role) {
  const privileged = [
    'SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN', 'ORGANIZATION_ADMIN',
    'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'COMPLIANCE_MANAGER', 'PROJECT_MANAGER'
  ];
  return privileged.includes((role || '').toUpperCase());
}

/**
 * POST /api/ai-agent/run
 * Initiates an agent run for a natural-language goal.
 */
async function runAgent(req, res) {
  try {
    const { goal } = req.body;
    if (!goal || typeof goal !== 'string' || !goal.trim()) {
      return res.status(400).json({ success: false, message: 'A non-empty string "goal" is required.' });
    }

    const user = req.user;
    const orgId = user.organizationId;
    const userId = user.userId || user._id?.toString() || 'unknown_user';
    const runId = `run_${crypto.randomBytes(6).toString('hex')}`;
    const startTime = new Date().toISOString();

    // 1. Create AgentRun record in database
    const agentRun = await AgentRun.create({
      agent_run_id: runId,
      user_id: userId,
      organization_id: orgId,
      goal: goal.trim(),
      status: 'RUNNING',
      started_at: startTime,
      step_count: 0,
      result_summary: 'Agent run initiated',
      final_response: '',
      error_category: null
    });

    // 2. Log AGENT_RUN_STARTED audit event
    await AuditLog.create({
      organizationId: orgId,
      user: user.email || user.name || 'User',
      userId: userId,
      action: 'AGENT_RUN_STARTED',
      riskId: '',
      module: 'AIAgent',
      recordId: runId,
      metadata: { run_id: runId, goal: goal.trim(), timestamp: startTime },
      timestamp: startTime
    });

    // 3. Prepare authorized payload for Python AI service
    const pythonPayload = {
      goal: goal.trim(),
      agent_run_id: runId,
      user_context: {
        user_id: userId,
        organization_id: orgId,
        role: user.role || 'VIEWER',
        permissions: user.permissions || []
      }
    };

    // 4. Dispatch to Python service
    let pythonRes;
    try {
      const response = await fetch(`${pythonServiceUrl}/internal/agent/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Key': internalKey
        },
        body: JSON.stringify(pythonPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Python AI Agent returned HTTP ${response.status}: ${errorText}`);
      }

      pythonRes = await response.json();
    } catch (callErr) {
      await AgentRun.updateOne(
        { agent_run_id: runId },
        { 
          status: 'FAILED', 
          error_category: 'AI_SERVICE_COMMUNICATION_ERROR',
          result_summary: callErr.message,
          completed_at: new Date().toISOString()
        }
      );

      await AuditLog.create({
        organizationId: orgId,
        user: user.email || user.name || 'User',
        userId: userId,
        action: 'AGENT_RUN_FAILED',
        riskId: '',
        module: 'AIAgent',
        recordId: runId,
        metadata: { run_id: runId, error: callErr.message },
        timestamp: new Date().toISOString()
      });

      return res.status(502).json({
        success: false,
        message: 'Failed to communicate with AI Agent service.',
        error: callErr.message
      });
    }

    // 5. Persist steps, tool calls, and approvals returned by Python
    await syncAgentEntities(runId, orgId, user, pythonRes);

    return res.status(200).json({
      success: true,
      data: pythonRes
    });
  } catch (err) {
    console.error('Agent Run Gateway Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error while executing agent run.' });
  }
}

/**
 * Helper to persist steps, tool calls, approvals and update AgentRun
 */
async function syncAgentEntities(runId, orgId, user, pythonRes) {
  const userId = user.userId || user._id?.toString() || 'User';
  const now = new Date().toISOString();

  // Persist Steps
  if (Array.isArray(pythonRes.steps)) {
    for (const step of pythonRes.steps) {
      const existing = await AgentStep.findOne({ step_id: step.step_id });
      if (!existing) {
        await AgentStep.create({
          step_id: step.step_id,
          agent_run_id: runId,
          step_number: step.step_number,
          step_type: step.step_type,
          tool_name: step.tool_name || null,
          input_summary: step.input_summary || '',
          output_summary: step.output_summary || '',
          status: step.status || 'COMPLETED',
          created_at: step.created_at || now
        });
      }
    }
  }

  // Persist Tool Calls & Audit them
  if (Array.isArray(pythonRes.tool_calls)) {
    for (const call of pythonRes.tool_calls) {
      const existing = await AgentToolCall.findOne({ tool_call_id: call.tool_call_id });
      if (!existing) {
        await AgentToolCall.create({
          tool_call_id: call.tool_call_id,
          agent_run_id: runId,
          step_id: call.step_id,
          tool_name: call.tool_name,
          validated_input: call.validated_input || {},
          result_summary: call.result_summary || '',
          status: call.status || 'SUCCESS',
          execution_time: call.execution_time || 0,
          created_at: call.created_at || now
        });

        // Audit tool execution
        await AuditLog.create({
          organizationId: orgId,
          user: user.email || user.name || 'User',
          userId: userId,
          action: call.status === 'FAILED' ? 'AGENT_TOOL_FAILED' : 'AGENT_TOOL_EXECUTED',
          riskId: call.validated_input?.risk_id || '',
          module: 'AIAgent',
          recordId: call.tool_call_id,
          metadata: {
            tool_name: call.tool_name,
            run_id: runId,
            status: call.status,
            execution_time: call.execution_time
          },
          timestamp: call.created_at || now
        });
      }
    }
  }

  // Persist Approvals
  if (Array.isArray(pythonRes.approvals)) {
    for (const appr of pythonRes.approvals) {
      const existing = await AgentApproval.findOne({ approval_id: appr.approval_id });
      if (!existing) {
        await AgentApproval.create({
          approval_id: appr.approval_id,
          agent_run_id: runId,
          tool_name: appr.tool_name,
          reason: appr.reason,
          requested_action: appr.requested_action || {},
          requested_by_agent: appr.requested_by_agent || 'RiskAgent',
          status: appr.status || 'PENDING',
          created_at: appr.created_at || now
        });

        // Audit approval request
        await AuditLog.create({
          organizationId: orgId,
          user: user.email || user.name || 'User',
          userId: userId,
          action: 'AGENT_APPROVAL_REQUESTED',
          riskId: appr.requested_action?.risk_id || '',
          module: 'AIAgent',
          recordId: appr.approval_id,
          metadata: {
            approval_id: appr.approval_id,
            tool_name: appr.tool_name,
            reason: appr.reason,
            run_id: runId
          },
          timestamp: now
        });
      }
    }
  }

  // Update AgentRun
  await AgentRun.updateOne(
    { agent_run_id: runId },
    {
      status: pythonRes.status,
      step_count: pythonRes.step_count || pythonRes.steps?.length || 0,
      result_summary: pythonRes.result_summary || '',
      final_response: pythonRes.final_response || '',
      error_category: pythonRes.error_category || null,
      completed_at: pythonRes.completed_at || (pythonRes.status === 'COMPLETED' ? now : null)
    }
  );

  // Audit completion/failure
  if (pythonRes.status === 'COMPLETED') {
    await AuditLog.create({
      organizationId: orgId,
      user: user.email || user.name || 'User',
      userId: userId,
      action: 'AGENT_RUN_COMPLETED',
      riskId: '',
      module: 'AIAgent',
      recordId: runId,
      metadata: { run_id: runId, step_count: pythonRes.step_count },
      timestamp: now
    });
  } else if (pythonRes.status === 'FAILED') {
    await AuditLog.create({
      organizationId: orgId,
      user: user.email || user.name || 'User',
      userId: userId,
      action: 'AGENT_RUN_FAILED',
      riskId: '',
      module: 'AIAgent',
      recordId: runId,
      metadata: { run_id: runId, error: pythonRes.result_summary },
      timestamp: now
    });
  }
}

/**
 * GET /api/ai-agent/runs
 * Returns list of agent runs for the organization.
 */
async function listAgentRuns(req, res) {
  try {
    const orgId = req.user.organizationId;
    const filter = (req.user.role === 'SUPER_ADMIN' || req.user.role === 'PLATFORM_ADMIN') ? {} : { organization_id: orgId };

    const runs = await AgentRun.find(filter).sort({ started_at: -1 }).limit(50);
    return res.status(200).json({ success: true, count: runs.length, data: runs });
  } catch (err) {
    console.error('List Agent Runs Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve agent runs.' });
  }
}

/**
 * GET /api/ai-agent/runs/:id
 * Retrieves a single agent run by run ID.
 */
async function getAgentRunById(req, res) {
  try {
    const { id } = req.params;
    const orgId = req.user.organizationId;

    const run = await AgentRun.findOne({ agent_run_id: id });
    if (!run) {
      return res.status(404).json({ success: false, message: `Agent run '${id}' not found.` });
    }

    // Tenant isolation check
    if (run.organization_id !== orgId && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'PLATFORM_ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden: Cannot access agent runs from another organization.' });
    }

    const steps = await AgentStep.find({ agent_run_id: id }).sort({ step_number: 1 });
    const toolCalls = await AgentToolCall.find({ agent_run_id: id }).sort({ created_at: 1 });
    const approvals = await AgentApproval.find({ agent_run_id: id });

    return res.status(200).json({
      success: true,
      data: {
        ...run.toObject(),
        steps,
        tool_calls: toolCalls,
        approvals
      }
    });
  } catch (err) {
    console.error('Get Agent Run Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve agent run details.' });
  }
}

/**
 * GET /api/ai-agent/runs/:id/steps
 * Retrieves the step sequence for an agent run.
 */
async function getAgentRunSteps(req, res) {
  try {
    const { id } = req.params;
    const orgId = req.user.organizationId;

    const run = await AgentRun.findOne({ agent_run_id: id });
    if (!run) {
      return res.status(404).json({ success: false, message: `Agent run '${id}' not found.` });
    }

    if (run.organization_id !== orgId && req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'PLATFORM_ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden: Cannot access steps from another organization.' });
    }

    const steps = await AgentStep.find({ agent_run_id: id }).sort({ step_number: 1 });
    return res.status(200).json({ success: true, count: steps.length, data: steps });
  } catch (err) {
    console.error('Get Run Steps Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve agent steps.' });
  }
}

/**
 * POST /api/ai-agent/approvals/:id/approve
 * Approves a pending action and resumes agent execution.
 */
async function approveAction(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    // RBAC: Check write authorization
    if (!canManageRisks(user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges to approve agent write actions.' });
    }

    const approval = await AgentApproval.findOne({ approval_id: id });
    if (!approval) {
      return res.status(404).json({ success: false, message: `Approval request '${id}' not found.` });
    }

    if (approval.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: `Approval request is already '${approval.status}'.` });
    }

    const run = await AgentRun.findOne({ agent_run_id: approval.agent_run_id });
    if (!run) {
      return res.status(404).json({ success: false, message: 'Associated agent run not found.' });
    }

    // Tenant check
    if (run.organization_id !== user.organizationId && user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden: Tenant mismatch.' });
    }

    const now = new Date().toISOString();
    await AgentApproval.updateOne(
      { approval_id: id },
      { 
        status: 'APPROVED', 
        approved_by: user.email || user.name || 'User',
        approved_at: now 
      }
    );

    // Audit approval
    await AuditLog.create({
      organizationId: run.organization_id,
      user: user.email || user.name || 'User',
      userId: user.userId || user._id?.toString() || 'User',
      action: 'AGENT_APPROVED',
      riskId: approval.requested_action?.risk_id || '',
      module: 'AIAgent',
      recordId: id,
      metadata: { approval_id: id, run_id: run.agent_run_id, tool_name: approval.tool_name },
      timestamp: now
    });

    // Resume Python agent execution
    const resumePayload = {
      goal: run.goal,
      agent_run_id: run.agent_run_id,
      resume_approval_id: id,
      resume_decision: 'APPROVE',
      user_context: {
        user_id: user.userId || user._id?.toString() || 'User',
        organization_id: run.organization_id,
        role: user.role,
        permissions: user.permissions || []
      }
    };

    const pythonRes = await fetch(`${pythonServiceUrl}/internal/agent/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Service-Key': internalKey
      },
      body: JSON.stringify(resumePayload)
    });

    const pythonData = await pythonRes.json();
    await syncAgentEntities(run.agent_run_id, run.organization_id, user, pythonData);

    return res.status(200).json({
      success: true,
      message: 'Action approved and agent execution resumed successfully.',
      data: pythonData
    });
  } catch (err) {
    console.error('Approve Action Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process approval.' });
  }
}

/**
 * POST /api/ai-agent/approvals/:id/reject
 * Rejects a pending action and safely concludes agent execution.
 */
async function rejectAction(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!canManageRisks(user.role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges to reject agent write actions.' });
    }

    const approval = await AgentApproval.findOne({ approval_id: id });
    if (!approval) {
      return res.status(404).json({ success: false, message: `Approval request '${id}' not found.` });
    }

    if (approval.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: `Approval request is already '${approval.status}'.` });
    }

    const run = await AgentRun.findOne({ agent_run_id: approval.agent_run_id });
    if (!run) {
      return res.status(404).json({ success: false, message: 'Associated agent run not found.' });
    }

    if (run.organization_id !== user.organizationId && user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Forbidden: Tenant mismatch.' });
    }

    const now = new Date().toISOString();
    await AgentApproval.updateOne(
      { approval_id: id },
      { 
        status: 'REJECTED', 
        rejected_by: user.email || user.name || 'User',
        rejected_at: now 
      }
    );

    // Audit rejection
    await AuditLog.create({
      organizationId: run.organization_id,
      user: user.email || user.name || 'User',
      userId: user.userId || user._id?.toString() || 'User',
      action: 'AGENT_REJECTED',
      riskId: approval.requested_action?.risk_id || '',
      module: 'AIAgent',
      recordId: id,
      metadata: { approval_id: id, run_id: run.agent_run_id, tool_name: approval.tool_name },
      timestamp: now
    });

    // Resume Python agent with REJECT decision
    const resumePayload = {
      goal: run.goal,
      agent_run_id: run.agent_run_id,
      resume_approval_id: id,
      resume_decision: 'REJECT',
      user_context: {
        user_id: user.userId || user._id?.toString() || 'User',
        organization_id: run.organization_id,
        role: user.role,
        permissions: user.permissions || []
      }
    };

    const pythonRes = await fetch(`${pythonServiceUrl}/internal/agent/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Service-Key': internalKey
      },
      body: JSON.stringify(resumePayload)
    });

    const pythonData = await pythonRes.json();
    await syncAgentEntities(run.agent_run_id, run.organization_id, user, pythonData);

    return res.status(200).json({
      success: true,
      message: 'Action rejected. Agent safely concluded.',
      data: pythonData
    });
  } catch (err) {
    console.error('Reject Action Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process rejection.' });
  }
}

/**
 * POST /internal/agent-tools/execute
 * Internal authenticated endpoint called by Python tool execution service.
 * Enforces server-side tenant isolation and executes authorized data actions.
 */
async function executeInternalTool(req, res) {
  try {
    const key = req.headers['x-internal-service-key'];
    if (key !== internalKey) {
      return res.status(401).json({ success: false, message: 'Unauthorized: Invalid internal service key.' });
    }

    const { tool_name, parameters, user_context } = req.body;
    if (!tool_name || !user_context || !user_context.organization_id) {
      return res.status(400).json({ success: false, message: 'Missing tool_name or user_context with organization_id.' });
    }

    const orgId = user_context.organization_id;

    // RBAC check: Viewers cannot execute state-modifying write tools
    const WRITE_TOOLS = ['create_mitigation_plan', 'assign_risk_owner', 'update_risk_status', 'schedule_action_deadline'];
    if (user_context.role === 'VIEWER' && WRITE_TOOLS.includes(tool_name)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Viewers are not authorized to execute write tools.' });
    }

    let result = null;

    switch (tool_name) {
      case 'list_risks': {
        const query = { organizationId: orgId };
        if (parameters.category) query.category = parameters.category;
        if (parameters.severity) query.severity = parameters.severity;
        if (parameters.status) query.status = parameters.status;
        const limit = Math.min(parameters.limit || 20, 100);
        result = await Risk.find(query).limit(limit);
        break;
      }

      case 'get_risk': {
        result = await Risk.findOne({ _id: parameters.risk_id, organizationId: orgId });
        break;
      }

      case 'get_risk_history': {
        result = await RiskHistory.find({ risk_id: parameters.risk_id }).sort({ timestamp: -1 });
        break;
      }

      case 'get_project': {
        result = await Project.findOne({ _id: parameters.project_id, organizationId: orgId });
        break;
      }

      case 'get_project_risks': {
        result = await Risk.find({ projectId: parameters.project_id, organizationId: orgId }).limit(parameters.limit || 20);
        break;
      }

      case 'get_compliance_records': {
        const query = { organizationId: orgId };
        if (parameters.status) query.status = parameters.status;
        result = await ComplianceRecord.find(query).limit(parameters.limit || 20);
        break;
      }

      case 'get_supplier_records': {
        const query = { organizationId: orgId };
        if (parameters.risk_level) query.riskLevel = parameters.risk_level;
        result = await SupplyChainRecord.find(query).limit(parameters.limit || 20);
        break;
      }

      case 'get_esg_records': {
        result = await ElectricityReading.find({ organizationId: orgId }).limit(parameters.limit || 20);
        break;
      }

      case 'get_carbon_records': {
        result = await EmissionRecord.find({ organizationId: orgId }).limit(parameters.limit || 20);
        break;
      }

      case 'get_mitigation_plan': {
        const query = { organization_id: orgId };
        if (parameters.plan_id) query.plan_id = parameters.plan_id;
        if (parameters.risk_id) query.risk_id = parameters.risk_id;
        result = await MitigationPlan.findOne(query);
        break;
      }

      case 'create_mitigation_plan': {
        const planId = `plan_${crypto.randomBytes(6).toString('hex')}`;
        const newPlan = await MitigationPlan.create({
          plan_id: planId,
          risk_id: parameters.risk_id,
          organization_id: orgId,
          title: parameters.title,
          steps: parameters.steps || [],
          owner: parameters.owner || '',
          target_date: parameters.target_date || '',
          status: 'PLANNED',
          created_at: new Date().toISOString()
        });
        result = newPlan;
        break;
      }

      case 'assign_risk_owner': {
        const updateRes = await Risk.updateOne(
          { _id: parameters.risk_id, organizationId: orgId },
          { ownerId: parameters.owner_id, updatedAt: new Date().toISOString() }
        );
        result = { risk_id: parameters.risk_id, owner_id: parameters.owner_id, modified: updateRes.modifiedCount };
        break;
      }

      case 'update_mitigation_status': {
        const updateRes = await Risk.updateOne(
          { _id: parameters.risk_id, organizationId: orgId },
          { status: parameters.status, updatedAt: new Date().toISOString() }
        );
        result = { risk_id: parameters.risk_id, status: parameters.status, modified: updateRes.modifiedCount };
        break;
      }

      case 'create_alert': {
        const newAlert = await EnvironmentalAlert.create({
          organizationId: orgId,
          severity: parameters.severity || 'Warning',
          type: 'Risk Agent Alert',
          relatedRecord: parameters.entity || 'RiskManager',
          message: parameters.message,
          status: 'Unread',
          createdAt: new Date().toISOString()
        });
        result = newAlert;
        break;
      }

      case 'generate_risk_report': {
        const allRisks = await Risk.find({ organizationId: orgId });
        const criticalCount = allRisks.filter(r => r.severity === 'CRITICAL').length;
        const highCount = allRisks.filter(r => r.severity === 'HIGH').length;
        result = {
          report_type: parameters.report_type || 'EXECUTIVE_SUMMARY',
          organization_id: orgId,
          total_risks: allRisks.length,
          critical_count: criticalCount,
          high_count: highCount,
          summary: `Executive Risk Report: ${allRisks.length} total risks identified (${criticalCount} Critical, ${highCount} High). Active mitigation controls recommended.`
        };
        break;
      }

      case 'predict_risk_trajectory': {
        const riskId = parameters.risk_id;
        const horizon = [7, 30, 90].includes(Number(parameters.prediction_horizon_days)) 
          ? Number(parameters.prediction_horizon_days) 
          : 30;
        const risk = await Risk.findOne({ _id: riskId, organizationId: orgId });
        if (!risk) {
          throw new Error(`Risk ${riskId} not found or unauthorized.`);
        }

        const pyRes = await fetch(`${pythonServiceUrl}/internal/predictive/predict`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Service-Key': internalKey
          },
          body: JSON.stringify({
            risk_id: risk._id.toString(),
            prediction_horizon_days: horizon,
            organization_id: orgId,
            project_id: risk.projectId ? risk.projectId.toString() : null,
            include_explainability: true,
            risk_snapshot: {
              risk_id: risk._id.toString(),
              title: risk.title,
              category: risk.category,
              status: risk.status,
              risk_score: risk.risk_score,
              severity: risk.severity,
              probability: risk.probability,
              impact: risk.impact,
              exposure: risk.exposure,
              urgency: risk.urgency
            }
          })
        });

        if (!pyRes.ok) {
          const errText = await pyRes.text();
          throw new Error(`Predictive service error: ${errText}`);
        }

        const pyData = await pyRes.json();
        const saved = await PredictionHistory.create({
          prediction_id: pyData.prediction_id || `pred_${crypto.randomUUID()}`,
          risk_id: risk._id.toString(),
          organizationId: orgId,
          projectId: risk.projectId ? risk.projectId.toString() : null,
          current_score: risk.risk_score,
          current_severity: risk.severity,
          prediction_horizon_days: pyData.prediction_horizon_days || horizon,
          predicted_score: pyData.predicted_score,
          predicted_severity: pyData.predicted_severity,
          critical_probability: pyData.critical_probability,
          trend: pyData.trend,
          top_predictive_factors: pyData.top_predictive_factors || [],
          model_version: pyData.model_version || 'risk-predictor-v1',
          feature_version: pyData.feature_version || 'risk-features-v1',
          prediction_timestamp: pyData.prediction_timestamp || new Date().toISOString()
        });

        result = saved;
        break;
      }

      case 'simulate_risk_scenario': {
        const scenarioType = parameters.scenario_type || 'CARBON_INCREASE';
        const risks = await Risk.find({ organizationId: orgId }).limit(50);
        const mappedRisks = risks.map(r => ({
          id: r._id.toString(),
          title: r.title,
          category: r.category,
          probability: r.probability,
          impact: r.impact,
          exposure: r.exposure,
          urgency: r.urgency
        }));

        const pyRes = await fetch(`${pythonServiceUrl}/internal/scenarios/simulate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenario_name: parameters.scenario_name || `Agent Simulation: ${scenarioType}`,
            scenario_type: scenarioType,
            organization_id: orgId,
            project_id: user_context.project_id || null,
            parameters: parameters,
            risks: mappedRisks,
            include_ai_explanation: true
          })
        });

        if (!pyRes.ok) {
          const errText = await pyRes.text();
          throw new Error(`Scenario simulation service error: ${errText}`);
        }

        result = await pyRes.json();
        break;
      }

      case 'compare_risk_scenarios': {
        const pyRes = await fetch(`${pythonServiceUrl}/internal/scenarios/compare`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organization_id: orgId,
            project_id: user_context.project_id || null,
            scenario_ids: parameters.scenario_ids || []
          })
        });

        if (!pyRes.ok) {
          const errText = await pyRes.text();
          throw new Error(`Scenario comparison service error: ${errText}`);
        }

        result = await pyRes.json();
        break;
      }

      default:
        return res.status(400).json({ success: false, message: `Unsupported internal tool '${tool_name}'.` });
    }

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('Execute Internal Tool Error:', err);
    return res.status(500).json({ success: false, message: `Tool execution error: ${err.message}` });
  }
}

module.exports = {
  runAgent,
  listAgentRuns,
  getAgentRunById,
  getAgentRunSteps,
  approveAction,
  rejectAction,
  executeInternalTool
};
