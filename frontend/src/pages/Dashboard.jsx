import React, { useEffect, useState, useMemo } from 'react';
import Navbar from '../components/Navbar';
import WorkspaceSelector from '../components/common/WorkspaceSelector';
import ReportingPeriodSelector from '../components/common/ReportingPeriodSelector';
import { useAuth } from '../context/AuthContext';
import { useFacilities } from '../context/FacilityContext';
import { 
  Zap, Globe, Droplet, Leaf, Recycle, Factory, Target, ClipboardList, 
  HelpCircle, Activity, ShieldCheck, CheckCircle, ArrowUpRight, Sparkles, 
  Clock, AlertTriangle, Upload, RefreshCw, Layers, AlertOctagon, Inbox,
  FileText, History, ExternalLink, TrendingUp, Check, X, Plus
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar 
} from 'recharts';

export default function Dashboard() {
  const { token, user } = useAuth();
  const { facilities, selectedFacilityId } = useFacilities();
  const [reportingPeriod, setReportingPeriod] = useState('Quarterly');

  // Real API data states
  const [dashboardData, setDashboardData] = useState(null);
  const [completenessData, setCompletenessData] = useState(null);
  const [actionCenterItems, setActionCenterItems] = useState([]);
  const [myTasks, setMyTasks] = useState({ assignedToMe: 0, dueToday: 0, overdue: 0, draftLogs: 0, needsCorrection: 0 });
  const [trendsData, setTrendsData] = useState([]);
  const [targets, setTargets] = useState([]);
  const [actionsList, setActionsList] = useState([]);
  const [gapsList, setGapsList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sub tab selection
  const [activeSubTab, setActiveSubTab] = useState('overview'); // overview, entry-center, gaps, targets, actions, audit

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const facilityParam = selectedFacilityId === 'all' ? 'all' : selectedFacilityId;
      
      const [dashRes, compRes, actRes, taskRes, trendRes, tarRes, actListRes, gapRes, auditRes] = await Promise.all([
        fetch(`/api/environment/dashboard?period=${reportingPeriod}&facilityId=${facilityParam}`, { headers }),
        fetch(`/api/environment/completeness?period=${reportingPeriod}`, { headers }),
        fetch('/api/environment/action-center', { headers }),
        fetch('/api/environment/my-tasks', { headers }),
        fetch('/api/environment/trends', { headers }),
        fetch('/api/environment/targets', { headers }),
        fetch('/api/environment/actions', { headers }),
        fetch('/api/environment/gaps', { headers }),
        fetch('/api/environment/audit-logs', { headers })
      ]);

      if (dashRes.ok) setDashboardData(await dashRes.json());
      if (compRes.ok) setCompletenessData(await compRes.json());
      if (actRes.ok) {
        const aJson = await actRes.json();
        setActionCenterItems(Array.isArray(aJson) ? aJson : []);
      }
      if (taskRes.ok) setMyTasks(await taskRes.json());
      if (trendRes.ok) {
        const tJson = await trendRes.json();
        setTrendsData(Array.isArray(tJson) ? tJson : []);
      }
      if (tarRes.ok) {
        const tarJson = await tarRes.json();
        setTargets(Array.isArray(tarJson) ? tarJson : []);
      }
      if (actListRes.ok) {
        const actJson = await actListRes.json();
        setActionsList(Array.isArray(actJson) ? actJson : []);
      }
      if (gapRes.ok) {
        const gapJson = await gapRes.json();
        setGapsList(Array.isArray(gapJson) ? gapJson : []);
      }
      if (auditRes.ok) {
        const audJson = await auditRes.json();
        setAuditLogs(Array.isArray(audJson) ? audJson : []);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Unable to load environmental workspace data. Please check connection and retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, reportingPeriod, selectedFacilityId]);

  // Derived real metrics
  const overallScore = dashboardData?.overallScore || 0;
  const metrics = dashboardData?.metrics || {
    totalEnergy: 0,
    renewablePct: 0,
    totalEmissions: 0,
    scope1: 0,
    scope2: 0,
    scope3: 0,
    totalWater: 0,
    waterRecyclePct: 0,
    totalWaste: 0,
    wasteRecyclePct: 0,
    activePollutionIncidents: 0,
    biodiversityRiskCount: 0
  };

  const counts = dashboardData?.counts || {
    readings: 0, emissions: 0, water: 0, waste: 0, pollution: 0, biodiversity: 0
  };

  const completionPct = completenessData?.completionPercentage ?? 0;
  const missingItems = completenessData?.missingItems || [];
  const moduleBreakdown = completenessData?.moduleBreakdown || {};

  // Explainable Recommended actions generated from real metrics
  const recommendations = useMemo(() => {
    const recs = [];
    if ((metrics.renewablePct || 0) < 30) {
      recs.push({
        title: 'Increase Renewable Energy Share',
        desc: `Renewable energy is at ${metrics.renewablePct || 0}%. Add solar/wind or review renewable energy targets.`,
        priority: 'MEDIUM',
        module: 'Energy',
        actionLabel: 'Review Energy',
        path: '/energy'
      });
    }
    if ((metrics.waterRecyclePct || 0) < 25) {
      recs.push({
        title: 'Improve Water Recycling & Reuse',
        desc: `Current water recycling rate is ${metrics.waterRecyclePct || 0}%. Log reuse or wastewater treatment.`,
        priority: 'HIGH',
        module: 'Water',
        actionLabel: 'Add Water Data',
        path: '/water'
      });
    }
    if ((metrics.totalEmissions || 0) > 100 && (metrics.scope1 || 0) > (metrics.scope2 || 0)) {
      recs.push({
        title: 'Implement Scope 1 Direct Emissions Plan',
        desc: 'Scope 1 stationary combustion is high. Target diesel generator efficiencies.',
        priority: 'HIGH',
        module: 'GHG Emissions',
        actionLabel: 'View GHG',
        path: '/ghg'
      });
    }
    if ((myTasks?.needsCorrection || 0) > 0) {
      recs.push({
        title: 'Resolve Returned Audit Records',
        desc: `${myTasks.needsCorrection} record(s) returned by reviewer requiring adjustments.`,
        priority: 'CRITICAL',
        module: 'Corrections',
        actionLabel: 'Fix Issues',
        path: '/gaps'
      });
    }
    return recs;
  }, [metrics, myTasks]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-[11px] text-slate-700 font-sans">
      <Navbar title="Environmental Performance & Data Dashboard" />

      {/* Filter Context Bar */}
      <div className="bg-white p-4 mt-6 mb-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between flex-wrap gap-4">
        <div>
          <h4 className="font-bold text-slate-800 text-xs">Active Reporting Context</h4>
          <p className="text-slate-400 text-[10px] mt-0.5">Filter data inputs, performance scores and gaps</p>
        </div>
        <div className="flex items-center space-x-4">
          <WorkspaceSelector />
          <ReportingPeriodSelector value={reportingPeriod} onChange={setReportingPeriod} />
          <button 
            onClick={fetchData}
            className="p-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span>{error}</span>
          </div>
          <button onClick={fetchData} className="font-bold text-xs bg-red-600 text-white px-3 py-1 rounded-lg">Retry</button>
        </div>
      )}

      {/* Sub tabs navigation */}
      <div className="flex border-b border-slate-200 mb-6 gap-1 flex-wrap">
        {[
          { id: 'overview', name: 'Overview Dashboard', icon: Activity },
          { id: 'entry-center', name: 'Data Entry Center', icon: Layers },
          { id: 'gaps', name: 'Data Gaps Center', icon: AlertOctagon, count: missingItems.length },
          { id: 'targets', name: 'Environmental Targets', icon: Target, count: targets.length },
          { id: 'actions', name: 'Improvement Actions', icon: ClipboardList, count: actionsList.length },
          { id: 'audit', name: 'Activity History', icon: History }
        ].map(sub => (
          <button
            key={sub.id}
            onClick={() => setActiveSubTab(sub.id)}
            className={`pb-3 px-4 font-bold text-xs flex items-center space-x-2 transition-all border-b-2 ${
              activeSubTab === sub.id ? 'border-forest-600 text-forest-600 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <sub.icon className="h-4 w-4" />
            <span>{sub.name}</span>
            {sub.count !== undefined && sub.count > 0 && (
              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                activeSubTab === sub.id ? 'bg-forest-100 text-forest-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {sub.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && !dashboardData ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="h-6 w-6 animate-spin text-forest-600" />
          <p className="font-semibold text-xs text-slate-600">Loading Real MSME Environmental Performance...</p>
        </div>
      ) : (
        <div>
          {/* A. OVERVIEW DASHBOARD */}
          {activeSubTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Top 6 Real KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { name: 'Data Completion', val: `${completionPct}%`, label: `${completenessData?.completedRequirements || 0}/${completenessData?.totalRequirements || 12} criteria`, color: 'text-forest-600', icon: CheckCircle, link: '/gaps' },
                  { name: 'Pending Entries', val: `${myTasks.draftLogs || 0}`, label: 'Draft entries to submit', color: 'text-amber-600', icon: Clock, link: '/energy' },
                  { name: 'Missing Evidence', val: `${missingItems.filter(m => m.type === 'EVIDENCE_MISSING').length}`, label: 'Invoices required', color: 'text-red-500', icon: Upload, link: '/evidence' },
                  { name: 'Needs Correction', val: `${myTasks.needsCorrection || 0}`, label: 'Returned from review', color: 'text-rose-500', icon: AlertTriangle, link: '/gaps' },
                  { name: 'Open Actions', val: `${actionsList.filter(a => a.status !== 'COMPLETED').length}`, label: `${myTasks.dueToday || 0} due today`, color: 'text-blue-600', icon: ClipboardList, link: '/actions' },
                  { name: 'Active Targets', val: `${targets.length}`, label: `${targets.filter(t => t.status === 'ACHIEVED').length} achieved`, color: 'text-purple-600', icon: Target, link: '/targets' }
                ].map(kpi => (
                  <a href={kpi.link} key={kpi.name} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-forest-500 hover:shadow-md transition">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-400 uppercase tracking-widest text-[8px]">{kpi.name}</span>
                      <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                    </div>
                    <div className="mt-2">
                      <h3 className="text-lg font-black text-slate-800">{kpi.val}</h3>
                      <span className="text-[9px] text-slate-400 block mt-0.5">{kpi.label}</span>
                    </div>
                  </a>
                ))}
              </div>

              {/* Action Center & Recommended actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Today's Action Center */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-bold text-slate-800 text-xs flex items-center space-x-1.5">
                        <AlertOctagon className="h-4 w-4 text-red-500" />
                        <span>Today's Action Center</span>
                      </h4>
                      <span className="text-[9px] font-bold text-slate-400">{actionCenterItems.length} items</span>
                    </div>

                    {actionCenterItems.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                        <CheckCircle className="h-6 w-6 text-forest-500 mx-auto mb-1.5" />
                        <p className="font-bold text-xs text-slate-700">All Clear!</p>
                        <p className="text-[10px] text-slate-400">No overdue tasks or missing items for this period.</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                        {actionCenterItems.slice(0, 5).map(item => (
                          <div 
                            key={item.id} 
                            className={`p-3 border-l-4 rounded flex justify-between items-center transition ${
                              item.priority === 'CRITICAL' ? 'bg-rose-50 border-rose-500 text-rose-900' :
                              item.priority === 'HIGH' ? 'bg-amber-50 border-amber-500 text-amber-900' :
                              'bg-slate-50 border-blue-500 text-slate-800'
                            }`}
                          >
                            <div className="space-y-0.5 pr-2">
                              <p className="font-bold truncate">{item.title}</p>
                              <p className="text-[9px] text-slate-500 line-clamp-1">{item.desc}</p>
                            </div>
                            <a 
                              href={item.link} 
                              className={`font-bold px-2.5 py-1 rounded text-[9px] text-white shrink-0 transition ${
                                item.priority === 'CRITICAL' ? 'bg-rose-600 hover:bg-rose-700' :
                                item.priority === 'HIGH' ? 'bg-amber-600 hover:bg-amber-700' :
                                'bg-forest-600 hover:bg-forest-700'
                              }`}
                            >
                              {item.actionLabel}
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Workspace Recommendations */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs mb-3 flex items-center space-x-1.5">
                      <Sparkles className="h-4 w-4 text-forest-600" />
                      <span>Explainable Recommendations</span>
                    </h4>
                    {recommendations.length === 0 ? (
                      <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                        <Check className="h-6 w-6 text-forest-500 mx-auto mb-1.5" />
                        <p className="font-bold text-xs text-slate-700">Optimal Performance</p>
                        <p className="text-[10px] text-slate-400">All module parameters meet environmental targets.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {recommendations.map((rec, idx) => (
                          <div key={idx} className="flex justify-between items-start pb-2.5 border-b border-slate-100 last:border-b-0 last:pb-0">
                            <div className="space-y-0.5 pr-2">
                              <span className="bg-forest-50 text-forest-700 text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">{rec.priority}</span>
                              <p className="font-bold text-slate-800">{rec.title}</p>
                              <p className="text-[9px] text-slate-400">{rec.desc}</p>
                            </div>
                            <a href={rec.path} className="text-forest-600 hover:underline font-bold text-[9px] self-center shrink-0">
                              {rec.actionLabel}
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. My Work Workload */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs mb-3 flex items-center space-x-1.5">
                      <Inbox className="h-4 w-4 text-blue-600" />
                      <span>My Productivity & Tasks</span>
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                        <p className="text-[10px] text-slate-400 font-bold">Assigned to Me</p>
                        <h4 className="text-lg font-black text-slate-800 mt-1">{myTasks.assignedToMe}</h4>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                        <p className="text-[10px] text-slate-400 font-bold">Due Today</p>
                        <h4 className="text-lg font-black text-amber-600 mt-1">{myTasks.dueToday}</h4>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                        <p className="text-[10px] text-slate-400 font-bold">Overdue</p>
                        <h4 className="text-lg font-black text-red-500 mt-1">{myTasks.overdue}</h4>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                        <p className="text-[10px] text-slate-400 font-bold">Draft Records</p>
                        <h4 className="text-lg font-black text-blue-600 mt-1">{myTasks.draftLogs}</h4>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Completeness Matrix & Trend Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Module Completeness Matrix */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-800 text-xs mb-3">Module Completeness Matrix ({reportingPeriod})</h4>
                    <div className="space-y-3">
                      {[
                        { id: 'energy', name: 'Energy Management', mod: moduleBreakdown.energy },
                        { id: 'ghg', name: 'GHG Emissions', mod: moduleBreakdown.ghg },
                        { id: 'water', name: 'Water Management', mod: moduleBreakdown.water },
                        { id: 'biodiversity', name: 'Biodiversity Risks', mod: moduleBreakdown.biodiversity },
                        { id: 'waste', name: 'Waste Diversion', mod: moduleBreakdown.waste },
                        { id: 'pollution', name: 'Pollution Monitoring', mod: moduleBreakdown.pollution }
                      ].map(item => {
                        const score = item.mod?.score ?? 0;
                        return (
                          <div key={item.id} className="space-y-1">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="font-semibold text-slate-600">{item.name}</span>
                              <span className={`font-bold ${score === 100 ? 'text-forest-600' : (score > 0 ? 'text-amber-600' : 'text-slate-400')}`}>{score}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${score === 100 ? 'bg-forest-600' : (score > 0 ? 'bg-amber-500' : 'bg-slate-200')}`} style={{ width: `${score}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Overall Score</p>
                      <h3 className="text-lg font-black text-slate-800 mt-0.5">{completionPct}%</h3>
                    </div>
                    <a href="/gaps" className="text-forest-600 font-bold text-xs hover:underline flex items-center space-x-1">
                      <span>View Gaps</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                {/* Real Performance Trends Chart */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-slate-800 text-xs">Real Environmental Consumption Trends</h4>
                    <div className="flex items-center space-x-3 text-[10px]">
                      <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block"></span><span>Energy (kWh)</span></span>
                      <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 bg-sky-500 rounded-full inline-block"></span><span>Water (m³)</span></span>
                      <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 bg-rose-500 rounded-full inline-block"></span><span>GHG (tCO2e)</span></span>
                    </div>
                  </div>
                  
                  <div className="h-52">
                    {trendsData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-slate-400">
                        <p>No historical trends recorded yet. Enter data in environmental modules to see charts.</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorEng" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorWat" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorGhg" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="month" stroke="#cbd5e1" fontSize={10} />
                          <YAxis stroke="#cbd5e1" fontSize={10} />
                          <Tooltip />
                          <Area type="monotone" dataKey="energy" name="Energy (kWh)" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorEng)" />
                          <Area type="monotone" dataKey="water" name="Water (m³)" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorWat)" />
                          <Area type="monotone" dataKey="emissions" name="GHG (tCO2e)" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorGhg)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* B. DATA ENTRY CENTER */}
          {activeSubTab === 'entry-center' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { name: 'ENERGY', icon: Zap, color: 'text-amber-500', count: counts.readings, breakdown: moduleBreakdown.energy, path: '/energy' },
                { name: 'GHG EMISSIONS', icon: Globe, color: 'text-blue-500', count: counts.emissions, breakdown: moduleBreakdown.ghg, path: '/ghg' },
                { name: 'WATER MANAGEMENT', icon: Droplet, color: 'text-sky-500', count: counts.water, breakdown: moduleBreakdown.water, path: '/water' },
                { name: 'BIODIVERSITY', icon: Leaf, color: 'text-green-500', count: counts.biodiversity, breakdown: moduleBreakdown.biodiversity, path: '/biodiversity' },
                { name: 'WASTE DIVERSION', icon: Recycle, color: 'text-emerald-500', count: counts.waste, breakdown: moduleBreakdown.waste, path: '/waste' },
                { name: 'POLLUTION MONITORING', icon: Factory, color: 'text-red-500', count: counts.pollution, breakdown: moduleBreakdown.pollution, path: '/pollution' }
              ].map(mod => {
                const score = mod.breakdown?.score ?? (mod.count > 0 ? 50 : 0);
                return (
                  <div key={mod.name} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-2">
                          <mod.icon className={`h-5 w-5 ${mod.color}`} />
                          <h4 className="font-bold text-slate-800 text-xs">{mod.name}</h4>
                        </div>
                        <span className={`font-bold ${score === 100 ? 'text-forest-600' : 'text-slate-800'}`}>{score}%</span>
                      </div>

                      <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
                        <div className={`h-2 rounded-full ${score === 100 ? 'bg-forest-600' : 'bg-amber-500'}`} style={{ width: `${score}%` }}></div>
                      </div>

                      <div className="space-y-2 text-slate-500 text-[10px] mb-4">
                        <div className="flex justify-between">
                          <span>Total records logged:</span>
                          <span className="font-bold text-slate-800">{mod.count} entries</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Draft records:</span>
                          <span className="font-bold text-blue-600">{mod.breakdown?.draftCount || 0} drafts</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Requires correction:</span>
                          <span className={`font-bold ${(mod.breakdown?.correctionCount || 0) > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                            {mod.breakdown?.correctionCount || 0} records
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Supporting evidence:</span>
                          <span className="font-bold text-slate-800">{mod.breakdown?.evidenceCount || 0} files attached</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2 pt-2 border-t border-slate-100">
                      <a href={mod.path} className="flex-1 bg-forest-600 hover:bg-forest-700 text-white font-bold py-2 rounded-lg text-center transition">
                        Add Data
                      </a>
                      <a href={mod.path} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg text-center transition">
                        View Records
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* C. DATA GAPS & MISSING ITEMS */}
          {activeSubTab === 'gaps' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">Data Completeness Gaps & Missing Evidence</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Real requirements calculated from your reporting period data</p>
                </div>
                <span className="text-xs font-bold text-forest-700 bg-forest-50 px-3 py-1 rounded-lg">
                  {missingItems.length} Gaps Identified
                </span>
              </div>
              
              {missingItems.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <CheckCircle className="h-8 w-8 text-forest-500 mx-auto mb-2" />
                  <p className="font-bold text-sm text-slate-800">No Data Gaps Detected</p>
                  <p className="text-xs text-slate-400 mt-1">All 6 environmental modules and required evidence are complete for {reportingPeriod}.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-400 uppercase text-[9px] border-b border-slate-100">
                      <th className="py-4 px-6">Module</th>
                      <th className="py-4 px-6">Missing Requirement / Issue</th>
                      <th className="py-4 px-6">Gap Type</th>
                      <th className="py-4 px-6 text-center">Priority</th>
                      <th className="py-4 px-6 text-center">Direct Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {missingItems.map((gap, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="py-4 px-6 font-bold text-slate-800">{gap.module}</td>
                        <td className="py-4 px-6 text-slate-600 font-medium">{gap.issue}</td>
                        <td className="py-4 px-6 uppercase text-[9px] text-slate-400 font-bold">{gap.type}</td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                            gap.priority === 'CRITICAL' ? 'bg-rose-50 text-rose-700' :
                            gap.priority === 'HIGH' ? 'bg-amber-50 text-amber-700' :
                            'bg-blue-50 text-blue-700'
                          }`}>
                            {gap.priority}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <a href={gap.link} className="bg-forest-600 hover:bg-forest-700 text-white font-bold px-3 py-1.5 rounded-lg transition text-[9px]">
                            {gap.type.includes('EVIDENCE') ? 'Upload Evidence' : 'Add Data'}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* D. TARGETS */}
          {activeSubTab === 'targets' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">Organization Environmental Targets</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Real targets tracked against baseline values</p>
                </div>
                <a href="/targets" className="bg-forest-600 hover:bg-forest-700 text-white font-bold py-2 px-3.5 rounded-xl transition flex items-center space-x-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Target</span>
                </a>
              </div>
              
              {targets.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Target className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-sm text-slate-700">No Environmental Targets Set</p>
                  <p className="text-xs text-slate-400 mt-1">Define reduction targets for energy, GHG, water, or waste.</p>
                  <a href="/targets" className="inline-block mt-4 bg-forest-600 text-white font-bold px-4 py-2 rounded-xl text-xs">Create First Target</a>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-400 uppercase text-[9px] border-b border-slate-100">
                      <th className="py-4 px-6">Target Name</th>
                      <th className="py-4 px-6">Category</th>
                      <th className="py-4 px-6">Baseline Value</th>
                      <th className="py-4 px-6">Current Value</th>
                      <th className="py-4 px-6">Target Value</th>
                      <th className="py-4 px-6">Target Year</th>
                      <th className="py-4 px-6 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {targets.map(tar => (
                      <tr key={tar._id} className="hover:bg-slate-50">
                        <td className="py-4 px-6 font-bold text-slate-800">{tar.name}</td>
                        <td className="py-4 px-6 text-slate-500 font-semibold">{tar.category}</td>
                        <td className="py-4 px-6 text-slate-500">{tar.baselineValue} ({tar.baselineYear})</td>
                        <td className="py-4 px-6 text-forest-600 font-bold">{tar.currentValue}</td>
                        <td className="py-4 px-6 text-slate-800 font-bold">{tar.targetValue}</td>
                        <td className="py-4 px-6 text-slate-400">{tar.targetYear}</td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                            tar.status === 'ACHIEVED' ? 'bg-green-50 text-green-700' :
                            tar.status === 'AT_RISK' ? 'bg-amber-50 text-amber-700' :
                            tar.status === 'OFF_TRACK' ? 'bg-rose-50 text-rose-700' :
                            'bg-blue-50 text-blue-700'
                          }`}>
                            {tar.status || 'ON_TRACK'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* E. ACTIONS & IMPROVEMENT PLAN */}
          {activeSubTab === 'actions' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">Improvement Actions & Initiatives</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Real assigned tasks and progress milestones</p>
                </div>
                <a href="/actions" className="bg-forest-600 hover:bg-forest-700 text-white font-bold py-2 px-3.5 rounded-xl transition flex items-center space-x-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Action</span>
                </a>
              </div>
              
              {actionsList.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <ClipboardList className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-sm text-slate-700">No Improvement Actions</p>
                  <p className="text-xs text-slate-400 mt-1">Create an action item to improve environmental efficiency.</p>
                  <a href="/actions" className="inline-block mt-4 bg-forest-600 text-white font-bold px-4 py-2 rounded-xl text-xs">Add First Action</a>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-400 uppercase text-[9px] border-b border-slate-100">
                      <th className="py-4 px-6">Problem / Focus</th>
                      <th className="py-4 px-6">Proposed Action</th>
                      <th className="py-4 px-6">Module</th>
                      <th className="py-4 px-6">Owner</th>
                      <th className="py-4 px-6">Due Date</th>
                      <th className="py-4 px-6 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {actionsList.map(act => (
                      <tr key={act._id} className="hover:bg-slate-50">
                        <td className="py-4 px-6 font-bold text-slate-800">{act.problem}</td>
                        <td className="py-4 px-6 text-slate-600 font-medium">{act.action}</td>
                        <td className="py-4 px-6 uppercase text-[9px] text-slate-400 font-bold">{act.category}</td>
                        <td className="py-4 px-6 text-slate-500 font-mono text-[10px]">{act.owner}</td>
                        <td className="py-4 px-6 text-slate-500">{act.dueDate}</td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                            act.status === 'COMPLETED' ? 'bg-green-50 text-green-700' :
                            act.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700' :
                            act.status === 'OVERDUE' ? 'bg-red-50 text-red-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {act.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* F. AUDIT LOGS & ACTIVITY HISTORY */}
          {activeSubTab === 'audit' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
                <h4 className="font-bold text-slate-800 text-xs">Organization Activity & Audit Trail</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Traceable history of records created, updated, submitted, and verified</p>
              </div>
              
              {auditLogs.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <History className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-sm text-slate-700">No Activity Logs Yet</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {auditLogs.map(log => (
                    <div key={log._id} className="p-4 px-6 flex items-center justify-between hover:bg-slate-50">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-800 text-xs">{log.action}</span>
                          <span className="bg-slate-100 text-slate-600 text-[8px] font-bold px-1.5 py-0.2 rounded uppercase">{log.module}</span>
                        </div>
                        <p className="text-[10px] text-slate-400">By <span className="font-mono text-slate-600 font-semibold">{log.user}</span></p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
