import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import { 
  ShieldAlert, AlertTriangle, CheckCircle2, Clock, 
  Activity, ArrowRight, Plus, RefreshCw, AlertOctagon, 
  Layers, Filter, Eye, ShieldCheck, History, TrendingUp,
  TrendingDown, Minus, Flame, BarChart3, Grid, HelpCircle, X
} from 'lucide-react';

const CATEGORIES = [
  'Financial', 'Operational', 'Environmental', 'ESG', 'Compliance',
  'Regulatory', 'Supplier', 'Project', 'Cybersecurity', 'Data',
  'Reputational', 'Fraud', 'Carbon', 'Documentation'
];

export default function RiskDashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Phase 2 Real Database Analytics State
  const [overview, setOverview] = useState(null);
  const [severityDist, setSeverityDist] = useState([]);
  const [categoryDist, setCategoryDist] = useState([]);
  const [trends, setTrends] = useState([]);
  const [heatmap, setHeatmap] = useState(null);
  const [highestRisks, setHighestRisks] = useState([]);

  // Selected Heatmap Cell Modal
  const [activeHeatmapCell, setActiveHeatmapCell] = useState(null);

  const fetchAllAnalytics = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      const [resOverview, resSev, resCat, resTrends, resHeatmap, resRisks] = await Promise.all([
        fetch('/api/risk-analytics/overview', { headers }),
        fetch('/api/risk-analytics/severity', { headers }),
        fetch('/api/risk-analytics/categories', { headers }),
        fetch('/api/risk-analytics/trends', { headers }),
        fetch('/api/risk-analytics/heatmap', { headers }),
        fetch('/api/risks?limit=6&sortBy=risk_score&sortOrder=desc', { headers })
      ]);

      if (resOverview.ok) {
        const json = await resOverview.json();
        setOverview(json.data);
      }
      if (resSev.ok) {
        const json = await resSev.json();
        setSeverityDist(json.data || []);
      }
      if (resCat.ok) {
        const json = await resCat.json();
        setCategoryDist(json.data || []);
      }
      if (resTrends.ok) {
        const json = await resTrends.json();
        setTrends(json.data || []);
      }
      if (resHeatmap.ok) {
        const json = await resHeatmap.json();
        setHeatmap(json.data);
      }
      if (resRisks.ok) {
        const json = await resRisks.json();
        setHighestRisks(json.data || []);
      }
    } catch (err) {
      console.error('Error loading analytics dashboard:', err);
      setError(err.message || 'Error loading risk analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllAnalytics();
  }, [token]);

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">MEDIUM</span>;
      case 'LOW':
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">LOW</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">Open</span>;
      case 'UNDER_REVIEW':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">Under Review</span>;
      case 'MITIGATION_IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">Mitigating</span>;
      case 'MITIGATED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Mitigated</span>;
      case 'CLOSED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">Closed</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  // Helper for 4x4 matrix cell styling based on coordinates
  const getCellBaseStyle = (pKey, iKey) => {
    const pVal = pKey === '75-100' ? 4 : pKey === '50-74' ? 3 : pKey === '25-49' ? 2 : 1;
    const iVal = iKey === '75-100' ? 4 : iKey === '50-74' ? 3 : iKey === '25-49' ? 2 : 1;
    const severityScore = pVal * iVal;

    if (severityScore >= 12) return 'bg-rose-50 border-rose-200 hover:bg-rose-100 text-rose-950';
    if (severityScore >= 8) return 'bg-orange-50 border-orange-200 hover:bg-orange-100 text-orange-950';
    if (severityScore >= 4) return 'bg-amber-50 border-amber-200 hover:bg-amber-100 text-amber-950';
    return 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100 text-emerald-950';
  };

  const isViewer = user?.role === 'VIEWER';

  return (
    <div className="min-h-screen bg-slate-50 pl-64">
      <Navbar title="AI Risk Manager - Scoring Engine & Analytics" />

      <main className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Top Header & Quick Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldAlert className="h-6 w-6 text-emerald-600" />
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Risk Analytics & Scoring Engine</h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Phase 2 Authoritative 4-Factor Scoring, 4×4 Risk Matrix Heatmap & Enterprise Analytics
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchAllAnalytics}
              disabled={loading}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition"
              title="Refresh metrics"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <Link
              to="/risk-manager/audit-logs"
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition"
            >
              <History className="h-4 w-4 text-slate-600" />
              <span>Audit Trail</span>
            </Link>

            <Link
              to="/risk-manager/risks"
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition"
            >
              <Layers className="h-4 w-4 text-slate-600" />
              <span>View Registry</span>
            </Link>

            {!isViewer && (
              <Link
                to="/risk-manager/risks/new"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition"
              >
                <Plus className="h-4 w-4" />
                <span>Create Risk</span>
              </Link>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchAllAnalytics} className="underline font-bold ml-4">Retry</button>
          </div>
        )}

        {/* Phase 2: Enterprise KPI Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {/* 1. Total Risks */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Risks</p>
            <p className="text-2xl font-black text-slate-900 mt-2">
              {loading ? '-' : (overview?.total_risks ?? 0)}
            </p>
            <div className="text-[11px] text-slate-400 mt-1">Tenant Scoped</div>
          </div>

          {/* 2. Average Risk Score */}
          <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm bg-blue-50/20">
            <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Average Score</p>
            <p className="text-2xl font-black text-blue-600 mt-2">
              {loading ? '-' : (overview?.average_score != null ? Number(overview.average_score).toFixed(1) : '0.0')}
            </p>
            <div className="text-[11px] text-blue-500 mt-1">Out of 100 Scale</div>
          </div>

          {/* 3. Highest Risk Score */}
          <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm bg-rose-50/30">
            <p className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">Highest Score</p>
            <p className="text-2xl font-black text-rose-700 mt-2">
              {loading ? '-' : (overview?.highest_risk_score != null ? Number(overview.highest_risk_score).toFixed(1) : '0.0')}
            </p>
            <div className="text-[11px] text-rose-600 mt-1">Top Threat Level</div>
          </div>

          {/* 4. Critical Severity */}
          <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-sm bg-rose-50/20">
            <p className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Critical Risks</p>
            <p className="text-2xl font-black text-rose-600 mt-2">
              {loading ? '-' : (overview?.critical_risks ?? 0)}
            </p>
            <div className="text-[11px] text-rose-500 mt-1">Score ≥ 75.0</div>
          </div>

          {/* 5. High Severity */}
          <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm bg-orange-50/20">
            <p className="text-[11px] font-bold text-orange-700 uppercase tracking-wider">High Risks</p>
            <p className="text-2xl font-black text-orange-600 mt-2">
              {loading ? '-' : (overview?.high_risks ?? 0)}
            </p>
            <div className="text-[11px] text-orange-500 mt-1">Score 50.0–74.9</div>
          </div>

          {/* 6. Score Increasing Trends */}
          <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-sm">
            <div className="flex items-center space-x-1 text-rose-700">
              <TrendingUp className="h-3.5 w-3.5" />
              <p className="text-[11px] font-bold uppercase tracking-wider">Escalating</p>
            </div>
            <p className="text-2xl font-black text-slate-900 mt-2">
              {loading ? '-' : (overview?.increasing_risks ?? 0)}
            </p>
            <div className="text-[11px] text-rose-500 mt-1">Scores Rose</div>
          </div>

          {/* 7. Score Decreasing Trends */}
          <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm bg-emerald-50/20">
            <div className="flex items-center space-x-1 text-emerald-700">
              <TrendingDown className="h-3.5 w-3.5" />
              <p className="text-[11px] font-bold uppercase tracking-wider">De-escalating</p>
            </div>
            <p className="text-2xl font-black text-emerald-700 mt-2">
              {loading ? '-' : (overview?.decreasing_risks ?? 0)}
            </p>
            <div className="text-[11px] text-emerald-600 mt-1">Scores Fell</div>
          </div>
        </div>

        {/* Phase 2: 4x4 Risk Heatmap Section */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="flex items-center space-x-2">
                <Grid className="h-5 w-5 text-emerald-600" />
                <h2 className="text-base font-bold text-slate-900">4×4 Probability vs Impact Risk Heatmap</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Distribution matrix across four standardized likelihood and consequence tiers (Click any cell to inspect risks)
              </p>
            </div>
            <div className="flex items-center space-x-3 text-[11px]">
              <span className="flex items-center space-x-1">
                <span className="h-3 w-3 rounded bg-emerald-200 border border-emerald-300 inline-block" />
                <span className="text-slate-600">Low</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="h-3 w-3 rounded bg-amber-200 border border-amber-300 inline-block" />
                <span className="text-slate-600">Medium</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="h-3 w-3 rounded bg-orange-200 border border-orange-300 inline-block" />
                <span className="text-slate-600">High</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="h-3 w-3 rounded bg-rose-200 border border-rose-300 inline-block" />
                <span className="text-slate-600">Critical</span>
              </span>
            </div>
          </div>

          {/* 4x4 Grid Container */}
          <div className="pt-2">
            <div className="grid grid-cols-5 gap-2 max-w-4xl mx-auto">
              {/* Corner Label */}
              <div className="p-3 text-[11px] font-black text-slate-400 flex items-center justify-center text-center">
                Probability ↓ \ Impact →
              </div>
              {/* X-Axis Header Columns (Impact Buckets) */}
              {['0-24', '25-49', '50-74', '75-100'].map(iBucket => (
                <div key={iBucket} className="p-2 text-center text-xs font-bold text-slate-600 bg-slate-100 rounded-lg">
                  {iBucket}%
                  <div className="text-[10px] font-normal text-slate-400">
                    {iBucket === '0-24' ? 'Minor' : iBucket === '25-49' ? 'Moderate' : iBucket === '50-74' ? 'Major' : 'Catastrophic'}
                  </div>
                </div>
              ))}

              {/* Rows (Probability Buckets reversed: 75-100 down to 0-24) */}
              {['75-100', '50-74', '25-49', '0-24'].map(pBucket => (
                <React.Fragment key={pBucket}>
                  {/* Y-Axis Row Header */}
                  <div className="p-2 text-center text-xs font-bold text-slate-600 bg-slate-100 rounded-lg flex flex-col justify-center">
                    <span>{pBucket}%</span>
                    <span className="text-[10px] font-normal text-slate-400">
                      {pBucket === '75-100' ? 'Extreme' : pBucket === '50-74' ? 'High' : pBucket === '25-49' ? 'Moderate' : 'Low'}
                    </span>
                  </div>

                  {/* 4 Cells for this Row */}
                  {['0-24', '25-49', '50-74', '75-100'].map(iBucket => {
                    const cell = heatmap?.cells?.find(
                      c => c.probability_bucket === pBucket && c.impact_bucket === iBucket
                    ) || { count: 0, percentage: 0, risk_titles: [] };

                    const baseStyle = getCellBaseStyle(pBucket, iBucket);

                    return (
                      <button
                        key={`${pBucket}_${iBucket}`}
                        onClick={() => {
                          if (cell.count > 0) {
                            setActiveHeatmapCell({
                              pBucket,
                              iBucket,
                              count: cell.count,
                              percentage: cell.percentage,
                              titles: cell.risk_titles || []
                            });
                          }
                        }}
                        className={`p-4 rounded-xl border transition-all text-center flex flex-col items-center justify-center min-h-[85px] cursor-pointer ${baseStyle} ${
                          cell.count > 0 ? 'hover:scale-[1.02] shadow-xs' : 'opacity-60 cursor-default'
                        }`}
                      >
                        <span className="text-xl font-black">{cell.count}</span>
                        <span className="text-[10px] font-semibold opacity-75">
                          {cell.percentage}% of total
                        </span>
                        {cell.count > 0 && (
                          <span className="text-[9px] font-bold underline mt-1 opacity-90">
                            Inspect
                          </span>
                        )}
                      </button>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Heatmap Inspect Cell Modal */}
        {activeHeatmapCell && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Grid className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    Bucket: P({activeHeatmapCell.pBucket}%) × I({activeHeatmapCell.iBucket}%)
                  </h3>
                </div>
                <button onClick={() => setActiveHeatmapCell(null)}>
                  <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex justify-between font-medium">
                <span>Concentration:</span>
                <span className="font-bold text-slate-800">
                  {activeHeatmapCell.count} risks ({activeHeatmapCell.percentage}% of enterprise profile)
                </span>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Risks in this Quadrant:
                </h4>
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {activeHeatmapCell.titles.map((t, idx) => (
                    <li key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800">
                      {t}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-end pt-2">
                <Link
                  to="/risk-manager/risks"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700"
                >
                  View All in Registry
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Severity & Status Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Severity Distribution */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Severity Breakdown (Phase 2 Calculation)</h2>
              <span className="text-xs text-slate-500">Database Percentages</span>
            </div>

            <div className="grid grid-cols-4 gap-3 pt-2">
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(s => {
                const item = severityDist.find(d => d.severity === s) || { count: 0, percentage: 0 };
                const textColor = 
                  s === 'CRITICAL' ? 'text-rose-700' :
                  s === 'HIGH' ? 'text-orange-700' :
                  s === 'MEDIUM' ? 'text-amber-700' : 'text-emerald-700';

                return (
                  <div key={s} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <div className={`text-xs font-bold ${textColor}`}>{s}</div>
                    <div className="text-xl font-extrabold text-slate-900 mt-1">
                      {item.count}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{item.percentage}%</div>
                  </div>
                );
              })}
            </div>

            {/* Progress Bars */}
            <div className="space-y-2 pt-2">
              {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => {
                const item = severityDist.find(d => d.severity === sev) || { count: 0, percentage: 0 };
                const barColor = 
                  sev === 'CRITICAL' ? 'bg-rose-500' :
                  sev === 'HIGH' ? 'bg-orange-500' :
                  sev === 'MEDIUM' ? 'bg-amber-400' : 'bg-emerald-500';

                return (
                  <div key={sev} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-600 font-medium">
                      <span>{sev}</span>
                      <span>{item.count} ({item.percentage}%)</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${item.percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Time-Series Trend Analytics */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Score Timeline Trends</h2>
              <span className="text-xs text-slate-500">Historical Evolution</span>
            </div>

            {trends.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No time-series history data available yet.
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                {trends.slice(-5).map(pt => (
                  <div key={pt.date} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-slate-800">{pt.date}</span>
                      <span className="text-slate-400 ml-2">({pt.count} risks)</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-slate-500">
                        Avg Score: <strong className="text-slate-900 font-mono">{Number(pt.average_score).toFixed(1)}</strong>
                      </span>
                      {pt.critical_count > 0 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          {pt.critical_count} Critical
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Category Breakdown (14 Categories Grid) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">14 Enterprise Risk Categories</h2>
              <p className="text-xs text-slate-500">Real-time counts across standardized taxonomy</p>
            </div>
            <Link
              to="/risk-manager/risks"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
            >
              <span>Explore Filtered Table</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 pt-2">
            {CATEGORIES.map(cat => {
              const item = categoryDist.find(c => c.category === cat) || { count: 0, percentage: 0 };
              return (
                <Link
                  key={cat}
                  to={`/risk-manager/risks?category=${encodeURIComponent(cat)}`}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 transition text-center group"
                >
                  <p className="text-[11px] font-bold text-slate-600 group-hover:text-emerald-800 truncate" title={cat}>
                    {cat}
                  </p>
                  <p className="text-lg font-black text-slate-900 group-hover:text-emerald-700 mt-1">
                    {item.count}
                  </p>
                  <p className="text-[9px] text-slate-400 font-semibold">{item.percentage}%</p>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Highest Threat Registry Table (Ranked by Authoritative Risk Score) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Highest Threat Registry (Ranked by Authoritative Score)</h2>
              <p className="text-xs text-slate-500">Prioritized by calculated risk score</p>
            </div>
            <Link
              to="/risk-manager/risks"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center space-x-1"
            >
              <span>View Full Registry</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto" />
              <p className="text-xs">Loading prioritized risk register...</p>
            </div>
          ) : highestRisks.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-3">
              <ShieldCheck className="h-10 w-10 text-emerald-500 mx-auto opacity-70" />
              <p className="text-sm font-semibold text-slate-700">No risks currently registered</p>
              {!isViewer && (
                <Link
                  to="/risk-manager/risks/new"
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Risk Profile</span>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-6">Risk Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Authoritative Score</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4 text-center">Factors (P/I/E/U)</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {highestRisks.map((risk) => (
                    <tr key={risk._id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-6 font-semibold text-slate-900 max-w-xs truncate">
                        <Link to={`/risk-manager/risks/${risk._id}`} className="hover:text-emerald-600">
                          {risk.title}
                        </Link>
                        <div className="text-[11px] text-slate-400 font-normal truncate">{risk.description}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {risk.category}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          {risk.risk_score != null ? Number(risk.risk_score).toFixed(2) : '—'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {getSeverityBadge(risk.severity)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="font-mono text-[11px] text-slate-600">
                          {risk.probability} / {risk.impact} / {risk.exposure ?? 50} / {risk.urgency ?? 50}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {getStatusBadge(risk.status)}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <Link
                          to={`/risk-manager/risks/${risk._id}`}
                          className="inline-flex items-center space-x-1 text-emerald-600 hover:text-emerald-800 font-bold"
                        >
                          <Eye className="h-4 w-4" />
                          <span>View</span>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
