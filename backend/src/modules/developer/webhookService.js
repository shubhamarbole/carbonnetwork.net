const crypto = require('crypto');
const { WebhookEndpoint, WebhookDelivery, AuditLog } = require('../../../models/models');

class WebhookService {
  /**
   * Register a new webhook endpoint
   */
  async registerEndpoint(organizationId, applicationId, data = {}) {
    const webhookId = `whk_${crypto.randomBytes(8).toString('hex')}`;
    const rawSecret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
    const now = new Date().toISOString();

    const allowedEvents = [
      'risk.created', 'risk.updated', 'risk.escalated', 'risk.resolved',
      'prediction.critical',
      'alert.created', 'alert.resolved',
      'workflow.started', 'workflow.completed', 'workflow.escalated',
      'decision.approved', 'decision.completed',
      'agent.completed', 'agent.failed',
      'ping'
    ];

    const events = Array.isArray(data.events) && data.events.length > 0
      ? data.events.filter(e => allowedEvents.includes(e) || e === '*')
      : ['risk.created', 'risk.escalated', 'alert.created'];

    const record = await WebhookEndpoint.create({
      webhook_id: webhookId,
      organization_id: organizationId,
      application_id: applicationId || '',
      url: data.url,
      events,
      secret_hash: rawSecret, // Secret key used for HMAC-SHA256 signature generation
      status: 'ACTIVE',
      failure_count: 0,
      created_at: now,
      updated_at: now
    });

    await AuditLog.create({
      organizationId,
      user: 'DeveloperPlatform',
      action: 'WEBHOOK_CREATED',
      module: 'DeveloperPlatform',
      recordId: webhookId,
      newValue: 'ACTIVE',
      metadata: { url: data.url, events },
      timestamp: now
    });

    return {
      endpoint_id: record.webhook_id,
      webhook_id: record.webhook_id,
      application_id: record.application_id,
      url: record.url,
      events: record.events,
      secret: rawSecret, // Return plaintext secret ONCE upon creation
      status: record.status,
      created_at: record.created_at
    };
  }

  async listEndpoints(organizationId, applicationId = null) {
    const query = { organization_id: organizationId };
    if (applicationId) query.application_id = applicationId;
    return await WebhookEndpoint.find(query).select('-secret_hash').sort({ created_at: -1 });
  }

  async getEndpoint(organizationId, webhookId) {
    return await WebhookEndpoint.findOne({ webhook_id: webhookId, organization_id: organizationId }).select('-secret_hash');
  }

  async deleteEndpoint(organizationId, webhookId) {
    const endpoint = await WebhookEndpoint.findOne({ webhook_id: webhookId, organization_id: organizationId });
    if (!endpoint) return false;
    endpoint.status = 'DISABLED';
    endpoint.updated_at = new Date().toISOString();
    await endpoint.save();

    await AuditLog.create({
      organizationId,
      user: 'DeveloperPlatform',
      action: 'WEBHOOK_DISABLED',
      module: 'DeveloperPlatform',
      recordId: webhookId,
      newValue: 'DISABLED',
      timestamp: new Date().toISOString()
    });
    return true;
  }

  /**
   * Emit platform event to all matching registered webhook endpoints
   */
  async emitEvent(eventType, payload, organizationId) {
    try {
      const endpoints = await WebhookEndpoint.find({
        organization_id: organizationId,
        status: 'ACTIVE'
      });

      const matching = endpoints.filter(ep => ep.events.includes('*') || ep.events.includes(eventType));
      if (matching.length === 0) return [];

      const eventId = `evt_${crypto.randomBytes(8).toString('hex')}`;
      const now = new Date().toISOString();

      const deliveries = [];
      for (const ep of matching) {
        const deliveryId = `deliv_${crypto.randomBytes(8).toString('hex')}`;
        const delivery = await WebhookDelivery.create({
          delivery_id: deliveryId,
          webhook_id: ep.webhook_id,
          event_id: eventId,
          event_type: eventType,
          payload,
          attempt: 1,
          status: 'PENDING',
          status_code: null,
          latency_ms: null,
          response_summary: null,
          delivered_at: null,
          next_retry_at: null,
          created_at: now
        });

        deliveries.push(delivery);
        // Non-blocking async execution
        setImmediate(() => {
          this.executeDelivery(delivery, ep).catch(err => {
            console.error(`[Webhook Delivery Error] ${deliveryId}:`, err.message);
          });
        });
      }

      return deliveries;
    } catch (err) {
      console.error('[Webhook Emit Error]:', err.message);
      return [];
    }
  }

  /**
   * Execute delivery with HMAC signature and retry handling
   */
  async executeDelivery(delivery, endpoint) {
    const startTime = Date.now();
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payloadStr = JSON.stringify(delivery.payload);

    // Compute HMAC-SHA256 signature
    const signature = crypto
      .createHmac('sha256', endpoint.secret_hash)
      .update(`${timestamp}.${payloadStr}`)
      .digest('hex');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-ID': delivery.delivery_id,
          'X-Webhook-Timestamp': timestamp,
          'X-Webhook-Signature': signature,
          'User-Agent': 'CarbonESG-Webhook/1.0'
        },
        body: payloadStr,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const latency = Date.now() - startTime;
      let responseText = '';
      try {
        responseText = (await res.text()).slice(0, 500);
      } catch {}

      if (res.ok) {
        delivery.status = 'DELIVERED';
        delivery.status_code = res.status;
        delivery.latency_ms = latency;
        delivery.response_summary = responseText || 'OK';
        delivery.delivered_at = new Date().toISOString();
        await delivery.save();

        if (endpoint.failure_count > 0) {
          endpoint.failure_count = 0;
          await endpoint.save();
        }
      } else {
        throw new Error(`HTTP ${res.status}: ${responseText}`);
      }
    } catch (err) {
      const latency = Date.now() - startTime;
      delivery.latency_ms = latency;
      delivery.response_summary = err.message ? err.message.slice(0, 300) : 'Delivery failed';

      if (delivery.attempt < 3) {
        delivery.status = 'RETRYING';
        delivery.attempt += 1;
        const backoffMs = delivery.attempt * 2000;
        delivery.next_retry_at = new Date(Date.now() + backoffMs).toISOString();
        await delivery.save();

        setTimeout(() => {
          this.executeDelivery(delivery, endpoint).catch(() => {});
        }, backoffMs);
      } else {
        delivery.status = 'FAILED';
        await delivery.save();

        endpoint.failure_count = (endpoint.failure_count || 0) + 1;
        if (endpoint.failure_count >= 5) {
          endpoint.status = 'FAILED';
        }
        await endpoint.save();
      }
    }
  }

  async getDeliveries(webhookId, limit = 50) {
    return await WebhookDelivery.find({ webhook_id: webhookId })
      .sort({ created_at: -1 })
      .limit(limit);
  }
}

module.exports = new WebhookService();
