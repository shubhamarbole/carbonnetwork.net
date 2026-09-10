/**
 * Scenario Intelligence Express Controller
 * Phase 10: Scenario CRUD, Deterministic Execution, Comparisons, Explanations, Zero-Mutation Guarantee.
 */
const crypto = require('crypto');
const {
  Scenario,
  ScenarioResult,
  Risk,
  MonitoringEvent,
  AuditLog
} = require('../../../models/models');

const PYTHON_SERVICE_URL = process.env.PYTHON_AI_URL || 'http://localhost:8000';

class ScenariosController {
  async listScenarios(req, res) {
    try {
      const orgId = req.user.organizationId;
      const scenarios = await Scenario.find({ organizationId: orgId }).sort({ createdAt: -1 });
      return res.status(200).json({ success: true, data: scenarios });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getScenario(req, res) {
    try {
      const orgId = req.user.organizationId;
      const scenario = await Scenario.findOne({ _id: req.params.id, organizationId: orgId });
      if (!scenario) {
        return res.status(404).json({ success: false, message: 'Scenario not found.' });
      }
      return res.status(200).json({ success: true, data: scenario });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async createScenario(req, res) {
    try {
      const orgId = req.user.organizationId;
      const { name, description, scenarioType, parameters, projectId } = req.body;

      if (!name || !scenarioType) {
        return res.status(400).json({ success: false, message: 'Name and scenarioType are required.' });
      }

      const scenarioId = `scen_${crypto.randomUUID().slice(0, 12)}`;
      const now = new Date().toISOString();

      const scenario = await Scenario.create({
        scenarioId,
        name,
        description: description || '',
        scenarioType,
        parameters: parameters || {},
        organizationId: orgId,
        projectId: projectId || null,
        createdBy: req.user.email || 'User',
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now
      });

      await AuditLog.create({
        organizationId: orgId,
        user: req.user.email || 'User',
        userId: req.user.userId || req.user._id,
        action: 'SCENARIO_CREATED',
        module: 'Scenarios',
        recordId: scenarioId,
        metadata: { name, scenarioType },
        timestamp: now
      });

      return res.status(201).json({ success: true, data: scenario });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async updateScenario(req, res) {
    try {
      const orgId = req.user.organizationId;
      const { name, description, parameters, status } = req.body;

      const updateFields = { updatedAt: new Date().toISOString() };
      if (name) updateFields.name = name;
      if (description !== undefined) updateFields.description = description;
      if (parameters) updateFields.parameters = parameters;
      if (status) updateFields.status = status;

      const updated = await Scenario.findOneAndUpdate(
        { _id: req.params.id, organizationId: orgId },
        { $set: updateFields },
        { new: true }
      );

      if (!updated) {
        return res.status(404).json({ success: false, message: 'Scenario not found.' });
      }

      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async deleteScenario(req, res) {
    try {
      const orgId = req.user.organizationId;
      const deleted = await Scenario.findOneAndDelete({ _id: req.params.id, organizationId: orgId });
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Scenario not found.' });
      }
      await ScenarioResult.deleteMany({ scenarioId: deleted.scenarioId, organizationId: orgId });
      return res.status(200).json({ success: true, message: 'Scenario and associated simulations deleted.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async runScenario(req, res) {
    try {
      const orgId = req.user.organizationId;
      const scenario = await Scenario.findOne({ _id: req.params.id, organizationId: orgId });
      if (!scenario) {
        return res.status(404).json({ success: false, message: 'Scenario not found.' });
      }

      // 1. Fetch baseline risks (TENANT-ISOLATED)
      const risks = await Risk.find({ organizationId: orgId });
      const mappedRisks = risks.map(r => ({
        id: r._id.toString(),
        title: r.title,
        category: r.category,
        probability: r.probability,
        impact: r.impact,
        exposure: r.exposure,
        urgency: r.urgency
      }));

      // 2. Call Python Deterministic Simulation Engine
      const pyRes = await fetch(`${PYTHON_SERVICE_URL}/internal/scenarios/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_id: scenario.scenarioId,
          scenario_name: scenario.name,
          scenario_type: scenario.scenarioType,
          organization_id: orgId,
          project_id: scenario.projectId || null,
          parameters: scenario.parameters || {},
          risks: mappedRisks,
          include_ai_explanation: true
        })
      });

      if (!pyRes.ok) {
        const errTxt = await pyRes.text();
        return res.status(500).json({ success: false, message: `Python simulation error: ${errTxt}` });
      }

      const simData = await pyRes.json();
      const now = new Date().toISOString();

      // 3. Persist ScenarioResult (simulation = true, GUARANTEE: Risk records untouched)
      const result = await ScenarioResult.create({
        simulationId: simData.simulation_id || `sim_${crypto.randomUUID().slice(0, 12)}`,
        scenarioId: scenario.scenarioId,
        scenarioName: scenario.name,
        scenarioType: scenario.scenarioType,
        organizationId: orgId,
        projectId: scenario.projectId || null,
        baselineAverageScore: simData.baseline_average_score,
        projectedAverageScore: simData.projected_average_score,
        scoreDelta: simData.score_delta,
        baselineCriticalCount: simData.baseline_critical_count || 0,
        projectedCriticalCount: simData.projected_critical_count || 0,
        baselineHighCount: simData.baseline_high_count || 0,
        projectedHighCount: simData.projected_high_count || 0,
        affectedRisks: simData.affected_risks || [],
        potentialEvents: simData.potential_events || [],
        potentialAlerts: simData.potential_alerts || [],
        aiExplanation: simData.ai_explanation || '',
        policyCitations: simData.policy_citations || [],
        engineVersion: simData.engine_version || 'scenario-engine-v1.0.0',
        simulation: true,
        createdAt: now
      });

      // Update Scenario lastRunAt
      await Scenario.updateOne({ _id: scenario._id }, { $set: { lastRunAt: now } });

      // Log Observability Monitoring Event
      await MonitoringEvent.create({
        eventId: `evt_${crypto.randomUUID().slice(0, 12)}`,
        organizationId: orgId,
        eventType: 'SCENARIO_SIMULATION_EXECUTED',
        resourceType: 'SCENARIO',
        resourceId: scenario.scenarioId,
        fingerprint: `fp_${crypto.randomUUID().slice(0, 12)}`,
        source: 'ScenarioEngine',
        status: 'DETECTED',
        detectedAt: now,
        payload: {
          title: `[SIMULATION] Scenario Executed: ${scenario.name}`,
          description: `Simulated delta: ${simData.score_delta > 0 ? '+' : ''}${simData.score_delta} pts. Projected Critical Risks: ${simData.projected_critical_count}.`,
          scenarioId: scenario.scenarioId,
          simulation: true,
          delta: simData.score_delta
        }
      });

      return res.status(200).json({ success: true, data: result });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async compareScenarios(req, res) {
    try {
      const orgId = req.user.organizationId;
      const { scenario_ids } = req.body;

      // Load the latest results for each requested scenario
      let results = [];
      if (Array.isArray(scenario_ids) && scenario_ids.length > 0) {
        for (const sId of scenario_ids) {
          const latest = await ScenarioResult.findOne({
            organizationId: orgId,
            $or: [{ scenarioId: sId }, { simulationId: sId }]
          }).sort({ createdAt: -1 });
          if (latest) {
            results.push({
              simulation_id: latest.simulationId,
              scenario_id: latest.scenarioId,
              scenario_name: latest.scenarioName,
              scenario_type: latest.scenarioType,
              organization_id: orgId,
              project_id: latest.projectId,
              baseline_average_score: latest.baselineAverageScore,
              projected_average_score: latest.projectedAverageScore,
              score_delta: latest.scoreDelta,
              baseline_critical_count: latest.baselineCriticalCount,
              projected_critical_count: latest.projectedCriticalCount,
              baseline_high_count: latest.baselineHighCount,
              projected_high_count: latest.projectedHighCount,
              affected_risks: latest.affectedRisks || [],
              potential_events: latest.potentialEvents || [],
              potential_alerts: latest.potentialAlerts || [],
              ai_explanation: latest.aiExplanation,
              policy_citations: latest.policyCitations || [],
              engine_version: latest.engineVersion,
              simulation_timestamp: latest.createdAt
            });
          }
        }
      }

      const pyRes = await fetch(`${PYTHON_SERVICE_URL}/internal/scenarios/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: orgId,
          project_id: req.body.project_id || null,
          simulation_results: results.length > 0 ? results : null
        })
      });

      if (!pyRes.ok) {
        const errTxt = await pyRes.text();
        return res.status(500).json({ success: false, message: `Scenario comparison failed: ${errTxt}` });
      }

      const comparison = await pyRes.json();
      return res.status(200).json({ success: true, data: comparison });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getScenarioResults(req, res) {
    try {
      const orgId = req.user.organizationId;
      const results = await ScenarioResult.find({
        scenarioId: req.params.id,
        organizationId: orgId
      }).sort({ createdAt: -1 }).limit(20);
      return res.status(200).json({ success: true, data: results });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
}

module.exports = new ScenariosController();
