import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Target, Sparkles, Play, Plus, RefreshCw, AlertTriangle, CheckCircle2, ShieldAlert,
  ArrowUpRight, ArrowDownRight, Layers, BarChart3, Info, X, BookOpen, ExternalLink,
  Activity
} from 'lucide-react';

export default function ScenarioManager() {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('registry'); // registry, comparison
  const [toastMsg, setToastMsg] = useState(null);
  const [runningId, setRunningId] = useState(null);
  const [activeResult, setActiveResult] = useState(null);
  const [comparisonMatrix, setComparisonMatrix] = useState(null);
  const [comparing, setComparing] = useState(false);

  // Create Scenario Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    scenarioType: 'CARBON_INCREASE',
    carbon_pct: 25,
    compliance_days: 30,
    supplier_pct: 40,
    energy_pct: 30,
    project_days: 60,
    prob_shift: 15,
    impact_shift: 15
  });

  const token = localStorage.getItem('token') || '';

  const showToast = (msg, isError = false) => {
    setToastMsg({ text: msg, isError });
    setTimeout(() => setToastMsg(null), 4500);
  };

  const fetchScenarios = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/scenarios', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setScenarios(data.data || []);
      }
    } catch (err) {
      showToast('Error loading scenarios: ' + err.message, true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScenarios();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const params = {};
      if (formData.scenarioType === 'CARBON_INCREASE' || formData.scenarioType === 'CARBON_REDUCTION') {
        params.carbon_emission_pct_change = parseFloat(formData.carbon_pct);
      } else if (formData.scenarioType === 'COMPLIANCE_DELAY') {
        params.compliance_delay_days = parseInt(formData.compliance_days);
      } else if (formData.scenarioType === 'SUPPLIER_FAILURE') {
        params.supplier_risk_pct_change = parseFloat(formData.supplier_pct);
      } else if (formData.scenarioType === 'ENERGY_INCREASE' || formData.scenarioType === 'ENERGY_REDUCTION') {
        params.energy_consumption_pct_change = parseFloat(formData.energy_pct);
      } else if (formData.scenarioType === 'PROJECT_DELAY') {
        params.project_delay_days = parseInt(formData.project_days);
      } else if (formData.scenarioType === 'RISK_FACTOR_CHANGE') {
        params.probability_shift = parseFloat(formData.prob_shift);
        params.impact_shift = parseFloat(formData.impact_shift);
      }

      const res = await fetch('/api/scenarios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          scenarioType: formData.scenarioType,
          parameters: params
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Created scenario: ${formData.name}`);
        setCreateModalOpen(false);
        setFormData({
          name: '',
          description: '',
          scenarioType: 'CARBON_INCREASE',
          carbon_pct: 25,
          compliance_days: 30,
          supplier_pct: 40,
          energy_pct: 30,
          project_days: 60,
          prob_shift: 15,
          impact_shift: 15
        });
        fetchScenarios();
      } else {
        showToast(data.message || 'Creation failed', true);
      }
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const handleRunSimulation = async (scenario) => {
    try {
      setRunningId(scenario._id);
      const res = await fetch(`/api/scenarios/${scenario._id}/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveResult(data.data);
        showToast(`Simulation executed for ${scenario.name}!`);
        fetchScenarios();
      } else {
        showToast(data.message || 'Simulation error', true);
      }
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setRunningId(null);
    }
  };

  const handleRunComparison = async () => {
    try {
      setComparing(true);
      const ids = scenarios.map(s => s.scenarioId);
      const res = await fetch('/api/scenarios/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ scenario_ids: ids })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setComparisonMatrix(data.data);
        setActiveTab('comparison');
        showToast('Comparison matrix generated!');
      } else {
        showToast(data.message || 'Comparison failed', true);
      }
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setComparing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Toast */}
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-xl text-white font-medium flex items-center space-x-2 ${
          toastMsg.isError ? 'bg-rose-600' : 'bg-emerald-600'
        }`}>
          {toastMsg.isError ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200 mb-6 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-md shadow-indigo-500/20">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Scenario & What-If Intelligence</h1>
              <p className="text-sm text-slate-500">Model hypothetical risk shocks and policy shifts with deterministic zero-mutation simulation.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRunComparison}
            disabled={comparing}
            className="inline-flex items-center px-3.5 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-sm font-medium transition shadow-sm"
          >
            <BarChart3 className={`w-4 h-4 mr-2 ${comparing ? 'animate-spin' : ''}`} />
            Compare Scenarios
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition shadow-md shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create Scenario
          </button>
        </div>
      </div>

      {/* CRITICAL SAFETY BANNER */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-center space-x-3 shadow-sm">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>Simulation Guardrail Active:</strong> All scenario calculations are purely hypothetical projections executed by <code>scenario-engine-v1.0.0</code>. <strong>Production risk scores, audit records, and operational metrics are never modified.</strong>
        </p>
      </div>

      {/* Main Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('registry')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition ${activeTab === 'registry' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Scenarios Registry ({scenarios.length})
        </button>
        {comparisonMatrix && (
          <button
            onClick={() => setActiveTab('comparison')}
            className={`pb-3 px-4 text-sm font-medium border-b-2 transition ${activeTab === 'comparison' ? 'border-indigo-600 text-indigo-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Multi-Scenario Comparison Matrix
          </button>
        )}
      </div>

      {activeTab === 'registry' && (
        <div className="space-y-6">
          {/* Scenario Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scenarios.map(scen => (
              <div key={scen._id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between p-5">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="px-2 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {scen.scenarioType}
                    </span>
                    <span className="text-xs text-slate-400">
                      {scen.lastRunAt ? `Ran ${new Date(scen.lastRunAt).toLocaleDateString()}` : 'Not run'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">{scen.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-3">{scen.description || 'No description provided.'}</p>

                  <div className="bg-slate-50 p-2.5 rounded-lg text-xs font-mono text-slate-600 space-y-1 mb-4">
                    {Object.entries(scen.parameters || {}).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-slate-400">{k}:</span>
                        <span className="font-bold text-slate-700">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <Link
                    to={`/scenario-manager/${scen._id}`}
                    className="text-xs font-medium text-slate-600 hover:text-indigo-600 transition flex items-center"
                  >
                    View Details <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
                  </Link>
                  <button
                    onClick={() => handleRunSimulation(scen)}
                    disabled={runningId === scen._id}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition flex items-center shadow-sm shadow-indigo-600/20"
                  >
                    {runningId === scen._id ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Play className="w-3.5 h-3.5 mr-1.5" />}
                    Simulate
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Active Simulation Result Display */}
          {activeResult && (
            <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-xl p-6 mt-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 mb-6 gap-2">
                <div>
                  <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 mb-1">
                    SIMULATION RESULT — PURE WHAT-IF
                  </span>
                  <h2 className="text-xl font-bold text-slate-900">Simulation: {activeResult.scenarioName}</h2>
                  <p className="text-xs text-slate-500 font-mono">Engine: {activeResult.engineVersion} | ID: {activeResult.simulationId}</p>
                </div>
                <button
                  onClick={() => setActiveResult(null)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-600 font-medium self-start sm:self-auto"
                >
                  Dismiss View
                </button>
              </div>

              {/* KPI Comparison Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="text-xs font-semibold uppercase text-slate-400 mb-1">Baseline Avg Risk</div>
                  <div className="text-2xl font-bold text-slate-700">{activeResult.baselineAverageScore}</div>
                  <div className="text-xs text-slate-500 mt-1">Authoritative Phase 2 Score</div>
                </div>
                <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/30">
                  <div className="text-xs font-semibold uppercase text-indigo-500 mb-1">Projected Avg Risk</div>
                  <div className="text-2xl font-bold text-indigo-700">{activeResult.projectedAverageScore}</div>
                  <div className="text-xs text-indigo-600 mt-1 font-semibold">
                    Shift: {activeResult.scoreDelta > 0 ? '+' : ''}{activeResult.scoreDelta} pts
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="text-xs font-semibold uppercase text-slate-400 mb-1">Critical Risks</div>
                  <div className="text-2xl font-bold text-slate-800">
                    {activeResult.baselineCriticalCount} <span className="text-sm text-slate-400 font-normal">→</span> <span className="text-rose-600">{activeResult.projectedCriticalCount}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Severity tier transitions</div>
                </div>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <div className="text-xs font-semibold uppercase text-slate-400 mb-1">Potential Alerts</div>
                  <div className="text-2xl font-bold text-amber-600">{activeResult.potentialAlerts?.length || 0}</div>
                  <div className="text-xs text-slate-500 mt-1">Pre-emptive mitigation targets</div>
                </div>
              </div>

              {/* Affected Risks Table */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
                  <ShieldAlert className="w-4 h-4 text-indigo-600 mr-2" />
                  Affected Risks Breakdown ({activeResult.affectedRisks?.length || 0})
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 uppercase font-semibold text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Risk Title</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Baseline Score</th>
                        <th className="py-2.5 px-3">Projected Score</th>
                        <th className="py-2.5 px-3">Delta</th>
                        <th className="py-2.5 px-3">Severity Transition</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeResult.affectedRisks?.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition">
                          <td className="py-2.5 px-3 font-medium text-slate-800">{item.title}</td>
                          <td className="py-2.5 px-3 text-slate-500">{item.category}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-700">{item.baseline_score} ({item.baseline_severity})</td>
                          <td className="py-2.5 px-3 font-bold text-indigo-700">{item.projected_score} ({item.projected_severity})</td>
                          <td className={`py-2.5 px-3 font-bold ${item.score_delta > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {item.score_delta > 0 ? '+' : ''}{item.score_delta}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded font-mono text-[11px] bg-slate-100 text-slate-700 font-semibold">
                              {item.severity_transition}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* AI Explanation & Regulatory Citations */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center space-x-2 text-indigo-700">
                  <Sparkles className="w-4 h-4" />
                  <h4 className="font-bold text-xs uppercase tracking-wider">AI Scenario Synthesis</h4>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{activeResult.aiExplanation}</p>

                {activeResult.policyCitations && activeResult.policyCitations.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/80">
                    <div className="text-[11px] font-bold text-slate-500 uppercase mb-2">Policy & Regulatory Citations</div>
                    <div className="space-y-1.5">
                      {activeResult.policyCitations.map((cit, idx) => (
                        <div key={idx} className="text-xs text-slate-600 flex items-start space-x-2">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />
                          <span>
                            <strong>{cit.source}</strong> ({cit.section}): {cit.relevance}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'comparison' && comparisonMatrix && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Multi-Scenario Comparison Matrix</h3>
              <p className="text-xs text-slate-500">Side-by-side risk score and critical transition projections.</p>
            </div>
            <button
              onClick={() => setActiveTab('registry')}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium"
            >
              Back to Registry
            </button>
          </div>

          {/* Synthesis Card */}
          <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 text-xs text-indigo-950">
            <div className="font-bold text-indigo-900 mb-1 flex items-center">
              <Sparkles className="w-4 h-4 mr-1.5 text-indigo-600" />
              Executive Synthesis
            </div>
            <p className="leading-relaxed">{comparisonMatrix.ai_synthesis}</p>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Scenario</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Projected Score</th>
                  <th className="py-3 px-4">Delta vs Baseline</th>
                  <th className="py-3 px-4">Critical Risks</th>
                  <th className="py-3 px-4">High Risks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {comparisonMatrix.comparison_matrix?.rows?.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{row.scenario}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 uppercase">
                        {row.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">{row.avg_score}</td>
                    <td className={`py-3 px-4 font-bold ${row.delta > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {row.delta > 0 ? '+' : ''}{row.delta}
                    </td>
                    <td className="py-3 px-4 font-semibold text-rose-600">{row.critical_risks}</td>
                    <td className="py-3 px-4 font-semibold text-amber-600">{row.high_risks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-900">Configure What-If Scenario</h3>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Scenario Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2026 Q3 Carbon Price Shock (+35%)"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Scenario Hypothesis</label>
                <textarea
                  rows="2"
                  placeholder="Hypothetical assumptions tested in this simulation..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Perturbation Archetype</label>
                <select
                  value={formData.scenarioType}
                  onChange={(e) => setFormData({ ...formData, scenarioType: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                >
                  <option value="CARBON_INCREASE">CARBON_INCREASE (Grid factor / emission spike)</option>
                  <option value="CARBON_REDUCTION">CARBON_REDUCTION (Renewable PPA / abatement)</option>
                  <option value="ENERGY_INCREASE">ENERGY_INCREASE (Manufacturing load expansion)</option>
                  <option value="ENERGY_REDUCTION">ENERGY_REDUCTION (Efficiency retrofit)</option>
                  <option value="COMPLIANCE_DELAY">COMPLIANCE_DELAY (Statutory filing / audit delay)</option>
                  <option value="SUPPLIER_FAILURE">SUPPLIER_FAILURE (Vendor insolvency / disruption)</option>
                  <option value="PROJECT_DELAY">PROJECT_DELAY (MRV verification delay)</option>
                  <option value="ESG_DEGRADATION">ESG_DEGRADATION (Materiality rating downgrade)</option>
                  <option value="MITIGATION_FAILURE">MITIGATION_FAILURE (Abatement failure)</option>
                  <option value="RISK_FACTOR_CHANGE">RISK_FACTOR_CHANGE (Direct P/I factor shift)</option>
                </select>
              </div>

              {/* Dynamic sliders based on archetype */}
              {(formData.scenarioType === 'CARBON_INCREASE' || formData.scenarioType === 'CARBON_REDUCTION') && (
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Carbon Emission Shift (%)</span>
                    <span className="font-mono font-bold text-indigo-600">{formData.carbon_pct}%</span>
                  </div>
                  <input
                    type="range"
                    min="-80"
                    max="200"
                    value={formData.carbon_pct}
                    onChange={(e) => setFormData({ ...formData, carbon_pct: e.target.value })}
                    className="w-full accent-indigo-600"
                  />
                </div>
              )}

              {formData.scenarioType === 'COMPLIANCE_DELAY' && (
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Filing Delay (Days)</span>
                    <span className="font-mono font-bold text-indigo-600">{formData.compliance_days} days</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="180"
                    value={formData.compliance_days}
                    onChange={(e) => setFormData({ ...formData, compliance_days: e.target.value })}
                    className="w-full accent-indigo-600"
                  />
                </div>
              )}

              {formData.scenarioType === 'SUPPLIER_FAILURE' && (
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                    <span>Supplier Risk Shift (%)</span>
                    <span className="font-mono font-bold text-indigo-600">+{formData.supplier_pct}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    value={formData.supplier_pct}
                    onChange={(e) => setFormData({ ...formData, supplier_pct: e.target.value })}
                    className="w-full accent-indigo-600"
                  />
                </div>
              )}

              <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition shadow-md shadow-indigo-600/20"
                >
                  Create Scenario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
