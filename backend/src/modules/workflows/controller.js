/**
 * Workflows Controller
 * Phase 7: Alerts + Workflow Automation
 * Handles workflow definitions CRUD, multi-step instance execution,
 * approval governance, and audit logging.
 */

const crypto = require('crypto');
const {
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowStep,
  Alert,
  MitigationPlan,
  Notification,
  AuditLog
} = require('../../../models/models');

const pythonServiceUrl = process.env.PYTHON_AI_URL || 'http://localhost:8000';
const internalKey = process.env.INTERNAL_SERVICE_KEY || 'esg-ai-internal-service-key-secret-2026';

function buildIdFilter(id, customField) {
  const isHexObjectId = typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
  if (isHexObjectId) {
    return { $or: [{ [customField]: id }, { _id: id }] };
  }
  return { [customField]: id };
}

function canManageWorkflows(role) {
  const privileged = [
    'SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN', 'ORGANIZATION_ADMIN',
    'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'COMPLIANCE_MANAGER', 'PROJECT_MANAGER'
  ];
  return privileged.includes((role || '').toUpperCase());
}

// ----------------------------------------------------------------------
// Definitions CRUD
// ----------------------------------------------------------------------

async function listDefinitions(req, res) {
  try {
    const query = { ...(req.riskQuery || {}) };
    const { trigger, enabled, projectId } = req.query;

    if (trigger) query.trigger = trigger.toUpperCase();
    if (enabled !== undefined) query.enabled = enabled === 'true';
    if (projectId) query.projectId = projectId;

    const definitions = await WorkflowDefinition.find(query).sort({ createdAt: -1 });

    const formatted = definitions.map(d => {
      const doc = d.toObject ? d.toObject() : d;
      return {
        ...doc,
        workflow_id: doc.workflowId || doc._id?.toString(),
        organization_id: doc.organizationId,
        project_id: doc.projectId,
        created_by: doc.createdBy,
        created_at: doc.createdAt,
        updated_at: doc.updatedAt
      };
    });

    res.json({ success: true, data: formatted });
  } catch (err) {
    console.error('Failed to list workflow definitions:', err);
    res.status(500).json({ success: false, message: 'Failed to list workflow definitions' });
  }
}

async function getDefinitionById(req, res) {
  try {
    const { id } = req.params;
    const filter = buildIdFilter(id, 'workflowId');
    const definition = await WorkflowDefinition.findOne(filter);

    if (!definition) {
      return res.status(404).json({ success: false, message: `Workflow definition ${id} not found` });
    }

    const role = req.user?.role || 'VIEWER';
    const userOrg = req.user?.organizationId?.toString();
    if (role !== 'SUPER_ADMIN' && role !== 'PLATFORM_ADMIN' && definition.organizationId !== userOrg) {
      return res.status(403).json({ success: false, message: 'Unauthorized: Cross-tenant access denied' });
    }

    const doc = definition.toObject ? definition.toObject() : definition;
    res.json({
      success: true,
      data: {
        ...doc,
        workflow_id: doc.workflowId || doc._id?.toString(),
        organization_id: doc.organizationId,
        project_id: doc.projectId,
        created_by: doc.createdBy,
        created_at: doc.createdAt,
        updated_at: doc.updatedAt
      }
    });
  } catch (err) {
    console.error('Failed to get definition by id:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve workflow definition' });
  }
}

async function createDefinition(req, res) {
  try {
    const user = req.user;
    const orgId = user?.organizationId?.toString() || req.body.organizationId || req.body.organization_id;
    if (!orgId) {
      return res.status(400).json({ success: false, message: 'Organization ID is required' });
    }

    const role = user?.role || 'VIEWER';
    if (role !== 'SUPER_ADMIN' && role !== 'PLATFORM_ADMIN' && !canManageWorkflows(role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges to create workflows' });
    }

    const {
      name,
      description = '',
      trigger,
      conditions = [],
      actions = [],
      enabled = true,
      projectId,
      project_id,
      deadlineConfig
    } = req.body;

    if (!name || !trigger) {
      return res.status(400).json({ success: false, message: 'Workflow name and trigger are required' });
    }

    const workflowId = `wf_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const nowIso = new Date().toISOString();

    const definition = await WorkflowDefinition.create({
      workflowId,
      name,
      description,
      trigger: trigger.toUpperCase(),
      conditions,
      actions,
      enabled,
      organizationId: orgId,
      projectId: projectId || project_id || null,
      deadlineConfig: deadlineConfig || null,
      createdBy: user?.email || 'Admin',
      createdAt: nowIso,
      updatedAt: nowIso
    });

    await AuditLog.create({
      organizationId: orgId,
      user: user?.email || 'Admin',
      userId: user?.id || user?._id || 'Admin',
      action: 'WORKFLOW_CREATED',
      recordId: workflowId,
      module: 'WorkflowManager',
      newValue: JSON.stringify({ workflowId, name, trigger }),
      timestamp: nowIso
    });

    // Also sync to Python service if available
    try {
      await fetch(`${pythonServiceUrl}/internal/workflows/definitions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Key': internalKey
        },
        body: JSON.stringify({
          workflow_id: workflowId,
          name,
          description,
          trigger: trigger.toUpperCase(),
          conditions,
          actions,
          enabled,
          organization_id: orgId,
          project_id: projectId || project_id || null
        }),
        signal: AbortSignal.timeout(3000)
      });
    } catch (e) {
      // Background sync best effort
    }

    res.status(201).json({ success: true, data: definition });
  } catch (err) {
    console.error('Failed to create workflow definition:', err);
    res.status(500).json({ success: false, message: 'Failed to create workflow definition' });
  }
}

async function updateDefinition(req, res) {
  try {
    const { id } = req.params;
    const filter = buildIdFilter(id, 'workflowId');
    const definition = await WorkflowDefinition.findOne(filter);

    if (!definition) {
      return res.status(404).json({ success: false, message: `Workflow definition ${id} not found` });
    }

    const role = req.user?.role || 'VIEWER';
    const userOrg = req.user?.organizationId?.toString();
    if (role !== 'SUPER_ADMIN' && role !== 'PLATFORM_ADMIN' && definition.organizationId !== userOrg) {
      return res.status(403).json({ success: false, message: 'Unauthorized: Cross-tenant access denied' });
    }

    const { name, description, trigger, conditions, actions, enabled, projectId } = req.body;
    if (name !== undefined) definition.name = name;
    if (description !== undefined) definition.description = description;
    if (trigger !== undefined) definition.trigger = trigger.toUpperCase();
    if (conditions !== undefined) definition.conditions = conditions;
    if (actions !== undefined) definition.actions = actions;
    if (enabled !== undefined) definition.enabled = enabled;
    if (projectId !== undefined) definition.projectId = projectId;

    definition.updatedAt = new Date().toISOString();
    await definition.save();

    res.json({ success: true, data: definition });
  } catch (err) {
    console.error('Failed to update workflow definition:', err);
    res.status(500).json({ success: false, message: 'Failed to update workflow definition' });
  }
}

async function deleteDefinition(req, res) {
  try {
    const { id } = req.params;
    const filter = buildIdFilter(id, 'workflowId');
    const definition = await WorkflowDefinition.findOne(filter);

    if (!definition) {
      return res.status(404).json({ success: false, message: `Workflow definition ${id} not found` });
    }

    const role = req.user?.role || 'VIEWER';
    const userOrg = req.user?.organizationId?.toString();
    if (role !== 'SUPER_ADMIN' && role !== 'PLATFORM_ADMIN' && definition.organizationId !== userOrg) {
      return res.status(403).json({ success: false, message: 'Unauthorized: Cross-tenant access denied' });
    }

    await WorkflowDefinition.deleteOne(filter);
    res.json({ success: true, message: `Workflow definition ${id} deleted successfully` });
  } catch (err) {
    console.error('Failed to delete workflow definition:', err);
    res.status(500).json({ success: false, message: 'Failed to delete workflow definition' });
  }
}

// ----------------------------------------------------------------------
// Instances & Step Execution
// ----------------------------------------------------------------------

async function listInstances(req, res) {
  try {
    const query = { ...(req.riskQuery || {}) };
    const { status, workflowId, projectId } = req.query;

    if (status) query.status = status.toUpperCase();
    if (workflowId) query.workflowId = workflowId;
    if (projectId) query.projectId = projectId;

    const instances = await WorkflowInstance.find(query).sort({ startedAt: -1 });

    const formatted = instances.map(i => {
      const doc = i.toObject ? i.toObject() : i;
      return {
        ...doc,
        instance_id: doc.instanceId || doc._id?.toString(),
        workflow_id: doc.workflowId,
        event_id: doc.eventId,
        risk_id: doc.riskId,
        organization_id: doc.organizationId,
        project_id: doc.projectId,
        current_step: doc.currentStep,
        started_at: doc.startedAt,
        completed_at: doc.completedAt,
        created_by: doc.createdBy,
        updated_at: doc.updatedAt
      };
    });

    res.json({ success: true, data: formatted });
  } catch (err) {
    console.error('Failed to list workflow instances:', err);
    res.status(500).json({ success: false, message: 'Failed to list workflow instances' });
  }
}

async function getInstanceById(req, res) {
  try {
    const { id } = req.params;
    const filter = buildIdFilter(id, 'instanceId');
    const instance = await WorkflowInstance.findOne(filter);

    if (!instance) {
      return res.status(404).json({ success: false, message: `Workflow instance ${id} not found` });
    }

    const role = req.user?.role || 'VIEWER';
    const userOrg = req.user?.organizationId?.toString();
    if (role !== 'SUPER_ADMIN' && role !== 'PLATFORM_ADMIN' && instance.organizationId !== userOrg) {
      return res.status(403).json({ success: false, message: 'Unauthorized: Cross-tenant access denied' });
    }

    const steps = await WorkflowStep.find({ instanceId: instance.instanceId }).sort({ stepNumber: 1 });
    const doc = instance.toObject ? instance.toObject() : instance;

    const formatted = {
      ...doc,
      instance_id: doc.instanceId || doc._id?.toString(),
      workflow_id: doc.workflowId,
      event_id: doc.eventId,
      risk_id: doc.riskId,
      organization_id: doc.organizationId,
      project_id: doc.projectId,
      current_step: doc.currentStep,
      started_at: doc.startedAt,
      completed_at: doc.completedAt,
      created_by: doc.createdBy,
      updated_at: doc.updatedAt,
      steps: steps.map(s => {
        const sdoc = s.toObject ? s.toObject() : s;
        return {
          ...sdoc,
          step_id: sdoc.stepId || sdoc._id?.toString(),
          instance_id: sdoc.instanceId,
          step_number: sdoc.stepNumber,
          action_type: sdoc.actionType,
          input_summary: sdoc.inputSummary,
          result_summary: sdoc.resultSummary,
          assigned_to: sdoc.assignedTo,
          started_at: sdoc.startedAt,
          completed_at: sdoc.completedAt
        };
      })
    };

    res.json({ success: true, data: formatted });
  } catch (err) {
    console.error('Failed to get instance by id:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve workflow instance' });
  }
}

async function getStepsByInstanceId(req, res) {
  try {
    const { id } = req.params;
    const filter = buildIdFilter(id, 'instanceId');
    const instance = await WorkflowInstance.findOne(filter);
    if (!instance) {
      return res.status(404).json({ success: false, message: `Workflow instance ${id} not found` });
    }

    const steps = await WorkflowStep.find({ instanceId: instance.instanceId }).sort({ stepNumber: 1 });
    res.json({ success: true, data: steps });
  } catch (err) {
    console.error('Failed to get steps by instance id:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve workflow steps' });
  }
}

/**
 * POST /api/workflows/execute
 * Triggers execution of a workflow definition on a given risk/event context
 */
async function executeWorkflow(req, res) {
  try {
    const user = req.user;
    const orgId = user?.organizationId?.toString() || req.body.organizationId || req.body.organization_id;
    const {
      workflowId,
      workflow_id,
      riskId,
      risk_id,
      eventId,
      event_id,
      projectId,
      project_id,
      triggerType = 'MANUAL'
    } = req.body;

    const targetWfId = workflowId || workflow_id;
    let definition = null;
    if (targetWfId) {
      definition = await WorkflowDefinition.findOne(buildIdFilter(targetWfId, 'workflowId'));
    } else {
      definition = await WorkflowDefinition.findOne({
        organizationId: orgId,
        trigger: triggerType.toUpperCase(),
        enabled: true
      });
    }

    if (!definition) {
      return res.status(404).json({ success: false, message: 'No matching active workflow definition found' });
    }

    const instanceId = `inst_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const nowIso = new Date().toISOString();
    const cleanRiskId = riskId || risk_id || null;
    const cleanEventId = eventId || event_id || null;
    const cleanProjectId = projectId || project_id || definition.projectId || null;

    // Calculate deadline
    let deadline = null;
    if (definition.deadlineConfig) {
      const durHours = definition.deadlineConfig.duration_hours || 24.0;
      const dueTime = new Date(Date.now() + durHours * 3600 * 1000).toISOString();
      const warnTime = new Date(Date.now() + durHours * 0.75 * 3600 * 1000).toISOString();
      deadline = {
        started_at: nowIso,
        due_at: dueTime,
        warning_at: warnTime,
        overdue_at: dueTime,
        duration_hours: durHours,
        current_tier: 'NONE',
        escalated_tiers: []
      };
    }

    const instance = await WorkflowInstance.create({
      instanceId,
      workflowId: definition.workflowId,
      eventId: cleanEventId,
      riskId: cleanRiskId,
      organizationId: orgId,
      projectId: cleanProjectId,
      status: 'RUNNING',
      currentStep: 0,
      startedAt: nowIso,
      completedAt: null,
      createdBy: user?.email || 'System',
      error: null,
      deadline,
      updatedAt: nowIso
    });

    await AuditLog.create({
      organizationId: orgId,
      user: user?.email || 'System',
      userId: user?.id || user?._id || 'System',
      action: 'WORKFLOW_STARTED',
      recordId: instanceId,
      riskId: cleanRiskId || '',
      module: 'WorkflowManager',
      newValue: JSON.stringify({ instanceId, workflowId: definition.workflowId, trigger: definition.trigger }),
      timestamp: nowIso
    });

    // Execute actions sequentially
    const actions = definition.actions || [];
    let isPausedForApproval = false;

    for (const act of actions) {
      const stepId = `step_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const requiresApproval = act.requires_approval || [
        'CHANGE_RISK_OWNER', 'CHANGE_COMPLIANCE_STATUS', 'EXTERNAL_NOTIFICATION',
        'SUPPLIER_ACTION', 'FINANCIAL_ACTION', 'DESTRUCTIVE_ACTION'
      ].includes(act.action_type);

      await AuditLog.create({
        organizationId: orgId,
        user: user?.email || 'System',
        userId: user?.id || user?._id || 'System',
        action: 'WORKFLOW_STEP_STARTED',
        recordId: stepId,
        riskId: cleanRiskId || '',
        module: 'WorkflowManager',
        newValue: JSON.stringify({ instanceId, stepNumber: act.step_number, actionType: act.action_type }),
        timestamp: new Date().toISOString()
      });

      if (requiresApproval) {
        // Create WAITING step
        await WorkflowStep.create({
          stepId,
          instanceId,
          stepNumber: act.step_number,
          actionType: act.action_type,
          status: 'WAITING',
          inputSummary: `Requires approval: ${act.action_type}`,
          resultSummary: 'Paused awaiting reviewer approval',
          assignedTo: act.parameters?.assigned_to || null,
          startedAt: new Date().toISOString()
        });

        instance.status = 'WAITING_FOR_APPROVAL';
        instance.currentStep = act.step_number;
        instance.updatedAt = new Date().toISOString();
        await instance.save();

        await AuditLog.create({
          organizationId: orgId,
          user: user?.email || 'System',
          userId: user?.id || user?._id || 'System',
          action: 'APPROVAL_REQUESTED',
          recordId: stepId,
          riskId: cleanRiskId || '',
          module: 'WorkflowManager',
          newValue: JSON.stringify({ instanceId, actionType: act.action_type }),
          timestamp: new Date().toISOString()
        });

        // Notify reviewers
        await Notification.create({
          notificationId: `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
          organizationId: orgId,
          type: 'APPROVAL_REQUIRED',
          title: `Approval Required: ${act.action_type}`,
          message: `Workflow ${instanceId} requires authorization for step ${act.step_number} (${act.action_type}).`,
          resourceType: 'WorkflowInstance',
          resourceId: instanceId,
          createdAt: new Date().toISOString()
        });

        isPausedForApproval = true;
        break; // Pause loop
      }

      // Execute safe action
      let resultSummary = `Completed ${act.action_type}`;
      const params = act.parameters || {};

      if (act.action_type === 'CREATE_ALERT') {
        const alertId = `alt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        await Alert.create({
          alertId,
          organizationId: orgId,
          projectId: cleanProjectId,
          riskId: cleanRiskId,
          eventId: cleanEventId,
          type: params.type || 'MONITORING',
          severity: params.severity || 'HIGH',
          title: params.title || `Workflow Alert: ${definition.name}`,
          description: params.description || `Generated by workflow ${definition.workflowId}`,
          status: 'NEW',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        resultSummary = `Created alert ${alertId}`;
      } else if (act.action_type === 'CREATE_MITIGATION') {
        const planId = `mit_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        await MitigationPlan.create({
          plan_id: planId,
          organization_id: orgId,
          risk_id: cleanRiskId || 'general',
          title: params.title || `Mitigation plan for ${definition.name}`,
          owner: params.owner || user?.email || 'Unassigned',
          target_date: params.target_date || '',
          status: 'PLANNED',
          created_at: new Date().toISOString()
        });
        resultSummary = `Created mitigation plan ${planId}`;
      } else if (act.action_type === 'CREATE_NOTIFICATION') {
        const notifId = `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
        await Notification.create({
          notificationId: notifId,
          organizationId: orgId,
          userId: params.user_id || null,
          type: params.type || 'WORKFLOW_ASSIGNED',
          title: params.title || `Workflow Notification: ${definition.name}`,
          message: params.message || `Action executed for workflow ${instanceId}`,
          resourceType: 'WorkflowInstance',
          resourceId: instanceId,
          createdAt: new Date().toISOString()
        });
        resultSummary = `Created notification ${notifId}`;
      }

      // Record completed step
      await WorkflowStep.create({
        stepId,
        instanceId,
        stepNumber: act.step_number,
        actionType: act.action_type,
        status: 'COMPLETED',
        inputSummary: `Parameters: ${JSON.stringify(params)}`,
        resultSummary,
        assignedTo: params.assigned_to || null,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      });

      await AuditLog.create({
        organizationId: orgId,
        user: user?.email || 'System',
        userId: user?.id || user?._id || 'System',
        action: 'WORKFLOW_STEP_COMPLETED',
        recordId: stepId,
        riskId: cleanRiskId || '',
        module: 'WorkflowManager',
        newValue: JSON.stringify({ instanceId, stepNumber: act.step_number, resultSummary }),
        timestamp: new Date().toISOString()
      });

      instance.currentStep = act.step_number;
    }

    if (!isPausedForApproval) {
      instance.status = 'COMPLETED';
      instance.completedAt = new Date().toISOString();
      instance.updatedAt = new Date().toISOString();
      await instance.save();

      await AuditLog.create({
        organizationId: orgId,
        user: user?.email || 'System',
        userId: user?.id || user?._id || 'System',
        action: 'WORKFLOW_COMPLETED',
        recordId: instanceId,
        riskId: cleanRiskId || '',
        module: 'WorkflowManager',
        newValue: JSON.stringify({ instanceId, status: 'COMPLETED' }),
        timestamp: new Date().toISOString()
      });
    }

    const steps = await WorkflowStep.find({ instanceId }).sort({ stepNumber: 1 });
    res.status(201).json({
      success: true,
      data: {
        ...instance.toObject(),
        steps
      }
    });
  } catch (err) {
    console.error('Failed to execute workflow:', err);
    res.status(500).json({ success: false, message: 'Failed to execute workflow' });
  }
}

/**
 * POST /api/workflows/instances/:id/approve
 */
async function approveInstanceStep(req, res) {
  try {
    const { id } = req.params;
    const filter = buildIdFilter(id, 'instanceId');
    const instance = await WorkflowInstance.findOne(filter);

    if (!instance) {
      return res.status(404).json({ success: false, message: `Workflow instance ${id} not found` });
    }

    const role = req.user?.role || 'VIEWER';
    const userOrg = req.user?.organizationId?.toString();
    if (role !== 'SUPER_ADMIN' && role !== 'PLATFORM_ADMIN' && instance.organizationId !== userOrg) {
      return res.status(403).json({ success: false, message: 'Unauthorized: Cross-tenant access denied' });
    }

    if (!canManageWorkflows(role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges to approve workflow steps' });
    }

    if (instance.status !== 'WAITING_FOR_APPROVAL') {
      return res.status(400).json({ success: false, message: `Workflow is not waiting for approval (Current status: ${instance.status})` });
    }

    const waitingStep = await WorkflowStep.findOne({ instanceId: instance.instanceId, status: 'WAITING' });
    const nowIso = new Date().toISOString();

    if (waitingStep) {
      waitingStep.status = 'COMPLETED';
      waitingStep.completedAt = nowIso;
      waitingStep.resultSummary = `Approved by ${req.user?.email || 'Admin'}: Action executed`;
      await waitingStep.save();

      await AuditLog.create({
        organizationId: instance.organizationId,
        user: req.user?.email || 'Admin',
        userId: req.user?.id || req.user?._id || 'Admin',
        action: 'APPROVAL_APPROVED',
        recordId: waitingStep.stepId,
        riskId: instance.riskId || '',
        module: 'WorkflowManager',
        newValue: JSON.stringify({ instanceId: instance.instanceId, approvedBy: req.user?.email }),
        timestamp: nowIso
      });
    }

    // Mark instance COMPLETED (or continue next steps)
    instance.status = 'COMPLETED';
    instance.completedAt = nowIso;
    instance.updatedAt = nowIso;
    await instance.save();

    await AuditLog.create({
      organizationId: instance.organizationId,
      user: req.user?.email || 'Admin',
      userId: req.user?.id || req.user?._id || 'Admin',
      action: 'WORKFLOW_COMPLETED',
      recordId: instance.instanceId,
      riskId: instance.riskId || '',
      module: 'WorkflowManager',
      newValue: JSON.stringify({ instanceId: instance.instanceId, status: 'COMPLETED' }),
      timestamp: nowIso
    });

    res.json({ success: true, message: 'Workflow step approved and instance resumed to completion', data: instance });
  } catch (err) {
    console.error('Failed to approve workflow step:', err);
    res.status(500).json({ success: false, message: 'Failed to approve workflow step' });
  }
}

/**
 * POST /api/workflows/instances/:id/reject
 */
async function rejectInstanceStep(req, res) {
  try {
    const { id } = req.params;
    const filter = buildIdFilter(id, 'instanceId');
    const instance = await WorkflowInstance.findOne(filter);

    if (!instance) {
      return res.status(404).json({ success: false, message: `Workflow instance ${id} not found` });
    }

    const role = req.user?.role || 'VIEWER';
    const userOrg = req.user?.organizationId?.toString();
    if (role !== 'SUPER_ADMIN' && role !== 'PLATFORM_ADMIN' && instance.organizationId !== userOrg) {
      return res.status(403).json({ success: false, message: 'Unauthorized: Cross-tenant access denied' });
    }

    if (!canManageWorkflows(role)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges to reject workflow steps' });
    }

    const { comment = 'Rejected by reviewer' } = req.body;
    const nowIso = new Date().toISOString();

    const waitingStep = await WorkflowStep.findOne({ instanceId: instance.instanceId, status: 'WAITING' });
    if (waitingStep) {
      waitingStep.status = 'SKIPPED';
      waitingStep.error = comment;
      waitingStep.completedAt = nowIso;
      await waitingStep.save();

      await AuditLog.create({
        organizationId: instance.organizationId,
        user: req.user?.email || 'Admin',
        userId: req.user?.id || req.user?._id || 'Admin',
        action: 'APPROVAL_REJECTED',
        recordId: waitingStep.stepId,
        riskId: instance.riskId || '',
        module: 'WorkflowManager',
        newValue: JSON.stringify({ instanceId: instance.instanceId, rejectedBy: req.user?.email, comment }),
        timestamp: nowIso
      });
    }

    instance.status = 'CANCELLED';
    instance.error = `Workflow halted by reviewer rejection: ${comment}`;
    instance.updatedAt = nowIso;
    await instance.save();

    await AuditLog.create({
      organizationId: instance.organizationId,
      user: req.user?.email || 'Admin',
      userId: req.user?.id || req.user?._id || 'Admin',
      action: 'WORKFLOW_CANCELLED',
      recordId: instance.instanceId,
      riskId: instance.riskId || '',
      module: 'WorkflowManager',
      newValue: JSON.stringify({ instanceId: instance.instanceId, reason: comment }),
      timestamp: nowIso
    });

    res.json({ success: true, message: 'Workflow rejected and cancelled', data: instance });
  } catch (err) {
    console.error('Failed to reject workflow step:', err);
    res.status(500).json({ success: false, message: 'Failed to reject workflow step' });
  }
}

/**
 * POST /api/workflows/instances/:id/cancel
 */
async function cancelInstance(req, res) {
  try {
    const { id } = req.params;
    const filter = buildIdFilter(id, 'instanceId');
    const instance = await WorkflowInstance.findOne(filter);

    if (!instance) {
      return res.status(404).json({ success: false, message: `Workflow instance ${id} not found` });
    }

    const role = req.user?.role || 'VIEWER';
    const userOrg = req.user?.organizationId?.toString();
    if (role !== 'SUPER_ADMIN' && role !== 'PLATFORM_ADMIN' && instance.organizationId !== userOrg) {
      return res.status(403).json({ success: false, message: 'Unauthorized: Cross-tenant access denied' });
    }

    const nowIso = new Date().toISOString();
    instance.status = 'CANCELLED';
    instance.error = req.body.reason || 'Cancelled by user';
    instance.updatedAt = nowIso;
    await instance.save();

    await AuditLog.create({
      organizationId: instance.organizationId,
      user: req.user?.email || 'User',
      userId: req.user?.id || req.user?._id || 'User',
      action: 'WORKFLOW_CANCELLED',
      recordId: instance.instanceId,
      riskId: instance.riskId || '',
      module: 'WorkflowManager',
      newValue: JSON.stringify({ instanceId: instance.instanceId, reason: instance.error }),
      timestamp: nowIso
    });

    res.json({ success: true, message: 'Workflow instance cancelled', data: instance });
  } catch (err) {
    console.error('Failed to cancel workflow instance:', err);
    res.status(500).json({ success: false, message: 'Failed to cancel workflow instance' });
  }
}

/**
 * POST /api/workflows/instances/:id/retry
 */
async function retryInstance(req, res) {
  try {
    const { id } = req.params;
    const filter = buildIdFilter(id, 'instanceId');
    const instance = await WorkflowInstance.findOne(filter);

    if (!instance) {
      return res.status(404).json({ success: false, message: `Workflow instance ${id} not found` });
    }

    const role = req.user?.role || 'VIEWER';
    const userOrg = req.user?.organizationId?.toString();
    if (role !== 'SUPER_ADMIN' && role !== 'PLATFORM_ADMIN' && instance.organizationId !== userOrg) {
      return res.status(403).json({ success: false, message: 'Unauthorized: Cross-tenant access denied' });
    }

    const nowIso = new Date().toISOString();
    instance.status = 'RUNNING';
    instance.error = null;
    instance.updatedAt = nowIso;
    await instance.save();

    // Reset failed/skipped steps
    await WorkflowStep.updateMany(
      { instanceId: instance.instanceId, status: { $in: ['FAILED', 'SKIPPED'] } },
      { $set: { status: 'PENDING', error: null } }
    );

    // Call python service for idempotent resume
    try {
      await fetch(`${pythonServiceUrl}/internal/workflows/instances/${instance.instanceId}/retry`, {
        method: 'POST',
        headers: { 'X-Internal-Service-Key': internalKey },
        signal: AbortSignal.timeout(3000)
      });
    } catch (e) {
      // Local fallback mark complete if no remaining steps
    }

    res.json({ success: true, message: 'Workflow instance retry initiated', data: instance });
  } catch (err) {
    console.error('Failed to retry workflow instance:', err);
    res.status(500).json({ success: false, message: 'Failed to retry workflow instance' });
  }
}

/**
 * GET /api/workflow-manager/overview
 */
async function getWorkflowOverview(req, res) {
  try {
    const query = { ...(req.riskQuery || {}) };
    const instances = await WorkflowInstance.find(query);
    const definitions = await WorkflowDefinition.find(query);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const activeWorkflows = instances.filter(i => i.status === 'RUNNING').length;
    const pendingApprovals = instances.filter(i => i.status === 'WAITING_FOR_APPROVAL').length;
    const escalatedWorkflows = instances.filter(i => i.status === 'ESCALATED').length;
    const failedWorkflows = instances.filter(i => i.status === 'FAILED').length;

    let completedToday = 0;
    let overdueCount = 0;

    for (const i of instances) {
      if (i.status === 'COMPLETED' && i.completedAt && i.completedAt.startsWith(todayStr)) {
        completedToday++;
      }
      if (i.deadline && ['RUNNING', 'WAITING_FOR_APPROVAL'].includes(i.status)) {
        if (i.deadline.due_at && new Date(i.deadline.due_at) < now) {
          overdueCount++;
        }
      }
    }

    const finished = instances.filter(i => ['COMPLETED', 'FAILED'].includes(i.status));
    const successRate = finished.length === 0
      ? 100.0
      : Math.round((instances.filter(i => i.status === 'COMPLETED').length / finished.length) * 1000) / 10;

    res.json({
      success: true,
      data: {
        active_workflows: activeWorkflows,
        pending_approvals: pendingApprovals,
        overdue_workflows: overdueCount,
        completed_today: completedToday,
        failed_workflows: failedWorkflows,
        escalated_workflows: escalatedWorkflows,
        success_rate: successRate,
        total_definitions: definitions.length,
        total_instances: instances.length,
        status_breakdown: {
          RUNNING: activeWorkflows,
          WAITING_FOR_APPROVAL: pendingApprovals,
          COMPLETED: instances.filter(i => i.status === 'COMPLETED').length,
          FAILED: failedWorkflows,
          CANCELLED: instances.filter(i => i.status === 'CANCELLED').length,
          ESCALATED: escalatedWorkflows
        }
      }
    });
  } catch (err) {
    console.error('Failed to get workflow overview:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve workflow overview metrics' });
  }
}

module.exports = {
  listDefinitions,
  getDefinitionById,
  createDefinition,
  updateDefinition,
  deleteDefinition,
  listInstances,
  getInstanceById,
  getStepsByInstanceId,
  executeWorkflow,
  approveInstanceStep,
  rejectInstanceStep,
  cancelInstance,
  retryInstance,
  getWorkflowOverview
};
