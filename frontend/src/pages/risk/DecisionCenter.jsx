import React, { useState, useEffect } from 'react';
import {
  Scale,
  Target,
  ShieldAlert,
  Brain,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingUp,
  Activity,
  Layers,
  ArrowRight,
  RefreshCw,
  Plus,
  Play,
  Check,
  X,
  FileText,
  Sliders,
  Sparkles,
  ExternalLink,
  ChevronRight,
  BarChart3
} from 'lucide-react';

const OBJECTIVES = [
  { id: 'BALANCED_OUTCOME', label: 'Balanced Outcome', desc: 'Optimal equilibrium across risk, capital outlay, and operational speed' },
  { id: 'RISK_REDUCTION', label: 'Aggressive Risk Reduction', desc: 'Prioritizes maximum risk suppression regardless of secondary costs' },
  { id: 'COST_MINIMIZATION', label: 'Cost Minimization', desc: 'Prioritizes lowest capital expenditure while achieving acceptable risk' },
  { id: 'COMPLIANCE', label: 'Statutory Compliance', desc: 'Eliminates regulatory penalties and reporting audit gaps' },
  { id: 'CARBON_REDUCTION', label: 'Carbon Abatement', desc: 'Maximizes tCO2e reduction and energy decarbonization' },
  { id: 'ESG_IMPROVEMENT', label: 'ESG Score Improvement', desc: 'Maximizes composite sustainability rating' },
  { id: 'OPERATIONAL_STABILITY', label: 'Operational Stability', desc: 'Minimizes workflow disruption and organizational friction' }
];

export default function DecisionCenter() {
  const [decisions, setDecisions] = useState([]);
  const [selectedDecisionId, setSelectedDecisionId] = useState(null);
  const [decisionDetail, setDecisionDetail] = useState(null);
  const [comparisonMatrix, setComparisonMatrix] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showOptionModal, setShowOptionModal] = useState(false);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // New Decision Form State
  const [newDecision, setNewDecision] = useState({
    title: '',
    description: '',
    objective: 'BALANCED_OUTCOME',
    maxCost: '',
    maxTime: '',
    minRiskReduction: ''
  });

  // New Option Form State
  const [newOption, setNewOption] = useState({
    name: '',
    description: '',
    projectedRisk: 35,
    projectedCost: 12000,
    projectedEsgImpact: 75,
    projectedCarbonImpact: 250,
    projectedComplianceExposure: 10,
    implementationTime: 25,
    operationalImpact: 15
  });

  // Outcome Form State
  const [actualOutcome, setActualOutcome] = useState({
    actualRisk: 32,
    actualCost: 12500,
    actualEsg: 76,
    actualCarbon: 260,
    actualCompliance: 8,
    accuracyNotes: 'Post-implementation audit completed with verified telemetry.'
  });

  const fetchDecisions = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/decisions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load decisions.');
      const data = await res.json();
      const list = data.data || [];
      setDecisions(list);
      if (list.length > 0 && !selectedDecisionId) {
        setSelectedDecisionId(list[0].decisionId);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDecisionDetail = async (id) => {
    if (!id) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/decisions/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load decision details.');
      const data = await res.json();
      setDecisionDetail(data.data);

      // Also fetch comparison matrix if options exist
      if (data.data?.options?.length > 1) {
        fetchComparison(id);
      } else {
        setComparisonMatrix(null);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchComparison = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/decisions/${id}/compare`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setComparisonMatrix(data.data || data);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchDecisions();
  }, []);

  useEffect(() => {
    if (selectedDecisionId) {
      fetchDecisionDetail(selectedDecisionId);
    }
  }, [selectedDecisionId]);

  const handleCreateDecision = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const constraints = {};
      if (newDecision.maxCost) constraints.max_cost = Number(newDecision.maxCost);
      if (newDecision.maxTime) constraints.max_implementation_time_days = Number(newDecision.maxTime);
      if (newDecision.minRiskReduction) constraints.min_risk_reduction_points = Number(newDecision.minRiskReduction);

      const res = await fetch('/api/decisions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newDecision.title,
          description: newDecision.description,
          objective: newDecision.objective,
          constraints
        })
      });

      if (!res.ok) throw new Error('Failed to create decision.');
      const data = await res.json();
      setShowCreateModal(false);
      setSuccessMsg(`Decision "${newDecision.title}" created successfully.`);
      await fetchDecisions();
      setSelectedDecisionId(data.data.decisionId);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateOption = async (e) => {
    e.preventDefault();
    if (!selectedDecisionId) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/decisions/${selectedDecisionId}/options`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newOption)
      });
      if (!res.ok) throw new Error('Failed to add decision option.');
      setShowOptionModal(false);
      setSuccessMsg(`Option "${newOption.name}" added successfully.`);
      await fetchDecisionDetail(selectedDecisionId);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedDecisionId) return;
    setActionLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/decisions/${selectedDecisionId}/analyze`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Analysis failed.');
      }
      setSuccessMsg('Deterministic option analysis & scoring completed.');
      await fetchDecisionDetail(selectedDecisionId);
      await fetchDecisions();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecommend = async () => {
    if (!selectedDecisionId) return;
    setActionLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/decisions/${selectedDecisionId}/recommend`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Recommendation generation failed.');
      }
      setSuccessMsg('Evidence-grounded AI recommendation synthesized.');
      await fetchDecisionDetail(selectedDecisionId);
      await fetchDecisions();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedDecisionId) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/decisions/${selectedDecisionId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes: 'Executive approval granted for authoritative optimal pathway.' })
      });
      if (!res.ok) throw new Error('Failed to approve decision.');
      setSuccessMsg('Decision approved. Ready for operational execution.');
      await fetchDecisionDetail(selectedDecisionId);
      await fetchDecisions();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!selectedDecisionId) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/decisions/${selectedDecisionId}/execute`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Execution failed.');
      }
      setSuccessMsg('Decision executed! Mitigation plan & automated workflow spawned.');
      await fetchDecisionDetail(selectedDecisionId);
      await fetchDecisions();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordOutcome = async (e) => {
    e.preventDefault();
    if (!selectedDecisionId) return;
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/decisions/${selectedDecisionId}/outcomes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(actualOutcome)
      });
      if (!res.ok) throw new Error('Failed to record outcome.');
      setShowOutcomeModal(false);
      setSuccessMsg('Post-implementation outcome recorded and verified.');
      await fetchDecisionDetail(selectedDecisionId);
      await fetchDecisions();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredDecisions = decisions.filter(d => {
    if (statusFilter === 'ALL') return true;
    return d.status === statusFilter;
  });

  const currentOption = decisionDetail?.options?.find(o => o.optionId === decisionDetail?.selectedOptionId) || decisionDetail?.options?.[0];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-lg">
              <Scale className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Advanced Decision Intelligence Center
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              Phase 13: decision-score-v1.0.0
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Deterministic multi-attribute option evaluation, scenario projections, and verified evidence-backed AI recommendations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { fetchDecisions(); if (selectedDecisionId) fetchDecisionDetail(selectedDecisionId); }}
            className="p-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Decision
          </button>
        </div>
      </div>

      {/* Status Notifications */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center justify-between text-rose-700 dark:text-rose-400 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Main Grid: Sidebar + Detail Center */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Decision Selector & Filters */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                Decisions ({filteredDecisions.length})
              </h2>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-2 py-1 text-gray-700 dark:text-gray-300"
              >
                <option value="ALL">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="READY_FOR_REVIEW">Ready for Review</option>
                <option value="WAITING_FOR_APPROVAL">Waiting Approval</option>
                <option value="APPROVED">Approved</option>
                <option value="EXECUTED">Executed</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredDecisions.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  No decisions found for this filter.
                </div>
              ) : (
                filteredDecisions.map((dec) => {
                  const isSelected = dec.decisionId === selectedDecisionId;
                  return (
                    <button
                      key={dec.decisionId}
                      onClick={() => setSelectedDecisionId(dec.decisionId)}
                      className={`w-full text-left p-3.5 rounded-lg border transition-all ${
                        isSelected
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 shadow-sm'
                          : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-1">
                          {dec.title}
                        </span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          dec.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' :
                          dec.status === 'WAITING_FOR_APPROVAL' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                          dec.status === 'EXECUTED' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400' :
                          dec.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' :
                          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {dec.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Target className="w-3.5 h-3.5 text-indigo-500" />
                          {dec.objective?.replace('_', ' ')}
                        </span>
                        <span>•</span>
                        <span>{new Date(dec.createdAt).toLocaleDateString()}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Area: Active Decision Dossier */}
        <div className="lg:col-span-8 space-y-6">
          {!decisionDetail ? (
            <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-400">
              Select or create a decision to view intelligence analysis.
            </div>
          ) : (
            <>
              {/* Decision Overview & Situation Card */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm space-y-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {decisionDetail.title}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {decisionDetail.description || 'No description provided.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full font-mono text-gray-600 dark:text-gray-300">
                      ID: {decisionDetail.decisionId}
                    </span>
                  </div>
                </div>

                {/* KPI Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-3.5 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800">
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Target className="w-3.5 h-3.5 text-indigo-500" /> Strategic Objective
                    </span>
                    <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                      {decisionDetail.objective?.replace('_', ' ')}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800">
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> Current Baseline Risk
                    </span>
                    <p className="text-sm font-bold text-rose-600 dark:text-rose-400 mt-1">
                      60.0 pts (HIGH)
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800">
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Sliders className="w-3.5 h-3.5 text-amber-500" /> Options Evaluated
                    </span>
                    <p className="text-sm font-bold text-gray-900 dark:text-white mt-1">
                      {decisionDetail.options?.length || 0} Alternatives
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-800">
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <Activity className="w-3.5 h-3.5 text-emerald-500" /> Lifecycle State
                    </span>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-1 uppercase">
                      {decisionDetail.status?.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                {/* Constraints Checklist */}
                {decisionDetail.constraints && Object.keys(decisionDetail.constraints).length > 0 && (
                  <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg text-xs flex flex-wrap gap-4 text-amber-800 dark:text-amber-300">
                    <span className="font-semibold">Active Constraints:</span>
                    {decisionDetail.constraints.max_cost && (
                      <span>Max Cost: ${decisionDetail.constraints.max_cost.toLocaleString()}</span>
                    )}
                    {decisionDetail.constraints.max_implementation_time_days && (
                      <span>Max Timeline: {decisionDetail.constraints.max_implementation_time_days} days</span>
                    )}
                    {decisionDetail.constraints.min_risk_reduction_points && (
                      <span>Min Risk Reduction: {decisionDetail.constraints.min_risk_reduction_points} pts</span>
                    )}
                  </div>
                )}

                {/* Action Pipeline Bar */}
                <div className="pt-2 flex flex-wrap items-center gap-3">
                  <button
                    onClick={handleAnalyze}
                    disabled={actionLoading || !decisionDetail.options?.length}
                    className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Run Deterministic Analysis
                  </button>

                  <button
                    onClick={handleRecommend}
                    disabled={actionLoading || !decisionDetail.options?.length}
                    className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate AI Recommendation
                  </button>

                  {decisionDetail.status === 'WAITING_FOR_APPROVAL' && (
                    <button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve Optimal Pathway
                    </button>
                  )}

                  {decisionDetail.status === 'APPROVED' && (
                    <button
                      onClick={handleExecute}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      Execute Authorized Actions
                    </button>
                  )}

                  {decisionDetail.status === 'EXECUTED' && (
                    <button
                      onClick={() => setShowOutcomeModal(true)}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors"
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      Record Post-Implementation Outcome
                    </button>
                  )}
                </div>
              </div>

              {/* Options Comparison Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-600" />
                    Evaluated Decision Alternatives ({decisionDetail.options?.length || 0})
                  </h3>
                  <button
                    onClick={() => setShowOptionModal(true)}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1.5 rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Option
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(decisionDetail.options || []).map((opt) => {
                    const isRank1 = opt.rank === 1 && opt.isFeasible;
                    return (
                      <div
                        key={opt.optionId}
                        className={`rounded-xl border p-4 space-y-3 transition-all relative ${
                          isRank1
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-600 ring-1 ring-emerald-400'
                            : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                        }`}
                      >
                        {isRank1 && (
                          <span className="absolute -top-2.5 right-3 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Rank 1 Recommended
                          </span>
                        )}

                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Option {opt.rank}</span>
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">{opt.name}</h4>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-gray-400">Score</span>
                            <p className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">{opt.decisionScore || 0}</p>
                          </div>
                        </div>

                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {opt.description || 'No description provided.'}
                        </p>

                        <div className="grid grid-cols-2 gap-2 text-xs border-t border-gray-100 dark:border-gray-800 pt-2 text-gray-600 dark:text-gray-300">
                          <div>
                            <span className="text-gray-400 block text-[10px]">Projected Risk</span>
                            <span className="font-semibold text-rose-500">{opt.projectedRisk} pts</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px]">Cost</span>
                            <span className="font-semibold">${opt.projectedCost.toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px]">Carbon Delta</span>
                            <span className="font-semibold text-emerald-500">+{opt.projectedCarbonImpact} tCO2e</span>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px]">Timeline</span>
                            <span className="font-semibold">{opt.implementationTime} days</span>
                          </div>
                        </div>

                        {!opt.isFeasible && (
                          <div className="p-2 bg-rose-50 dark:bg-rose-950/40 rounded text-[11px] text-rose-700 dark:text-rose-400">
                            Constraint breach: {opt.constraintViolations?.[0] || 'Violates criteria'}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Multi-Criteria Comparison Table */}
              {comparisonMatrix?.metrics && (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    Multi-Option Criteria Matrix
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300">
                        <tr>
                          <th className="p-3">Decision Metric</th>
                          {decisionDetail.options?.map(o => (
                            <th key={o.optionId} className="p-3 text-center">{o.name}</th>
                          ))}
                          <th className="p-3 text-center">Top Performing</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {comparisonMatrix.metrics.map((m) => (
                          <tr key={m.metric_key} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                            <td className="p-3 font-medium text-gray-900 dark:text-white">
                              {m.label}
                              <span className="block text-[10px] text-gray-400">{m.unit}</span>
                            </td>
                            {decisionDetail.options?.map(o => {
                              const val = m.values_by_option?.[o.optionId];
                              const isBest = m.best_option_id === o.optionId;
                              return (
                                <td key={o.optionId} className={`p-3 text-center ${isBest ? 'font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/20' : 'text-gray-600 dark:text-gray-300'}`}>
                                  {typeof val === 'number' ? (m.metric_key.includes('cost') ? `$${val.toLocaleString()}` : val) : (val || '-')}
                                </td>
                              );
                            })}
                            <td className="p-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                              {decisionDetail.options?.find(o => o.optionId === m.best_option_id)?.name || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Grounded AI Recommendation Card */}
              {decisionDetail.aiRecommendation && (
                <div className="bg-white dark:bg-gray-900 border border-purple-200 dark:border-purple-900/60 rounded-xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-bold text-base">
                    <Sparkles className="w-5 h-5" />
                    Verified AI Recommendation & Strategic Tradeoffs
                  </div>

                  <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 rounded-lg text-sm text-gray-800 dark:text-gray-200 space-y-2 leading-relaxed">
                    <p className="font-semibold text-purple-900 dark:text-purple-300">
                      Authoritative Recommendation: {decisionDetail.aiRecommendation.recommended_option_name}
                    </p>
                    <p>{decisionDetail.aiRecommendation.executive_rationale}</p>
                    <p className="text-gray-600 dark:text-gray-400 text-xs mt-2 border-t border-purple-100 dark:border-purple-900/40 pt-2">
                      <span className="font-semibold">Tradeoff Summary: </span>
                      {decisionDetail.aiRecommendation.tradeoff_explanation}
                    </p>
                  </div>

                  {/* Evidence Citations */}
                  {decisionDetail.aiRecommendation.evidence_references?.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        Grounding Evidence & Citations
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {decisionDetail.aiRecommendation.evidence_references.map((ref, idx) => (
                          <div key={idx} className="p-2.5 bg-gray-50 dark:bg-gray-800/60 rounded border border-gray-200 dark:border-gray-800 text-xs">
                            <span className="text-[10px] text-indigo-500 font-bold uppercase block">{ref.type}</span>
                            <p className="font-medium text-gray-900 dark:text-white line-clamp-1">{ref.title || ref.scenario_name || ref.id}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Outcomes Section (Expected vs Actual) */}
              {decisionDetail.outcomes?.length > 0 && (
                <div className="bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-900/60 rounded-xl p-5 shadow-sm space-y-3">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Post-Implementation Verification (Expected vs Actual)
                  </h3>

                  {decisionDetail.outcomes.map((out) => (
                    <div key={out.outcomeId} className="p-4 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-lg space-y-3 text-xs">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <span className="text-gray-400 block text-[10px]">Forecast Error</span>
                          <span className="font-bold text-sm text-gray-900 dark:text-white">{out.forecastError} pts</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">Expected vs Actual Risk</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{out.expectedResult?.risk} → {out.actualRisk} pts</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">Cost Variance</span>
                          <span className="font-semibold text-gray-900 dark:text-white">${out.costVariance} ({out.costVariancePercentage}%)</span>
                        </div>
                        <div>
                          <span className="text-gray-400 block text-[10px]">Evaluated Timestamp</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{new Date(out.evaluatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 text-xs italic">{out.accuracyNotes}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal: Create Decision */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 max-w-lg w-full shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Create New Decision Intelligence Case</h3>
            <form onSubmit={handleCreateDecision} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newDecision.title}
                  onChange={(e) => setNewDecision({ ...newDecision, title: e.target.value })}
                  placeholder="e.g. Critical Scope 3 Supplier Mitigation Strategy"
                  className="w-full text-sm p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newDecision.description}
                  onChange={(e) => setNewDecision({ ...newDecision, description: e.target.value })}
                  placeholder="Strategic background, affected assets, or compliance driver..."
                  className="w-full text-sm p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Strategic Objective</label>
                <select
                  value={newDecision.objective}
                  onChange={(e) => setNewDecision({ ...newDecision, objective: e.target.value })}
                  className="w-full text-sm p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  {OBJECTIVES.map((obj) => (
                    <option key={obj.id} value={obj.id}>{obj.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Max Cost ($)</label>
                  <input
                    type="number"
                    value={newDecision.maxCost}
                    onChange={(e) => setNewDecision({ ...newDecision, maxCost: e.target.value })}
                    placeholder="25000"
                    className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Max Time (d)</label>
                  <input
                    type="number"
                    value={newDecision.maxTime}
                    onChange={(e) => setNewDecision({ ...newDecision, maxTime: e.target.value })}
                    placeholder="45"
                    className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Min Reduction</label>
                  <input
                    type="number"
                    value={newDecision.minRiskReduction}
                    onChange={(e) => setNewDecision({ ...newDecision, minRiskReduction: e.target.value })}
                    placeholder="15"
                    className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg"
                >
                  Create Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Option */}
      {showOptionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 max-w-lg w-full shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Decision Alternative</h3>
            <form onSubmit={handleCreateOption} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Option Name</label>
                <input
                  type="text"
                  required
                  value={newOption.name}
                  onChange={(e) => setNewOption({ ...newOption, name: e.target.value })}
                  placeholder="e.g. Dual-Sourcing & Supplier Audit Protocol"
                  className="w-full text-sm p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Projected Risk (pts)</label>
                  <input
                    type="number"
                    value={newOption.projectedRisk}
                    onChange={(e) => setNewOption({ ...newOption, projectedRisk: Number(e.target.value) })}
                    className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Projected Cost ($)</label>
                  <input
                    type="number"
                    value={newOption.projectedCost}
                    onChange={(e) => setNewOption({ ...newOption, projectedCost: Number(e.target.value) })}
                    className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Carbon Abatement (tCO2e)</label>
                  <input
                    type="number"
                    value={newOption.projectedCarbonImpact}
                    onChange={(e) => setNewOption({ ...newOption, projectedCarbonImpact: Number(e.target.value) })}
                    className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Timeline (days)</label>
                  <input
                    type="number"
                    value={newOption.implementationTime}
                    onChange={(e) => setNewOption({ ...newOption, implementationTime: Number(e.target.value) })}
                    className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowOptionModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg"
                >
                  Add Option
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Actual Outcome */}
      {showOutcomeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 max-w-lg w-full shadow-xl space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Record Post-Implementation Outcome</h3>
            <p className="text-xs text-gray-500">Provide verified post-implementation metrics for automated Expected vs Actual quality evaluation.</p>
            <form onSubmit={handleRecordOutcome} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Actual Risk Score (pts)</label>
                  <input
                    type="number"
                    value={actualOutcome.actualRisk}
                    onChange={(e) => setActualOutcome({ ...actualOutcome, actualRisk: Number(e.target.value) })}
                    className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-500 mb-1">Actual Cost ($)</label>
                  <input
                    type="number"
                    value={actualOutcome.actualCost}
                    onChange={(e) => setActualOutcome({ ...actualOutcome, actualCost: Number(e.target.value) })}
                    className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Audit Verification Notes</label>
                <textarea
                  rows={2}
                  value={actualOutcome.accuracyNotes}
                  onChange={(e) => setActualOutcome({ ...actualOutcome, accuracyNotes: e.target.value })}
                  className="w-full text-xs p-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowOutcomeModal(false)}
                  className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm rounded-lg"
                >
                  Submit & Evaluate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
