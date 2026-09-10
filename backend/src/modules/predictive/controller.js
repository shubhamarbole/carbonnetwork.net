/**
 * Predictive Intelligence Controller
 * Phase 9: Machine Learning Risk Trajectory Forecasting & Explainability
 * 
 * IMPORTANT:
 * - Deterministic Phase 2 risk score remains authoritative and is NEVER overwritten.
 * - Forecasts and probabilities are persisted separately in PredictionHistory.
 * - Multi-tenant isolation is strictly enforced.
 */

const crypto = require('crypto');
const {
  Risk,
  RiskHistory,
  PredictionHistory,
  Alert,
  MonitoringEvent,
  AuditLog,
  User,
  Project,
  Organization
} = require('../../../models/models');

const PYTHON_SERVICE_URL = process.env.PYTHON_AI_URL || 'http://localhost:8000';
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'esg-ai-internal-service-key-secret-2026';

// Helper to resolve linked metadata
async function resolveUser(userId) {
  if (!userId) return null;
  try {
    return await User.findById(userId).select('name email role');
  } catch {
    return null;
  }
}

async function resolveProject(projectId) {
  if (!projectId) return null;
  try {
    return await Project.findById(projectId).select('name code status');
  } catch {
    return null;
  }
}

async function resolveOrganization(orgId) {
  if (!orgId) return null;
  try {
    return await Organization.findById(orgId).select('name code type');
  } catch {
    return null;
  }
}

class PredictiveController {
  /**
   * POST /api/risks/:id/predict
   * Run ML predictive risk trajectory forecast for a single risk.
   */
  async predictRisk(req, res, next) {
    try {
      const user = req.user;
      if (user.role === 'VIEWER') {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Viewers are not permitted to trigger predictive risk forecasts.'
        });
      }

      const riskId = req.params.id;
      const risk = await Risk.findById(riskId);
      if (!risk) {
        return res.status(404).json({ success: false, message: 'Risk record not found.' });
      }

      // Multi-tenant check
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'PLATFORM_ADMIN') {
        if (risk.organizationId && risk.organizationId.toString() !== user.organizationId?.toString()) {
          return res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this risk.' });
        }
      }

      // Valid horizons: 7, 30, 90 (default 30)
      const requestedHorizon = Number(req.body.horizon_days || req.body.prediction_horizon_days || 30);
      const horizonDays = [7, 30, 90].includes(requestedHorizon) ? requestedHorizon : 30;

      // 1. Fetch score history snapshots (chronological order)
      let historySnapshots = [];
      try {
        const histories = await RiskHistory.find({ risk_id: risk._id.toString() });
        const list = Array.isArray(histories) ? histories : (histories?.data || []);
        list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        historySnapshots = list.map(h => ({
          score: h.new_score,
          timestamp: h.timestamp
        }));
      } catch (hErr) {
        console.warn('Could not fetch score histories:', hErr.message);
      }

      // 2. Fetch alerts in past 30 days
      let alertsCount30d = 0;
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const alerts = await Alert.find({
          riskId: risk._id.toString(),
          createdAt: { $gte: thirtyDaysAgo }
        });
        alertsCount30d = Array.isArray(alerts) ? alerts.length : 0;
      } catch (aErr) {
        console.warn('Could not fetch alerts count:', aErr.message);
      }

      // 3. Fetch events in past 30 days
      let eventsCount30d = 0;
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const events = await MonitoringEvent.find({
          organization_id: risk.organizationId ? risk.organizationId.toString() : '',
          detected_at: { $gte: thirtyDaysAgo }
        });
        const evtList = Array.isArray(events) ? events : [];
        eventsCount30d = evtList.filter(ev =>
          ev.resource_id === risk._id.toString() ||
          ev.payload?.risk_id === risk._id.toString()
        ).length;
      } catch (eErr) {
        console.warn('Could not fetch events count:', eErr.message);
      }

      // 4. Construct payload for Python ML service
      const orgIdStr = risk.organizationId ? risk.organizationId.toString() : (user.organizationId || '');
      const projIdStr = risk.projectId ? risk.projectId.toString() : null;

      const pythonPayload = {
        risk_id: risk._id.toString(),
        prediction_horizon_days: horizonDays,
        organization_id: orgIdStr,
        project_id: projIdStr,
        include_explainability: true,
        risk_snapshot: {
          risk_id: risk._id.toString(),
          title: risk.title,
          category: risk.category,
          status: risk.status,
          risk_score: risk.risk_score,
          severity: risk.severity,
          probability: risk.probability,
          impact: risk.impact,
          exposure: risk.exposure,
          urgency: risk.urgency,
          createdAt: risk.createdAt,
          updatedAt: risk.updatedAt
        },
        history_snapshots: historySnapshots,
        events_count_30d: eventsCount30d,
        alerts_count_30d: alertsCount30d,
        overdue_mitigations: 0
      };

      const startTime = new Date().toISOString();

      // 5. Call Python Predictive Intelligence microservice
      const pyRes = await fetch(`${PYTHON_SERVICE_URL}/internal/predictive/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Service-Key': INTERNAL_SERVICE_KEY
        },
        body: JSON.stringify(pythonPayload)
      });

      if (!pyRes.ok) {
        const errText = await pyRes.text();
        console.error('Python predictive service failed:', pyRes.status, errText);
        return res.status(502).json({
          success: false,
          message: `Predictive AI service responded with error: ${errText}`
        });
      }

      const pyData = await pyRes.json();

      // 6. Persist forecast in PredictionHistory (Phase 2 deterministic score is untouched!)
      const predictionId = pyData.prediction_id || `pred_${crypto.randomUUID()}`;
      const savedPrediction = await PredictionHistory.create({
        prediction_id: predictionId,
        risk_id: risk._id.toString(),
        organizationId: orgIdStr,
        projectId: projIdStr,
        current_score: risk.risk_score,
        current_severity: risk.severity,
        prediction_horizon_days: pyData.prediction_horizon_days || horizonDays,
        predicted_score: pyData.predicted_score,
        predicted_severity: pyData.predicted_severity,
        critical_probability: pyData.critical_probability,
        trend: pyData.trend,
        top_predictive_factors: pyData.top_predictive_factors || [],
        model_version: pyData.model_version || 'risk-predictor-v1',
        feature_version: pyData.feature_version || 'risk-features-v1',
        prediction_timestamp: pyData.prediction_timestamp || startTime,
        feedback: {
          evaluated_at: null,
          actual_score: null,
          actual_severity: null,
          prediction_correct: null
        }
      });

      // 7. Audit Logging: PREDICTION_CREATED
      await AuditLog.create({
        organizationId: orgIdStr,
        user: user.email || user.name || 'User',
        userId: user.userId || user._id?.toString() || '',
        action: 'PREDICTION_CREATED',
        riskId: risk._id.toString(),
        module: 'PredictiveIntelligence',
        recordId: savedPrediction.prediction_id,
        metadata: {
          prediction_id: savedPrediction.prediction_id,
          risk_id: risk._id.toString(),
          current_score: risk.risk_score,
          current_severity: risk.severity,
          predicted_score: pyData.predicted_score,
          predicted_severity: pyData.predicted_severity,
          critical_probability: pyData.critical_probability,
          trend: pyData.trend,
          horizon_days: horizonDays,
          model_version: pyData.model_version
        },
        timestamp: new Date().toISOString()
      });

      // 8. Proactive Monitoring & Alert Integration:
      // If critical probability is high (>= 0.70) or predicted CRITICAL, create proactive alert & event
      if (pyData.critical_probability >= 0.70 || (pyData.predicted_severity === 'CRITICAL' && risk.severity !== 'CRITICAL')) {
        try {
          const alertTitle = `Predictive Alert: High Probability of Critical Escalation (${risk.title})`;
          const alertDesc = `Forecast models predict ${risk.title} has ${Math.round(pyData.critical_probability * 100)}% probability of reaching ${pyData.predicted_severity} severity within ${horizonDays} days. Trajectory trend: ${pyData.trend}. Top drivers: ${(pyData.top_predictive_factors || []).slice(0, 2).join('; ')}.`;
          
          await Alert.create({
            alertId: `alt_pred_${crypto.randomUUID()}`,
            organizationId: orgIdStr,
            projectId: projIdStr,
            riskId: risk._id.toString(),
            type: 'PREDICTIVE_RISK',
            severity: pyData.predicted_severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
            title: alertTitle,
            description: alertDesc,
            status: 'NEW',
            metadata: {
              prediction_id: savedPrediction.prediction_id,
              critical_probability: pyData.critical_probability,
              predicted_score: pyData.predicted_score,
              predicted_severity: pyData.predicted_severity,
              trend: pyData.trend,
              horizon_days: horizonDays
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });

          await MonitoringEvent.create({
            event_id: `evt_pred_${crypto.randomUUID()}`,
            event_type: 'PREDICTIVE_RISK_DETECTED',
            organization_id: orgIdStr,
            project_id: projIdStr,
            resource_type: 'Risk',
            resource_id: risk._id.toString(),
            previous_value: risk.severity,
            current_value: `Predicted ${pyData.predicted_severity} (${Math.round(pyData.critical_probability * 100)}% probability)`,
            status: 'DETECTED',
            payload: {
              prediction_id: savedPrediction.prediction_id,
              risk_id: risk._id.toString(),
              title: risk.title,
              current_score: risk.risk_score,
              predicted_score: pyData.predicted_score,
              critical_probability: pyData.critical_probability,
              trend: pyData.trend,
              top_predictive_factors: pyData.top_predictive_factors
            },
            detected_at: new Date().toISOString()
          });
        } catch (alertErr) {
          console.warn('Could not auto-generate predictive alert/event:', alertErr.message);
        }
      }

      res.json({
        success: true,
        data: savedPrediction
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/risks/:id/predictions
   * Retrieve historical predictive risk trajectory runs for a specific risk.
   */
  async getRiskPredictions(req, res, next) {
    try {
      const user = req.user;
      const riskId = req.params.id;
      const risk = await Risk.findById(riskId);
      if (!risk) {
        return res.status(404).json({ success: false, message: 'Risk record not found.' });
      }

      // Multi-tenant check
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'PLATFORM_ADMIN') {
        if (risk.organizationId && risk.organizationId.toString() !== user.organizationId?.toString()) {
          return res.status(403).json({ success: false, message: 'Forbidden: You do not have access to this risk.' });
        }
      }

      const predictions = await PredictionHistory.find({ risk_id: risk._id.toString() })
        .sort({ prediction_timestamp: -1 });

      res.json({
        success: true,
        data: predictions
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/predictive/overview
   * Tenant-scoped predictive KPIs and distribution metrics.
   */
  async getOverview(req, res, next) {
    try {
      const user = req.user;
      const query = {};
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'PLATFORM_ADMIN') {
        query.organizationId = user.organizationId ? user.organizationId.toString() : '';
      }

      const allPredictions = await PredictionHistory.find(query).sort({ prediction_timestamp: -1 });
      const totalPredictions = allPredictions.length;

      // Deduplicate by risk_id to get the latest forecast per risk
      const latestByRisk = new Map();
      for (const p of allPredictions) {
        if (!latestByRisk.has(p.risk_id)) {
          latestByRisk.set(p.risk_id, p);
        }
      }

      const latestForecasts = Array.from(latestByRisk.values());
      const activeRisksForecasted = latestForecasts.length;

      let criticalCount = 0;
      let highCount = 0;
      let mediumCount = 0;
      let lowCount = 0;
      let emergingCount = 0;
      let totalProb = 0;

      const trendCounts = {
        INCREASING: 0,
        STABLE: 0,
        DECREASING: 0
      };

      for (const f of latestForecasts) {
        const sev = (f.predicted_severity || 'LOW').toUpperCase();
        if (sev === 'CRITICAL') criticalCount++;
        else if (sev === 'HIGH') highCount++;
        else if (sev === 'MEDIUM') mediumCount++;
        else lowCount++;

        const prob = Number(f.critical_probability) || 0;
        totalProb += prob;

        // Emerging risk: critical probability >= 0.60, or predicted HIGH/CRITICAL from lower current severity
        const currSev = (f.current_severity || 'LOW').toUpperCase();
        if (prob >= 0.60 || ((sev === 'HIGH' || sev === 'CRITICAL') && (currSev === 'LOW' || currSev === 'MEDIUM'))) {
          emergingCount++;
        }

        const t = (f.trend || 'STABLE').toUpperCase();
        if (trendCounts[t] !== undefined) {
          trendCounts[t]++;
        } else {
          trendCounts.STABLE++;
        }
      }

      const avgProbability = activeRisksForecasted > 0 
        ? Math.round((totalProb / activeRisksForecasted) * 1000) / 1000 
        : 0.0;

      res.json({
        success: true,
        data: {
          total_predictions: totalPredictions,
          active_risks_forecasted: activeRisksForecasted,
          emerging_risks_count: emergingCount,
          severity_distribution: {
            CRITICAL: criticalCount,
            HIGH: highCount,
            MEDIUM: mediumCount,
            LOW: lowCount
          },
          trend_distribution: trendCounts,
          average_critical_probability: avgProbability,
          active_model: 'risk-predictor-v1',
          feature_version: 'risk-features-v1'
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/predictive/emerging-risks
   * High-urgency emerging risks forecasted to escalate.
   */
  async getEmergingRisks(req, res, next) {
    try {
      const user = req.user;
      const query = {};
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'PLATFORM_ADMIN') {
        query.organizationId = user.organizationId ? user.organizationId.toString() : '';
      }

      const horizonFilter = req.query.horizon_days ? Number(req.query.horizon_days) : null;
      const threshold = req.query.threshold ? Number(req.query.threshold) : 0.50;
      const search = (req.query.search || '').toLowerCase();

      const allPredictions = await PredictionHistory.find(query).sort({ prediction_timestamp: -1 });

      // Pick latest prediction per risk
      const latestMap = new Map();
      for (const p of allPredictions) {
        if (!latestMap.has(p.risk_id)) {
          if (!horizonFilter || p.prediction_horizon_days === horizonFilter) {
            latestMap.set(p.risk_id, p);
          }
        }
      }

      const candidates = Array.from(latestMap.values());

      // Filter by threshold or high/critical forecast
      const emergingFiltered = candidates.filter(p => {
        const prob = Number(p.critical_probability) || 0;
        const sev = (p.predicted_severity || '').toUpperCase();
        const trend = (p.trend || '').toUpperCase();
        return prob >= threshold || sev === 'CRITICAL' || sev === 'HIGH' || trend === 'INCREASING';
      });

      // Populate risk metadata
      const populated = await Promise.all(emergingFiltered.map(async (pred) => {
        const r = await Risk.findById(pred.risk_id);
        if (!r) return null;

        // Search filter
        if (search && !r.title.toLowerCase().includes(search) && !r.category.toLowerCase().includes(search)) {
          return null;
        }

        const [owner, project] = await Promise.all([
          resolveUser(r.ownerId),
          resolveProject(r.projectId)
        ]);

        return {
          prediction_id: pred.prediction_id,
          risk_id: pred.risk_id,
          title: r.title,
          category: r.category,
          status: r.status,
          current_score: pred.current_score,
          current_severity: pred.current_severity,
          prediction_horizon_days: pred.prediction_horizon_days,
          predicted_score: pred.predicted_score,
          predicted_severity: pred.predicted_severity,
          critical_probability: pred.critical_probability,
          trend: pred.trend,
          top_predictive_factors: pred.top_predictive_factors,
          prediction_timestamp: pred.prediction_timestamp,
          ownerName: owner?.name || 'Unassigned',
          projectName: project?.name || 'General / Org Level'
        };
      }));

      const validList = populated.filter(Boolean);
      // Sort by critical_probability descending
      validList.sort((a, b) => b.critical_probability - a.critical_probability);

      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.max(1, parseInt(req.query.limit) || 20);
      const paginated = validList.slice((page - 1) * limit, page * limit);

      res.json({
        success: true,
        data: paginated,
        pagination: {
          total: validList.length,
          page,
          limit,
          totalPages: Math.ceil(validList.length / limit) || 1
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/predictive/trends
   * Probability histogram buckets, trend breakdowns, and distribution.
   */
  async getTrends(req, res, next) {
    try {
      const user = req.user;
      const query = {};
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'PLATFORM_ADMIN') {
        query.organizationId = user.organizationId ? user.organizationId.toString() : '';
      }

      const predictions = await PredictionHistory.find(query).sort({ prediction_timestamp: -1 });

      // Probability Distribution Buckets
      const buckets = {
        '0.0 - 0.2': 0,
        '0.2 - 0.4': 0,
        '0.4 - 0.6': 0,
        '0.6 - 0.8': 0,
        '0.8 - 1.0': 0
      };

      const trends = { INCREASING: 0, STABLE: 0, DECREASING: 0 };
      const severities = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };

      for (const p of predictions) {
        const prob = Math.min(1.0, Math.max(0.0, Number(p.critical_probability) || 0.0));
        if (prob < 0.2) buckets['0.0 - 0.2']++;
        else if (prob < 0.4) buckets['0.2 - 0.4']++;
        else if (prob < 0.6) buckets['0.4 - 0.6']++;
        else if (prob < 0.8) buckets['0.6 - 0.8']++;
        else buckets['0.8 - 1.0']++;

        const t = (p.trend || 'STABLE').toUpperCase();
        if (trends[t] !== undefined) trends[t]++;
        else trends.STABLE++;

        const s = (p.predicted_severity || 'LOW').toUpperCase();
        if (severities[s] !== undefined) severities[s]++;
        else severities.LOW++;
      }

      res.json({
        success: true,
        data: {
          probability_distribution: buckets,
          trend_distribution: trends,
          severity_distribution: severities,
          sample_size: predictions.length
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/predictive/batch
   * Run batch prediction across all active risks for the tenant organization.
   */
  async batchPredict(req, res, next) {
    try {
      const user = req.user;
      if (user.role === 'VIEWER') {
        return res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges.' });
      }

      const orgId = user.organizationId ? user.organizationId.toString() : '';
      const query = { status: { $ne: 'CLOSED' } };
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'PLATFORM_ADMIN') {
        query.organizationId = orgId;
      }

      const horizonDays = [7, 30, 90].includes(Number(req.body.horizon_days)) ? Number(req.body.horizon_days) : 30;
      const risks = await Risk.find(query).limit(50);

      const results = [];
      for (const r of risks) {
        try {
          const payload = {
            risk_id: r._id.toString(),
            prediction_horizon_days: horizonDays,
            organization_id: r.organizationId ? r.organizationId.toString() : orgId,
            project_id: r.projectId ? r.projectId.toString() : null,
            include_explainability: true,
            risk_snapshot: {
              risk_id: r._id.toString(),
              title: r.title,
              category: r.category,
              status: r.status,
              risk_score: r.risk_score,
              severity: r.severity,
              probability: r.probability,
              impact: r.impact,
              exposure: r.exposure,
              urgency: r.urgency
            }
          };

          const pyRes = await fetch(`${PYTHON_SERVICE_URL}/internal/predictive/predict`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-Service-Key': INTERNAL_SERVICE_KEY
            },
            body: JSON.stringify(payload)
          });

          if (pyRes.ok) {
            const pyData = await pyRes.json();
            const saved = await PredictionHistory.create({
              prediction_id: pyData.prediction_id || `pred_${crypto.randomUUID()}`,
              risk_id: r._id.toString(),
              organizationId: r.organizationId ? r.organizationId.toString() : orgId,
              projectId: r.projectId ? r.projectId.toString() : null,
              current_score: r.risk_score,
              current_severity: r.severity,
              prediction_horizon_days: pyData.prediction_horizon_days || horizonDays,
              predicted_score: pyData.predicted_score,
              predicted_severity: pyData.predicted_severity,
              critical_probability: pyData.critical_probability,
              trend: pyData.trend,
              top_predictive_factors: pyData.top_predictive_factors || [],
              model_version: pyData.model_version || 'risk-predictor-v1',
              feature_version: pyData.feature_version || 'risk-features-v1',
              prediction_timestamp: pyData.prediction_timestamp || new Date().toISOString()
            });
            results.push(saved);
          }
        } catch (itemErr) {
          console.warn(`Batch prediction item error on risk ${r._id}:`, itemErr.message);
        }
      }

      await AuditLog.create({
        organizationId: orgId,
        user: user.email || user.name || 'User',
        userId: user.userId || user._id?.toString() || '',
        action: 'PREDICTION_BATCH_PROCESSED',
        module: 'PredictiveIntelligence',
        metadata: {
          risks_targeted: risks.length,
          predictions_created: results.length,
          horizon_days: horizonDays
        },
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        count: results.length,
        data: results
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/predictive/feedback/:predictionId
   * Record actual outcome feedback to evaluate predictive model calibration.
   */
  async submitFeedback(req, res, next) {
    try {
      const user = req.user;
      if (user.role === 'VIEWER') {
        return res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges.' });
      }

      const { predictionId } = req.params;
      const { actual_score, actual_severity, actual_critical_event } = req.body;

      const isObjectId = /^[0-9a-fA-F]{24}$/.test(predictionId);
      const query = isObjectId
        ? { $or: [{ prediction_id: predictionId }, { _id: predictionId }] }
        : { prediction_id: predictionId };

      const prediction = await PredictionHistory.findOne(query);

      if (!prediction) {
        return res.status(404).json({ success: false, message: 'Prediction record not found.' });
      }

      // Multi-tenant check
      if (user.role !== 'SUPER_ADMIN' && user.role !== 'PLATFORM_ADMIN') {
        if (prediction.organizationId && prediction.organizationId.toString() !== user.organizationId?.toString()) {
          return res.status(403).json({ success: false, message: 'Forbidden: Unauthorized cross-tenant access.' });
        }
      }

      const evaluatedAt = new Date().toISOString();
      const actualSev = (actual_severity || '').toUpperCase();
      const predSev = (prediction.predicted_severity || '').toUpperCase();
      const isCorrect = actualSev ? (actualSev === predSev) : null;

      prediction.feedback = {
        evaluated_at: evaluatedAt,
        actual_score: actual_score !== undefined ? Number(actual_score) : null,
        actual_severity: actualSev || null,
        prediction_correct: isCorrect
      };

      await prediction.save();

      // Forward feedback to Python service
      try {
        await fetch(`${PYTHON_SERVICE_URL}/internal/predictive/feedback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Service-Key': INTERNAL_SERVICE_KEY
          },
          body: JSON.stringify({
            prediction_id: prediction.prediction_id,
            actual_score: prediction.feedback.actual_score,
            actual_severity: prediction.feedback.actual_severity,
            actual_critical_event: actual_critical_event || (actualSev === 'HIGH' || actualSev === 'CRITICAL'),
            evaluation_timestamp: evaluatedAt
          })
        });
      } catch (fErr) {
        console.warn('Could not forward feedback to Python evaluator:', fErr.message);
      }

      await AuditLog.create({
        organizationId: prediction.organizationId,
        user: user.email || user.name || 'User',
        userId: user.userId || user._id?.toString() || '',
        action: 'PREDICTION_FEEDBACK_RECORDED',
        riskId: prediction.risk_id,
        module: 'PredictiveIntelligence',
        recordId: prediction.prediction_id,
        metadata: {
          prediction_id: prediction.prediction_id,
          actual_score,
          actual_severity: actualSev,
          prediction_correct: isCorrect
        },
        timestamp: evaluatedAt
      });

      res.json({
        success: true,
        data: prediction
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/predictive/models
   * Inspect registered predictive models and metadata.
   */
  async getModelInfo(req, res, next) {
    try {
      const pyRes = await fetch(`${PYTHON_SERVICE_URL}/internal/predictive/models`, {
        headers: { 'X-Internal-Service-Key': INTERNAL_SERVICE_KEY }
      });
      if (pyRes.ok) {
        const data = await pyRes.json();
        return res.json({ success: true, data });
      }
      res.json({
        success: true,
        data: {
          active_model: 'risk-predictor-v1',
          feature_version: 'risk-features-v1',
          status: 'HEALTHY'
        }
      });
    } catch (err) {
      res.json({
        success: true,
        data: {
          active_model: 'risk-predictor-v1',
          feature_version: 'risk-features-v1',
          status: 'STANDALONE'
        }
      });
    }
  }
}

module.exports = new PredictiveController();
