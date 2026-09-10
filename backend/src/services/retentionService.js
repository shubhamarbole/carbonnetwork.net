const { 
  Risk, RiskHistory, AIRiskAnalysis, KnowledgeDocument, 
  AgentRun, AgentToolCall, MonitoringEvent, MonitoringRun, 
  Alert, WorkflowInstance, WorkflowStep, Notification, AuditLog 
} = require('../../models/models');

const DEFAULT_POLICIES = {
  documents: { retentionDays: 730, action: 'ARCHIVE' },
  risks: { retentionDays: 1095, action: 'ARCHIVE' },
  audit_logs: { retentionDays: 1825, action: 'ARCHIVE' }, // 5 years for ESG compliance
  ai_analyses: { retentionDays: 365, action: 'ARCHIVE' },
  agent_runs: { retentionDays: 180, action: 'ARCHIVE' },
  monitoring_events: { retentionDays: 180, action: 'ARCHIVE' },
  workflow_history: { retentionDays: 365, action: 'ARCHIVE' },
  notifications: { retentionDays: 90, action: 'DELETE' }
};

class DataRetentionService {
  constructor() {
    this.policies = { ...DEFAULT_POLICIES };
  }

  getPolicies() {
    return this.policies;
  }

  updatePolicy(entityType, policy, user, organizationId) {
    if (!this.policies[entityType]) {
      throw new Error(`Unknown entity type: ${entityType}`);
    }
    this.policies[entityType] = {
      ...this.policies[entityType],
      ...policy
    };
    return this.policies[entityType];
  }

  async evaluateRetention(entityType, dryRun = true, user = null, organizationId = null) {
    const policy = this.policies[entityType];
    if (!policy) throw new Error(`Unknown entity type: ${entityType}`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);
    const cutoffIso = cutoffDate.toISOString();

    let model = null;
    let dateField = 'createdAt';

    switch (entityType) {
      case 'documents': model = KnowledgeDocument; dateField = 'created_at'; break;
      case 'risks': model = Risk; dateField = 'createdAt'; break;
      case 'audit_logs': model = AuditLog; dateField = 'timestamp'; break;
      case 'ai_analyses': model = AIRiskAnalysis; dateField = 'created_at'; break;
      case 'agent_runs': model = AgentRun; dateField = 'created_at'; break;
      case 'monitoring_events': model = MonitoringEvent; dateField = 'detected_at'; break;
      case 'workflow_history': model = WorkflowInstance; dateField = 'createdAt'; break;
      case 'notifications': model = Notification; dateField = 'createdAt'; break;
      default: throw new Error(`No model mapping for ${entityType}`);
    }

    const query = {};
    query[dateField] = { $lt: cutoffIso };
    if (organizationId) {
      if (entityType === 'documents' || entityType === 'ai_analyses' || entityType === 'agent_runs' || entityType === 'monitoring_events') {
        query.organization_id = organizationId;
      } else {
        query.organizationId = organizationId;
      }
    }

    const candidates = await model.find(query);
    const list = Array.isArray(candidates) ? candidates : (candidates?.data || []);
    const count = list.length;

    if (!dryRun && count > 0) {
      // Execute policy action
      let processed = 0;
      for (const item of list) {
        if (policy.action === 'ARCHIVE') {
          if (item.status !== undefined) {
            item.status = 'ARCHIVED';
            if (typeof item.save === 'function') await item.save();
          }
        } else if (policy.action === 'DELETE') {
          if (typeof model.findByIdAndDelete === 'function') {
            await model.findByIdAndDelete(item._id || item.id);
          }
        }
        processed++;
      }

      // Log administrative audit action
      if (AuditLog) {
        await AuditLog.create({
          organizationId: organizationId || 'org-system-1',
          user: user?.email || user?.name || 'System Admin',
          userId: user?.userId || user?._id?.toString() || 'system',
          action: 'RETENTION_PURGE_EXECUTED',
          module: 'DataRetention',
          recordId: entityType,
          metadata: {
            entityType,
            retentionDays: policy.retentionDays,
            action: policy.action,
            recordsProcessed: processed,
            cutoffDate: cutoffIso
          },
          timestamp: new Date().toISOString()
        });
      }

      return {
        entityType,
        policy,
        cutoffDate: cutoffIso,
        dryRun: false,
        recordsAffected: processed,
        status: 'EXECUTED'
      };
    }

    return {
      entityType,
      policy,
      cutoffDate: cutoffIso,
      dryRun: true,
      recordsCandidate: count,
      status: 'PREVIEW'
    };
  }
}

const retentionService = new DataRetentionService();
module.exports = retentionService;
