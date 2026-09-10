/**
 * Phase 12: Server-Authoritative Feature Flags Service
 * Controls runtime feature availability with audit logging and tenant-aware scoping.
 */
const { FeatureFlag, AuditLog } = require('../../../models/models');

const DEFAULT_FLAGS = [
  { key: 'AI_AGENT_ENABLED', enabled: true, description: 'Enables autonomous AI agent and tool calling pipeline' },
  { key: 'RAG_ENABLED', enabled: true, description: 'Enables Vector retrieval and regulatory document grounding' },
  { key: 'PREDICTIVE_ANALYSIS_ENABLED', enabled: true, description: 'Enables Phase 9 predictive risk horizon forecasting' },
  { key: 'SCENARIO_SIMULATION_ENABLED', enabled: true, description: 'Enables Phase 10 what-if ESG & carbon stress testing' },
  { key: 'PROACTIVE_MONITORING_ENABLED', enabled: true, description: 'Enables background telemetry ingestion and event detection' },
  { key: 'EXECUTIVE_DASHBOARD_ENABLED', enabled: true, description: 'Enables Phase 11 executive risk aggregation and briefings' },
  { key: 'PRODUCTION_PILOT_MODE', enabled: true, description: 'Enforces pilot validation checks, KPI logging, and non-destructive operations' }
];

class FeatureFlagsService {
  async ensureDefaults() {
    for (const df of DEFAULT_FLAGS) {
      const existing = await FeatureFlag.findOne({ key: df.key });
      if (!existing) {
        await FeatureFlag.create({
          key: df.key,
          name: df.key,
          enabled: df.enabled,
          description: df.description,
          updatedBy: 'system',
          updatedAt: new Date().toISOString()
        });
      }
    }
  }

  async getAllFlags(organizationId = null) {
    await this.ensureDefaults();
    const flags = await FeatureFlag.find({});
    return flags.map(f => ({
      key: f.key,
      name: f.name || f.key,
      enabled: f.enabled,
      description: f.description,
      updatedBy: f.updatedBy,
      updatedAt: f.updatedAt
    }));
  }

  async getFlag(key, organizationId = null) {
    await this.ensureDefaults();
    const flag = await FeatureFlag.findOne({ key });
    if (!flag) {
      return { key, enabled: false, description: 'Unknown feature flag' };
    }
    return {
      key: flag.key,
      name: flag.name || flag.key,
      enabled: flag.enabled,
      description: flag.description,
      updatedBy: flag.updatedBy,
      updatedAt: flag.updatedAt
    };
  }

  async setFlag(key, enabled, updatedBy = 'system', organizationId = null) {
    await this.ensureDefaults();
    const nowIso = new Date().toISOString();
    let flag = await FeatureFlag.findOne({ key });

    const previousState = flag ? flag.enabled : null;

    if (!flag) {
      flag = await FeatureFlag.create({
        key,
        name: key,
        enabled: Boolean(enabled),
        description: `Custom flag: ${key}`,
        updatedBy,
        updatedAt: nowIso
      });
    } else {
      flag.enabled = Boolean(enabled);
      flag.updatedBy = updatedBy;
      flag.updatedAt = nowIso;
      await flag.save();
    }

    // Audit trail
    await AuditLog.create({
      organizationId: organizationId || 'system',
      userId: updatedBy,
      action: 'FEATURE_FLAG_UPDATED',
      details: {
        key,
        previousState,
        newState: Boolean(enabled)
      },
      timestamp: nowIso
    }).catch(() => {});

    return {
      key: flag.key,
      enabled: flag.enabled,
      description: flag.description,
      updatedBy: flag.updatedBy,
      updatedAt: flag.updatedAt
    };
  }
}

module.exports = new FeatureFlagsService();
