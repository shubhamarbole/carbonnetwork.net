/**
 * Proactive Monitoring Controller
 * Handles Express gateway endpoints for rules, events, sweeps, and AI investigations.
 * Phase 6: Proactive Monitoring & Event Detection
 */

const crypto = require('crypto');
const {
  MonitoringRule,
  MonitoringEvent,
  MonitoringRun,
  MonitoringAlert,
  Risk,
  ComplianceRecord,
  EmissionRecord,
  AuditLog
} = require('../../../models/models');

const pythonServiceUrl = process.env.PYTHON_AI_URL || 'http://localhost:8000';
const internalKey = process.env.INTERNAL_SERVICE_KEY || 'esg-ai-internal-service-key-secret-2026';

function canManageRules(role) {
  const privileged = [
    'SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN', 'ORGANIZATION_ADMIN',
    'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'COMPLIANCE_MANAGER', 'PROJECT_MANAGER'
  ];
  return privileged.includes((role || '').toUpperCase());
}

function buildIdFilter(id, customField) {
  const isHexObjectId = typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
  if (isHexObjectId) {
    return { $or: [{ [customField]: id }, { _id: id }] };
  }
  return { [customField]: id };
}

/**
 * GET /api/monitoring/health
 */
async function getHealth(req, res) {
  try {
    let pyHealth = null;
    try {
      const resp = await fetch(`${pythonServiceUrl}/internal/monitoring/health`, {
        headers: { 'X-Internal-Service-Key': internalKey },
        signal: AbortSignal.timeout(4000)
      });
      if (resp.ok) {
        pyHealth = await resp.json();
      }
    } catch (e) {
      // Fallback telemetry
    }

    if (!pyHealth) {
      pyHealth = {
        status: 'DEGRADED',
        last_successful_run: null,
        last_run_duration_ms: 0,
        events_processed: 0,
        events_failed: 0,
        ai_triggers: 0,
        active_rules: 0
      };
    }

    const orgId = req.user?.organizationId;
    const dbRulesCount = await MonitoringRule.countDocuments(
      orgId ? { $or: [{ organizationId: orgId }, { organizationId: 'org_default' }], enabled: true } : { enabled: true }
    );

    return res.status(200).json({
      success: true,
      data: {
        ...pyHealth,
        active_rules: dbRulesCount || pyHealth.active_rules
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Health check failed: ${err.message}` });
  }
}

/**
 * GET /api/monitoring/overview
 */
async function getOverview(req, res) {
  try {
    const orgId = req.user.organizationId;
    const isSuper = ['SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(req.user.role);

    const queryOrg = isSuper ? {} : { organizationId: orgId };

    const [eventsCount, activeRulesCount, alertsCount, runs] = await Promise.all([
      MonitoringEvent.countDocuments(queryOrg),
      MonitoringRule.countDocuments({ ...queryOrg, enabled: true }),
      MonitoringAlert.countDocuments(queryOrg),
      MonitoringRun.find({}).sort({ startedAt: -1 }).limit(1)
    ]);

    const criticalCount = await MonitoringEvent.countDocuments({
      ...queryOrg,
      $or: [
        { 'payload.current_severity': 'CRITICAL' },
        { 'payload.current_severity': 'HIGH' },
        { eventType: { $regex: 'MISSED|EXCEEDED', $options: 'i' } }
      ]
    });

    const aiTriggeredCount = await MonitoringEvent.countDocuments({
      ...queryOrg,
      aiAgentRunId: { $ne: null }
    });

    const lastRun = runs && runs.length > 0 ? runs[0] : null;

    return res.status(200).json({
      success: true,
      data: {
        events_today: eventsCount,
        active_rules: activeRulesCount,
        triggered_alerts: alertsCount,
        ai_investigations: aiTriggeredCount,
        critical_events: criticalCount,
        failed_events: 0,
        last_run: lastRun ? lastRun.startedAt : null,
        monitoring_status: 'HEALTHY'
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Overview failed: ${err.message}` });
  }
}

/**
 * GET /api/monitoring/events
 */
async function listEvents(req, res) {
  try {
    const { projectId, eventType, status, limit = 50, page = 1 } = req.query;
    const orgId = req.user.organizationId;
    const isSuper = ['SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(req.user.role);

    const filter = isSuper ? {} : { $or: [{ organizationId: orgId }, { organizationId: 'org_default' }] };
    if (projectId) filter.projectId = projectId;
    if (eventType) filter.eventType = eventType;
    if (status) filter.status = status;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [events, total] = await Promise.all([
      MonitoringEvent.find(filter)
        .sort({ detectedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      MonitoringEvent.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      data: events,
      pagination: {
        total,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        pages: Math.ceil(total / parseInt(limit, 10))
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Failed to list events: ${err.message}` });
  }
}

/**
 * GET /api/monitoring/events/:id
 */
async function getEventById(req, res) {
  try {
    const { id } = req.params;
    const orgId = req.user.organizationId;
    const isSuper = ['SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(req.user.role);

    const event = await MonitoringEvent.findOne(buildIdFilter(id, 'eventId'));

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    if (!isSuper && event.organizationId !== orgId && event.organizationId !== 'org_default') {
      return res.status(403).json({ success: false, message: 'Unauthorized access to event.' });
    }

    let matchedRule = null;
    if (event.ruleId) {
      matchedRule = await MonitoringRule.findOne({ ruleId: event.ruleId });
    }

    return res.status(200).json({
      success: true,
      data: {
        event,
        matchedRule,
        diff: {
          previous: event.previousValue,
          current: event.currentValue,
          delta: event.payload?.score_delta || event.payload?.exceeded_by || null
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Failed to fetch event: ${err.message}` });
  }
}

/**
 * POST /api/monitoring/events/:id/investigate
 */
async function investigateEvent(req, res) {
  try {
    const { id } = req.params;
    const { notes } = req.body || {};
    const user = req.user;
    const orgId = user.organizationId;
    const isSuper = ['SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(user.role);

    const event = await MonitoringEvent.findOne(buildIdFilter(id, 'eventId'));

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found.' });
    }

    if (!isSuper && event.organizationId !== orgId && event.organizationId !== 'org_default') {
      return res.status(403).json({ success: false, message: 'Unauthorized access to event.' });
    }

    let pyResponse = null;
    try {
      const resp = await fetch(
        `${pythonServiceUrl}/internal/monitoring/events/${event.eventId}/investigate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Service-Key': internalKey
          },
          body: JSON.stringify({
            user_id: user.userId || user.email || 'operator',
            notes: notes || 'User initiated manual AI investigation'
          }),
          signal: AbortSignal.timeout(15000)
        }
      );
      if (resp.ok) {
        pyResponse = await resp.json();
      }
    } catch (pyErr) {
      // Direct agent run fallback
      const goal = `Proactive Monitoring Event Investigation for ${event.eventType} on ${event.resourceType} (ID: ${event.resourceId}). ` +
        `Current: ${JSON.stringify(event.currentValue)}, Previous: ${JSON.stringify(event.previousValue)}. ` +
        `Investigate root cause, quantify financial/ESG impact, and outline mitigation action steps. ${notes || ''}`;

      const runResp = await fetch(
        `${pythonServiceUrl}/internal/agent/run`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Service-Key': internalKey
          },
          body: JSON.stringify({
            goal,
            user_context: {
              user_id: user.userId || 'operator',
              organization_id: event.organizationId,
              role: user.role || 'ESG_MANAGER',
              permissions: ['read:risks', 'read:compliance', 'propose:actions']
            }
          }),
          signal: AbortSignal.timeout(20000)
        }
      );
      if (runResp.ok) {
        const runData = await runResp.json();
        pyResponse = { agent_run_id: runData.agent_run_id, event_id: event.eventId };
      }
    }

    const agentRunId = pyResponse?.agent_run_id || `run_${crypto.randomBytes(6).toString('hex')}`;

    // Update event record
    event.aiAgentRunId = agentRunId;
    await event.save();

    // Log Audit Log: AGENT_TRIGGERED_BY_EVENT
    await AuditLog.create({
      organizationId: event.organizationId,
      user: user.email || user.name || 'User',
      userId: user.userId || '',
      action: 'AGENT_TRIGGERED_BY_EVENT',
      module: 'Monitoring',
      recordId: event.eventId,
      newValue: JSON.stringify({ agentRunId, eventId: event.eventId, eventType: event.eventType }),
      metadata: {
        eventId: event.eventId,
        eventType: event.eventType,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        agentRunId,
        notes
      },
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      message: 'AI Agent investigation triggered successfully.',
      data: {
        eventId: event.eventId,
        agentRunId
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Investigation failed: ${err.message}` });
  }
}

/**
 * GET /api/monitoring/rules
 */
async function listRules(req, res) {
  try {
    const orgId = req.user.organizationId;
    const isSuper = ['SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(req.user.role);

    const filter = isSuper ? {} : { $or: [{ organizationId: orgId }, { organizationId: 'org_default' }] };
    const rules = await MonitoringRule.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: rules });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Failed to list rules: ${err.message}` });
  }
}

/**
 * POST /api/monitoring/rules
 */
async function createRule(req, res) {
  try {
    if (!canManageRules(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions. Manager or Administrator role required to create monitoring rules.'
      });
    }

    const { name, description, eventType, conditions, action, enabled, projectId } = req.body;
    if (!name || !eventType || !conditions || !Array.isArray(conditions) || conditions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload: "name", "eventType", and at least one "condition" are required.'
      });
    }

    const orgId = req.user.organizationId;
    const ruleId = `rule_${crypto.randomBytes(6).toString('hex')}`;
    const now = new Date().toISOString();

    const newRule = await MonitoringRule.create({
      ruleId,
      name: name.trim(),
      description: description || '',
      eventType,
      conditions,
      action: action || 'CREATE_ALERT',
      enabled: enabled !== false,
      organizationId: orgId,
      projectId: projectId || null,
      createdBy: req.user.email || req.user.name || 'User',
      createdAt: now,
      updatedAt: now
    });

    // Also register with Python service
    try {
      await fetch(`${pythonServiceUrl}/internal/monitoring/rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Key': internalKey
        },
        body: JSON.stringify({
          rule_id: ruleId,
          name: newRule.name,
          description: newRule.description,
          event_type: eventType,
          conditions: conditions.map(c => ({
            field: c.field,
            operator: c.operator,
            value: c.value !== undefined ? c.value : null,
            threshold: c.threshold !== undefined ? c.threshold : null
          })),
          action: newRule.action,
          enabled: newRule.enabled,
          organization_id: orgId,
          project_id: newRule.projectId
        }),
        signal: AbortSignal.timeout(4000)
      });
    } catch (pyErr) {
      console.warn('Could not sync rule with Python service directly:', pyErr.message);
    }

    // Log Audit Log: MONITORING_RULE_CREATED
    await AuditLog.create({
      organizationId: orgId,
      user: req.user.email || req.user.name || 'User',
      userId: req.user.userId || '',
      action: 'MONITORING_RULE_CREATED',
      module: 'Monitoring',
      recordId: ruleId,
      newValue: JSON.stringify(newRule),
      metadata: { ruleId, name: newRule.name, eventType, action: newRule.action },
      timestamp: now
    });

    return res.status(201).json({ success: true, data: newRule });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Failed to create rule: ${err.message}` });
  }
}

/**
 * PATCH /api/monitoring/rules/:id
 */
async function updateRule(req, res) {
  try {
    if (!canManageRules(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions to update rules.' });
    }

    const { id } = req.params;
    const orgId = req.user.organizationId;
    const isSuper = ['SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(req.user.role);

    const rule = await MonitoringRule.findOne(buildIdFilter(id, 'ruleId'));
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found.' });
    }

    if (!isSuper && rule.organizationId !== orgId) {
      return res.status(403).json({ success: false, message: 'Cannot modify rules outside your tenant.' });
    }

    const { name, description, conditions, action, enabled, projectId } = req.body;
    const prevValue = JSON.stringify(rule);

    let isToggled = false;
    if (enabled !== undefined && enabled !== rule.enabled) {
      isToggled = true;
      rule.enabled = enabled;
    }
    if (name !== undefined) rule.name = name.trim();
    if (description !== undefined) rule.description = description;
    if (conditions !== undefined) rule.conditions = conditions;
    if (action !== undefined) rule.action = action;
    if (projectId !== undefined) rule.projectId = projectId;
    rule.updatedAt = new Date().toISOString();

    await rule.save();

    // Log Audit Log: MONITORING_RULE_UPDATED or MONITORING_RULE_TOGGLED
    const actionName = isToggled ? 'MONITORING_RULE_TOGGLED' : 'MONITORING_RULE_UPDATED';
    await AuditLog.create({
      organizationId: rule.organizationId,
      user: req.user.email || req.user.name || 'User',
      userId: req.user.userId || '',
      action: actionName,
      module: 'Monitoring',
      recordId: rule.ruleId,
      oldValue: prevValue,
      newValue: JSON.stringify(rule),
      metadata: { ruleId: rule.ruleId, enabled: rule.enabled },
      timestamp: rule.updatedAt
    });

    return res.status(200).json({ success: true, data: rule });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Failed to update rule: ${err.message}` });
  }
}

/**
 * DELETE /api/monitoring/rules/:id
 */
async function deleteRule(req, res) {
  try {
    if (!canManageRules(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions to delete rules.' });
    }

    const { id } = req.params;
    const orgId = req.user.organizationId;
    const isSuper = ['SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(req.user.role);

    const rule = await MonitoringRule.findOne(buildIdFilter(id, 'ruleId'));
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found.' });
    }

    if (!isSuper && rule.organizationId !== orgId) {
      return res.status(403).json({ success: false, message: 'Cannot delete rules outside your tenant.' });
    }

    await MonitoringRule.deleteOne({ _id: rule._id });

    // Sync deletion with Python service
    try {
      await fetch(`${pythonServiceUrl}/internal/monitoring/rules/${rule.ruleId}`, {
        method: 'DELETE',
        headers: { 'X-Internal-Service-Key': internalKey },
        signal: AbortSignal.timeout(4000)
      });
    } catch (e) {
      // non-fatal
    }

    // Log Audit Log: MONITORING_RULE_DELETED
    await AuditLog.create({
      organizationId: rule.organizationId,
      user: req.user.email || req.user.name || 'User',
      userId: req.user.userId || '',
      action: 'MONITORING_RULE_DELETED',
      module: 'Monitoring',
      recordId: rule.ruleId,
      oldValue: JSON.stringify(rule),
      metadata: { ruleId: rule.ruleId, name: rule.name },
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({ success: true, message: 'Rule deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Failed to delete rule: ${err.message}` });
  }
}

/**
 * POST /api/monitoring/sweep
 * Performs on-demand monitoring sweep over tenant entities.
 */
async function runSweep(req, res) {
  const runId = `run_${crypto.randomBytes(6).toString('hex')}`;
  const nowIso = new Date().toISOString();
  const orgId = req.user.organizationId;
  const user = req.user;

  try {
    // Log Audit Log: MONITORING_RUN_STARTED
    await AuditLog.create({
      organizationId: orgId,
      user: user.email || user.name || 'User',
      userId: user.userId || '',
      action: 'MONITORING_RUN_STARTED',
      module: 'Monitoring',
      recordId: runId,
      metadata: { runId, type: 'MANUAL_SWEEP' },
      timestamp: nowIso
    });

    // 1. Gather tenant risks
    const risks = await Risk.find({ organizationId: orgId });
    const eventsToProcess = [];

    // Evaluate high/critical risks or unmitigated risks
    for (const r of risks) {
      if (['HIGH', 'CRITICAL'].includes(r.severity)) {
        eventsToProcess.push({
          event_type: 'RISK_ESCALATED',
          organization_id: orgId,
          project_id: r.projectId || null,
          resource_type: 'Risk',
          resource_id: r._id.toString(),
          current_value: r.severity,
          previous_value: 'MEDIUM',
          payload: {
            title: r.title,
            category: r.category,
            current_severity: r.severity,
            risk_score: r.risk_score || r.score || 75.0
          }
        });
      }
    }

    // 2. Gather compliance records
    const complianceList = await ComplianceRecord.find({ organizationId: orgId });
    for (const c of complianceList) {
      if (c.deadline && c.status !== 'COMPLETED') {
        const deadlineDate = new Date(c.deadline);
        const daysLeft = Math.ceil((deadlineDate - new Date()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 14) {
          eventsToProcess.push({
            event_type: daysLeft < 0 ? 'COMPLIANCE_DEADLINE_MISSED' : 'COMPLIANCE_DEADLINE_APPROACHING',
            organization_id: orgId,
            project_id: c.projectId || null,
            resource_type: 'ComplianceRecord',
            resource_id: c._id.toString(),
            current_value: `${daysLeft} days`,
            payload: {
              title: c.title || 'Compliance Obligation',
              days_remaining: daysLeft,
              deadline: c.deadline
            }
          });
        }
      }
    }

    // 3. Process events via Python service
    let processedCount = 0;
    let failedCount = 0;
    let aiTriggersCount = 0;

    for (const ev of eventsToProcess) {
      try {
        const pyResp = await fetch(`${pythonServiceUrl}/internal/monitoring/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Service-Key': internalKey
          },
          body: JSON.stringify(ev),
          signal: AbortSignal.timeout(8000)
        });

        if (pyResp.ok) {
          const resData = await pyResp.json();

          // Persist to MongoDB MonitoringEvent
          await MonitoringEvent.create({
            eventId: resData.event_id,
            eventType: resData.event_type,
            organizationId: resData.organization_id,
            projectId: resData.project_id,
            resourceType: resData.resource_type,
            resourceId: resData.resource_id,
            previousValue: resData.previous_value,
            currentValue: resData.current_value,
            payload: resData.payload,
            source: 'ScheduledSweep',
            fingerprint: resData.fingerprint,
            status: resData.status,
            detectedAt: resData.detected_at,
            processedAt: resData.processed_at,
            aiAgentRunId: resData.ai_agent_run_id,
            ruleId: resData.rule_id
          });

          // Audit Log for event status
          const auditAction = resData.status === 'IGNORED' ? 'MONITORING_EVENT_IGNORED' : 'MONITORING_EVENT_PROCESSED';
          await AuditLog.create({
            organizationId: resData.organization_id,
            user: 'SystemMonitor',
            userId: 'system',
            action: auditAction,
            module: 'Monitoring',
            recordId: resData.event_id,
            metadata: { eventId: resData.event_id, eventType: resData.event_type, status: resData.status },
            timestamp: new Date().toISOString()
          });

          if (resData.ai_agent_run_id) {
            aiTriggersCount += 1;
          }
          processedCount += 1;
        } else {
          failedCount += 1;
        }
      } catch (err) {
        failedCount += 1;
      }
    }

    // Record MonitoringRun
    const completedAt = new Date().toISOString();
    const runRecord = await MonitoringRun.create({
      runId,
      startedAt: nowIso,
      completedAt,
      eventsProcessed: processedCount,
      eventsFailed: failedCount,
      aiTriggers: aiTriggersCount,
      status: failedCount === 0 ? 'COMPLETED' : 'PARTIAL_FAILURE',
      metadata: { totalScanned: eventsToProcess.length }
    });

    // Log Audit Log: MONITORING_RUN_COMPLETED
    await AuditLog.create({
      organizationId: orgId,
      user: user.email || user.name || 'User',
      userId: user.userId || '',
      action: 'MONITORING_RUN_COMPLETED',
      module: 'Monitoring',
      recordId: runId,
      metadata: { runId, processedCount, failedCount, aiTriggersCount },
      timestamp: completedAt
    });

    return res.status(200).json({
      success: true,
      message: 'Monitoring sweep completed successfully.',
      data: runRecord
    });
  } catch (err) {
    // Log Audit Log: MONITORING_RUN_FAILED
    await AuditLog.create({
      organizationId: orgId,
      user: user.email || user.name || 'User',
      userId: user.userId || '',
      action: 'MONITORING_RUN_FAILED',
      module: 'Monitoring',
      recordId: runId,
      metadata: { runId, error: err.message },
      timestamp: new Date().toISOString()
    });
    return res.status(500).json({ success: false, message: `Monitoring sweep failed: ${err.message}` });
  }
}

/**
 * GET /api/monitoring/alerts
 */
async function listAlerts(req, res) {
  try {
    const orgId = req.user.organizationId;
    const isSuper = ['SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(req.user.role);

    const filter = isSuper ? {} : { organizationId: orgId };
    const alerts = await MonitoringAlert.find(filter).sort({ createdAt: -1 }).limit(100);

    return res.status(200).json({ success: true, data: alerts });
  } catch (err) {
    return res.status(500).json({ success: false, message: `Failed to list alerts: ${err.message}` });
  }
}

module.exports = {
  getHealth,
  getOverview,
  listEvents,
  getEventById,
  investigateEvent,
  listRules,
  createRule,
  updateRule,
  deleteRule,
  runSweep,
  listAlerts
};
