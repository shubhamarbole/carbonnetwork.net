const { Risk, RiskHistory } = require('../../../models/models');

const VALID_CATEGORIES = [
  'Financial', 'Operational', 'Environmental', 'ESG', 'Compliance',
  'Regulatory', 'Supplier', 'Project', 'Cybersecurity', 'Data',
  'Reputational', 'Fraud', 'Carbon', 'Documentation'
];

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const HEATMAP_BUCKETS = [
  { key: '0-24', min: 0, max: 24.99 },
  { key: '25-49', min: 25, max: 49.99 },
  { key: '50-74', min: 50, max: 74.99 },
  { key: '75-100', min: 75, max: 100.0 }
];

function getBucketKey(val) {
  const num = Number(val) || 0;
  for (const b of HEATMAP_BUCKETS) {
    if (num >= b.min && num <= b.max) return b.key;
  }
  return num >= 100 ? '75-100' : '0-24';
}

class RiskAnalyticsController {
  // GET /api/risk-analytics/overview
  async overview(req, res, next) {
    try {
      const query = { ...req.riskQuery };
      let risks = await Risk.find(query);
      if (!Array.isArray(risks)) risks = risks?.data || [];

      const total_risks = risks.length;
      if (total_risks === 0) {
        return res.json({
          success: true,
          data: {
            total_risks: 0,
            critical_risks: 0,
            high_risks: 0,
            medium_risks: 0,
            low_risks: 0,
            open_risks: 0,
            under_review_risks: 0,
            mitigated_risks: 0,
            closed_risks: 0,
            average_score: 0.0,
            highest_risk_score: 0.0,
            increasing_risks: 0,
            decreasing_risks: 0,
            risks_with_recent_changes: 0
          }
        });
      }

      const critical_risks = risks.filter(r => r.severity === 'CRITICAL').length;
      const high_risks = risks.filter(r => r.severity === 'HIGH').length;
      const medium_risks = risks.filter(r => r.severity === 'MEDIUM').length;
      const low_risks = risks.filter(r => r.severity === 'LOW').length;

      const open_risks = risks.filter(r => r.status === 'OPEN').length;
      const under_review_risks = risks.filter(r => r.status === 'UNDER_REVIEW').length;
      const mitigated_risks = risks.filter(r => r.status === 'MITIGATED').length;
      const closed_risks = risks.filter(r => r.status === 'CLOSED').length;

      const scores = risks.map(r => Number(r.risk_score || 0));
      const average_score = Math.round((scores.reduce((a, b) => a + b, 0) / total_risks) * 100) / 100;
      const highest_risk_score = Math.max(...scores, 0);

      // Score trends by inspecting latest RiskHistory records
      const riskIds = risks.map(r => r._id.toString());
      let increasing_risks = 0;
      let decreasing_risks = 0;

      for (const rid of riskIds) {
        let histories = await RiskHistory.find({ risk_id: rid }).sort({ timestamp: -1 }).limit(2);
        if (histories && histories.length > 0) {
          const latest = histories[0];
          if (latest.old_score !== null && latest.old_score !== undefined && latest.new_score !== null && latest.new_score !== undefined) {
            if (Number(latest.new_score) > Number(latest.old_score)) {
              increasing_risks++;
            } else if (Number(latest.new_score) < Number(latest.old_score)) {
              decreasing_risks++;
            }
          }
        }
      }

      res.json({
        success: true,
        data: {
          total_risks,
          critical_risks,
          high_risks,
          medium_risks,
          low_risks,
          open_risks,
          under_review_risks,
          mitigated_risks,
          closed_risks,
          average_score,
          highest_risk_score,
          increasing_risks,
          decreasing_risks,
          risks_with_recent_changes: increasing_risks + decreasing_risks
        }
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/risk-analytics/severity
  async severity(req, res, next) {
    try {
      const query = { ...req.riskQuery };
      let risks = await Risk.find(query);
      if (!Array.isArray(risks)) risks = risks?.data || [];
      const total = risks.length;

      const counts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
      risks.forEach(r => {
        const s = r.severity || 'LOW';
        if (counts[s] !== undefined) counts[s]++;
        else counts['LOW']++;
      });

      const data = SEVERITIES.map(s => {
        const cnt = counts[s];
        const pct = total > 0 ? Math.round((cnt / total) * 10000) / 100 : 0.0;
        return { severity: s, count: cnt, percentage: pct };
      });

      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/risk-analytics/categories
  async categories(req, res, next) {
    try {
      const query = { ...req.riskQuery };
      let risks = await Risk.find(query);
      if (!Array.isArray(risks)) risks = risks?.data || [];
      const total = risks.length;

      const counts = {};
      VALID_CATEGORIES.forEach(c => { counts[c] = 0; });

      risks.forEach(r => {
        if (counts[r.category] !== undefined) counts[r.category]++;
      });

      const data = VALID_CATEGORIES.map(c => {
        const cnt = counts[c];
        const pct = total > 0 ? Math.round((cnt / total) * 10000) / 100 : 0.0;
        return { category: c, count: cnt, percentage: pct };
      });

      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/risk-analytics/trends
  async trends(req, res, next) {
    try {
      const { dateFrom, dateTo } = req.query;
      const query = { ...req.riskQuery };
      let risks = await Risk.find(query);
      if (!Array.isArray(risks)) risks = risks?.data || [];

      const dateGroups = {};

      risks.forEach(r => {
        const ts = r.createdAt || r.updatedAt || new Date().toISOString();
        const dStr = String(ts).slice(0, 10); // YYYY-MM-DD

        if (dateFrom && dStr < dateFrom) return;
        if (dateTo && dStr > dateTo) return;

        if (!dateGroups[dStr]) dateGroups[dStr] = [];
        dateGroups[dStr].push(r);
      });

      const sortedDates = Object.keys(dateGroups).sort();
      const timeline = sortedDates.map(d => {
        const items = dateGroups[d];
        const scores = items.map(item => Number(item.risk_score || 0));
        const avg = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : 0.0;
        const crit = items.filter(item => item.severity === 'CRITICAL').length;
        const high = items.filter(item => item.severity === 'HIGH').length;
        return {
          date: d,
          count: items.length,
          average_score: avg,
          critical_count: crit,
          high_count: high
        };
      });

      res.json({ success: true, data: timeline });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/risk-analytics/heatmap
  async heatmap(req, res, next) {
    try {
      const query = { ...req.riskQuery };
      let risks = await Risk.find(query);
      if (!Array.isArray(risks)) risks = risks?.data || [];
      const total_risks = risks.length;

      // 4x4 matrix
      const grid = {};
      HEATMAP_BUCKETS.forEach(pb => {
        HEATMAP_BUCKETS.forEach(ib => {
          grid[`${pb.key}_${ib.key}`] = {
            probability_bucket: pb.key,
            impact_bucket: ib.key,
            count: 0,
            percentage: 0.0,
            risk_titles: []
          };
        });
      });

      risks.forEach(r => {
        const pKey = getBucketKey(r.probability);
        const iKey = getBucketKey(r.impact);
        const cell = grid[`${pKey}_${iKey}`];
        if (cell) {
          cell.count++;
          if (cell.risk_titles.length < 5 && r.title) {
            cell.risk_titles.push(r.title);
          }
        }
      });

      const cells = [];
      HEATMAP_BUCKETS.forEach(pb => {
        HEATMAP_BUCKETS.forEach(ib => {
          const cell = grid[`${pb.key}_${ib.key}`];
          cell.percentage = total_risks > 0 ? Math.round((cell.count / total_risks) * 10000) / 100 : 0.0;
          cells.push(cell);
        });
      });

      res.json({
        success: true,
        data: {
          total_risks,
          probability_buckets: HEATMAP_BUCKETS.map(b => b.key),
          impact_buckets: HEATMAP_BUCKETS.map(b => b.key),
          cells
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RiskAnalyticsController();
