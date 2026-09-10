/**
 * Phase 12: Organization Onboarding Service
 * Manages the structured 9-step onboarding wizard progression and persistence.
 */
const { OnboardingState, AuditLog } = require('../../../models/models');

const ONBOARDING_STEPS_META = [
  { stepNumber: 1, title: 'Organization Profile & Tier', description: 'Legal identity, industry domain, tenant tier selection' },
  { stepNumber: 2, title: 'Admin & Role Provisioning', description: 'Setup primary administrators and configure persona permissions' },
  { stepNumber: 3, title: 'Project Scope & Baseline', description: 'Register decarbonization projects, targets, and baselines' },
  { stepNumber: 4, title: 'ESG & Carbon Data Sources', description: 'Connect IoT telemetry, ERP connectors, and registry APIs' },
  { stepNumber: 5, title: 'Risk Category & Scoring Config', description: 'Calibrate risk categories, thresholds, and severity weightings' },
  { stepNumber: 6, title: 'Monitoring & Event Detection', description: 'Configure anomaly detection rules, thresholds, and cadences' },
  { stepNumber: 7, title: 'AI Agent & Predictive Governance', description: 'Set token limits, tool authorization levels, and predictive horizons' },
  { stepNumber: 8, title: 'Workflow & HITL Approval Policies', description: 'Configure human-in-the-loop signoff criteria for automated actions' },
  { stepNumber: 9, title: 'Verification & Activation', description: 'Run validation health checks and officially activate tenant operations' }
];

class OnboardingService {
  async getOrCreateOnboardingState(organizationId) {
    let state = await OnboardingState.findOne({ organizationId });
    if (!state) {
      const nowIso = new Date().toISOString();
      const steps = ONBOARDING_STEPS_META.map(s => ({
        stepNumber: s.stepNumber,
        title: s.title,
        status: s.stepNumber === 1 ? 'IN_PROGRESS' : 'PENDING',
        completedAt: null,
        data: {}
      }));

      state = await OnboardingState.create({
        organizationId,
        currentStep: 1,
        completedSteps: [],
        totalSteps: 9,
        status: 'IN_PROGRESS',
        steps,
        startedAt: nowIso,
        createdAt: nowIso,
        updatedAt: nowIso
      });
    }
    return state;
  }

  async updateStep(organizationId, stepNumber, stepData = {}, performedBy = 'system') {
    const num = parseInt(stepNumber, 10);
    if (num < 1 || num > 9) throw new Error('Step number must be between 1 and 9');

    const state = await this.getOrCreateOnboardingState(organizationId);
    const nowIso = new Date().toISOString();

    const targetStep = state.steps.find(s => s.stepNumber === num);
    if (targetStep) {
      targetStep.status = 'COMPLETED';
      targetStep.completedAt = nowIso;
      targetStep.data = { ...(targetStep.data || {}), ...stepData };
    }

    // Advance currentStep if not at the end
    if (num < 9) {
      state.currentStep = Math.max(state.currentStep, num + 1);
      const nextStep = state.steps.find(s => s.stepNumber === state.currentStep);
      if (nextStep && nextStep.status === 'PENDING') {
        nextStep.status = 'IN_PROGRESS';
      }
    }

    state.updatedAt = nowIso;
    await state.save();

    await AuditLog.create({
      organizationId,
      userId: performedBy,
      action: 'ONBOARDING_STEP_COMPLETED',
      details: { stepNumber: num, stepTitle: targetStep?.title },
      timestamp: nowIso
    }).catch(() => {});

    return state;
  }

  async completeOnboarding(organizationId, performedBy = 'system') {
    const state = await this.getOrCreateOnboardingState(organizationId);
    const nowIso = new Date().toISOString();

    // Mark all steps completed if not already
    for (const step of state.steps) {
      if (step.status !== 'COMPLETED') {
        step.status = 'COMPLETED';
        step.completedAt = step.completedAt || nowIso;
      }
    }

    state.status = 'COMPLETED';
    state.completedAt = nowIso;
    state.updatedAt = nowIso;
    await state.save();

    await AuditLog.create({
      organizationId,
      userId: performedBy,
      action: 'ONBOARDING_COMPLETED',
      details: { organizationId, completedAt: nowIso },
      timestamp: nowIso
    }).catch(() => {});

    return state;
  }
}

module.exports = new OnboardingService();
