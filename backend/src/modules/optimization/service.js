const crypto = require('crypto');
const { 
  OptimizationRun, 
  Risk, 
  AuditLog, 
  MitigationPlan,
  WorkflowInstance,
  WorkflowDefinition
} = require('../../../models/models');

const PYTHON_AI_URL = process.env.PYTHON_AI_URL || 'http://localhost:8000';

class OptimizationService {
  async runOptimization(user, data = {}) {
    const orgId = user.organizationId;
    const now = new Date().toISOString();

    // 1. Fetch active risks for this tenant if not supplied explicitly
    let portfolioRisks = data.portfolio_risks;
    if (!Array.isArray(portfolioRisks) || portfolioRisks.length === 0) {
      const dbRisks = await Risk.find({ 
        organizationId: orgId,
        status: { $in: ['OPEN', 'UNDER_REVIEW', 'IDENTIFIED'] }
      }).limit(data.limit || 20);

      portfolioRisks = dbRisks.map(r => ({
        risk_id: r._id.toString(),
        risk_title: r.title,
        current_score: Number(r.score || 50.0),
        category: r.category || 'Operational',
        severity: r.severity || 'MEDIUM',
        project_id: r.projectId ? r.projectId.toString() : null,
        candidate_actions: []
      }));
    }

    // Fallback if tenant has 0 risks: construct pilot candidate risk
    if (portfolioRisks.length === 0) {
      portfolioRisks = [{
        risk_id: `risk_synth_${Date.now()}`,
        risk_title: 'Industrial Pipeline Effluent Pressure Fluctuation',
        current_score: 82.5,
        category: 'Compliance',
        severity: 'CRITICAL',
        candidate_actions: []
      }];
    }

    const payload = {
      organization_id: orgId,
      objective: data.objective || 'BALANCED_OPTIMIZATION',
      custom_weights: data.custom_weights || null,
      constraints: {
        budget: Number(data.budget !== undefined ? data.budget : (data.constraints?.budget ?? 50000.0)),
        deadline: Number(data.deadline !== undefined ? data.deadline : (data.constraints?.deadline ?? 60)),
        resource_limit: Number(data.resource_limit !== undefined ? data.resource_limit : (data.constraints?.resource_limit ?? 20)),
        risk_tolerance: Number(data.risk_tolerance !== undefined ? data.risk_tolerance : (data.constraints?.risk_tolerance ?? 45.0)),
        mandatory_compliance: data.mandatory_compliance !== undefined ? Boolean(data.mandatory_compliance) : (data.constraints?.mandatory_compliance ?? true),
        carbon_target: data.carbon_target !== undefined ? Number(data.carbon_target) : (data.constraints?.carbon_target ?? null),
        esg_target: data.esg_target !== undefined ? Number(data.esg_target) : (data.constraints?.esg_target ?? null)
      },
      portfolio_risks: portfolioRisks,
      simulation_only: false
    };

    // 2. Call Python optimization microservice
    const pyRes = await fetch(`${PYTHON_AI_URL}/internal/optimization/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!pyRes.ok) {
      const errText = await pyRes.text();
      throw new Error(`Python optimization service failed (${pyRes.status}): ${errText}`);
    }

    const optResult = await pyRes.json();
    const runId = optResult.optimization_id || `opt_${crypto.randomBytes(6).toString('hex')}`;

    // 3. Persist optimization run record
    const runRecord = await OptimizationRun.create({
      runId,
      organizationId: orgId,
      objective: optResult.objective,
      weightsVersion: optResult.weights_version,
      scoringVersion: optResult.scoring_version,
      weights: payload.custom_weights || {},
      constraints: payload.constraints,
      totalRisksConsidered: optResult.total_risks_considered,
      selectedMitigationsCount: optResult.selected_mitigations_count,
      totalBudgetAllocated: optResult.total_budget_allocated,
      budgetCap: optResult.budget_cap,
      budgetUtilizationPct: optResult.budget_utilization_pct,
      totalRiskPointsReduced: optResult.total_risk_points_reduced,
      totalCarbonReductionTco2e: optResult.total_carbon_reduction_tco2e,
      totalEsgGain: optResult.total_esg_gain,
      maxImplementationDays: optResult.max_implementation_days,
      constraintsSatisfied: optResult.constraints_satisfied,
      constraintViolations: optResult.constraint_violations || [],
      rankedStrategies: optResult.ranked_strategies || [],
      executiveSummary: optResult.executive_summary,
      status: 'WAITING_FOR_APPROVAL',
      isSimulation: false,
      createdAt: now,
      updatedAt: now
    });

    // 4. Record Audit Log
    await AuditLog.create({
      organizationId: orgId,
      user: user.email || user.name || 'System',
      userId: user.id || user._id?.toString() || 'usr_unknown',
      action: 'OPTIMIZATION_RUN',
      module: 'OptimizationEngine',
      recordId: runId,
      newValue: 'WAITING_FOR_APPROVAL',
      metadata: { 
        objective: optResult.objective, 
        selectedCount: optResult.selected_mitigations_count,
        totalCost: optResult.total_budget_allocated
      },
      timestamp: now
    });

    return runRecord;
  }

  async simulateOptimization(user, data = {}) {
    const orgId = user.organizationId;

    let portfolioRisks = data.portfolio_risks;
    if (!Array.isArray(portfolioRisks) || portfolioRisks.length === 0) {
      const dbRisks = await Risk.find({ 
        organizationId: orgId,
        status: { $in: ['OPEN', 'UNDER_REVIEW', 'IDENTIFIED'] }
      }).limit(data.limit || 15);

      portfolioRisks = dbRisks.map(r => ({
        risk_id: r._id.toString(),
        risk_title: r.title,
        current_score: Number(r.score || 50.0),
        category: r.category || 'Operational',
        severity: r.severity || 'MEDIUM',
        project_id: r.projectId ? r.projectId.toString() : null,
        candidate_actions: []
      }));
    }

    if (portfolioRisks.length === 0) {
      portfolioRisks = [{
        risk_id: `risk_synth_${Date.now()}`,
        risk_title: 'Volatile Flue Gas Recirculation Sensor Spike',
        current_score: 76.0,
        category: 'Environmental',
        severity: 'HIGH',
        candidate_actions: []
      }];
    }

    const payload = {
      organization_id: orgId,
      objective: data.objective || 'BALANCED_OPTIMIZATION',
      custom_weights: data.custom_weights || null,
      constraints: {
        budget: Number(data.budget !== undefined ? data.budget : (data.constraints?.budget ?? 40000.0)),
        deadline: Number(data.deadline !== undefined ? data.deadline : (data.constraints?.deadline ?? 45)),
        resource_limit: Number(data.resource_limit !== undefined ? data.resource_limit : (data.constraints?.resource_limit ?? 15)),
        risk_tolerance: Number(data.risk_tolerance !== undefined ? data.risk_tolerance : (data.constraints?.risk_tolerance ?? 40.0)),
        mandatory_compliance: data.mandatory_compliance !== undefined ? Boolean(data.mandatory_compliance) : (data.constraints?.mandatory_compliance ?? true),
        carbon_target: data.carbon_target !== undefined ? Number(data.carbon_target) : null,
        esg_target: data.esg_target !== undefined ? Number(data.esg_target) : null
      },
      portfolio_risks: portfolioRisks,
      simulation_only: true
    };

    const pyRes = await fetch(`${PYTHON_AI_URL}/internal/optimization/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!pyRes.ok) {
      const errText = await pyRes.text();
      throw new Error(`Python optimization simulation failed: ${errText}`);
    }

    return await pyRes.json();
  }

  async listRuns(user) {
    return await OptimizationRun.find({ organizationId: user.organizationId })
      .sort({ createdAt: -1 })
      .limit(50);
  }

  async getRun(user, runId) {
    const run = await OptimizationRun.findOne({ 
      runId, 
      organizationId: user.organizationId 
    });
    if (!run) {
      const err = new Error(`Optimization run '${runId}' not found for tenant`);
      err.status = 404;
      throw err;
    }
    return run;
  }

  async approveRun(user, runId, notes = '') {
    const run = await this.getRun(user, runId);
    const now = new Date().toISOString();
    const approvalId = `appr_opt_${crypto.randomBytes(4).toString('hex')}`;

    run.status = 'APPROVED';
    run.approvalId = approvalId;
    run.approvedBy = user.email || user.name || 'ESG Admin';
    run.approvedAt = now;
    run.updatedAt = now;
    await run.save();

    await AuditLog.create({
      organizationId: user.organizationId,
      user: user.email || user.name,
      userId: user.id || user._id?.toString(),
      action: 'OPTIMIZATION_APPROVED',
      module: 'OptimizationEngine',
      recordId: runId,
      newValue: 'APPROVED',
      metadata: { approvalId, notes },
      timestamp: now
    });

    return run;
  }

  async executeRun(user, runId) {
    const run = await this.getRun(user, runId);
    if (run.status !== 'APPROVED') {
      const err = new Error(`Cannot execute optimization run '${runId}' in status '${run.status}'. Must be APPROVED first.`);
      err.status = 400;
      throw err;
    }

    const now = new Date().toISOString();

    // Operational hand-off: Transition selected risks to MITIGATION_IN_PROGRESS and create mitigation plans
    for (const strat of run.rankedStrategies) {
      if (strat.risk_id && !strat.risk_id.startsWith('risk_synth_')) {
        await Risk.updateOne(
          { _id: strat.risk_id, organizationId: user.organizationId },
          { $set: { status: 'MITIGATION_IN_PROGRESS', updatedAt: now } }
        );

        const planId = `plan_opt_${crypto.randomBytes(4).toString('hex')}`;
        await MitigationPlan.create({
          plan_id: planId,
          risk_id: strat.risk_id,
          organization_id: user.organizationId,
          title: strat.action_title || 'Optimized Mitigation Plan',
          description: `Dispatched optimization action for risk ${strat.risk_id}. Estimated cost: $${strat.estimated_cost}, implementation: ${strat.implementation_time}d.`,
          actions: [strat.action_title || 'Execute remediation action'],
          status: 'IN_PROGRESS',
          created_at: now
        }).catch(err => {
          console.warn('MitigationPlan creation warning:', err.message);
        });
      }
    }

    run.status = 'EXECUTED';
    run.executedAt = now;
    run.updatedAt = now;
    await run.save();

    await AuditLog.create({
      organizationId: user.organizationId,
      user: user.email || user.name,
      userId: user.id || user._id?.toString(),
      action: 'OPTIMIZATION_EXECUTED',
      module: 'OptimizationEngine',
      recordId: runId,
      newValue: 'EXECUTED',
      metadata: { 
        executedStrategiesCount: run.rankedStrategies.length,
        totalCost: run.totalBudgetAllocated
      },
      timestamp: now
    });

    return run;
  }
}

module.exports = new OptimizationService();
