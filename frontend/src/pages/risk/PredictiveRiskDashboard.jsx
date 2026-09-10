import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp, TrendingDown, Minus, ShieldAlert, AlertTriangle,
  Sparkles, RefreshCw, Layers, ArrowRight, Bot, Bell,
  CheckCircle2, AlertCircle, BarChart3, Filter, Search, Calendar, Check, ExternalLink
} from 'lucide-react';

export default function PredictiveRiskDashboard() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [emergingRisks, setEmergingRisks] = useState([]);
  const [trends, setTrends] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [batching, setBatching] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [error, setError] = useState(null);

  // Filters
  const [horizonFilter, setHorizonFilter] = useState('ALL');
  const [thresholdFilter, setThresholdFilter] = useState(0.40);
  const [searchQuery, setSearchQuery] = useState('');

  // Feedback modal
  const [feedbackModal, setFeedbackModal] = useState({
    isOpen: false,
    prediction: null,
    actualScore: '',
    actualSeverity: 'MEDIUM',
    submitting: false
  });

  const token = localStorage.getItem('token') || '';

  const showToast = (msg, isError = false) => {
    setToastMsg({ text: msg, isError });
    setTimeout(() => setToastMsg(null), 4500);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [ovRes, emRes, trRes, mdRes] = await Promise.all([
        fetch('/api/predictive/overview', { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/predictive/emerging-risks?threshold=${thresholdFilter}&search=${encodeURIComponent(searchQuery)}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/predictive/trends', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/predictive/models', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (ovRes.ok) {
        const ovJson = await ovRes.json();
        setOverview(ovJson.data);
      }
      if (emRes.ok) {
        const emJson = await emRes.json();
        setEmergingRisks(emJson.data || []);
      }
      if (trRes.ok) {
        const trJson = await trRes.json();
        setTrends(trJson.data);
      }
      if (mdRes.ok) {
        const mdJson = await mdRes.json();
        setModelInfo(mdJson.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load predictive risk intelligence.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [thresholdFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleRunBatch = async () => {
    try {
      setBatching(true);
      const res = await fetch('/api/predictive/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ horizon_days: 30 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Batch prediction failed');

      showToast(`Batch forecast completed: ${data.count || 0} risk trajectories evaluated.`);
      fetchData();
    } catch (err) {
      showToast(err.message || 'Batch forecast failed', true);
    } finally {
      setBatching(false);
    }
  };

  const handleOpenFeedback = (pred) => {
    setFeedbackModal({
      isOpen: true,
      prediction: pred,
      actualScore: pred.current_score || '',
      actualSeverity: pred.predicted_severity || 'MEDIUM',
      submitting: false
    });
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackModal.prediction) return;
    try {
      setFeedbackModal(prev => ({ ...prev, submitting: true }));
      const res = await fetch(`/api/predictive/feedback/${feedbackModal.prediction.prediction_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          actual_score: Number(feedbackModal.actualScore),
          actual_severity: feedbackModal.actualSeverity
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit feedback');

      showToast('Actual outcome recorded! Evaluation metrics updated.');
      setFeedbackModal({ isOpen: false, prediction: null, actualScore: '', actualSeverity: 'MEDIUM', submitting: false });
      fetchData();
    } catch (err) {
      showToast(err.message || 'Error submitting feedback', true);
      setFeedbackModal(prev => ({ ...prev, submitting: false }));
    }
  };

  // Filter emerging risks by selected horizon tab
  const displayedRisks = emergingRisks.filter(r => {
    if (horizonFilter === 'ALL') return true;
    return r.prediction_horizon_days === Number(horizonFilter);
  });

  const getSeverityBadge = (severity) => {
    const s = (severity || 'LOW').toUpperCase();
    switch (s) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  const getTrendBadge = (trend) => {
    const t = (trend || 'STABLE').toUpperCase();
    if (t === 'INCREASING') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-700 border border-red-200">
          <TrendingUp className="h-3.5 w-3.5" /> Escalating
        </span>
      );
    }
    if (t === 'DECREASING') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <TrendingDown className="h-3.5 w-3.5" /> Improving
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
        <Minus className="h-3.5 w-3.5" /> Stable
      </span>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Toast Notification */}
      {toastMsg && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2 ${
          toastMsg.isError ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {toastMsg.isError ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Authoritative Score Protection Banner */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3.5">
        <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="text-xs text-amber-900 space-y-1">
          <div className="font-bold text-amber-950 flex items-center gap-2">
            <span>Authoritative Deterministic Risk Scoring Protection</span>
            <span className="px-2 py-0.5 text-[10px] bg-amber-200 text-amber-900 rounded-full font-mono font-bold">
              Phase 2 Active
            </span>
          </div>
          <p>
            The Phase 2 deterministic risk score (Probability × 0.35 + Impact × 0.35 + Exposure × 0.20 + Urgency × 0.10)
            remains the strictly authoritative current-state risk metric. Phase 9 Machine Learning forecasts provide
            forward-looking early warning trajectories over 7, 30, and 90-day horizons without modifying the authoritative score.
          </p>
        </div>
      </div>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-forest-700 text-xs font-bold uppercase tracking-wider mb-1">
            <TrendingUp className="h-4 w-4" />
            <span>Phase 9: Predictive Intelligence</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Predictive Risk Intelligence</h1>
          <p className="text-sm text-slate-500 mt-1">
            Machine Learning risk trajectory forecasting, escalation probability modeling, and calibrated explainability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleRunBatch}
            disabled={batching}
            className="px-4 py-2 rounded-xl bg-forest-700 hover:bg-forest-800 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <Sparkles className={`h-3.5 w-3.5 ${batching ? 'animate-spin' : ''}`} />
            <span>{batching ? 'Forecasting Active Risks...' : 'Run Batch Forecast'}</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Forecasts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Forecasts Run</span>
            <Layers className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {overview?.total_predictions ?? (loading ? '...' : 0)}
          </div>
          <div className="text-[11px] text-slate-500">
            {overview?.active_risks_forecasted ?? 0} active risks monitored
          </div>
        </div>

        {/* Emerging Risks */}
        <div className="bg-white p-5 rounded-2xl border border-red-100 shadow-xs space-y-2 bg-gradient-to-br from-white to-red-50/20">
          <div className="flex items-center justify-between text-red-600 text-xs font-bold uppercase tracking-wider">
            <span>Emerging Risks</span>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
          <div className="text-2xl font-black text-red-700">
            {overview?.emerging_risks_count ?? (loading ? '...' : 0)}
          </div>
          <div className="text-[11px] text-red-600/80 font-medium">
            High probability of critical escalation
          </div>
        </div>

        {/* Escalating Trajectory */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Escalating Trend</span>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600">
            {overview?.trend_distribution?.INCREASING ?? 0}
          </div>
          <div className="text-[11px] text-slate-500">
            {overview?.trend_distribution?.STABLE ?? 0} Stable • {overview?.trend_distribution?.DECREASING ?? 0} Improving
          </div>
        </div>

        {/* Avg Critical Probability */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Avg Critical Prob</span>
            <BarChart3 className="h-4 w-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-700">
            {overview?.average_critical_probability !== undefined
              ? `${Math.round(overview.average_critical_probability * 100)}%`
              : '0%'}
          </div>
          <div className="text-[11px] text-slate-500">
            Probability of reaching Critical tier
          </div>
        </div>

        {/* Model Info */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
            <span>Active Model</span>
            <Bot className="h-4 w-4 text-forest-600" />
          </div>
          <div className="text-sm font-bold text-slate-900 font-mono truncate">
            {overview?.active_model || 'risk-predictor-v1'}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-bold">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Features: {overview?.feature_version || 'risk-features-v1'}</span>
          </div>
        </div>
      </div>

      {/* Distribution & Trajectory Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Critical Probability Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
            <span>Critical Probability Distribution</span>
            <span className="text-[10px] text-slate-400 font-normal">N = {trends?.sample_size || 0}</span>
          </h3>
          <div className="space-y-2.5">
            {trends?.probability_distribution && Object.entries(trends.probability_distribution).map(([range, count]) => {
              const total = trends.sample_size || 1;
              const pct = Math.round((count / total) * 100);
              const isHigh = range === '0.6 - 0.8' || range === '0.8 - 1.0';
              return (
                <div key={range} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-mono text-slate-600">{range}</span>
                    <span className="font-bold text-slate-800">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isHigh ? 'bg-red-500' : range === '0.4 - 0.6' ? 'bg-amber-400' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Severity Forecast Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Predicted Severity Distribution
          </h3>
          <div className="grid grid-cols-2 gap-3 pt-2">
            {[
              { label: 'CRITICAL', color: 'text-red-700 bg-red-50 border-red-200', count: overview?.severity_distribution?.CRITICAL || 0 },
              { label: 'HIGH', color: 'text-amber-700 bg-amber-50 border-amber-200', count: overview?.severity_distribution?.HIGH || 0 },
              { label: 'MEDIUM', color: 'text-blue-700 bg-blue-50 border-blue-200', count: overview?.severity_distribution?.MEDIUM || 0 },
              { label: 'LOW', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', count: overview?.severity_distribution?.LOW || 0 }
            ].map(item => (
              <div key={item.label} className={`p-4 rounded-xl border ${item.color} flex flex-col justify-between`}>
                <span className="text-[10px] font-black uppercase tracking-wider">{item.label}</span>
                <span className="text-2xl font-black mt-1">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trajectory Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Risk Trajectory Breakdown
          </h3>
          <div className="space-y-3 pt-2">
            <div className="p-3 rounded-xl bg-red-50/60 border border-red-200/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-red-100 text-red-700">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-red-900">Escalating Trajectory</div>
                  <div className="text-[10px] text-red-700">Risks projected to increase severity</div>
                </div>
              </div>
              <span className="text-base font-black text-red-900">
                {overview?.trend_distribution?.INCREASING || 0}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-slate-200 text-slate-700">
                  <Minus className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Stable Trajectory</div>
                  <div className="text-[10px] text-slate-600">Scores within normal historical variance</div>
                </div>
              </div>
              <span className="text-base font-black text-slate-900">
                {overview?.trend_distribution?.STABLE || 0}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <TrendingDown className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-900">Improving Trajectory</div>
                  <div className="text-[10px] text-emerald-700">Mitigation actions reducing risk score</div>
                </div>
              </div>
              <span className="text-base font-black text-emerald-900">
                {overview?.trend_distribution?.DECREASING || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Emerging Risks & Trajectories Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4">
        {/* Table Toolbar */}
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <span>Emerging Risks & Trajectory Early-Warning</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Risks flagged by ML forecasting models with high escalation probabilities or rapid adverse momentum.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Horizon Filter Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
              {['ALL', '7', '30', '90'].map(h => (
                <button
                  key={h}
                  onClick={() => setHorizonFilter(h)}
                  className={`px-3 py-1 rounded-lg transition ${
                    horizonFilter === h ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {h === 'ALL' ? 'All Horizons' : `${h}d Horizon`}
                </button>
              ))}
            </div>

            {/* Threshold Selector */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <span>Prob &ge;</span>
              <select
                value={thresholdFilter}
                onChange={(e) => setThresholdFilter(Number(e.target.value))}
                className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value={0.10}>10%</option>
                <option value={0.30}>30%</option>
                <option value={0.40}>40%</option>
                <option value={0.50}>50%</option>
                <option value={0.70}>70%</option>
              </select>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="px-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search risk title or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-forest-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition"
          >
            Filter
          </button>
        </form>

        {/* Table Content */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Loading predictive trajectories...</span>
          </div>
        ) : displayedRisks.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
            <div className="text-sm font-bold text-slate-800">No Critical Emerging Risks Detected</div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              All forecasted risks currently remain within acceptable probability bounds for the selected threshold ({Math.round(thresholdFilter * 100)}%).
            </p>
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-6">Risk & Category</th>
                    <th className="py-3 px-4">Current (Phase 2)</th>
                    <th className="py-3 px-4">Forecast Score</th>
                    <th className="py-3 px-4">Critical Probability</th>
                    <th className="py-3 px-4">Trajectory</th>
                    <th className="py-3 px-4">Top Predictive Driver</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedRisks.map((pred) => {
                    const probPct = Math.round((pred.critical_probability || 0) * 100);
                    const isProbHigh = probPct >= 60;
                    const isProbMed = probPct >= 35 && probPct < 60;

                    return (
                      <tr key={pred.prediction_id} className="hover:bg-slate-50/60 transition group">
                        {/* Risk Title & Category */}
                        <td className="py-4 px-6">
                          <Link
                            to={`/risk-manager/risks/${pred.risk_id}`}
                            className="font-bold text-slate-900 hover:text-forest-700 transition flex items-center gap-1.5"
                          >
                            <span>{pred.title}</span>
                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition" />
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                              {pred.category}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {pred.projectName}
                            </span>
                          </div>
                        </td>

                        {/* Authoritative Current Score */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {pred.current_score}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadge(pred.current_severity)}`}>
                              {pred.current_severity}
                            </span>
                          </div>
                        </td>

                        {/* Forecast Horizon & Score */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {pred.predicted_score}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getSeverityBadge(pred.predicted_severity)}`}>
                              {pred.predicted_severity}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              ({pred.prediction_horizon_days}d)
                            </span>
                          </div>
                        </td>

                        {/* Critical Probability */}
                        <td className="py-4 px-4">
                          <div className="space-y-1 max-w-[120px]">
                            <div className="flex justify-between text-xs font-bold">
                              <span className={isProbHigh ? 'text-red-700' : isProbMed ? 'text-amber-700' : 'text-emerald-700'}>
                                {probPct}%
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal">critical</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isProbHigh ? 'bg-red-500' : isProbMed ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${probPct}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Trajectory */}
                        <td className="py-4 px-4">
                          {getTrendBadge(pred.trend)}
                        </td>

                        {/* Top Factors */}
                        <td className="py-4 px-4 max-w-xs truncate text-[11px] text-slate-600">
                          {pred.top_predictive_factors?.[0] || 'Standard variance baseline'}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenFeedback(pred)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-[11px] font-bold transition"
                              title="Record actual outcome for model calibration"
                            >
                              Feedback
                            </button>
                            <Link
                              to={`/risk-manager/agent?goal=${encodeURIComponent(`Analyze predictive escalation for risk: ${pred.title}. Investigate top drivers and suggest proactive mitigations.`)}`}
                              className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-[11px] font-bold transition flex items-center gap-1"
                            >
                              <Bot className="h-3 w-3" />
                              <span>AI Agent</span>
                            </Link>
                            <Link
                              to={`/risk-manager/risks/${pred.risk_id}`}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 text-white hover:bg-slate-900 text-[11px] font-bold transition"
                            >
                              View
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View (<768px) */}
            <div className="md:hidden divide-y divide-slate-100">
              {displayedRisks.map((pred) => {
                const probPct = Math.round((pred.critical_probability || 0) * 100);
                const isProbHigh = probPct >= 60;
                const isProbMed = probPct >= 35 && probPct < 60;

                return (
                  <div key={pred.prediction_id} className="p-4 space-y-3 bg-white hover:bg-slate-50 transition">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to={`/risk-manager/risks/${pred.risk_id}`}
                        className="font-bold text-sm text-slate-900 hover:text-forest-700 transition flex-1 leading-snug"
                      >
                        {pred.title}
                      </Link>
                      <div className="flex-shrink-0">
                        {getTrendBadge(pred.trend)}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {pred.category}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {pred.projectName}
                      </span>
                    </div>

                    {/* Current vs Predicted Grid */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Current</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono font-bold text-slate-900 text-sm">{pred.current_score}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getSeverityBadge(pred.current_severity)}`}>
                            {pred.current_severity}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Forecast ({pred.prediction_horizon_days}d)</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono font-bold text-slate-900 text-sm">{pred.predicted_score}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${getSeverityBadge(pred.predicted_severity)}`}>
                            {pred.predicted_severity}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Critical Probability Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-600">Critical Probability:</span>
                        <span className={isProbHigh ? 'text-red-700' : isProbMed ? 'text-amber-700' : 'text-emerald-700'}>
                          {probPct}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isProbHigh ? 'bg-red-500' : isProbMed ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${probPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Top Factor */}
                    {pred.top_predictive_factors?.[0] && (
                      <div className="text-[11px] text-slate-500 bg-slate-50/70 px-2.5 py-1.5 rounded-lg border border-slate-100">
                        <span className="font-semibold text-slate-700">Driver: </span>
                        {pred.top_predictive_factors[0]}
                      </div>
                    )}

                    {/* Mobile Touch Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleOpenFeedback(pred)}
                        className="flex-1 py-2 px-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition min-h-[40px] flex items-center justify-center text-center"
                      >
                        Feedback
                      </button>
                      <Link
                        to={`/risk-manager/agent?goal=${encodeURIComponent(`Analyze predictive escalation for risk: ${pred.title}. Investigate top drivers and suggest proactive mitigations.`)}`}
                        className="flex-1 py-2 px-3 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 text-xs font-bold transition min-h-[40px] flex items-center justify-center gap-1 text-center"
                      >
                        <Bot className="h-3.5 w-3.5" />
                        <span>AI Agent</span>
                      </Link>
                      <Link
                        to={`/risk-manager/risks/${pred.risk_id}`}
                        className="py-2 px-4 rounded-xl bg-slate-800 text-white hover:bg-slate-900 text-xs font-bold transition min-h-[40px] flex items-center justify-center text-center"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Model Feedback Modal */}
      {feedbackModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Record Actual Risk Outcome
            </h3>
            <p className="text-xs text-slate-500">
              Record the observed score and severity after the forecast horizon ({feedbackModal.prediction?.prediction_horizon_days} days) to evaluate model calibration.
            </p>

            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observed Risk Score (0 - 100)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  required
                  value={feedbackModal.actualScore}
                  onChange={(e) => setFeedbackModal(prev => ({ ...prev, actualScore: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-forest-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observed Severity Tier
                </label>
                <select
                  value={feedbackModal.actualSeverity}
                  onChange={(e) => setFeedbackModal(prev => ({ ...prev, actualSeverity: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-forest-500 focus:outline-none"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFeedbackModal({ isOpen: false, prediction: null, actualScore: '', actualSeverity: 'MEDIUM', submitting: false })}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={feedbackModal.submitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-forest-700 hover:bg-forest-800 rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  {feedbackModal.submitting ? 'Recording...' : 'Submit Feedback'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
