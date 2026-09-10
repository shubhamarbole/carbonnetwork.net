import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell, AlertTriangle, ShieldAlert, CheckCircle2, Clock,
  Filter, Search, UserCheck, Check, X, Bot, ArrowUpRight,
  RefreshCw, ChevronRight, CheckCheck, User
} from 'lucide-react';

export default function AlertCenter() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [toastMsg, setToastMsg] = useState(null);
  const [assigningAlertId, setAssigningAlertId] = useState(null);
  const [assigneeEmail, setAssigneeEmail] = useState('');

  const token = localStorage.getItem('token') || '';

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      let url = '/api/alerts?limit=100';
      if (severityFilter !== 'ALL') url += `&severity=${severityFilter}`;
      if (statusFilter !== 'ALL') url += `&status=${statusFilter}`;
      if (typeFilter !== 'ALL') url += `&type=${typeFilter}`;
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setAlerts(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [severityFilter, statusFilter, typeFilter]);

  const handleAcknowledge = async (id) => {
    try {
      const res = await fetch(`/api/alerts/${id}/acknowledge`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Alert acknowledged successfully.');
        fetchAlerts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolve = async (id) => {
    try {
      const res = await fetch(`/api/alerts/${id}/resolve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Alert resolved successfully.');
        fetchAlerts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDismiss = async (id) => {
    try {
      const res = await fetch(`/api/alerts/${id}/dismiss`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Alert dismissed.');
        fetchAlerts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssign = async (id) => {
    if (!assigneeEmail.trim()) return;
    try {
      const res = await fetch(`/api/alerts/${id}/assign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ assignedTo: assigneeEmail.trim() })
      });
      if (res.ok) {
        showToast(`Alert assigned to ${assigneeEmail.trim()}.`);
        setAssigningAlertId(null);
        setAssigneeEmail('');
        fetchAlerts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const totalCount = alerts.length;
  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length;
  const newCount = alerts.filter(a => a.status === 'NEW').length;
  const resolvedCount = alerts.filter(a => a.status === 'RESOLVED').length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2">
          <CheckCheck className="h-4 w-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-red-100 text-red-700 rounded-xl">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Operational Alert Center</h1>
              <p className="text-sm text-slate-500">
                Triage, investigate, and automate workflows from monitored platform events.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/workflow-manager"
            className="flex items-center space-x-1.5 px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl text-sm transition"
          >
            <span>Workflow Manager</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
          <button
            onClick={fetchAlerts}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition"
            title="Refresh alerts"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Alerts</span>
            <Bell className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-3xl font-extrabold text-slate-800 mt-2">{totalCount}</p>
          <p className="text-xs text-slate-400 mt-1">Operational notifications</p>
        </div>

        <div className="bg-white border border-red-200 rounded-2xl p-5 shadow-sm bg-red-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Critical Severity</span>
            <ShieldAlert className="h-4 w-4 text-red-500" />
          </div>
          <p className="text-3xl font-extrabold text-red-700 mt-2">{criticalCount}</p>
          <p className="text-xs text-red-500 mt-1">Requires immediate action</p>
        </div>

        <div className="bg-white border border-amber-200 rounded-2xl p-5 shadow-sm bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">New (Unreviewed)</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-3xl font-extrabold text-amber-700 mt-2">{newCount}</p>
          <p className="text-xs text-amber-600 mt-1">Awaiting acknowledgment</p>
        </div>

        <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Resolved</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-3xl font-extrabold text-emerald-700 mt-2">{resolvedCount}</p>
          <p className="text-xs text-emerald-600 mt-1">Successfully mitigated</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search alerts by title or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchAlerts()}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Severity */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="DISMISSED">Dismissed</option>
          </select>

          {/* Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Types</option>
            <option value="CRITICAL_RISK">Critical Risk</option>
            <option value="HIGH_RISK">High Risk</option>
            <option value="RISK_ESCALATION">Risk Escalation</option>
            <option value="COMPLIANCE">Compliance</option>
            <option value="ESG">ESG</option>
            <option value="CARBON">Carbon</option>
            <option value="SUPPLIER">Supplier</option>
            <option value="MONITORING">Monitoring</option>
          </select>
        </div>
      </div>

      {/* Alerts Stream List */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600" />
            Loading operational alerts...
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <Bell className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            No alerts matching current filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {alerts.map((alert) => {
              const alertId = alert.alert_id || alert.alertId || alert._id;
              const severityBadge =
                alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-800 border-red-200' :
                alert.severity === 'HIGH' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                alert.severity === 'MEDIUM' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                'bg-slate-100 text-slate-800 border-slate-200';

              const statusBadge =
                alert.status === 'NEW' ? 'bg-red-50 text-red-700 border-red-200' :
                alert.status === 'ACKNOWLEDGED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                alert.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                alert.status === 'RESOLVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                'bg-slate-50 text-slate-500 border-slate-200';

              return (
                <div key={alertId} className="p-5 hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full border ${severityBadge}`}>
                        {alert.severity}
                      </span>
                      <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${statusBadge}`}>
                        {alert.status}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {alert.type}
                      </span>
                      <span className="text-xs text-slate-400">
                        {alert.created_at ? new Date(alert.created_at).toLocaleString() : ''}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-800 text-base">{alert.title}</h3>
                    {alert.description && (
                      <p className="text-xs text-slate-500 line-clamp-2">{alert.description}</p>
                    )}

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                      {alert.assigned_to || alert.assignedTo ? (
                        <div className="flex items-center space-x-1 text-slate-600">
                          <User className="h-3.5 w-3.5 text-slate-400" />
                          <span>Assigned: <strong className="text-slate-800">{alert.assigned_to || alert.assignedTo}</strong></span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}

                      {alert.risk_id && (
                        <Link
                          to={`/risk-manager/risks/${alert.risk_id}`}
                          className="text-emerald-700 hover:text-emerald-800 font-semibold flex items-center space-x-1"
                        >
                          <span>Risk: {alert.risk_id}</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      )}

                      {alert.event_id && (
                        <Link
                          to={`/risk-manager/monitoring/events/${alert.event_id}`}
                          className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center space-x-1"
                        >
                          <span>Event: {alert.event_id}</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 md:pt-0">
                    {alert.status === 'NEW' && (
                      <button
                        onClick={() => handleAcknowledge(alertId)}
                        className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-xl border border-amber-200 transition min-h-[40px] flex items-center justify-center"
                      >
                        Acknowledge
                      </button>
                    )}

                    {['NEW', 'ACKNOWLEDGED', 'IN_PROGRESS'].includes(alert.status) && (
                      <button
                        onClick={() => handleResolve(alertId)}
                        className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200 transition min-h-[40px] flex items-center justify-center"
                      >
                        Resolve
                      </button>
                    )}

                    {alert.status !== 'DISMISSED' && (
                      <button
                        onClick={() => handleDismiss(alertId)}
                        className="px-3.5 py-2 hover:bg-slate-100 text-slate-500 text-xs font-semibold rounded-xl transition min-h-[40px] flex items-center justify-center"
                      >
                        Dismiss
                      </button>
                    )}

                    {/* Assign Action */}
                    {assigningAlertId === alertId ? (
                      <div className="flex items-center space-x-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                        <input
                          type="email"
                          placeholder="Assignee email..."
                          value={assigneeEmail}
                          onChange={(e) => setAssigneeEmail(e.target.value)}
                          className="text-xs px-2 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none min-h-[36px]"
                        />
                        <button
                          onClick={() => handleAssign(alertId)}
                          className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 min-h-[36px] min-w-[36px] flex items-center justify-center"
                          title="Confirm assignment"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setAssigningAlertId(null)}
                          className="p-2 text-slate-400 hover:text-slate-600 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setAssigningAlertId(alertId);
                          setAssigneeEmail(alert.assigned_to || alert.assignedTo || '');
                        }}
                        className="p-2.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-xl transition min-h-[40px] min-w-[40px] flex items-center justify-center"
                        title="Assign to user"
                      >
                        <UserCheck className="h-4 w-4" />
                      </button>
                    )}

                    {/* Proactive Agent Investigate */}
                    <Link
                      to={`/risk-manager/agent?goal=${encodeURIComponent(`Investigate operational alert: ${alert.title}. Suggest mitigation and resolution steps.`)}`}
                      className="px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-xl border border-purple-200 transition flex items-center space-x-1.5 min-h-[40px]"
                      title="Investigate with AI Agent"
                    >
                      <Bot className="h-3.5 w-3.5" />
                      <span>AI Investigate</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
