import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldAlert, AlertTriangle, TrendingUp, CheckCircle2, Clock, Bot,
  Activity, Play, ArrowRight, ExternalLink, Search, RefreshCw,
  Cpu, Layers, Zap, Database, Server, Filter, X, Eye, ThumbsUp,
  AlertCircle, Sparkles, Send, Check, ChevronRight, FileText, Scale
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAuthStore } from '../../store/authStore';

export default function CommandCenter() {
  const navigate = useNavigate();
  const { token: ctxToken, user, permissions } = useAuth();
  const token = ctxToken || useAuthStore.getState().token || localStorage.getItem('esg_super_admin_token') || localStorage.getItem('token') || '';

  // Data states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overview, setOverview] = useState(null);
  const [actions, setActions] = useState([]);
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);

  // Context Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerData, setDrawerData] = useState(null);

  // AI Copilot Modal state
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [copilotGoal, setCopilotGoal] = useState('');
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotResponse, setCopilotResponse] = useState(null);
  const [copilotError, setCopilotError] = useState(null);

  // Real-time SSE indicator
  const [isLive, setIsLive] = useState(true);
  const eventSourceRef = useRef(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/command-center/overview', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setOverview(json.data);
        setActions(json.data.action_queue || []);
      } else {
        setError(json.message || 'Failed to retrieve Command Center overview.');
      }
    } catch (err) {
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Connect SSE stream for live updates
  useEffect(() => {
    if (!token) return;
    fetchOverview();

    try {
      // Connect to native EventSource or fallback to periodic refresh
      const evtSource = new EventSource(`/api/command-center/stream?token=${encodeURIComponent(token)}`);
      evtSource.onmessage = (e) => {
        try {
          const packet = JSON.parse(e.data);
          if (packet.type === 'UPDATE' && packet.data) {
            setOverview(packet.data);
            setActions(packet.data.action_queue || []);
          }
        } catch (err) {}
      };
      evtSource.onerror = () => {
        evtSource.close();
      };
      eventSourceRef.current = evtSource;
    } catch (e) {
      // Fallback: poll every 30s
      const timer = setInterval(fetchOverview, 30000);
      return () => clearInterval(timer);
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [token]);

  // Global Search Handler
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchDropdownOpen(false);
      return;
    }

    const debounce = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const res = await fetch(`/api/command-center/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (res.ok && json.success) {
          setSearchResults(json.data.results || []);
          setSearchDropdownOpen(true);
        }
      } catch (e) {
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => clearTimeout(debounce);
  }, [searchQuery, token]);

  // Open Context Drawer
  const openContextDrawer = async (resourceType, resourceId) => {
    try {
      setDrawerOpen(true);
      setDrawerLoading(true);
      setDrawerData(null);
      const res = await fetch(`/api/command-center/context/${resourceType}/${resourceId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setDrawerData(json.data);
      }
    } catch (err) {
    } finally {
      setDrawerLoading(false);
    }
  };

  // Direct Action Handler
  const handleActionClick = async (action, actType) => {
    if (actType === 'Open') {
      openContextDrawer(action.resource_type, action.resource_id);
      return;
    }
    if (actType === 'Investigate') {
      setCopilotGoal(`Investigate critical issue '${action.title}' and propose immediate containment strategy.`);
      setCopilotOpen(true);
      return;
    }

    // Direct execute (Approve, Escalate)
    try {
      const res = await fetch('/api/command-center/actions/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action_id: action.action_id,
          action_type: actType.toUpperCase(),
          resource_type: action.resource_type,
          resource_id: action.resource_id
        })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        await fetchOverview();
      } else {
        alert(json.message || `Failed to execute ${actType}`);
      }
    } catch (err) {
      alert(`Error executing ${actType}: ${err.message}`);
    }
  };

  // Run AI Copilot
  const runCopilot = async (overrideGoal) => {
    const prompt = overrideGoal || copilotGoal;
    if (!prompt.trim()) return;

    try {
      setCopilotLoading(true);
      setCopilotError(null);
      setCopilotResponse(null);

      const res = await fetch('/api/ai-agent/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ goal: prompt })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setCopilotResponse(json.data);
      } else {
        setCopilotError(json.message || 'AI Copilot failed to process the inquiry.');
      }
    } catch (err) {
      setCopilotError(`Network error: ${err.message}`);
    } finally {
      setCopilotLoading(false);
    }
  };

  // Filter Actions
  const filteredActions = actions.filter(act => {
    if (priorityFilter !== 'ALL' && act.priority !== priorityFilter) return false;
    if (typeFilter !== 'ALL' && act.type !== typeFilter) return false;
    return true;
  });

  const kpis = overview?.kpi || {
    overallRiskIndex: 0,
    criticalRisks: 0,
    emergingRisks: 0,
    overdueActions: 0,
    pendingApprovals: 0,
    activeWorkflows: 0,
    aiInvestigations: 0,
    criticalAlerts: 0
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* 1. Header & Global Command Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Activity className="w-6 h-6 text-cyan-400" />
              Unified Enterprise Command Center
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              LIVE TELEMETRY
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative Single Pane of Glass • Phases 1–18 Unified Operations Layer
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
          {/* Universal Search */}
          <div className="relative flex-1 sm:flex-initial sm:w-64 md:w-80 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Universal Search across domains..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors min-h-[40px]"
            />
            {searchDropdownOpen && searchResults.length > 0 && (
              <div className="absolute right-0 left-0 mt-1 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl z-50 max-h-80 overflow-y-auto divide-y divide-slate-800">
                {searchResults.map((res, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setSearchDropdownOpen(false);
                      openContextDrawer(res.type.toLowerCase(), res.resource_id);
                    }}
                    className="p-2.5 hover:bg-slate-800/80 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white truncate max-w-[180px]">{res.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">{res.type}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{res.subtitle}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ask AI Copilot Button */}
          <button
            onClick={() => setCopilotOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all min-h-[40px]"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
            <span>Ask Copilot</span>
          </button>

          {/* Refresh Button */}
          <button
            onClick={fetchOverview}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Top 8 KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* KPI 1: Risk Index */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Risk Index</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-white">{kpis.overallRiskIndex}</span>
            <span className="text-[10px] text-slate-500 ml-1">/ 100</span>
          </div>
          <span className="text-[10px] text-cyan-400 mt-1">Deterministic Auth</span>
        </div>

        {/* KPI 2: Critical Risks */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Critical</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-rose-400">{kpis.criticalRisks}</span>
          </div>
          <span className="text-[10px] text-rose-400/80 mt-1">Score ≥ 75</span>
        </div>

        {/* KPI 3: Emerging Risks */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Emerging</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-amber-400">{kpis.emergingRisks}</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">ML Forecast Trend</span>
        </div>

        {/* KPI 4: Overdue Actions */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Overdue</span>
            <Clock className="w-4 h-4 text-orange-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-orange-400">{kpis.overdueActions}</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Past SLA</span>
        </div>

        {/* KPI 5: Pending Approvals */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Approvals</span>
            <AlertCircle className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-purple-400">{kpis.pendingApprovals}</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">HITL Gates</span>
        </div>

        {/* KPI 6: Active Workflows */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Workflows</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-blue-400">{kpis.activeWorkflows}</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Active Automations</span>
        </div>

        {/* KPI 7: AI Investigations */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">AI Agent</span>
            <Bot className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-teal-400">{kpis.aiInvestigations}</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Investigations</span>
        </div>

        {/* KPI 8: Critical Alerts */}
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-medium uppercase tracking-wider">Alerts</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold font-mono text-red-400">{kpis.criticalAlerts}</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Sweeps & Anomaly</span>
        </div>
      </div>

      {/* 3. Main Operational Split: Action Queue (Left 7 cols) & Emerging/Feed (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Action Queue & Immediate Attention */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
                <h2 className="font-bold text-base text-white">Action Queue & Immediate Attention</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-800 text-slate-300">
                  {filteredActions.length}
                </span>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
                  {['ALL', 'P1_CRITICAL', 'P2_HIGH'].map(p => (
                    <button
                      key={p}
                      onClick={() => setPriorityFilter(p)}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        priorityFilter === p ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {p === 'ALL' ? 'All' : p.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions List */}
            {filteredActions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No active actions matching the selected priority filters.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredActions.map((act) => (
                  <div
                    key={act.action_id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                          act.priority === 'P1_CRITICAL' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                          act.priority === 'P2_HIGH' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                          act.priority === 'P3_MEDIUM' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {act.priority}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-900 text-slate-400 font-mono">
                          {act.type}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Score: {act.priority_score}/100
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {act.available_actions?.map(btn => (
                          <button
                            key={btn}
                            onClick={() => handleActionClick(act, btn)}
                            className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                              btn === 'Approve' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' :
                              btn === 'Escalate' ? 'bg-rose-600/80 hover:bg-rose-600 text-white' :
                              btn === 'Investigate' ? 'bg-indigo-600 hover:bg-indigo-500 text-white' :
                              'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            {btn}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4
                        onClick={() => openContextDrawer(act.resource_type, act.resource_id)}
                        className="text-sm font-semibold text-white hover:text-cyan-400 cursor-pointer transition-colors"
                      >
                        {act.title}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {act.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-[11px] text-slate-500 font-mono">
                      <span>Ref: {act.resource_type} / {act.resource_id}</span>
                      <span>Created: {new Date(act.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Workflow Summary Card */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                Workflow Engine Summary
              </h3>
              <Link to="/workflow-manager" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
                Open Manager <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] uppercase text-slate-400">Active</span>
                <p className="text-lg font-bold text-white mt-1">{overview?.workflows?.active || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] uppercase text-orange-400">Overdue</span>
                <p className="text-lg font-bold text-orange-400 mt-1">{overview?.workflows?.overdue || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] uppercase text-purple-400">Approvals</span>
                <p className="text-lg font-bold text-purple-400 mt-1">{overview?.workflows?.pendingApprovals || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] uppercase text-rose-400">Escalated</span>
                <p className="text-lg font-bold text-rose-400 mt-1">{overview?.workflows?.escalated || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] uppercase text-emerald-400">Completed Today</span>
                <p className="text-lg font-bold text-emerald-400 mt-1">{overview?.workflows?.completedToday || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Emerging Intelligence, Activity Feed & Platform Health */}
        <div className="lg:col-span-5 space-y-4">
          {/* Emerging Intelligence */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                Emerging Intelligence
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                CURRENT • FORECAST • SIMULATION
              </span>
            </div>

            <div className="space-y-3">
              {overview?.risk?.topCriticalRisks?.slice(0, 2).map((r, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400">
                      CURRENT
                    </span>
                    <span className="text-xs font-mono font-bold text-rose-300">Score: {r.risk_score}</span>
                  </div>
                  <h5 className="text-xs font-semibold text-white truncate">{r.title}</h5>
                  <p className="text-[11px] text-slate-400">Category: {r.category} | Status: {r.status}</p>
                </div>
              ))}

              {overview?.predictions?.recentEscalations?.slice(0, 2).map((p, i) => (
                <div key={i} className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                      FORECAST
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-300">
                      Trend: {p.trajectory_trend}
                    </span>
                  </div>
                  <h5 className="text-xs font-semibold text-white truncate">Risk ID: {p.risk_id}</h5>
                  <p className="text-[11px] text-slate-400">
                    Critical Probability: {Math.round((p.critical_probability || 0.8) * 100)}%
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Feed */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                Live Activity Feed
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">Realtime</span>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {overview?.activity_feed?.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No recent activity detected.</p>
              ) : (
                overview?.activity_feed?.map((ev, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/60 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{ev.title}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Source: {ev.user}</span>
                      <span className="text-slate-500 font-mono">{ev.resource}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Platform Health Grid */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" />
                Platform Subsystems (9/9)
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {overview?.health?.overall || 'HEALTHY'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {overview?.health?.subsystems?.map((sub, i) => (
                <div key={i} className="p-2 rounded-lg bg-slate-950 border border-slate-800/60 text-[11px] flex flex-col justify-between">
                  <span className="text-slate-300 font-medium truncate">{sub.name}</span>
                  <div className="flex items-center justify-between mt-1 text-[10px]">
                    <span className="text-emerald-400 font-mono">{sub.status}</span>
                    <span className="text-slate-500 font-mono">{sub.latency_ms}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Context Drawer Slide-Over Panel */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full p-6 overflow-y-auto space-y-6 shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs font-mono uppercase text-cyan-400">Context Investigation</span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {drawerData?.resourceType}: {drawerData?.resourceId}
                </h3>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {drawerLoading ? (
              <div className="flex items-center justify-center py-20 text-slate-400 text-xs">
                <RefreshCw className="w-4 h-4 animate-spin mr-2 text-cyan-400" />
                Aggregating 360-degree context...
              </div>
            ) : (
              <div className="space-y-5 text-xs">
                {/* Current Risk Details */}
                {drawerData?.context?.currentRisk && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Current Risk</span>
                    <p className="text-sm font-semibold text-white">{drawerData.context.currentRisk.title}</p>
                    <p className="text-slate-300">{drawerData.context.currentRisk.description}</p>
                    <div className="flex gap-4 pt-2 font-mono text-slate-400">
                      <span>Score: {drawerData.context.currentRisk.risk_score}</span>
                      <span>Severity: {drawerData.context.currentRisk.severity}</span>
                      <span>Status: {drawerData.context.currentRisk.status}</span>
                    </div>
                  </div>
                )}

                {/* Prediction Details */}
                {drawerData?.context?.prediction && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-amber-400">ML Forecast Trajectory</span>
                    <div className="flex justify-between font-mono">
                      <span>Trend: {drawerData.context.prediction.trajectory_trend}</span>
                      <span>Critical Prob: {Math.round((drawerData.context.prediction.critical_probability || 0) * 100)}%</span>
                    </div>
                  </div>
                )}

                {/* Direct Navigation Links */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Direct Module Links</span>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link
                      to="/risk-manager/risks"
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1.5"
                    >
                      Risk Registry <ExternalLink className="w-3 h-3" />
                    </Link>
                    <Link
                      to="/risk-manager/agent"
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1.5"
                    >
                      AI Agent <ExternalLink className="w-3 h-3" />
                    </Link>
                    <Link
                      to="/workflow-manager"
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1.5"
                    >
                      Workflows <ExternalLink className="w-3 h-3" />
                    </Link>
                    <Link
                      to="/decision-center"
                      className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center gap-1.5"
                    >
                      Decision Center <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Embedded AI Risk Copilot Modal */}
      {copilotOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base text-white">Global AI Risk Copilot</h3>
                <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Phase 5 Integrated
                </span>
              </div>
              <button
                onClick={() => setCopilotOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Prompt Chips */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Suggested Inquiries</span>
              <div className="flex flex-wrap gap-2">
                {[
                  "What needs my attention today?",
                  "What are the three most urgent risks?",
                  "Which workflows are overdue?",
                  "Why is our risk exposure increasing?"
                ].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => {
                      setCopilotGoal(chip);
                      runCopilot(chip);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Input & Run */}
            <div className="flex gap-2">
              <input
                type="text"
                value={copilotGoal}
                onChange={(e) => setCopilotGoal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runCopilot()}
                placeholder="Ask the AI Risk Agent anything across your enterprise..."
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => runCopilot()}
                disabled={copilotLoading || !copilotGoal.trim()}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white flex items-center gap-1.5"
              >
                {copilotLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Ask
              </button>
            </div>

            {/* Response Area */}
            {copilotError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                {copilotError}
              </div>
            )}

            {copilotResponse && (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 max-h-60 overflow-y-auto">
                <div className="flex items-center justify-between text-xs border-b border-slate-900 pb-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Agent Response
                  </span>
                  <Link
                    to={`/risk-manager/agent/runs/${copilotResponse.agent_run_id}`}
                    className="text-indigo-400 hover:underline flex items-center gap-1 text-[11px]"
                  >
                    View Run #{copilotResponse.agent_run_id} <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
                <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                  {copilotResponse.final_response || 'Investigation completed.'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
