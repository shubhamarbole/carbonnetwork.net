import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Bell,
  ClipboardList,
  FileText,
  Download,
  RefreshCw,
  ExternalLink,
  ArrowRight,
  Shield,
  Radio,
  Target,
  Scale,
  Layers,
  BarChart2,
  Zap,
  Globe,
  Info
} from 'lucide-react';

export default function ExecutiveRiskDashboard() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [topRisks, setTopRisks] = useState([]);
  const [emergingRisks, setEmergingRisks] = useState([]);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);

  const fetchExecutiveData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [overviewRes, topRisksRes, emergingRisksRes] = await Promise.all([
        fetch('/api/executive-risk/overview', { headers }),
        fetch('/api/executive-risk/top-risks?limit=6', { headers }),
        fetch('/api/executive-risk/emerging-risks?limit=6', { headers })
      ]);

      if (!overviewRes.ok) throw new Error('Failed to load executive overview.');
      const overviewData = await overviewRes.json();
      const topRisksData = topRisksRes.ok ? await topRisksRes.json() : { data: [] };
      const emergingData = emergingRisksRes.ok ? await emergingRisksRes.json() : { data: [] };

      setOverview(overviewData.data);
      setTopRisks(topRisksData.data || []);
      setEmergingRisks(emergingData.data || []);
    } catch (err) {
      setError(err.message || 'Error communicating with executive intelligence service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExecutiveData();
  }, []);

  const handleExport = async (format = 'json') => {
    setExporting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/executive-risk/export?format=${format}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Export failed');

      if (format === 'csv') {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `executive_risk_report_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `executive_risk_report_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      alert(`Export error: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const getSeverityBadge = (severity) => {
    const s = String(severity || '').toUpperCase();
    switch (s) {
      case 'CRITICAL':
        return <span className="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded-full text-xs font-semibold">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-xs font-semibold">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2.5 py-1 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-full text-xs font-semibold">MEDIUM</span>;
      case 'LOW':
      default:
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full text-xs font-semibold">LOW</span>;
    }
  };

  const getTrendIcon = (trend) => {
    const t = String(trend || '').toUpperCase();
    if (t === 'INCREASING') {
      return <div className="flex items-center text-rose-600 font-semibold"><TrendingUp className="w-4 h-4 mr-1" /> Increasing Trajectory</div>;
    } else if (t === 'DECREASING') {
      return <div className="flex items-center text-emerald-600 font-semibold"><TrendingDown className="w-4 h-4 mr-1" /> Decreasing Trajectory</div>;
    }
    return <div className="flex items-center text-slate-600 font-semibold"><Minus className="w-4 h-4 mr-1" /> Stable</div>;
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-slate-600 font-medium">Aggregating Executive Risk Intelligence across 10 phases...</p>
        </div>
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
          <div className="flex items-center space-x-3 mb-2">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
            <h2 className="text-lg font-bold">Executive Intelligence Offline</h2>
          </div>
          <p className="text-sm mb-4">{error || 'Unable to retrieve consolidated executive metrics.'}</p>
          <button 
            onClick={fetchExecutiveData}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { executiveRiskIndex, kpiSummary, domainExposures, decisionCenter } = overview;

  return (
    <div className="p-6 lg:p-8 space-y-8 bg-slate-50 min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 text-white rounded-lg shadow-sm">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Executive Risk Intelligence Center</h1>
              <p className="text-sm text-slate-500">Consolidated portfolio oversight, deterministic index tracking & AI-assisted decision synthesis</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => fetchExecutiveData()}
            className="px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 flex items-center transition-colors shadow-sm"
            title="Refresh Real-Time Metrics"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
          </button>

          <div className="relative inline-block text-left">
            <button
              onClick={() => handleExport('csv')}
              disabled={exporting}
              className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 flex items-center transition-colors shadow-sm disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-1.5 text-slate-500" /> Export CSV
            </button>
          </div>

          <Link
            to="/executive-risk/decisions"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium flex items-center transition-colors shadow-sm"
          >
            <ClipboardList className="w-4 h-4 mr-1.5" /> Decision Center ({decisionCenter?.totalDecisions || 0})
          </Link>

          <Link
            to="/executive-risk/briefings"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center transition-colors shadow-sm"
          >
            <FileText className="w-4 h-4 mr-1.5" /> Executive Briefings
          </Link>
        </div>
      </div>

      {/* 1. Executive Risk Index Hero Card */}
      <div className="bg-white rounded-2xl p-6 lg:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
          {/* Main Index Score */}
          <div className="lg:col-span-1 border-b lg:border-b-0 lg:border-r border-slate-200 pb-6 lg:pb-0 lg:pr-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Authoritative Portfolio Metric</span>
              <button 
                onClick={() => setShowFormulaInfo(!showFormulaInfo)}
                className="text-slate-400 hover:text-indigo-600 transition-colors"
                title="Show Index Formula details"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-baseline space-x-3 mb-3">
              <span className="text-5xl font-extrabold text-slate-900 tracking-tight">
                {executiveRiskIndex?.index?.toFixed(2) || '0.00'}
              </span>
              <span className="text-xl font-medium text-slate-400">/ 100</span>
              <div>{getSeverityBadge(executiveRiskIndex?.severity)}</div>
            </div>
            <div className="flex items-center justify-between text-sm pt-2">
              <div className="flex items-center">
                <span className="text-slate-500 mr-2">Trajectory:</span>
                {getTrendIcon(executiveRiskIndex?.trend)}
              </div>
              <span className="text-xs font-mono text-slate-400">{executiveRiskIndex?.modelVersion}</span>
            </div>
          </div>

          {/* Deterministic Components Breakdown */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Mathematical Component Attribution</h3>
              <span className="text-xs text-slate-500">Auditable Multi-Factor Formulation</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-xs font-medium text-slate-500 mb-1">Severity Mean (45%)</div>
                <div className="text-lg font-bold text-slate-800">
                  {executiveRiskIndex?.components?.severity_weighted_mean?.toFixed(1) || '0.0'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Weighted S_mean</div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-xs font-medium text-slate-500 mb-1">Critical Penalty (30%)</div>
                <div className="text-lg font-bold text-slate-800">
                  {executiveRiskIndex?.components?.critical_penalty?.toFixed(1) || '0.0'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">C_penalty (15c+5h)</div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-xs font-medium text-slate-500 mb-1">Concentration (15%)</div>
                <div className="text-lg font-bold text-slate-800">
                  {executiveRiskIndex?.components?.category_concentration?.toFixed(1) || '0.0'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Herfindahl H_conc</div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <div className="text-xs font-medium text-slate-500 mb-1">Project Breadth (10%)</div>
                <div className="text-lg font-bold text-slate-800">
                  {executiveRiskIndex?.components?.project_breadth?.toFixed(1) || '0.0'}%
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">B_proj Active/Total</div>
              </div>
            </div>

            {showFormulaInfo && (
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl text-xs text-indigo-900 leading-relaxed">
                <strong>executive-index-v1.0.0 Specification:</strong> Index = round(0.45 * S_mean + 0.30 * C_penalty + 0.15 * H_conc + 0.10 * B_proj, 2). This consolidated organization-level index does NOT replace individual Phase 2 deterministic risk scores, which remain the authoritative truth for each risk item.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Executive KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">Critical Risks</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600">{kpiSummary?.criticalRisks || 0}</div>
          <div className="text-xs text-slate-400 mt-1">Immediate threat</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">High Risks</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-600">{kpiSummary?.highRisks || 0}</div>
          <div className="text-xs text-slate-400 mt-1">Elevated exposure</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">Emerging (ML)</span>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-600">{kpiSummary?.emergingRisks || 0}</div>
          <div className="text-xs text-slate-400 mt-1">Phase 9 Forecast</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">Active Events</span>
            <Activity className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-bold text-cyan-600">{kpiSummary?.activeEvents || 0}</div>
          <div className="text-xs text-slate-400 mt-1">Proactive Monitoring</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">Pending Approvals</span>
            <ClipboardList className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-600">{kpiSummary?.pendingApprovals || 0}</div>
          <div className="text-xs text-slate-400 mt-1">Workflow Sign-offs</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase">Decisions Required</span>
            <Target className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-rose-600">{decisionCenter?.totalDecisions || 0}</div>
          <div className="text-xs text-slate-400 mt-1">Synthesized Actions</div>
        </div>
      </div>

      {/* 3. Multi-Domain Exposure Grid (Phase 10 Integrations & Scenarios) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase">ESG Composite Rating</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><Globe className="w-4 h-4" /></div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold text-slate-900">
              {domainExposures?.esg?.compositeScore?.toFixed(1) || '50.0'}
            </span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              {domainExposures?.esg?.rating || 'MODERATE'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Multi-source external ESG normalized benchmark</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase">Carbon & Energy</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><Zap className="w-4 h-4" /></div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-extrabold text-slate-900">
              {(domainExposures?.carbon?.totalEmissionsTco2e || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">tCO2e</span>
            </div>
            <div className="text-xs text-slate-500">
              Grid Intensity: <span className="font-semibold text-slate-700">{domainExposures?.carbon?.gridCarbonIntensityGco2Kwh || 0} gCO2/kWh</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase">Compliance & Cross-Border</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Scale className="w-4 h-4" /></div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-extrabold text-slate-900">
              €{(domainExposures?.compliance?.cbamEstimatedLiabilityEur || 0).toLocaleString()}
            </div>
            <div className="text-xs text-slate-500">
              CSRD Audit Gaps: <span className="font-semibold text-rose-600">{domainExposures?.compliance?.csrdAuditGaps || 0} Open</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase">Scenario Intelligence</span>
            <div className="p-1.5 bg-purple-50 text-purple-600 rounded-lg"><Target className="w-4 h-4" /></div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-extrabold text-slate-900">
              +{domainExposures?.scenario?.worstCaseScoreDelta?.toFixed(1) || '0.0'} <span className="text-xs font-normal text-slate-400">pts</span>
            </div>
            <div className="text-xs text-slate-500">
              Worst-case stress delta across <span className="font-semibold text-slate-700">{domainExposures?.scenario?.totalScenarios || 0}</span> scenarios
            </div>
          </div>
        </div>
      </div>

      {/* 4. Side-by-Side Dual Intelligence Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Top Authoritative Risks (Phase 2 Deterministic Scores) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Top Authoritative Current Risks</h3>
              <p className="text-xs text-slate-500">Ranked by Phase 2 Deterministic Risk Score (Authoritative ground truth)</p>
            </div>
            <Link to="/risk-manager/risks" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center">
              View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>

          {topRisks.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No active risks detected in organization.</div>
          ) : (
            <div className="space-y-3">
              {topRisks.map((r, i) => (
                <div key={r.riskId || i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-colors flex items-center justify-between">
                  <div className="space-y-1 min-w-0 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono text-slate-400">#{i + 1}</span>
                      <Link to={`/risk-manager/risks/${r.riskId}`} className="text-sm font-bold text-slate-800 hover:text-indigo-600 truncate block">
                        {r.title || `Risk ${r.riskId}`}
                      </Link>
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-slate-500">
                      <span className="px-2 py-0.5 bg-white rounded border border-slate-200">{r.category || 'Operational'}</span>
                      <span>{r.mitigationCount || 0} mitigations</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-base font-extrabold text-slate-900">{r.score?.toFixed(1)}</div>
                    <div>{getSeverityBadge(r.severity)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Emerging Risks Radar (Phase 9 ML Trajectory Predictions) */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Emerging Risks Radar</h3>
              <p className="text-xs text-slate-500">Phase 9 ML Trajectory Forecasting (30 / 60 / 90 day horizons)</p>
            </div>
            <Link to="/predictive-risk" className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center">
              Explore ML Models <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>

          {emergingRisks.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No emerging risks exceeding critical thresholds.</div>
          ) : (
            <div className="space-y-3">
              {emergingRisks.map((p, i) => (
                <div key={p.predictionId || i} className="p-3.5 bg-purple-50/40 rounded-xl border border-purple-100 hover:border-purple-200 transition-colors flex items-center justify-between">
                  <div className="space-y-1 min-w-0 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono text-purple-600 font-semibold">+{p.predictionHorizonDays || 30}d</span>
                      <span className="text-sm font-bold text-slate-800 truncate">
                        Risk {p.riskId?.slice(0, 12)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      Driver: <span className="font-medium text-slate-700">{(p.topFactors || ['Environmental volatility'])[0]}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-slate-500">
                      Crit Prob: <span className="font-bold text-rose-600">{((p.criticalProbability || 0) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="text-xs font-bold text-purple-700 mt-0.5">
                      Proj: {p.predictedScore?.toFixed(1)} ({p.predictedSeverity})
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
