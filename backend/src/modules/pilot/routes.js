/**
 * Phase 12: Pilot & Operations API Routes
 * Endpoints for pilot synthetic seeding, business KPIs, resource limits, feature flags, incidents, releases, onboarding, UAT, and AI evaluation.
 */
const express = require('express');
const router = express.Router();
const controller = require('./controller');
const { authenticateRiskUser, enforceRiskScope } = require('../../middleware/riskAuth');

router.use(authenticateRiskUser);
router.use(enforceRiskScope);

// 1. Synthetic Seeding & Business KPIs
router.post('/seed-synthetic', (req, res) => controller.seedSynthetic(req, res));
router.get('/kpis', (req, res) => controller.getKPIs(req, res));
router.get('/ai-usage', (req, res) => controller.getAIUsage(req, res));

// 2. Feature Flags
router.get('/flags', (req, res) => controller.getFlags(req, res));
router.post('/flags', (req, res) => controller.setFlag(req, res));

// 3. Incidents
router.get('/incidents', (req, res) => controller.listIncidents(req, res));
router.post('/incidents', (req, res) => controller.createIncident(req, res));
router.put('/incidents/:id/status', (req, res) => controller.updateIncidentStatus(req, res));
router.post('/incidents/:id/postmortem', (req, res) => controller.addPostmortem(req, res));

// 4. Release Management & Quality Gates
router.get('/release/gates', (req, res) => controller.getQualityGates(req, res));
router.post('/release', (req, res) => controller.recordRelease(req, res));
router.get('/release/history', (req, res) => controller.listReleases(req, res));
router.post('/release/rollback', (req, res) => controller.triggerRollback(req, res));

// 5. Onboarding Wizard
router.get('/onboarding', (req, res) => controller.getOnboarding(req, res));
router.post('/onboarding/step', (req, res) => controller.saveOnboardingStep(req, res));
router.post('/onboarding/complete', (req, res) => controller.completeOnboarding(req, res));

// 6. UAT & AI Evaluation Runners
router.post('/uat/run', (req, res) => controller.runUAT(req, res));
router.get('/uat/results', (req, res) => controller.getUATResults(req, res));
router.post('/ai-eval/run', (req, res) => controller.runAIEval(req, res));

module.exports = router;
