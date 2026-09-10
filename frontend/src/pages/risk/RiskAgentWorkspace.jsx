import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot, Sparkles, Send, ShieldAlert, CheckCircle2, Clock, AlertTriangle,
  FileText, ArrowRight, Play, Check, X, RefreshCw, Cpu, Layers,
  ExternalLink, Search, ShieldCheck, HelpCircle, BookOpen, AlertCircle,
  RotateCcw, Database, Compass, CheckSquare
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAuthStore } from '../../store/authStore';

const SUGGESTED_PROMPTS = [
  {
    title: "Analyze highest-risk project",
    prompt: "Analyze the highest-risk project, evaluate critical vulnerabilities, and prepare a mitigation strategy."
  },
  {
    title: "Find emerging critical risks",
    prompt: "Find emerging critical risks across operations, calculate trajectory forecasts, and flag escalating trends."
  },
  {
    title: "Review compliance risks",
    prompt: "Inspect current compliance permits and identify any expiring or non-compliant environmental records."
  },
  {
    title: "Analyze carbon exposure",
    prompt: "Audit supplier risk ratings and retrieve our internal sustainable sourcing guidelines for Scope 3 emissions."
  },
  {
    title: "Search knowledge standards",
    prompt: "Search the organizational knowledge base for effluent discharge standards and check risk compliance status."
  }
];

export default function RiskAgentWorkspace() {
  const { token: ctxToken, user, permissions } = useAuth();
  const token = ctxToken || useAuthStore.getState().token || localStorage.getItem('esg_super_admin_token') || localStorage.getItem('token') || '';

  const [goal, setGoal] = useState('');
  const [activeRun, setActiveRun] = useState(null);
  const [recentRuns, setRecentRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastAttemptedGoal, setLastAttemptedGoal] = useState('');
  const [approving, setApproving] = useState(false);
  const [approvalActionError, setApprovalActionError] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const timerRef = useRef(null);

  // Elapsed timer during execution
  useEffect(() => {
    if (loading) {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading]);

  const fetchRecentRuns = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/ai-agent/runs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setRecentRuns(json.data || []);
      }
    } catch (err) {
      console.warn('Could not fetch recent runs:', err);
    }
  };

  useEffect(() => {
    fetchRecentRuns();
  }, [token]);

  const executeGoal = async (targetGoal) => {
    const cleanGoal = (targetGoal || goal || '').trim();
    if (!cleanGoal || loading) return;

    setLastAttemptedGoal(cleanGoal);
    setLoading(true);
    setError(null);
    setApprovalActionError(null);

    // Immediately display active running state
    setActiveRun({
      agent_run_id: 'pending...',
      goal: cleanGoal,
      status: 'RUNNING',
      started_at: new Date().toISOString(),
      steps: []
    });

    try {
      const res = await fetch('/api/ai-agent/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ goal: cleanGoal })
      });

      const json = await res.json().catch(() => ({}));

      if (res.ok && json.success) {
        setActiveRun(json.data);
        fetchRecentRuns();
      } else {
        // Map to friendly, user-facing error message
        let userMessage = json.message || 'Failed to execute agent run.';
        if (res.status === 401) {
          userMessage = 'You do not have permission to run this agent. Please check your session.';
        } else if (res.status === 403) {
          userMessage = 'Your current role does not have authorization to trigger AI Agent workflows.';
        } else if (res.status === 502 || res.status === 503) {
          userMessage = 'AI Agent service is temporarily unavailable. Your risk data remains fully accessible.';
        } else if (res.status === 504) {
          userMessage = 'The AI Agent request timed out. You can retry the request.';
        }
        setError(userMessage);
        setActiveRun(null);
      }
    } catch (err) {
      setError('AI Agent service is temporarily unreachable. Please check your connection or retry.');
      setActiveRun(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRunSubmit = (e) => {
    if (e) e.preventDefault();
    executeGoal(goal);
  };

  const handleSelectSuggested = (promptText) => {
    setGoal(promptText);
    executeGoal(promptText);
  };

  const handleRetry = () => {
    if (lastAttemptedGoal) {
      executeGoal(lastAttemptedGoal);
    } else if (goal.trim()) {
      executeGoal(goal);
    }
  };

  const handleApprove = async (approvalId) => {
    try {
      setApproving(true);
      setApprovalActionError(null);

      const res = await fetch(`/api/ai-agent/approvals/${approvalId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setActiveRun(json.data);
        fetchRecentRuns();
      } else {
        setApprovalActionError(json.message || 'Failed to authorize action.');
      }
    } catch (err) {
      setApprovalActionError(`Network error: ${err.message}`);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async (approvalId) => {
    try {
      setApproving(true);
      setApprovalActionError(null);

      const res = await fetch(`/api/ai-agent/approvals/${approvalId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setActiveRun(json.data);
        fetchRecentRuns();
      } else {
        setApprovalActionError(json.message || 'Failed to reject action.');
      }
    } catch (err) {
      setApprovalActionError(`Network error: ${err.message}`);
    } finally {
      setApproving(false);
    }
  };

  const handleLoadRun = async (runId) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/ai-agent/runs/${runId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setActiveRun(json.data);
        setGoal(json.data.goal || '');
      }
    } catch (err) {
      console.error('Error loading run:', err);
    } finally {
      setLoading(false);
    }
  };

  const pendingApproval = activeRun?.approvals?.find((a) => a.status === 'PENDING');

  const getStatusBadge = (status) => {
    switch (status) {
      case 'RUNNING':
      case 'PLANNING':
      case 'TOOL_EXECUTION':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> {status}
          </span>
        );
      case 'WAITING_FOR_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" /> Awaiting Approval
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
        );
      case 'FAILED':
      case 'TIMEOUT':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-3.5 h-3.5" /> {status}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-700 text-slate-300">
            {status || 'READY'}
          </span>
        );
    }
  };

  const getStepBadge = (type) => {
    switch (type) {
      case 'PLANNING':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">PLANNING</span>;
      case 'TOOL_CALL':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">TOOL CALL</span>;
      case 'TOOL_RESULT':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-teal-500/10 text-teal-400 border border-teal-500/20">OBSERVATION</span>;
      case 'RAG_RETRIEVAL':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">RAG EVIDENCE</span>;
      case 'APPROVAL_REQUEST':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">APPROVAL REQ</span>;
      case 'FINAL_RESPONSE':
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">FINAL RESPONSE</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-700 text-slate-300">{type}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6 w-full min-w-0">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400">
              <Bot className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                AI Risk Agent & Tool Copilot
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Phase 5 Verified
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Autonomous multi-step reasoning, tool execution, and human-in-the-loop approval governance.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/risk-manager/knowledge"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sm font-medium text-slate-300 transition-colors"
          >
            <BookOpen className="w-4 h-4 text-purple-400" />
            Knowledge Base
          </Link>
          <Link
            to="/risk-manager/risks"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sm font-medium text-slate-300 transition-colors"
          >
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            Risk Registry
          </Link>
        </div>
      </div>

      {/* Main Content Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 w-full min-w-0">
        {/* Left Column: Goal Submission & History */}
        <div className="lg:col-span-1 space-y-6 min-w-0">
          {/* Goal Input Card */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Ask the AI Risk Agent
            </h2>

            <form onSubmit={handleRunSubmit} className="space-y-3">
              <textarea
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={4}
                disabled={loading}
                placeholder="What risk investigation, compliance audit, or mitigation plan should the agent execute?"
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm text-slate-200 placeholder-slate-500 resize-none disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={loading || !goal.trim()}
                className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed font-medium text-sm text-white shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Executing ({elapsedSeconds}s)...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    Launch Agent Goal
                  </>
                )}
              </button>
            </form>

            {/* Error Message & Retry */}
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-semibold transition"
                >
                  <RotateCcw className="w-3 h-3" />
                  Retry Request
                </button>
              </div>
            )}

            {/* Suggested Prompts */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <span className="text-xs font-medium text-slate-400">Suggested Inquiries (Click to Run):</span>
              <div className="space-y-2">
                {SUGGESTED_PROMPTS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={loading}
                    onClick={() => handleSelectSuggested(item.prompt)}
                    className="w-full text-left p-2.5 rounded-lg bg-slate-950/70 hover:bg-slate-800 border border-slate-800/80 hover:border-indigo-500/40 text-xs text-slate-300 hover:text-indigo-200 transition-all group disabled:opacity-50"
                  >
                    <div className="font-semibold text-slate-200 group-hover:text-indigo-300 flex items-center justify-between">
                      <span>{item.title}</span>
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400" />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      "{item.prompt}"
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Runs Sidebar */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Recent Agent Runs</span>
              <button onClick={fetchRecentRuns} className="hover:text-indigo-400 transition-colors">
                <RefreshCw className="w-3 h-3" />
              </button>
            </h3>

            {recentRuns.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No previous agent runs found.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {recentRuns.map((r) => (
                  <div
                    key={r.agent_run_id}
                    onClick={() => handleLoadRun(r.agent_run_id)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                      activeRun?.agent_run_id === r.agent_run_id
                        ? 'bg-indigo-950/40 border-indigo-500/40'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-mono text-slate-400">{r.agent_run_id.slice(0, 10)}</span>
                      {getStatusBadge(r.status)}
                    </div>
                    <p className="text-xs text-slate-200 line-clamp-2 font-medium">{r.goal}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2">
                      <span>{r.step_count || 0} steps</span>
                      <span>{new Date(r.started_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Execution Timeline, Approvals, and Results */}
        <div className="lg:col-span-3 space-y-6 min-w-0">
          {loading ? (
            /* Live Progressive Loading State */
            <div className="p-6 rounded-xl bg-slate-900/90 border border-indigo-500/40 shadow-2xl space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Agent Execution in Progress</h3>
                    <p className="text-xs text-slate-400">Goal: "{activeRun?.goal || goal}"</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono px-3 py-1 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                    Elapsed: {elapsedSeconds}s
                  </span>
                </div>
              </div>

              {/* Progressive Steps Indicator */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-200">1. Request Received & Authorized</p>
                    <p className="text-[11px] text-slate-400">Session permissions validated for tenant organization</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/30">
                  <Cpu className="w-5 h-5 text-indigo-400 animate-pulse shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-indigo-300">2. Formulating Multi-Step Execution Plan</p>
                    <p className="text-[11px] text-slate-400">AI reasoning over registered tools and goal parameters</p>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20">
                    Active
                  </span>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/40 border border-slate-800/60 opacity-70">
                  <Compass className="w-5 h-5 text-slate-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-300">3. Tool Invocation & Evidence Retrieval</p>
                    <p className="text-[11px] text-slate-500">Querying live risk database, ESG metrics, and RAG knowledge</p>
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase">Pending</span>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-950/40 border border-slate-800/60 opacity-70">
                  <CheckSquare className="w-5 h-5 text-slate-500 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-300">4. Executive Recommendation & Action Synthesis</p>
                    <p className="text-[11px] text-slate-500">Formulating final response and checking HITL approval triggers</p>
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase">Pending</span>
                </div>
              </div>
            </div>
          ) : activeRun && activeRun.agent_run_id !== 'pending...' ? (
            <>
              {/* Active Run Status Bar */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-400">Run ID: {activeRun.agent_run_id}</span>
                    {getStatusBadge(activeRun.status)}
                    <span className="text-xs text-slate-400">
                      Steps executed: <strong className="text-white">{activeRun.step_count || activeRun.steps?.length || 0}</strong> / 10
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-100">"{activeRun.goal}"</p>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    to={`/risk-manager/agent/runs/${activeRun.agent_run_id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition-colors"
                  >
                    Run Details
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* High-Priority Human-In-The-Loop Approval Banner */}
              {pendingApproval && (
                <div className="p-5 rounded-xl bg-gradient-to-r from-amber-950/40 via-amber-900/30 to-amber-950/40 border-2 border-amber-500/50 shadow-2xl space-y-4 animate-in fade-in">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
                        Human-in-the-Loop Action Authorization Required
                        <span className="px-2 py-0.5 text-[10px] uppercase font-bold bg-amber-400 text-slate-950 rounded">
                          Action Paused
                        </span>
                      </h3>
                      <p className="text-sm text-slate-300">{pendingApproval.reason}</p>
                    </div>
                  </div>

                  {/* Proposed Action Parameters */}
                  <div className="p-3.5 rounded-lg bg-slate-950/80 border border-amber-500/30 space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                      Proposed Tool Action: <span className="font-mono text-white">{pendingApproval.tool_name}</span>
                    </div>
                    <pre className="text-xs font-mono text-slate-300 overflow-x-auto p-2 bg-slate-900/60 rounded">
                      {JSON.stringify(pendingApproval.requested_action, null, 2)}
                    </pre>
                  </div>

                  {approvalActionError && (
                    <div className="p-2.5 rounded bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
                      {approvalActionError}
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handleApprove(pendingApproval.approval_id)}
                      disabled={approving}
                      className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
                    >
                      {approving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      Authorize & Resume Execution
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(pendingApproval.approval_id)}
                      disabled={approving}
                      className="px-5 py-2.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-rose-200 font-medium text-sm flex items-center gap-2 transition-all"
                    >
                      <X className="w-4 h-4" />
                      Reject Proposed Action
                    </button>
                  </div>
                </div>
              )}

              {/* Final Response Card */}
              {activeRun.final_response && (
                <div className="p-6 rounded-xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <h3 className="font-bold text-base text-white">Agent Executive Assessment</h3>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Authoritative Phase 2 Score Preserved
                    </span>
                  </div>

                  <div className="prose prose-invert max-w-none text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                    {activeRun.final_response}
                  </div>
                </div>
              )}

              {/* Execution Steps Timeline */}
              <div className="p-6 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  Execution Timeline & Tool Activity
                </h3>

                {(!activeRun.steps || activeRun.steps.length === 0) ? (
                  <p className="text-sm text-slate-500 italic py-4 text-center">No execution steps recorded yet.</p>
                ) : (
                  <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
                    {activeRun.steps.map((step, idx) => (
                      <div key={step.step_id || idx} className="relative space-y-2">
                        {/* Circle bullet */}
                        <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-slate-950 border-2 border-indigo-400" />

                        <div className="p-4 rounded-lg bg-slate-950 border border-slate-800/80 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-slate-400">Step #{step.step_number}</span>
                              {getStepBadge(step.step_type)}
                              {step.tool_name && (
                                <span className="text-xs font-mono text-indigo-300 px-1.5 py-0.5 rounded bg-indigo-950/40 border border-indigo-500/20">
                                  {step.tool_name}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {new Date(step.created_at).toLocaleTimeString()}
                            </span>
                          </div>

                          {step.input_summary && (
                            <div className="text-xs text-slate-400">
                              <span className="font-semibold text-slate-500">Action: </span>
                              {step.input_summary}
                            </div>
                          )}

                          {step.output_summary && (
                            <div className="text-xs text-slate-300 p-2.5 rounded bg-slate-900/70 border border-slate-800 font-mono overflow-x-auto">
                              <span className="font-semibold text-indigo-400 font-sans">Observation: </span>
                              {step.output_summary}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="p-12 rounded-xl bg-slate-900/60 border border-slate-800 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center">
                <Bot className="w-8 h-8" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-lg font-bold text-white">AI Agent Ready</h3>
                <p className="text-sm text-slate-400">
                  Select a suggested inquiry on the left or write a custom goal to trigger the agent's multi-step tool reasoning engine.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
