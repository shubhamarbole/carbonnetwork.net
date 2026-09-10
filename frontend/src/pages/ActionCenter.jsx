import React, { useState, useEffect } from 'react';
import { 
  CheckSquare, AlertTriangle, Clock, ArrowRight, ShieldAlert, 
  UploadCloud, FileText, CheckCircle2, UserCheck, RefreshCw, Filter, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ActionCenter() {
  const { token, user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState({ critical: 0, high: 0, medium: 0, open: 0 });
  const [loading, setLoading] = useState(true);
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [selectedTask, setSelectedTask] = useState(null);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/action-center', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && json.data) {
        setTasks(json.data.tasks || []);
        setSummary(json.data.summary || {});
      }
    } catch (err) {
      console.error('Failed to load Action Center tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [token]);

  const handleExecuteAction = async (taskId, action, comment = '') => {
    setSubmittingAction(true);
    setActionSuccess('');
    setActionError('');
    try {
      const res = await fetch(`/api/action-center/${taskId}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action, comment })
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess(`Success: ${json.message}`);
        // Remove task or update status locally
        setTasks(prev => prev.filter(t => t.id !== taskId));
        setTimeout(() => setActionSuccess(''), 4000);
      } else {
        setActionError(json.message || 'Action failed');
      }
    } catch (err) {
      setActionError(err.message || 'Failed to execute action');
    } finally {
      setSubmittingAction(false);
      setSelectedTask(null);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (filterPriority !== 'ALL' && t.priority !== filterPriority) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl border border-amber-500/20">
              <CheckSquare className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Action Center</h1>
              <p className="text-xs text-slate-500 font-medium">
                Automated ESG Remediation, Verification & Task Execution Hub
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchTasks}
            disabled={loading}
            className="flex items-center space-x-2 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Tasks</span>
          </button>
        </div>
      </div>

      {/* Notifications banner */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs font-bold rounded-r-xl flex items-center justify-between">
          <span>{actionSuccess}</span>
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        </div>
      )}
      {actionError && (
        <div className="p-3.5 bg-red-50 border-l-4 border-red-500 text-red-800 text-xs font-bold rounded-r-xl">
          {actionError}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Actions</span>
            <span className="p-1 bg-slate-100 rounded-lg text-slate-600"><CheckSquare className="h-4 w-4" /></span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">{tasks.length}</span>
            <span className="text-xs text-slate-400 font-medium">pending</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-red-100 bg-red-50/20 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider">Critical Priority</span>
            <span className="p-1 bg-red-100 rounded-lg text-red-600"><AlertTriangle className="h-4 w-4" /></span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-red-600">{summary.critical || 0}</span>
            <span className="text-xs text-red-500 font-medium">requires fix</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-amber-100 bg-amber-50/20 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">High Priority</span>
            <span className="p-1 bg-amber-100 rounded-lg text-amber-600"><Clock className="h-4 w-4" /></span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-amber-600">{summary.high || 0}</span>
            <span className="text-xs text-amber-500 font-medium">due &lt; 7 days</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-forest-100 bg-forest-50/20 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-forest-700 uppercase tracking-wider">Verification Tasks</span>
            <span className="p-1 bg-forest-100 rounded-lg text-forest-700"><CheckCircle2 className="h-4 w-4" /></span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-forest-700">
              {tasks.filter(t => t.actionType === 'REVIEW').length}
            </span>
            <span className="text-xs text-forest-600 font-medium">in queue</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2 flex items-center space-x-1">
          <Filter className="h-3.5 w-3.5" />
          <span>Priority:</span>
        </span>
        {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map(p => (
          <button
            key={p}
            onClick={() => setFilterPriority(p)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filterPriority === p 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-forest-500" />
            <p className="text-xs font-semibold">Scanning database for automated action items...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl inline-block mb-3">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">All Action Items Clear</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No outstanding corrections, missing evidence, or overdue submissions found for this organization.
            </p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <div 
              key={task.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm transition space-y-3"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                      task.priority === 'CRITICAL' ? 'bg-red-100 text-red-700 border border-red-200' :
                      task.priority === 'HIGH' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                      'bg-blue-100 text-blue-700 border border-blue-200'
                    }`}>
                      {task.priority}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {task.module}
                    </span>
                    <span className="text-xs font-bold text-slate-400 font-mono">
                      Due: {task.dueDate}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">{task.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{task.description}</p>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0 pt-2 md:pt-0">
                  {task.actionType === 'FIX_NOW' && (
                    <button
                      onClick={() => handleExecuteAction(task.id, 'FIX_NOW', 'Discrepancy corrected')}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      [Fix Now]
                    </button>
                  )}
                  {task.actionType === 'UPLOAD_EVIDENCE' && (
                    <button
                      onClick={() => handleExecuteAction(task.id, 'UPLOAD_EVIDENCE', 'Evidence receipt uploaded')}
                      className="px-3 py-1.5 bg-forest-600 hover:bg-forest-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center space-x-1"
                    >
                      <UploadCloud className="h-3.5 w-3.5" />
                      <span>[Upload Evidence]</span>
                    </button>
                  )}
                  {task.actionType === 'REVIEW' && (
                    <button
                      onClick={() => handleExecuteAction(task.id, 'REVIEW', 'Audit review completed')}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      [Review]
                    </button>
                  )}
                  {task.actionType === 'ESCALATE' && (
                    <button
                      onClick={() => handleExecuteAction(task.id, 'ESCALATE', 'Target escalated')}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      [Escalate]
                    </button>
                  )}

                  <button
                    onClick={() => handleExecuteAction(task.id, 'COMPLETE', 'Resolved by user')}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    [Complete]
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-2.5">
                <span>Assigned: <strong className="text-slate-600">{task.owner}</strong></span>
                <span>Created: <span className="font-mono">{task.createdDate}</span></span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
