import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ClipboardList, Play, Pause, CheckCircle2, XCircle, Clock,
  AlertTriangle, ArrowRight, RefreshCw, Plus, ShieldCheck,
  RotateCcw, Eye, ShieldAlert, CheckCheck
} from 'lucide-react';

export default function WorkflowDashboard() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const token = localStorage.getItem('token') || '';

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ovRes, instRes] = await Promise.all([
        fetch('/api/workflow-manager/overview', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/workflows/instances', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (ovRes.ok) {
        const ovJson = await ovRes.json();
        setOverview(ovJson.data || {});
      }
      if (instRes.ok) {
        const instJson = await instRes.json();
        setInstances(instJson.data || []);
      }
    } catch (err) {
      console.error('Failed to load workflow dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRetry = async (instanceId, e) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/workflows/instances/${instanceId}/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast(`Workflow ${instanceId} retry initiated.`);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredInstances = instances.filter(i => {
    if (statusFilter === 'ALL') return true;
    return i.status === statusFilter;
  });

  const activeCount = overview?.active_workflows ?? instances.filter(i => i.status === 'RUNNING').length;
  const pendingApprovalsCount = overview?.pending_approvals ?? instances.filter(i => i.status === 'WAITING_FOR_APPROVAL').length;
  const overdueCount = overview?.overdue_workflows ?? 0;
  const completedTodayCount = overview?.completed_today ?? 0;
  const failedCount = overview?.failed_workflows ?? instances.filter(i => i.status === 'FAILED').length;
  const escalatedCount = overview?.escalated_workflows ?? instances.filter(i => i.status === 'ESCALATED').length;
  const successRate = overview?.success_rate ?? 100.0;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Toast Notification */}
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
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Workflow Automation Manager</h1>
              <p className="text-sm text-slate-500">
                Automated, policy-driven task execution, deadline tracking, and reviewer governance.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/alerts"
            className="flex items-center space-x-1.5 px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold rounded-xl text-sm transition"
          >
            <span>Alert Center</span>
          </Link>
          <Link
            to="/workflow-manager/builder"
            className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-forest-500 hover:from-emerald-700 text-white font-semibold rounded-xl text-sm shadow transition"
          >
            <Plus className="h-4 w-4" />
            <span>Workflow Builder</span>
          </Link>
          <button
            onClick={fetchData}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition"
            title="Refresh dashboard"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active</span>
            <Play className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-800 mt-2">{activeCount}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Executing steps</p>
        </div>

        <div className="bg-white border border-amber-200 rounded-2xl p-4 shadow-sm bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Approvals</span>
            <ShieldCheck className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-extrabold text-amber-700 mt-2">{pendingApprovalsCount}</p>
          <p className="text-[11px] text-amber-600 mt-0.5">Paused for reviewer</p>
        </div>

        <div className="bg-white border border-red-200 rounded-2xl p-4 shadow-sm bg-red-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Overdue</span>
            <Clock className="h-4 w-4 text-red-500" />
          </div>
          <p className="text-2xl font-extrabold text-red-700 mt-2">{overdueCount}</p>
          <p className="text-[11px] text-red-500 mt-0.5">Past deadline</p>
        </div>

        <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm bg-emerald-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-700 mt-2">{completedTodayCount}</p>
          <p className="text-[11px] text-emerald-600 mt-0.5">Resolved today</p>
        </div>

        <div className="bg-white border border-purple-200 rounded-2xl p-4 shadow-sm bg-purple-50/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Escalated</span>
            <ShieldAlert className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-2xl font-extrabold text-purple-700 mt-2">{escalatedCount}</p>
          <p className="text-[11px] text-purple-600 mt-0.5">Manager tiers</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Success Rate</span>
            <CheckCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-800 mt-2">{successRate}%</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Resolution reliability</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3 overflow-x-auto">
        {['ALL', 'RUNNING', 'WAITING_FOR_APPROVAL', 'COMPLETED', 'ESCALATED', 'FAILED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition ${
              statusFilter === st
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {st.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Instances Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="font-bold text-slate-800 text-sm">Workflow Instances ({filteredInstances.length})</span>
          <span className="text-xs text-slate-400">Deterministic Execution Engine</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600" />
            Loading workflow instances...
          </div>
        ) : filteredInstances.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <ClipboardList className="h-8 w-8 mx-auto mb-2 text-slate-300" />
            No workflow instances in current state filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-6">Instance ID</th>
                  <th className="py-3 px-6">Workflow / Trigger</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6">Step</th>
                  <th className="py-3 px-6">Deadline</th>
                  <th className="py-3 px-6">Started</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInstances.map((inst) => {
                  const instId = inst.instance_id || inst.instanceId || inst._id;
                  const statusBadge =
                    inst.status === 'RUNNING' ? 'bg-emerald-100 text-emerald-800' :
                    inst.status === 'WAITING_FOR_APPROVAL' ? 'bg-amber-100 text-amber-800' :
                    inst.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                    inst.status === 'ESCALATED' ? 'bg-purple-100 text-purple-800' :
                    inst.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                    'bg-slate-100 text-slate-600';

                  return (
                    <tr
                      key={instId}
                      onClick={() => navigate(`/workflow-manager/instances/${instId}`)}
                      className="hover:bg-slate-50/80 cursor-pointer transition"
                    >
                      <td className="py-3.5 px-6 font-mono font-bold text-slate-800">
                        {instId.slice(0, 16)}...
                      </td>
                      <td className="py-3.5 px-6">
                        <div className="font-semibold text-slate-800">{inst.workflow_id || inst.workflowId}</div>
                        <div className="text-[11px] text-slate-400">
                          {inst.risk_id ? `Risk: ${inst.risk_id}` : inst.event_id ? `Event: ${inst.event_id}` : 'Manual Trigger'}
                        </div>
                      </td>
                      <td className="py-3.5 px-6">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${statusBadge}`}>
                          {inst.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-medium text-slate-700">
                        Step {inst.current_step ?? inst.currentStep ?? 0}
                      </td>
                      <td className="py-3.5 px-6">
                        {inst.deadline?.due_at ? (
                          <div className="flex items-center space-x-1 text-slate-500">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>{new Date(inst.deadline.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-slate-400 text-[11px]">
                        {inst.started_at ? new Date(inst.started_at).toLocaleDateString() : ''}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {['FAILED', 'CANCELLED'].includes(inst.status) && (
                            <button
                              onClick={(e) => handleRetry(instId, e)}
                              className="p-1 text-slate-500 hover:text-emerald-600 rounded"
                              title="Retry workflow"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <span className="text-emerald-700 font-bold hover:underline flex items-center space-x-0.5">
                            <span>Inspect</span>
                            <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
