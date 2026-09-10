/**
 * Phase 12: Production Incident Lifecycle Service
 * Manages incident detection, containment, mitigation, postmortem analysis, and audit logging.
 */
const crypto = require('crypto');
const { Incident, AuditLog } = require('../../../models/models');

const VALID_STATUSES = ['DETECTED', 'TRIAGED', 'CONTAINED', 'MITIGATED', 'RESOLVED', 'POSTMORTEM'];
const VALID_CATEGORIES = ['SECURITY', 'AI', 'DATA_INTEGRITY', 'INFRASTRUCTURE', 'COMPLIANCE'];
const VALID_SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

class IncidentService {
  async createIncident(incidentData, createdBy = 'system') {
    const {
      organizationId,
      title,
      category = 'AI',
      severity = 'HIGH',
      description = '',
      impact = '',
      assignedTo = null
    } = incidentData;

    if (!title) throw new Error('Incident title is required');
    if (!VALID_CATEGORIES.includes(category)) throw new Error(`Invalid category: ${category}`);
    if (!VALID_SEVERITIES.includes(severity)) throw new Error(`Invalid severity: ${severity}`);

    const nowIso = new Date().toISOString();
    const incidentId = `inc_${crypto.randomUUID().slice(0, 10)}`;

    const incident = await Incident.create({
      incidentId,
      organizationId,
      title,
      summary: title,
      affectedService: incidentData.affectedService || 'AI_AGENT',
      category: category === 'DATA_INTEGRITY' ? 'DATABASE' : category,
      severity,
      status: 'DETECTED',
      description,
      impact,
      assignedTo,
      timeline: [
        {
          timestamp: nowIso,
          action: 'INCIDENT_DETECTED',
          performedBy: createdBy,
          notes: 'Incident recorded in production operations monitoring'
        }
      ],
      detectedAt: nowIso,
      createdAt: nowIso,
      updatedAt: nowIso
    });

    await AuditLog.create({
      organizationId,
      userId: createdBy,
      action: 'INCIDENT_CREATED',
      details: { incidentId, title, category, severity },
      timestamp: nowIso
    }).catch(() => {});

    return incident;
  }

  async listIncidents(organizationId = null, filter = {}) {
    const query = organizationId ? { organizationId } : {};
    if (filter.status) query.status = filter.status;
    if (filter.severity) query.severity = filter.severity;
    if (filter.category) query.category = filter.category;

    const incidents = await Incident.find(query).sort({ createdAt: -1 }).limit(100);
    return incidents;
  }

  async getIncident(incidentId, organizationId = null) {
    const query = { incidentId };
    if (organizationId) query.organizationId = organizationId;
    const incident = await Incident.findOne(query);
    if (!incident) throw new Error(`Incident ${incidentId} not found`);
    return incident;
  }

  async updateIncidentStatus(incidentId, newStatus, performedBy = 'system', notes = '', organizationId = null) {
    if (!VALID_STATUSES.includes(newStatus)) {
      throw new Error(`Invalid incident status transition: ${newStatus}`);
    }

    const incident = await this.getIncident(incidentId, organizationId);
    const prevStatus = incident.status;
    const nowIso = new Date().toISOString();

    incident.status = newStatus;
    incident.updatedAt = nowIso;

    if (newStatus === 'RESOLVED' && !incident.resolvedAt) {
      incident.resolvedAt = nowIso;
    }

    incident.timeline.push({
      timestamp: nowIso,
      action: `STATUS_CHANGED_TO_${newStatus}`,
      performedBy,
      notes: notes || `Transitioned from ${prevStatus} to ${newStatus}`
    });

    await incident.save();

    await AuditLog.create({
      organizationId: incident.organizationId,
      userId: performedBy,
      action: 'INCIDENT_STATUS_UPDATED',
      details: { incidentId, prevStatus, newStatus, notes },
      timestamp: nowIso
    }).catch(() => {});

    return incident;
  }

  async addPostmortem(incidentId, postmortemData, performedBy = 'system', organizationId = null) {
    const incident = await this.getIncident(incidentId, organizationId);
    const nowIso = new Date().toISOString();

    incident.postmortem = {
      rootCause: postmortemData.rootCause || 'Under investigation',
      preventativeMeasures: postmortemData.preventativeMeasures || [],
      author: performedBy,
      publishedAt: nowIso
    };
    incident.status = 'POSTMORTEM';
    incident.updatedAt = nowIso;

    incident.timeline.push({
      timestamp: nowIso,
      action: 'POSTMORTEM_PUBLISHED',
      performedBy,
      notes: 'Formal postmortem investigation and preventative measures logged'
    });

    await incident.save();

    await AuditLog.create({
      organizationId: incident.organizationId,
      userId: performedBy,
      action: 'INCIDENT_POSTMORTEM_PUBLISHED',
      details: { incidentId, rootCause: incident.postmortem.rootCause },
      timestamp: nowIso
    }).catch(() => {});

    return incident;
  }
}

module.exports = new IncidentService();
