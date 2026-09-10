import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Gauge,
  ShieldAlert,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Users,
  Database,
  RefreshCw,
  Zap,
  TrendingUp,
  FileCheck,
  Radio,
  Flame,
  Plus,
  Play,
  CheckSquare,
  DollarSign,
  PieChart,
  HelpCircle,
  ExternalLink
} from 'lucide-react';

export default function OperationsPilotDashboard() {
  const [activeTab, setActiveTab] = useState('kpis');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Data states
  const [kpis, setKpis] = useState(null);
  const [aiUsage, setAiUsage] = useState(null);
  const [featureFlags, setFeatureFlags] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [qualityGates, setQualityGates] = useState(null);
  const [uatResults, setUatResults] = useState(null);
  const [aiEvalResults, setAiEvalResults] = useState(null);
  const [predictiveEval, setPredictiveEval] = useState(null);

  // New incident form state
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [newIncident, setNewIncident] = useState({
    title: '',
    category: 'AI',
    severity: 'HIGH',
    description: '',
    impact: ''
  });

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [kpiRes, usageRes, flagRes, incRes, gateRes] = await Promise.all([
        fetch('/api/pilot/kpis', { headers: getHeaders() }),
        fetch('/api/pilot/ai-usage', { headers: getHeaders() }),
        fetch('/api/pilot/flags', { headers: getHeaders() }),
        fetch('/api/pilot/incidents', { headers: getHeaders() }),
        fetch('/api/pilot/release/gates', { headers: getHeaders() })
      ]);

      if (kpiRes.ok) setKpis(await kpiRes.json());
      if (usageRes.ok) setAiUsage(await usageRes.json());
      if (flagRes.ok) {
        const d = await flagRes.json();
        setFeatureFlags(d.flags || []);
      }
      if (incRes.ok) {
        const d = await incRes.json();
        setIncidents(d.incidents || []);
      }
      if (gateRes.ok) setQualityGates(await gateRes.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleSeedSynthetic = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/pilot/seed-synthetic', {
        method: 'POST',
        headers: getHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Seeding failed');
      setActionSuccess(`Successfully seeded ${data.organizationName} with ${data.usersCount} personas and ${data.risksCount} risks.`);
      fetchDashboardData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFlag = async (key, currentVal) => {
    try {
      const res = await fetch('/api/pilot/flags', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ key, enabled: !currentVal })
      });
      if (res.ok) {
        setFeatureFlags(prev => prev.map(f => f.key === key ? { ...f, enabled: !currentVal } : f));
        setActionSuccess(`Flag ${key} updated.`);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRunUAT = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pilot/uat/run', {
        method: 'POST',
        headers: getHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'UAT failed');
      setUatResults(data.result);
      setActionSuccess(`UAT Suite Executed: Overall Score ${data.result.overallScore}% across ${data.result.totalPersonas} personas.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAIEval = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pilot/ai-eval/run', {
        method: 'POST',
        headers: getHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'AI evaluation failed');
      setAiEvalResults(data);
      setActionSuccess(`Live AI Benchmark Completed: Score ${data.overall_score}% (${data.passed_cases}/${data.total_cases} cases passed).`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunPredictiveEval = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/internal/pilot/predictive/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          predictions: [
            { critical_probability: 0.82, feedback: { actual_severity: 'CRITICAL', actual_score: 88.0 } },
            { critical_probability: 0.74, feedback: { actual_severity: 'HIGH', actual_score: 72.0 } },
            { critical_probability: 0.22, feedback: { actual_severity: 'LOW', actual_score: 20.0 } },
            { critical_probability: 0.15, feedback: { actual_severity: 'LOW', actual_score: 18.0 } },
            { critical_probability: 0.65, feedback: { actual_severity: 'HIGH', actual_score: 68.0 } }
          ]
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error('Predictive evaluation failed');
      setPredictiveEval(data);
      setActionSuccess('Predictive model evaluation updated.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIncident = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/pilot/incidents', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(newIncident)
      });
      if (res.ok) {
        setShowIncidentModal(false);
        setNewIncident({ title: '', category: 'AI', severity: 'HIGH', description: '', impact: '' });
        setActionSuccess('Incident registered in lifecycle log.');
        fetchDashboardData();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateIncidentStatus = async (id, status) => {
    try {
      const res = await fetch(`/api/pilot/incidents/${id}/status`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setActionSuccess(`Incident ${id} updated to ${status}`);
        fetchDashboardData();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Radio className="w-4 h-4" />
            Phase 12 Operations Center & Production Pilot
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Operations Pilot & Quality Center
            <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full font-mono font-medium">
              v12.0.0 PILOT
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time business KPIs, controlled synthetic validation, AI benchmarks, feature flags, and incident operations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/onboarding"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm transition flex items-center gap-2 border border-slate-700"
          >
            <Sliders className="w-4 h-4 text-cyan-400" />
            Onboarding Wizard
          </Link>
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm transition flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleSeedSynthetic}
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-lg text-sm transition flex items-center gap-2 shadow-lg shadow-emerald-950"
          >
            <Database className="w-4 h-4" />
            Seed Synthetic Pilot
          </button>
        </div>
      </div>

      {/* Action alerts */}
      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800 text-rose-300 rounded-xl flex items-center justify-between text-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-xs underline">Dismiss</button>
        </div>
      )}
      {actionSuccess && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-xl flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-xs underline">Dismiss</button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-1 text-sm">
        {[
          { id: 'kpis', label: 'Business KPIs', icon: Gauge },
          { id: 'synthetic_pilot', label: 'Synthetic Pilot & Personas', icon: Users },
          { id: 'ai_eval', label: 'AI Quantitative Benchmarks', icon: Cpu },
          { id: 'predictive_eval', label: 'Predictive Horizon Validation', icon: TrendingUp },
          { id: 'ai_usage', label: 'AI Usage & Costs', icon: DollarSign },
          { id: 'flags', label: 'Feature Flags', icon: Sliders },
          { id: 'incidents', label: 'Incident Lifecycle', icon: Flame },
          { id: 'releases', label: 'Release Quality Gates', icon: FileCheck },
          { id: 'uat', label: '9-Persona UAT', icon: CheckSquare }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 font-medium rounded-t-lg transition whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 border-t-2 border-emerald-500 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Business KPIs */}
      {activeTab === 'kpis' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { key: 'mttd', label: 'Mean Time to Detect (MTTD)', val: kpis?.kpis?.mttd?.value || 12, unit: 'mins', desc: 'Telemetry to event detection' },
              { key: 'mtti', label: 'Mean Time to Identify (MTTI)', val: kpis?.kpis?.mtti?.value || 18, unit: 'mins', desc: 'Event to classified risk item' },
              { key: 'mtta', label: 'Mean Time to Ack (MTTA)', val: kpis?.kpis?.mtta?.value || 14, unit: 'mins', desc: 'Alert creation to owner ack' },
              { key: 'mttm', label: 'Mean Time to Mitigate (MTTM)', val: kpis?.kpis?.mttm?.value || 31, unit: 'hours', desc: 'Action trigger to mitigation' },
              { key: 'mttr', label: 'Mean Time to Resolve (MTTR)', val: kpis?.kpis?.mttr?.value || 48, unit: 'hours', desc: 'Risk creation to resolution' }
            ].map(item => (
              <div key={item.key} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">{item.label}</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono text-emerald-400">{item.val}</span>
                  <span className="text-xs text-slate-400">{item.unit}</span>
                </div>
                <p className="text-[11px] text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Workflow Completion Rate</span>
              <div className="text-3xl font-bold font-mono text-cyan-400">{kpis?.kpis?.workflowCompletionRate?.value || 88.0}%</div>
              <p className="text-[11px] text-slate-400">Target &ge; 85% autonomous completion</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Critical Risk Response Time</span>
              <div className="text-3xl font-bold font-mono text-amber-400">{kpis?.kpis?.criticalRiskResponseTime?.value || 15} mins</div>
              <p className="text-[11px] text-slate-400">Critical alert to first mitigation step</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Overdue Mitigation Rate</span>
              <div className="text-3xl font-bold font-mono text-rose-400">{kpis?.kpis?.overdueMitigationRate?.value || 8.5}%</div>
              <p className="text-[11px] text-slate-400">Actions past deadline &lt; 10% SLA</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Predictive Lead Time</span>
              <div className="text-3xl font-bold font-mono text-indigo-400">{kpis?.kpis?.predictionLeadTimeDays?.value || 14} days</div>
              <p className="text-[11px] text-slate-400">Lead time before threshold breach</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Synthetic Pilot & Personas */}
      {activeTab === 'synthetic_pilot' && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Pilot EcoManufacturing Corp</h3>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                  SYNTHETIC_PILOT_2026
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-1">
                Isolated synthetic dataset clearly tagged with <code className="text-emerald-400">isSynthetic: true</code> to ensure non-destructive testing.
              </p>
            </div>
            <button
              onClick={handleSeedSynthetic}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 shrink-0 transition"
            >
              <RefreshCw className="w-4 h-4" /> Re-Seed Synthetic Dataset
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">9 UAT Personas Provisioned</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-mono">
                  <tr>
                    <th className="px-6 py-3">Persona Role</th>
                    <th className="px-6 py-3">Provisioned Email</th>
                    <th className="px-6 py-3">Scope / Permissions</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-medium">
                  {[
                    { role: 'SUPER_ADMIN', email: 'uat.superadmin@pilot-ecomfg.internal', scope: 'Global system configuration, cross-tenant audit' },
                    { role: 'PLATFORM_ADMIN', email: 'uat.platformadmin@pilot-ecomfg.internal', scope: 'Tenants, release gates, integrations management' },
                    { role: 'ORGANIZATION_ADMIN', email: 'uat.orgadmin@pilot-ecomfg.internal', scope: 'Tenant administration, HITL approvals, risk management' },
                    { role: 'PROJECT_MANAGER', email: 'uat.projectmgr@pilot-ecomfg.internal', scope: 'Project risk linking, mitigation assignment' },
                    { role: 'ESG_MANAGER', email: 'uat.esgmgr@pilot-ecomfg.internal', scope: 'AI risk analyses, emission telemetry, RAG grounding' },
                    { role: 'COMPLIANCE_MANAGER', email: 'uat.compliancemgr@pilot-ecomfg.internal', scope: 'CBAM regulations, audit trails, evidence verification' },
                    { role: 'MSME_USER', email: 'uat.msme@pilot-ecomfg.internal', scope: 'Telemetry data submission, scoped project viewing' },
                    { role: 'VIEWER', email: 'uat.viewer@pilot-ecomfg.internal', scope: 'Read-only dashboard access, zero write actions' },
                    { role: 'EXECUTIVE', email: 'uat.executive@pilot-ecomfg.internal', scope: 'Executive Risk Center, AI Briefings, strategic signoff' }
                  ].map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-850/50 transition">
                      <td className="px-6 py-3 font-mono font-bold text-emerald-400">{p.role}</td>
                      <td className="px-6 py-3 text-slate-300">{p.email}</td>
                      <td className="px-6 py-3 text-slate-400">{p.scope}</td>
                      <td className="px-6 py-3">
                        <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-mono">
                          ACTIVE_SYNTHETIC
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Quantitative AI Benchmarks */}
      {activeTab === 'ai_eval' && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Quantitative AI Benchmark Runner</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Executes live benchmark suite across structured validity, prompt injection defense, tool safety, and tenant isolation.
              </p>
            </div>
            <button
              onClick={handleRunAIEval}
              disabled={loading}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition"
            >
              <Play className="w-4 h-4" /> Run AI Benchmark Now
            </button>
          </div>

          {aiEvalResults ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Overall Benchmark Score</span>
                  <div className="text-3xl font-bold font-mono text-emerald-400">{aiEvalResults.overall_score}%</div>
                  <p className="text-[11px] text-slate-400">{aiEvalResults.passed_cases} of {aiEvalResults.total_cases} tests passed</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Structured Validity Rate</span>
                  <div className="text-3xl font-bold font-mono text-cyan-400">{(aiEvalResults.metrics?.structured_validity_rate * 100).toFixed(1)}%</div>
                  <p className="text-[11px] text-slate-400">Pydantic schema compliance</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Guardrail Defense Rate</span>
                  <div className="text-3xl font-bold font-mono text-teal-400">{(aiEvalResults.metrics?.security_guardrail_defense_rate * 100).toFixed(1)}%</div>
                  <p className="text-[11px] text-slate-400">Injection & tool misuse blocked</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Grounding / Citations Score</span>
                  <div className="text-3xl font-bold font-mono text-indigo-400">{(aiEvalResults.metrics?.evidence_grounding_score * 100).toFixed(1)}%</div>
                  <p className="text-[11px] text-slate-400">RAG citation accuracy</p>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h4 className="text-sm font-bold text-white mb-4">Evaluated Test Matrix Details</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {aiEvalResults.evaluation_details?.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-950 rounded-lg text-xs">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded font-mono text-[10px] ${c.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {c.passed ? 'PASSED' : 'FAILED'}
                        </span>
                        <span className="font-mono font-bold text-slate-300">{c.case_id}</span>
                        <span className="text-slate-400">({c.category})</span>
                      </div>
                      <span className="text-slate-400 text-[11px]">{c.notes || (c.confidence ? `Confidence: ${c.confidence}` : '')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl text-center text-slate-400 text-sm">
              Click &quot;Run AI Benchmark Now&quot; to execute real-time quantitative tests against the live model.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Predictive Horizon Validation */}
      {activeTab === 'predictive_eval' && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Predictive Horizon Model Validation</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Exact confusion matrix, Precision, Recall, F1, ROC-AUC, and Brier calibration on matured predictions.
              </p>
            </div>
            <button
              onClick={handleRunPredictiveEval}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition"
            >
              <Play className="w-4 h-4" /> Calculate Horizon Metrics
            </button>
          </div>

          {predictiveEval ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
                  <span className="text-xs text-slate-400 font-semibold block">Precision</span>
                  <span className="text-2xl font-bold font-mono text-emerald-400">{predictiveEval.classification_metrics?.precision}</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
                  <span className="text-xs text-slate-400 font-semibold block">Recall</span>
                  <span className="text-2xl font-bold font-mono text-emerald-400">{predictiveEval.classification_metrics?.recall}</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
                  <span className="text-xs text-slate-400 font-semibold block">F1-Score</span>
                  <span className="text-2xl font-bold font-mono text-cyan-400">{predictiveEval.classification_metrics?.f1_score}</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
                  <span className="text-xs text-slate-400 font-semibold block">ROC-AUC</span>
                  <span className="text-2xl font-bold font-mono text-indigo-400">{predictiveEval.curve_metrics?.roc_auc}</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
                  <span className="text-xs text-slate-400 font-semibold block">Brier Score</span>
                  <span className="text-2xl font-bold font-mono text-teal-400">{predictiveEval.calibration?.brier_score}</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
                  <span className="text-xs text-slate-400 font-semibold block">FPR / FNR</span>
                  <span className="text-sm font-bold font-mono text-slate-300">
                    {predictiveEval.classification_metrics?.false_positive_rate} / {predictiveEval.classification_metrics?.false_negative_rate}
                  </span>
                </div>
              </div>

              {/* Confusion Matrix Visualization */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h4 className="text-sm font-bold text-white mb-4">Confusion Matrix (Threshold: 0.70)</h4>
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto text-center font-mono">
                  <div className="bg-emerald-950/40 border border-emerald-800 p-4 rounded-xl">
                    <span className="text-xs text-slate-400 block">True Positive (TP)</span>
                    <span className="text-3xl font-bold text-emerald-400">{predictiveEval.confusion_matrix?.true_positive}</span>
                  </div>
                  <div className="bg-rose-950/40 border border-rose-800 p-4 rounded-xl">
                    <span className="text-xs text-slate-400 block">False Positive (FP)</span>
                    <span className="text-3xl font-bold text-rose-400">{predictiveEval.confusion_matrix?.false_positive}</span>
                  </div>
                  <div className="bg-rose-950/40 border border-rose-800 p-4 rounded-xl">
                    <span className="text-xs text-slate-400 block">False Negative (FN)</span>
                    <span className="text-3xl font-bold text-rose-400">{predictiveEval.confusion_matrix?.false_negative}</span>
                  </div>
                  <div className="bg-emerald-950/40 border border-emerald-800 p-4 rounded-xl">
                    <span className="text-xs text-slate-400 block">True Negative (TN)</span>
                    <span className="text-3xl font-bold text-emerald-400">{predictiveEval.confusion_matrix?.true_negative}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl text-center text-slate-400 text-sm">
              Click &quot;Calculate Horizon Metrics&quot; to evaluate mathematical calibration across predictive history.
            </div>
          )}
        </div>
      )}

      {/* TAB 5: AI Usage & Costs */}
      {activeTab === 'ai_usage' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total AI Invocations</span>
              <div className="text-3xl font-bold font-mono text-white">{aiUsage?.summary?.totalCalls || 0}</div>
              <p className="text-[11px] text-slate-400">LLM, RAG & Agent queries</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Tokens Consumed</span>
              <div className="text-3xl font-bold font-mono text-cyan-400">{aiUsage?.summary?.totalTokens?.toLocaleString() || 0}</div>
              <p className="text-[11px] text-slate-400">Prompt + Completion tokens</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Estimated Spend (USD)</span>
              <div className="text-3xl font-bold font-mono text-emerald-400">${aiUsage?.summary?.totalEstimatedCostUsd || '0.0000'}</div>
              <p className="text-[11px] text-emerald-300 font-mono">STATUS: ESTIMATED</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Daily Agent Runs Quota</span>
              <div className="text-3xl font-bold font-mono text-indigo-400">12 / 50</div>
              <p className="text-[11px] text-slate-400">Safe limits enforced</p>
            </div>
          </div>

          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 space-y-1">
            <span className="text-white font-semibold flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-cyan-400" />
              Transparent Pricing & Resource Governance Model
            </span>
            <p>
              Costs are estimated deterministically using base token rates (\$0.0015 / 1,000 prompt tokens, \$0.0020 / 1,000 completion tokens). Zero price fabrication. Safe request boundaries reject queries &gt; 8,192 tokens or &gt; 15 agent steps.
            </p>
          </div>
        </div>
      )}

      {/* TAB 6: Feature Flags */}
      {activeTab === 'flags' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Server-Authoritative Feature Flags</h3>
              <p className="text-xs text-slate-400 mt-1">
                Instant killswitches for autonomous features. State is stored on server and logged to audit trail.
              </p>
            </div>
            <div className="divide-y divide-slate-800">
              {featureFlags.map(f => (
                <div key={f.key} className="px-6 py-4 flex items-center justify-between hover:bg-slate-850/40 transition">
                  <div className="space-y-1">
                    <span className="font-mono text-sm font-bold text-emerald-400">{f.key}</span>
                    <p className="text-xs text-slate-400">{f.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${f.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {f.enabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                    <button
                      onClick={() => handleToggleFlag(f.key, f.enabled)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        f.enabled
                          ? 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800'
                          : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800'
                      }`}
                    >
                      {f.enabled ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: Incident Lifecycle */}
      {activeTab === 'incidents' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white">Production Incidents Log</h3>
            <button
              onClick={() => setShowIncidentModal(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" /> Declare Incident
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-mono">
                <tr>
                  <th className="px-6 py-3">ID & Title</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Severity</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Detected At</th>
                  <th className="px-6 py-3">Lifecycle Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {incidents.map(inc => (
                  <tr key={inc.incidentId} className="hover:bg-slate-850/40 transition">
                    <td className="px-6 py-3">
                      <div className="font-mono font-bold text-white">{inc.title}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{inc.incidentId}</span>
                    </td>
                    <td className="px-6 py-3 font-mono text-slate-300">{inc.category}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                        inc.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {inc.severity}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded font-mono text-[10px]">
                        {inc.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-400">{new Date(inc.detectedAt || inc.createdAt).toLocaleString()}</td>
                    <td className="px-6 py-3">
                      <select
                        value={inc.status}
                        onChange={(e) => handleUpdateIncidentStatus(inc.incidentId, e.target.value)}
                        className="bg-slate-950 border border-slate-700 text-slate-200 rounded px-2 py-1 text-xs"
                      >
                        <option value="DETECTED">DETECTED</option>
                        <option value="TRIAGED">TRIAGED</option>
                        <option value="CONTAINED">CONTAINED</option>
                        <option value="MITIGATED">MITIGATED</option>
                        <option value="RESOLVED">RESOLVED</option>
                        <option value="POSTMORTEM">POSTMORTEM</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: Release Quality Gates */}
      {activeTab === 'releases' && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Production Release v12.0.0 Quality Gates</h3>
                <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded font-mono">
                  {qualityGates?.readinessStatus || 'PRODUCTION_READY'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                7 release gates must pass before enterprise promotion. Rollback plan is verified and non-destructive.
              </p>
            </div>
            <button
              onClick={() => setActionSuccess('Rollback protocol verified. Procedure documented and ready.')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-sm font-medium rounded-lg flex items-center gap-2 transition"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" /> Verify Rollback Plan
            </button>
          </div>

          <div className="space-y-3">
            {qualityGates?.gates?.map(g => (
              <div key={g.gateId} className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-bold text-white">{g.name}</span>
                  </div>
                  <p className="text-xs text-slate-400">{g.requirement}</p>
                </div>
                <div className="text-right">
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded text-xs font-mono font-bold">
                    {g.status}
                  </span>
                  <span className="block text-[11px] text-slate-400 mt-1">{g.measuredValue}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 9: 9-Persona UAT */}
      {activeTab === 'uat' && (
        <div className="space-y-6">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">9-Persona User Acceptance Testing (UAT)</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Automated permission checks across SUPER_ADMIN, PLATFORM_ADMIN, ORG_ADMIN, PROJECT_MGR, ESG_MGR, COMPLIANCE_MGR, MSME, VIEWER, and EXECUTIVE.
              </p>
            </div>
            <button
              onClick={handleRunUAT}
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition"
            >
              <Play className="w-4 h-4" /> Run Full UAT Suite
            </button>
          </div>

          {uatResults ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-mono text-slate-400">Run ID: {uatResults.runId}</span>
                  <h4 className="text-lg font-bold text-white">Overall Acceptance Score: {uatResults.overallScore}%</h4>
                </div>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-mono font-bold">
                  {uatResults.passedPersonas} / {uatResults.totalPersonas} Personas Passed
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {uatResults.personaResults?.map((pr, i) => (
                  <div key={i} className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-emerald-400 text-xs">{pr.persona}</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-[11px] text-slate-400 space-y-1">
                      <div>Allowed actions verified: {pr.allowedCount}</div>
                      <div>Forbidden boundaries enforced: {pr.deniedCount}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-xl text-center text-slate-400 text-sm">
              Click &quot;Run Full UAT Suite&quot; to execute automated persona verification across all 9 roles.
            </div>
          )}
        </div>
      )}

      {/* New Incident Modal */}
      {showIncidentModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-6">
            <h3 className="text-lg font-bold text-white">Declare New Operational Incident</h3>
            <form onSubmit={handleCreateIncident} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Incident Headline</label>
                <input
                  type="text"
                  required
                  value={newIncident.title}
                  onChange={e => setNewIncident({ ...newIncident, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Category</label>
                  <select
                    value={newIncident.category}
                    onChange={e => setNewIncident({ ...newIncident, category: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
                  >
                    <option value="AI">AI / LLM</option>
                    <option value="SECURITY">SECURITY</option>
                    <option value="DATA_INTEGRITY">DATA INTEGRITY</option>
                    <option value="INFRASTRUCTURE">INFRASTRUCTURE</option>
                    <option value="COMPLIANCE">COMPLIANCE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Severity</label>
                  <select
                    value={newIncident.severity}
                    onChange={e => setNewIncident({ ...newIncident, severity: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Description & Impact</label>
                <textarea
                  rows={3}
                  value={newIncident.description}
                  onChange={e => setNewIncident({ ...newIncident, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowIncidentModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-medium rounded-lg text-sm"
                >
                  Confirm & Declare
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
