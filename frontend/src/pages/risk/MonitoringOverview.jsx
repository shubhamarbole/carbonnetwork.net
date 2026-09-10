import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity, ShieldAlert, AlertTriangle, CheckCircle2, Clock,
  RefreshCw, Play, ArrowRight, Settings, Bot, Bell, Filter, Check, ShieldCheck
} from 'lucide-react';

export default function MonitoringOverview() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [events, setEvents] = useState([]);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sweeping, setSweeping] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('token') || '';

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [ovRes, evRes, ruRes] = await Promise.all([
        fetch('/api/monitoring/overview', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/monitoring/events?limit=25', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/monitoring/rules', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (ovRes.ok) {
        const ovJson = await ovRes.json();
        setOverview(ovJson.data);
      }
      if (evRes.ok) {
        const evJson = await evRes.json();
        setEvents(evJson.data || []);
      }
      if (ruRes.ok) {
        const ruJson = await ruRes.json();
        setRules(ruJson.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load monitoring data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRunSweep = async () => {
    try {
      setSweeping(true);
      const res = await fetch('/api/monitoring/sweep', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Sweep completed: ${data.data?.eventsProcessed || 0} events processed, ${data.data?.aiTriggers || 0} AI investigations triggered.`);
        fetchData();
      } else {
        showToast(`Sweep failed: ${data.message || 'Unknown error'}`);
      }
    } catch (err) {
      showToast(`Error running sweep: ${err.message}`);
    } finally {
      setSweeping(false);
    }
  };

  const handleInvestigate = async (eventId) => {
    try {
      const res = await fetch(`/api/monitoring/events/${eventId}/investigate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ notes: 'Manual investigation triggered from overview' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`AI Investigation launched (Run ID: ${data.data?.agentRunId})`);
        fetchData();
      } else {
        showToast(`Investigation failed: ${data.message}`);
      }
    } catch (err) {
      showToast(`Error: ${err.message}`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 transition-all animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-medium">{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <Activity className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Proactive Monitoring & Event Detection</h1>
              <p className="text-sm text-gray-500">Deterministic continuous sweeps, multi-domain anomaly triggers, and AI agent investigation</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunSweep}
            disabled={sweeping}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-sm transition-all disabled:opacity-50"
          >
            <Play className={`w-4 h-4 ${sweeping ? 'animate-spin' : ''}`} />
            {sweeping ? 'Executing Sweep...' : 'Run Sweep Now'}
          </button>
          <Link
            to="/risk-manager/monitoring/rules"
            className="flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
          >
            <Settings className="w-4 h-4" />
            Manage Rules
          </Link>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-lg"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Events Today */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Events Today</span>
            <Activity className="w-5 h-5 text-blue-500" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">{overview?.events_today ?? 0}</p>
          <p className="mt-1 text-xs text-gray-500">{overview?.critical_events ?? 0} critical/high events</p>
        </div>

        {/* Active Rules */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Active Rules</span>
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">{overview?.active_rules ?? rules.length}</p>
          <p className="mt-1 text-xs text-gray-500">19 monitored event types</p>
        </div>

        {/* Triggered Alerts */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Triggered Alerts</span>
            <Bell className="w-5 h-5 text-amber-500" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">{overview?.triggered_alerts ?? 0}</p>
          <p className="mt-1 text-xs text-gray-500">Dispatched to alert queue</p>
        </div>

        {/* AI Investigations */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">AI Investigations</span>
            <Bot className="w-5 h-5 text-purple-500" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">{overview?.ai_investigations ?? 0}</p>
          <p className="mt-1 text-xs text-gray-500">Autonomous & manual</p>
        </div>

        {/* Engine Health */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Engine Health</span>
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600">
            {overview?.monitoring_status || 'HEALTHY'}
          </p>
          <p className="mt-1 text-xs text-gray-500 truncate">
            Last: {overview?.last_run ? new Date(overview.last_run).toLocaleTimeString() : 'Automated sweeps active'}
          </p>
        </div>
      </div>

      {/* Main Content Grid: Recent Events (Left 2/3) + Quick Rules (Right 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events Table Section */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-gray-900">Recent Monitored Events</h2>
            </div>
            <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-2.5 py-1 rounded-full">
              {events.length} Detected
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            {events.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <ShieldCheck className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                <p className="text-sm">No recent events detected. Run an on-demand sweep to evaluate state.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 font-medium text-xs uppercase border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">Event Type</th>
                    <th className="px-4 py-3">Resource</th>
                    <th className="px-4 py-3">Current / Transition</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Detected</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {events.map((ev) => (
                    <tr key={ev.eventId || ev._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          ev.eventType.includes('ESCALATED') || ev.eventType.includes('MISSED') || ev.eventType.includes('EXCEEDED')
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {ev.eventType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        <span className="font-medium text-gray-900">{ev.resourceType}</span>
                        <br />
                        <span className="text-gray-400 truncate block max-w-[120px]">{ev.resourceId}</span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {ev.previousValue !== null && ev.previousValue !== undefined ? (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400 line-through">{String(ev.previousValue)}</span>
                            <span>→</span>
                            <span className="font-semibold text-gray-900">{String(ev.currentValue)}</span>
                          </div>
                        ) : (
                          <span className="font-semibold text-gray-900">{String(ev.currentValue || 'N/A')}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                          ev.status === 'PROCESSED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : ev.status === 'IGNORED'
                            ? 'bg-gray-100 text-gray-600'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {ev.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {ev.detectedAt ? new Date(ev.detectedAt).toLocaleTimeString() : ''}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {ev.aiAgentRunId ? (
                            <Link
                              to={`/risk-manager/agent?runId=${ev.aiAgentRunId}`}
                              className="text-xs bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 px-2 py-1 rounded flex items-center gap-1"
                              title="View AI Agent Run"
                            >
                              <Bot className="w-3.5 h-3.5" />
                              Run
                            </Link>
                          ) : (
                            <button
                              onClick={() => handleInvestigate(ev.eventId)}
                              className="text-xs bg-gray-50 text-gray-700 hover:bg-gray-100 px-2 py-1 rounded border border-gray-200 flex items-center gap-1"
                              title="Investigate with AI"
                            >
                              <Bot className="w-3.5 h-3.5" />
                              Investigate
                            </button>
                          )}
                          <Link
                            to={`/risk-manager/monitoring/events/${ev.eventId}`}
                            className="text-xs text-emerald-600 hover:text-emerald-800 font-medium px-1.5 py-1"
                          >
                            Details
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Active Rules Section (Right 1/3) */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-gray-900">Active Rules</h2>
            </div>
            <Link to="/risk-manager/monitoring/rules" className="text-xs text-emerald-600 hover:underline font-medium">
              View All
            </Link>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {rules.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">No rules configured yet.</p>
            ) : (
              rules.slice(0, 6).map((rule) => (
                <div key={rule.ruleId || rule._id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900 truncate">{rule.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      rule.action === 'TRIGGER_AI_AGENT' ? 'bg-purple-100 text-purple-700' :
                      rule.action === 'TRIGGER_AI_ANALYSIS' ? 'bg-blue-100 text-blue-700' :
                      rule.action === 'CREATE_ALERT' ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {rule.action.replace('TRIGGER_', '')}
                    </span>
                  </div>
                  <p className="text-gray-500 mt-1 line-clamp-1">{rule.description || 'Target event: ' + rule.eventType}</p>
                  <div className="mt-2 flex items-center justify-between text-gray-400 text-[11px]">
                    <span>Event: <strong className="text-gray-700">{rule.eventType}</strong></span>
                    <span className={rule.enabled ? 'text-emerald-600 font-semibold' : 'text-gray-400'}>
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100">
            <Link
              to="/risk-manager/monitoring/rules"
              className="w-full text-center block text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 py-2 rounded-lg font-medium transition"
            >
              + Create or Edit Monitoring Rules
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
