import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ClipboardList, ArrowLeft, CheckCircle2, Clock, XCircle, AlertTriangle,
  RotateCcw, ShieldCheck, Check, X, ShieldAlert, ArrowUpRight, RefreshCw,
  CheckCheck
} from 'lucide-react';

export default function WorkflowInstanceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [instance, setInstance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approvalComment, setApprovalComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const token = localStorage.getItem('token') || '';

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const fetchInstance = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/workflows/instances/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setInstance(json.data);
      }
    } catch (err) {
      console.error('Failed to load workflow instance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstance();
  }, [id]);

  const handleApprove = async () => {
    try {
      setSubmitting(true);
      const res = await fetch(`/api/workflows/instances/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ comment: approvalComment })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast('Workflow step approved and execution resumed.');
        fetchInstance();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    try {
      setSubmitting(true);
      const res = await fetch(`/api/workflows/instances/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ comment: approvalComment || 'Rejected by reviewer' })
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast('Workflow step rejected. Instance halted.');
        fetchInstance();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    try {
      const res = await fetch(`/api/workflows/instances/${id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: 'Manual cancellation by user' })
      });
      if (res.ok) {
        showToast('Workflow cancelled.');
        fetchInstance();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRetry = async () => {
    try {
      const res = await fetch(`/api/workflows/instances/${id}/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Workflow retry initiated.');
        fetchInstance();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 text-sm">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-emerald-600" />
        Loading workflow instance execution history...
      </div>
    );
  }

  if (!instance) {
    return (
      <div className="p-12 text-center text-slate-500 space-y-3">
        <AlertTriangle className="h-8 w-8 mx-auto text-amber-500" />
        <h2 className="text-lg font-bold text-slate-800">Workflow Instance Not Found</h2>
        <Link to="/workflow-manager" className="text-sm font-semibold text-emerald-700 hover:underline">
          Return to Workflow Manager
        </Link>
      </div>
    );
  }

  const steps = instance.steps || [];
  const statusBadge =
    instance.status === 'RUNNING' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
    instance.status === 'WAITING_FOR_APPROVAL' ? 'bg-amber-100 text-amber-800 border-amber-200' :
    instance.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800 border-blue-200' :
    instance.status === 'ESCALATED' ? 'bg-purple-100 text-purple-800 border-purple-200' :
    instance.status === 'FAILED' ? 'bg-red-100 text-red-800 border-red-200' :
    'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 animate-fadeIn">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2">
          <CheckCheck className="h-4 w-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Navigation Header */}
      <div className="flex items-center space-x-3 text-slate-500 hover:text-slate-800 transition">
        <button onClick={() => navigate('/workflow-manager')} className="flex items-center space-x-1 text-sm font-semibold">
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Workflows</span>
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-slate-800">Workflow Execution Instance</h1>
            <span className={`px-3 py-0.5 rounded-full text-xs font-bold border ${statusBadge}`}>
              {instance.status}
            </span>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-1">ID: {instance.instance_id || instance.instanceId}</p>
        </div>

        <div className="flex items-center space-x-2">
          {['FAILED', 'CANCELLED'].includes(instance.status) && (
            <button
              onClick={handleRetry}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs shadow transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Retry Workflow</span>
            </button>
          )}

          {['RUNNING', 'WAITING_FOR_APPROVAL'].includes(instance.status) && (
            <button
              onClick={handleCancel}
              className="flex items-center space-x-1.5 px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold rounded-xl text-xs transition"
            >
              <X className="h-3.5 w-3.5" />
              <span>Cancel</span>
            </button>
          )}

          <button
            onClick={fetchInstance}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Approval Banner */}
      {instance.status === 'WAITING_FOR_APPROVAL' && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-amber-200 text-amber-900 rounded-xl">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900 text-base">Human-In-The-Loop Review Required</h3>
              <p className="text-xs text-amber-800 mt-0.5">
                This workflow has reached a sensitive action step that requires explicit authorization before execution can proceed.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-amber-900 mb-1">Reviewer Note / Decision Rationale</label>
            <textarea
              rows={2}
              placeholder="Add optional comments or verification details..."
              value={approvalComment}
              onChange={(e) => setApprovalComment(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={handleReject}
              disabled={submitting}
              className="px-4 py-2 bg-white border border-red-200 text-red-700 hover:bg-red-50 text-xs font-bold rounded-xl transition flex items-center space-x-1.5"
            >
              <X className="h-3.5 w-3.5" />
              <span>Reject & Halt Workflow</span>
            </button>

            <button
              onClick={handleApprove}
              disabled={submitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition flex items-center space-x-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Approve & Resume Execution</span>
            </button>
          </div>
        </div>
      )}

      {/* Metadata Grid */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Workflow Definition</span>
          <span className="font-bold text-slate-800 mt-1 block">{instance.workflow_id || instance.workflowId}</span>
        </div>

        <div>
          <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Context / Linked</span>
          <div className="mt-1 space-y-0.5">
            {instance.risk_id && (
              <Link to={`/risk-manager/risks/${instance.risk_id}`} className="text-emerald-700 hover:underline font-semibold block">
                Risk: {instance.risk_id}
              </Link>
            )}
            {instance.event_id && (
              <Link to={`/risk-manager/monitoring/events/${instance.event_id}`} className="text-indigo-600 hover:underline font-semibold block">
                Event: {instance.event_id}
              </Link>
            )}
            {!instance.risk_id && !instance.event_id && (
              <span className="text-slate-400 italic">None</span>
            )}
          </div>
        </div>

        <div>
          <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Resolution Deadline</span>
          <div className="mt-1 font-semibold text-slate-700 flex items-center space-x-1">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>{instance.deadline?.due_at ? new Date(instance.deadline.due_at).toLocaleString() : 'None configured'}</span>
          </div>
        </div>

        <div>
          <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">Execution Timing</span>
          <span className="font-semibold text-slate-700 mt-1 block">
            Started: {instance.started_at ? new Date(instance.started_at).toLocaleTimeString() : ''}
          </span>
        </div>
      </div>

      {/* Stepper Execution Logs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">
          Step Execution Stepper ({steps.length} Steps)
        </h3>

        {steps.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No step details recorded for this instance.
          </div>
        ) : (
          <div className="space-y-4">
            {steps.map((step, idx) => {
              const stepBadge =
                step.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                step.status === 'WAITING' ? 'bg-amber-100 text-amber-800' :
                step.status === 'RUNNING' ? 'bg-blue-100 text-blue-800' :
                step.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                'bg-slate-100 text-slate-500';

              return (
                <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-start space-x-3">
                  <div className="mt-0.5">
                    {step.status === 'COMPLETED' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : step.status === 'WAITING' ? (
                      <Clock className="h-5 w-5 text-amber-600 animate-pulse" />
                    ) : step.status === 'FAILED' ? (
                      <XCircle className="h-5 w-5 text-red-600" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-slate-300" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-slate-800">
                          Step {step.step_number || step.stepNumber}: {step.action_type || step.actionType}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${stepBadge}`}>
                          {step.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {step.completed_at || step.completedAt
                          ? new Date(step.completed_at || step.completedAt).toLocaleTimeString()
                          : ''}
                      </span>
                    </div>

                    {step.result_summary && (
                      <p className="text-xs text-slate-600 font-medium">{step.result_summary}</p>
                    )}

                    {step.error && (
                      <p className="text-xs text-red-600 font-semibold">{step.error}</p>
                    )}
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
