/**
 * Phase 12: Pilot & Operations Controller
 * HTTP handlers for synthetic seeding, KPIs, feature flags, incidents, releases, onboarding, UAT, and AI evals.
 */
const pilotService = require('./service');
const featureFlagsService = require('./featureFlagsService');
const incidentService = require('./incidentService');
const releaseService = require('./releaseService');
const onboardingService = require('./onboardingService');
const uatService = require('./uatService');
const { AIEvaluationRun } = require('../../../models/models');

const PYTHON_SERVICE_URL = process.env.PYTHON_AI_URL || 'http://localhost:8000';

class PilotController {
  // 1. Synthetic Dataset Seeding
  async seedSynthetic(req, res) {
    try {
      const requestedBy = req.user?.userId || req.user?._id || req.user?.id || 'system';
      const result = await pilotService.seedPilotDataset(requestedBy);
      return res.status(201).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: `Failed to seed pilot dataset: ${err.message}` });
    }
  }

  // 2. Business KPIs
  async getKPIs(req, res) {
    try {
      const organizationId = req.query.organizationId || req.user?.organizationId || null;
      const kpis = await pilotService.getBusinessKPIs(organizationId);
      return res.status(200).json(kpis);
    } catch (err) {
      return res.status(500).json({ success: false, message: `Failed to fetch business KPIs: ${err.message}` });
    }
  }

  // 3. AI Usage and Cost Tracking
  async getAIUsage(req, res) {
    try {
      const organizationId = req.query.organizationId || req.user?.organizationId || null;
      const usage = await pilotService.getAIUsageAndCosts(organizationId);
      return res.status(200).json(usage);
    } catch (err) {
      return res.status(500).json({ success: false, message: `Failed to fetch AI usage: ${err.message}` });
    }
  }

  // 4. Feature Flags
  async getFlags(req, res) {
    try {
      const flags = await featureFlagsService.getAllFlags(req.user?.organizationId);
      return res.status(200).json({ success: true, flags });
    } catch (err) {
      return res.status(500).json({ success: false, message: `Failed to fetch feature flags: ${err.message}` });
    }
  }

  async setFlag(req, res) {
    try {
      const { key, enabled } = req.body;
      if (!key) return res.status(400).json({ success: false, message: 'Flag key is required' });
      const updatedBy = req.user?.email || req.user?.userId || 'system';
      const flag = await featureFlagsService.setFlag(key, enabled, updatedBy, req.user?.organizationId);
      return res.status(200).json({ success: true, flag });
    } catch (err) {
      return res.status(500).json({ success: false, message: `Failed to set feature flag: ${err.message}` });
    }
  }

  // 5. Incidents
  async listIncidents(req, res) {
    try {
      const organizationId = req.user?.organizationId || null;
      const incidents = await incidentService.listIncidents(organizationId, req.query);
      return res.status(200).json({ success: true, count: incidents.length, incidents });
    } catch (err) {
      return res.status(500).json({ success: false, message: `Failed to list incidents: ${err.message}` });
    }
  }

  async createIncident(req, res) {
    try {
      const organizationId = req.user?.organizationId || req.body.organizationId || 'pilot-org-ecomfg-001';
      const createdBy = req.user?.email || req.user?.userId || 'system';
      const incident = await incidentService.createIncident({ ...req.body, organizationId }, createdBy);
      return res.status(201).json({ success: true, incident });
    } catch (err) {
      return res.status(400).json({ success: false, message: `Failed to create incident: ${err.message}` });
    }
  }

  async updateIncidentStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const performedBy = req.user?.email || req.user?.userId || 'system';
      const incident = await incidentService.updateIncidentStatus(id, status, performedBy, notes, req.user?.organizationId);
      return res.status(200).json({ success: true, incident });
    } catch (err) {
      return res.status(400).json({ success: false, message: `Failed to update incident: ${err.message}` });
    }
  }

  async addPostmortem(req, res) {
    try {
      const { id } = req.params;
      const performedBy = req.user?.email || req.user?.userId || 'system';
      const incident = await incidentService.addPostmortem(id, req.body, performedBy, req.user?.organizationId);
      return res.status(200).json({ success: true, incident });
    } catch (err) {
      return res.status(400).json({ success: false, message: `Failed to add postmortem: ${err.message}` });
    }
  }

  // 6. Release Management & Quality Gates
  async getQualityGates(req, res) {
    try {
      const gates = await releaseService.evaluateQualityGates();
      return res.status(200).json({ success: true, ...gates });
    } catch (err) {
      return res.status(500).json({ success: false, message: `Failed to evaluate quality gates: ${err.message}` });
    }
  }

  async recordRelease(req, res) {
    try {
      const deployedBy = req.user?.email || req.user?.userId || 'system';
      const release = await releaseService.recordRelease(deployedBy, req.body.notes);
      return res.status(201).json({ success: true, release });
    } catch (err) {
      return res.status(500).json({ success: false, message: `Failed to record release: ${err.message}` });
    }
  }

  async listReleases(req, res) {
    try {
      const releases = await releaseService.listReleases();
      return res.status(200).json({ success: true, count: releases.length, releases });
    } catch (err) {
      return res.status(500).json({ success: false, message: `Failed to list releases: ${err.message}` });
    }
  }

  async triggerRollback(req, res) {
    try {
      const { releaseId, reason } = req.body;
      const requestedBy = req.user?.email || req.user?.userId || 'system';
      const result = await releaseService.executeRollback(releaseId, requestedBy, reason);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, message: `Failed to execute rollback: ${err.message}` });
    }
  }

  // 7. Onboarding Wizard
  async getOnboarding(req, res) {
    try {
      const organizationId = req.query.organizationId || req.user?.organizationId || 'pilot-org-ecomfg-001';
      const state = await onboardingService.getOrCreateOnboardingState(organizationId);
      return res.status(200).json({ success: true, state });
    } catch (err) {
      return res.status(500).json({ success: false, message: `Failed to fetch onboarding state: ${err.message}` });
    }
  }

  async saveOnboardingStep(req, res) {
    try {
      const { organizationId, stepNumber, stepData } = req.body;
      const orgId = organizationId || req.user?.organizationId || 'pilot-org-ecomfg-001';
      const performedBy = req.user?.email || req.user?.userId || 'system';
      const state = await onboardingService.updateStep(orgId, stepNumber, stepData, performedBy);
      return res.status(200).json({ success: true, state });
    } catch (err) {
      return res.status(400).json({ success: false, message: `Failed to save onboarding step: ${err.message}` });
    }
  }

  async completeOnboarding(req, res) {
    try {
      const { organizationId } = req.body;
      const orgId = organizationId || req.user?.organizationId || 'pilot-org-ecomfg-001';
      const performedBy = req.user?.email || req.user?.userId || 'system';
      const state = await onboardingService.completeOnboarding(orgId, performedBy);
      return res.status(200).json({ success: true, state });
    } catch (err) {
      return res.status(400).json({ success: false, message: `Failed to complete onboarding: ${err.message}` });
    }
  }

  // 8. UAT Runner
  async runUAT(req, res) {
    try {
      const executedBy = req.user?.email || req.user?.userId || 'system';
      const result = await uatService.runPersonaUATSuite(executedBy);
      return res.status(200).json({ success: true, result });
    } catch (err) {
      return res.status(500).json({ success: false, message: `Failed to run UAT suite: ${err.message}` });
    }
  }

  async getUATResults(req, res) {
    try {
      const results = await uatService.getRecentResults();
      return res.status(200).json({ success: true, count: results.length, results });
    } catch (err) {
      return res.status(500).json({ success: false, message: `Failed to get UAT results: ${err.message}` });
    }
  }

  // 9. Quantitative AI Evaluation Runner (Proxy to Python microservice)
  async runAIEval(req, res) {
    try {
      const pyRes = await fetch(`${PYTHON_SERVICE_URL}/internal/pilot/evaluation/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!pyRes.ok) {
        const txt = await pyRes.text();
        throw new Error(`Python AI evaluation service error: ${txt}`);
      }

      const evalData = await pyRes.json();
      const orgId = req.user?.organizationId || 'pilot-org-ecomfg-001';
      const nowIso = new Date().toISOString();

      const savedRun = await AIEvaluationRun.create({
        evaluationId: `eval_${crypto.randomUUID().slice(0, 8)}`,
        organizationId: orgId,
        totalCases: evalData.total_cases,
        overallScore: evalData.overall_score,
        metrics: evalData.metrics || {},
        details: evalData.evaluation_details || [],
        measuredAt: nowIso
      });

      return res.status(200).json({
        success: true,
        evaluationId: savedRun.evaluationId,
        ...evalData
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: `Failed to run AI evaluation: ${err.message}` });
    }
  }
}

module.exports = new PilotController();
