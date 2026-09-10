import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Bot, ArrowLeft, CheckCircle2, AlertTriangle, AlertCircle, Clock,
  Layers, Cpu, ShieldCheck, Database, FileText, Check, X, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAuthStore } from '../../store/authStore';

export default function RiskAgentRunDetail() {
  const { id } = useParams();
  const { token: ctxToken } = useAuth();
  const token = ctxToken || useAuthStore.getState().token || localStorage.getItem('esg_super_admin_token') || localStorage.getItem('token') || '';
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approving, setApproving] = useState(false);
  const [approvalActionError, setApprovalActionError] = useState(null);

  const fetchRunDetail = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/ai-agent/runs/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setRun(json.data);
      } else {
        setError(json.message || `Failed to fetch run '${id}'.`);
      }
    } catch (err) {
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (approvalId, action) => {
    try {
      setApproving(true);
      setApprovalActionError(null);
      const res = await fetch(`/api/ai-agent/approvals/${approvalId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: `Operator ${action}ed via Run Detail UI` })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || `Failed to ${action} approval.`);
      }
      await fetchRunDetail();
    } catch (err) {
      setApprovalActionError(err.message);
    } finally {
      setApproving(false);
    }
  };

  useEffect(() => {
    fetchRunDetail();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading agent run details...</span>
        </div>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8 space-y-4">
        <Link
          to="/risk-manager/agent"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Agent Workspace
        </Link>
        <div className="p-6 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
          <p className="font-semibold">Failed to load run details</p>
          <p className="text-sm mt-1">{error || 'Run not found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Header & Back Link */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <Link
            to="/risk-manager/agent"
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white font-mono">{run.agent_run_id}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {run.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Started at: {new Date(run.started_at).toLocaleString()}</p>
          </div>
        </div>

        <button
          onClick={fetchRunDetail}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* Goal Banner */}
      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Goal</span>
        <p className="text-base font-medium text-white">{run.goal}</p>
        <div className="flex flex-wrap gap-4 pt-2 text-xs text-slate-400 font-mono">
          <span>Tenant Org: {run.organization_id}</span>
          <span>User: {run.user_id}</span>
          <span>Total Steps: {run.step_count || run.steps?.length || 0}</span>
          {run.completed_at && <span>Completed: {new Date(run.completed_at).toLocaleTimeString()}</span>}
        </div>
      </div>

      {/* Final Response if completed */}
      {run.final_response && (
        <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Final Output
            </h3>
            <span className="text-xs px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              Phase 2 Deterministic Scores Authoritative
            </span>
          </div>
          <div className="text-sm text-slate-300 whitespace-pre-line leading-relaxed">
            {run.final_response}
          </div>
        </div>
      )}

      {/* Steps Breakdown */}
      <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-400" />
          Step Sequence ({run.steps?.length || 0})
        </h3>

        <div className="space-y-3">
          {run.steps?.map((step) => (
            <div key={step.step_id} className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-indigo-400">Step #{step.step_number}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">{step.step_type}</span>
                  {step.tool_name && (
                    <span className="text-xs font-mono text-purple-300 px-2 py-0.5 rounded bg-purple-950/40 border border-purple-500/20">
                      {step.tool_name}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-500 font-mono">{step.status}</span>
              </div>

              {step.input_summary && (
                <div className="text-xs text-slate-400">
                  <span className="font-semibold text-slate-500">Action/Thought: </span>
                  {step.input_summary}
                </div>
              )}

              {step.output_summary && (
                <div className="text-xs text-slate-300 p-2.5 rounded bg-slate-900/60 font-mono overflow-x-auto">
                  {step.output_summary}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tool Calls Inspector */}
      {run.tool_calls && run.tool_calls.length > 0 && (
        <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-teal-400" />
            Tool Invocations ({run.tool_calls.length})
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Tool Name</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Execution Time</th>
                  <th className="p-3">Parameters</th>
                  <th className="p-3">Observation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {run.tool_calls.map((tc) => (
                  <tr key={tc.tool_call_id} className="hover:bg-slate-950/50">
                    <td className="p-3 font-mono font-bold text-indigo-300">{tc.tool_name}</td>
                    <td className="p-3 font-medium">
                      <span className={`px-2 py-0.5 rounded ${tc.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {tc.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-400">{tc.execution_time} ms</td>
                    <td className="p-3 font-mono text-slate-400 max-w-xs truncate">{JSON.stringify(tc.validated_input)}</td>
                    <td className="p-3 text-slate-300 max-w-sm truncate">{tc.result_summary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Approvals Inspector */}
      {run.approvals && run.approvals.length > 0 && (
        <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Human-in-the-Loop Approvals ({run.approvals.length})
          </h3>

          {approvalActionError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              {approvalActionError}
            </div>
          )}

          <div className="space-y-3">
            {run.approvals.map((appr) => (
              <div key={appr.approval_id} className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-amber-400">{appr.tool_name}</span>
                  <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                    appr.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' :
                    appr.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {appr.status}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{appr.reason}</p>
                <div className="text-[10px] text-slate-500 font-mono">
                  {appr.approved_by && `Approved by ${appr.approved_by} at ${appr.approved_at}`}
                  {appr.rejected_by && `Rejected by ${appr.rejected_by} at ${appr.rejected_at}`}
                </div>

                {appr.status === 'PENDING' && (
                  <div className="flex items-center gap-3 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => handleApproval(appr.approval_id, 'approve')}
                      disabled={approving}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-semibold text-white transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve Action
                    </button>
                    <button
                      onClick={() => handleApproval(appr.approval_id, 'reject')}
                      disabled={approving}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 disabled:opacity-50 text-xs font-semibold text-white transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
