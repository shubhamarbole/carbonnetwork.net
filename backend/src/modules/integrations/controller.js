/**
 * Data Integrations Express Controller
 * Phase 10: External adapter integration, sync management, normalized records, and jobs.
 */
const crypto = require('crypto');
const {
  Integration,
  SyncJob,
  NormalizedDataRecord,
  MonitoringEvent,
  AuditLog
} = require('../../../models/models');

const PYTHON_SERVICE_URL = process.env.PYTHON_AI_URL || 'http://localhost:8000';

class IntegrationsController {
  async listIntegrations(req, res) {
    try {
      const orgId = req.user.organizationId;
      const integrations = await Integration.find({ organizationId: orgId }).sort({ createdAt: -1 });
      return res.status(200).json({ success: true, data: integrations });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getIntegration(req, res) {
    try {
      const orgId = req.user.organizationId;
      const item = await Integration.findOne({ _id: req.params.id, organizationId: orgId });
      if (!item) {
        return res.status(404).json({ success: false, message: 'Integration not found.' });
      }
      return res.status(200).json({ success: true, data: item });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async createIntegration(req, res) {
    try {
      const orgId = req.user.organizationId;
      const { name, providerType, adapterName, syncFrequency, config, projectId } = req.body;

      if (!name || !providerType || !adapterName) {
        return res.status(400).json({ success: false, message: 'Missing required fields (name, providerType, adapterName).' });
      }

      const integrationId = `int_${crypto.randomUUID().slice(0, 12)}`;
      const now = new Date().toISOString();

      const integration = await Integration.create({
        integrationId,
        name,
        providerType,
        adapterName,
        status: 'CONNECTED',
        syncFrequency: syncFrequency || 'DAILY',
        config: config || {},
        organizationId: orgId,
        projectId: projectId || null,
        createdAt: now,
        updatedAt: now
      });

      await AuditLog.create({
        organizationId: orgId,
        user: req.user.email || 'User',
        userId: req.user.userId || req.user._id,
        action: 'INTEGRATION_CREATED',
        module: 'Integrations',
        recordId: integrationId,
        metadata: { name, providerType, adapterName },
        timestamp: now
      });

      return res.status(201).json({ success: true, data: integration });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async updateIntegration(req, res) {
    try {
      const orgId = req.user.organizationId;
      const { name, syncFrequency, status, config } = req.body;

      const updateFields = { updatedAt: new Date().toISOString() };
      if (name) updateFields.name = name;
      if (syncFrequency) updateFields.syncFrequency = syncFrequency;
      if (status) updateFields.status = status;
      if (config) updateFields.config = config;

      const updated = await Integration.findOneAndUpdate(
        { _id: req.params.id, organizationId: orgId },
        { $set: updateFields },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Integration not found.' });
      }

      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async deleteIntegration(req, res) {
    try {
      const orgId = req.user.organizationId;
      const deleted = await Integration.findOneAndDelete({ _id: req.params.id, organizationId: orgId });
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Integration not found.' });
      }
      return res.status(200).json({ success: true, message: 'Integration deleted successfully.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async testConnection(req, res) {
    try {
      const orgId = req.user.organizationId;
      const integration = await Integration.findOne({ _id: req.params.id, organizationId: orgId });
      if (!integration) {
        return res.status(404).json({ success: false, message: 'Integration not found.' });
      }

      const pyRes = await fetch(`${PYTHON_SERVICE_URL}/internal/integrations/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_type: integration.providerType,
          adapter_name: integration.adapterName,
          config: integration.config || {}
        })
      });

      const data = await pyRes.json();
      return res.status(pyRes.ok ? 200 : 400).json(data);
    } catch (err) {
      return res.status(500).json({ success: false, message: `Connection test error: ${err.message}` });
    }
  }

  async syncIntegration(req, res) {
    try {
      const orgId = req.user.organizationId;
      const integration = await Integration.findOne({ _id: req.params.id, organizationId: orgId });
      if (!integration) {
        return res.status(404).json({ success: false, message: 'Integration not found.' });
      }

      const syncType = req.body.sync_type || 'INCREMENTAL';
      const pyRes = await fetch(`${PYTHON_SERVICE_URL}/internal/integrations/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integration_id: integration.integrationId,
          adapter_name: integration.adapterName,
          sync_type: syncType,
          organization_id: orgId,
          project_id: integration.projectId || null,
          since: integration.lastSyncAt || null,
          config: integration.config || {}
        })
      });

      if (!pyRes.ok) {
        const errData = await pyRes.text();
        return res.status(500).json({ success: false, message: `Sync failed on microservice: ${errData}` });
      }

      const syncResult = await pyRes.json();
      const now = new Date().toISOString();

      // Persist SyncJob
      const job = await SyncJob.create({
        jobId: syncResult.job_id || `job_${crypto.randomUUID().slice(0, 12)}`,
        integrationId: integration.integrationId,
        organizationId: orgId,
        projectId: integration.projectId || null,
        syncType,
        status: syncResult.status,
        recordsFetched: syncResult.records_fetched || 0,
        recordsImported: syncResult.records_imported || 0,
        recordsSkipped: syncResult.records_skipped_duplicate || 0,
        errors: syncResult.errors || [],
        startedAt: syncResult.started_at || now,
        completedAt: syncResult.completed_at || now
      });

      // Persist Normalized Records
      if (Array.isArray(syncResult.normalized_records)) {
        for (const r of syncResult.normalized_records) {
          const recId = `rec_${crypto.randomUUID().slice(0, 12)}`;
          await NormalizedDataRecord.findOneAndUpdate(
            { organizationId: orgId, fingerprint: r.fingerprint },
            {
              $setOnInsert: {
                recordId: recId,
                source: r.source,
                domain: r.domain,
                organizationId: orgId,
                projectId: r.project_id || null,
                metric: r.metric,
                value: r.value,
                unit: r.unit,
                period: r.period || 'realtime',
                timestamp: r.timestamp,
                fingerprint: r.fingerprint,
                metadata: r.metadata || {}
              }
            },
            { upsert: true }
          );
        }

        // Emit Phase 6 Event for observability
        const domainEventMap = {
          CARBON: 'CARBON_DATA_UPDATED',
          ESG: 'ESG_DATA_UPDATED',
          SUPPLIER: 'SUPPLIER_DATA_UPDATED',
          COMPLIANCE: 'COMPLIANCE_DATA_UPDATED',
          PROJECT: 'PROJECT_DATA_UPDATED'
        };
        const evType = domainEventMap[integration.providerType] || 'ESG_DATA_UPDATED';

        await MonitoringEvent.create({
          eventId: `evt_${crypto.randomUUID().slice(0, 12)}`,
          organizationId: orgId,
          eventType: evType,
          resourceType: 'INTEGRATION',
          resourceId: integration.integrationId,
          fingerprint: `fp_${crypto.randomUUID().slice(0, 12)}`,
          source: 'IntegrationAdapter',
          status: 'DETECTED',
          detectedAt: now,
          payload: {
            title: `Data Ingested: ${integration.name} (${syncResult.records_imported} records)`,
            description: `Ingestion job ${syncResult.job_id} imported ${syncResult.records_imported} items via ${integration.adapterName}.`,
            integrationId: integration.integrationId,
            recordsImported: syncResult.records_imported,
            provider: integration.providerType
          }
        });
      }

      // Update Integration stats
      await Integration.updateOne(
        { _id: integration._id },
        {
          $set: {
            lastSyncAt: now,
            lastSyncStatus: syncResult.status,
            status: syncResult.status === 'FAILED' ? 'ERROR' : 'CONNECTED'
          },
          $inc: {
            recordsImported: syncResult.records_imported || 0
          }
        }
      );

      return res.status(200).json({ success: true, data: { job, syncResult } });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async listJobs(req, res) {
    try {
      const orgId = req.user.organizationId;
      const integration = await Integration.findOne({ _id: req.params.id, organizationId: orgId });
      if (!integration) {
        return res.status(404).json({ success: false, message: 'Integration not found.' });
      }
      const jobs = await SyncJob.find({
        integrationId: integration.integrationId,
        organizationId: orgId
      }).sort({ startedAt: -1 }).limit(20);
      return res.status(200).json({ success: true, data: jobs });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async listRecords(req, res) {
    try {
      const orgId = req.user.organizationId;
      const records = await NormalizedDataRecord.find({ organizationId: orgId })
        .sort({ timestamp: -1 })
        .limit(100);
      return res.status(200).json({ success: true, data: records });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new IntegrationsController();
