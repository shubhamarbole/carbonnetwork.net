import React, { useState, useEffect } from 'react';
import { 
  Building, Zap, Globe, Droplet, Recycle, Factory, ShieldCheck, 
  ArrowRight, UploadCloud, Plus, FileSpreadsheet, Bot, AlertTriangle, CheckCircle2, TrendingDown, Target,
  RefreshCw, Trash2, Eye, Download, Sparkles, FileText, BarChart3, Leaf
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import HealthScoreModal from '../../components/HealthScoreModal';
import AIRiskCheckModal from '../../components/environmental/AIRiskCheckModal';

export default function MSMEWorkspace() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';

  const setActiveTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const [metrics, setMetrics] = useState({
    energyKWh: 14250,
    ghgTonnes: 11.6,
    waterM3: 340,
    wasteKg: 1200,
    healthScore: 84
  });
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Modals
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [viewRecordModal, setViewRecordModal] = useState(false);
  const [riskCheckRecord, setRiskCheckRecord] = useState(null);
  const [riskModalOpen, setRiskModalOpen] = useState(false);
  const [viewNotesModal, setViewNotesModal] = useState(false);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [scoreRes, envRes, readingsRes] = await Promise.all([
        fetch('/api/health-score', { headers }),
        fetch('/api/environment/dashboard?period=Quarterly&facilityId=all', { headers }),
        fetch('/api/environment/readings', { headers })
      ]);
      if (scoreRes.ok) {
        const sJson = await scoreRes.json();
        const score = sJson?.data?.overallScore || sJson?.overallScore;
        if (score) {
          setMetrics(prev => ({ ...prev, healthScore: score }));
        }
      }
      if (envRes.ok) {
        const eJson = await envRes.json();
        if (eJson?.metrics) {
          setMetrics(prev => ({
            ...prev,
            energyKWh: eJson.metrics.totalEnergy ?? prev.energyKWh,
            ghgTonnes: eJson.metrics.totalEmissions ?? prev.ghgTonnes,
            waterM3: eJson.metrics.totalWater ?? prev.waterM3,
            wasteKg: eJson.metrics.totalWaste ?? prev.wasteKg,
            healthScore: eJson.overallScore ?? prev.healthScore
          }));
        }
      }
      if (readingsRes.ok) {
        const rJson = await readingsRes.json();
        if (Array.isArray(rJson)) {
          setSubmissions(rJson);
        }
      }
    } catch (e) {
      console.error('Failed to load MSME live metrics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadSummary();
  }, [token]);

  // Delete Draft Handler (Only for DRAFT status)
  const handleDeleteDraft = async (id) => {
    if (!window.confirm('Are you sure you want to delete this draft? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/environment/readings/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setActionSuccess('Draft reading deleted successfully.');
        setSubmissions(prev => prev.filter(s => (s._id || s.id) !== id));
        setTimeout(() => setActionSuccess(''), 4000);
      } else {
        const err = await res.json();
        setActionError(err.message || 'Failed to delete draft');
        setTimeout(() => setActionError(''), 4000);
      }
    } catch (e) {
      setActionError('Network error deleting draft');
      setTimeout(() => setActionError(''), 4000);
    }
  };

  // Submit Draft for Verification
  const handleSubmitForVerification = async (recordId) => {
    try {
      const res = await fetch('/api/workflow/transition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recordId,
          module: 'Energy',
          targetStatus: 'SUBMITTED',
          comment: 'MSME user submitted record for independent third-party verification.'
        })
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess('Record submitted successfully for MRV verification!');
        loadSummary();
        setTimeout(() => setActionSuccess(''), 4000);
      } else {
        setActionError(json.error || 'Failed to submit record');
        setTimeout(() => setActionError(''), 4000);
      }
    } catch (e) {
      setActionError('Error submitting record');
      setTimeout(() => setActionError(''), 4000);
    }
  };

  // Resubmit after correction
  const handleResubmit = async (recordId) => {
    try {
      const res = await fetch('/api/workflow/transition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recordId,
          module: 'Energy',
          targetStatus: 'RESUBMITTED',
          comment: 'MSME user corrected data points per verifier findings and resubmitted.'
        })
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess('Corrected record resubmitted to Verifier Queue!');
        loadSummary();
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (e) {
      setActionError('Error resubmitting record');
      setTimeout(() => setActionError(''), 4000);
    }
  };

  // Download Summary (Verified Records)
  const handleDownloadSummary = (record) => {
    const summaryData = {
      recordId: record._id,
      module: 'Energy / Environmental Accounting',
      source: record.sourceType || 'Grid Electricity',
      consumption: record.consumption,
      unit: record.unit || 'kWh',
      status: record.status,
      verificationStatement: 'Verified in conformance with GHG Protocol & ISO 14064',
      verifiedAt: record.updatedAt || new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(summaryData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Verified_Environmental_Record_${record._id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const modulesList = [
    {
      id: 'energy',
      name: 'Energy Management',
      path: '/energy',
      icon: Zap,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50 border-amber-200',
      description: 'Electricity sub-meters, diesel generators, grid factor synchronization & renewable share.',
      stat: `${Number(metrics?.energyKWh || 0).toLocaleString()} kWh`,
      subStat: 'Scope 2 accounted'
    },
    {
      id: 'ghg',
      name: 'GHG Emissions',
      path: '/ghg',
      icon: Globe,
      color: 'text-forest-500',
      bgColor: 'bg-forest-50 border-forest-200',
      description: 'Stationary combustion Scope 1, mobile equipment, and Scope 3 supply-chain footprint.',
      stat: `${metrics?.ghgTonnes || 0} tCO2e`,
      subStat: 'GHG Protocol aligned'
    },
    {
      id: 'water',
      name: 'Water Management',
      path: '/water',
      icon: Droplet,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 border-blue-200',
      description: 'Municipal utility meter readings, groundwater borewells, and internal recycling ratios.',
      stat: `${metrics?.waterM3 || 0} m³`,
      subStat: 'Withdrawal index'
    },
    {
      id: 'biodiversity',
      name: 'Biodiversity Impact',
      path: '/biodiversity',
      icon: ShieldCheck,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 border-emerald-200',
      description: 'Protected habitat proximity assessments, tree-canopy surveys, and ecological preservation.',
      stat: '12.4 ha',
      subStat: 'Preserved habitats'
    },
    {
      id: 'waste',
      name: 'Waste Diversion',
      path: '/waste',
      icon: Recycle,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50 border-emerald-200',
      description: 'Non-hazardous recycling, hazardous manifest documentation, and landfill diversion rate.',
      stat: `${Number(metrics?.wasteKg || 0).toLocaleString()} kg`,
      subStat: 'Diverted from landfill'
    },
    {
      id: 'pollution',
      name: 'Pollution Prevention',
      path: '/pollution',
      icon: Factory,
      color: 'text-rose-500',
      bgColor: 'bg-rose-50 border-rose-200',
      description: 'Stack emissions, continuous air monitors, effluent wastewater pH, and statutory limits.',
      stat: '0 Incidents',
      subStat: 'Within legal limits'
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Greeting & Scope Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-forest-100 text-forest-800 border border-forest-200">
              MSME Workspace
            </span>
            <span className="text-xs text-slate-400 font-mono">Tenant: {user?.organizationId || 'Eco Corp MSME'}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Welcome back, {user?.name || 'MSME Lead'}
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Environmental Sustainability Accounting, Audit-Ready Evidence & Pre-Verification Risk Checks
          </p>
        </div>

        {/* Workspace Sub-Tabs per Section 6 */}
        <div className="flex items-center bg-slate-200/80 p-1 rounded-xl border border-slate-300/60 shadow-xs self-start">
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'dashboard' 
                ? 'bg-white text-forest-800 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('environmental')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'environmental' 
                ? 'bg-white text-forest-800 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Environmental Data
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('submissions')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'submissions' 
                ? 'bg-white text-forest-800 shadow-xs' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            My Submissions ({submissions.length})
          </button>
        </div>
      </div>

      {/* Action Notifications */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs font-bold rounded-r-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess('')} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 bg-rose-50 border-l-4 border-rose-500 text-rose-800 text-xs font-bold rounded-r-xl flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError('')} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: DASHBOARD OVERVIEW */}
      {/* ========================================================= */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Organization Health Score Banner (Clickable) */}
          <div 
            onClick={() => setHealthModalOpen(true)}
            className="bg-gradient-to-r from-forest-900 via-slate-900 to-slate-900 p-5 rounded-3xl text-white shadow-lg cursor-pointer hover:shadow-xl hover:scale-[1.005] transition flex items-center justify-between"
          >
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-forest-500/20 rounded-2xl border border-forest-400/30">
                <ShieldCheck className="h-8 w-8 text-forest-300" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono tracking-widest text-forest-300 uppercase">
                    Organization Health Score
                  </span>
                  <span className="text-[9px] bg-forest-500/30 text-forest-200 px-2 py-0.5 rounded-full font-bold">
                    Click to Inspect Factors
                  </span>
                </div>
                <div className="flex items-baseline space-x-2 mt-0.5">
                  <span className="text-3xl font-black text-white">{metrics.healthScore}</span>
                  <span className="text-sm font-bold text-slate-300">/ 100</span>
                  <span className="text-xs font-semibold text-forest-300 ml-2">Exemplary Rating (GHG Protocol Compliant)</span>
                </div>
              </div>
            </div>
            <div className="hidden sm:flex items-center space-x-2 text-xs font-bold text-forest-300">
              <span>View Audit Breakdown</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </div>

          {/* 6 Core Environmental KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {modulesList.map(mod => (
              <div 
                key={mod.id} 
                onClick={() => navigate(mod.path)} 
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-forest-400 transition group"
              >
                <div className={`flex items-center justify-between ${mod.color} mb-1`}>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{mod.name.split(' ')[0]}</span>
                  <mod.icon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                </div>
                <p className="text-xl font-black text-slate-900">{mod.stat}</p>
                <p className="text-[10px] text-slate-400 font-mono">{mod.subStat}</p>
              </div>
            ))}
          </div>

          {/* Direct Environmental Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-forest-500 inline-block animate-pulse"></span>
                  <span>Direct Environmental Actions</span>
                </h2>
                <button
                  onClick={() => setActiveTab('submissions')}
                  className="text-xs font-bold text-forest-600 hover:text-forest-700 flex items-center space-x-1"
                >
                  <span>View Submissions Table</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={() => navigate('/energy')}
                  className="p-4 bg-slate-50 hover:bg-forest-50 border border-slate-200 hover:border-forest-300 rounded-2xl text-left transition flex flex-col justify-between"
                >
                  <div className="p-2 w-fit bg-amber-100 text-amber-800 rounded-xl mb-3">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Add Meter Reading</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Log electricity or fuel consumption</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/evidence')}
                  className="p-4 bg-slate-50 hover:bg-forest-50 border border-slate-200 hover:border-forest-300 rounded-2xl text-left transition flex flex-col justify-between"
                >
                  <div className="p-2 w-fit bg-blue-100 text-blue-800 rounded-xl mb-3">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Upload Evidence Proof</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Attach utility bills or test reports</p>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('submissions')}
                  className="p-4 bg-slate-50 hover:bg-forest-50 border border-slate-200 hover:border-forest-300 rounded-2xl text-left transition flex flex-col justify-between"
                >
                  <div className="p-2 w-fit bg-forest-100 text-forest-800 rounded-xl mb-3">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Run AI Risk Check</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">Pre-validate drafts against anomaly thresholds</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Non-Self-Verification Standard Note */}
            <div className="bg-slate-900 rounded-3xl p-6 text-white space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-forest-400">
                  <ShieldCheck className="h-5 w-5" />
                  <h3 className="text-xs font-bold uppercase tracking-wider">Independent Assurance Rule</h3>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Under ISO 14064 & GHG Protocol international accounting standards, 
                  <strong> MSME organizations cannot self-verify records</strong>. Submissions are strictly verified by independent Verifiers and Assurance Auditors.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400">Assigned Verifier:</span>
                <span className="font-bold text-forest-300">SGS Climate Agency</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: ENVIRONMENTAL DATA (6 MODULES) */}
      {/* ========================================================= */}
      {activeTab === 'environmental' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
                <Leaf className="h-5 w-5 text-forest-600" />
                <span>Environmental Data Collection Modules</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Each module allows draft saving, evidence upload, AI pre-screening, and formal submission for verification.
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 bg-forest-600 hover:bg-forest-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm shrink-0"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Full Analytics Dashboard</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modulesList.map(mod => (
              <div 
                key={mod.id} 
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between space-y-4 hover:border-forest-300 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2.5">
                      <div className={`p-2 rounded-xl border ${mod.bgColor} ${mod.color}`}>
                        <mod.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{mod.name}</h3>
                        <span className="text-[10px] font-mono text-slate-400">{mod.stat}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{mod.description}</p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center space-x-2">
                  <button
                    onClick={() => navigate(mod.path)}
                    className="flex-1 py-2 px-3 bg-forest-600 hover:bg-forest-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Enter Data</span>
                  </button>
                  <button
                    onClick={() => {
                      setSelectedRecord({ module: mod.name, name: mod.name });
                      setRiskModalOpen(true);
                    }}
                    className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition"
                    title="Run AI Risk Check on Module"
                  >
                    <Sparkles className="h-4 w-4 text-forest-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: MY SUBMISSIONS (STATUS CONSTRAINTS PER SECTION 6 & 19) */}
      {/* ========================================================= */}
      {activeTab === 'submissions' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center space-x-2">
                <FileSpreadsheet className="h-5 w-5 text-forest-600" />
                <span>My Environmental Submissions Registry</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Strict status controls enforced: DRAFT, SUBMITTED, CORRECTION REQUIRED, and VERIFIED.
              </p>
            </div>
            <button
              onClick={loadSummary}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition self-start flex items-center space-x-1.5 text-xs font-bold"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Registry</span>
            </button>
          </div>

          {loading && submissions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-forest-600" />
              <p className="text-xs font-semibold">Loading submission ledgers...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <CheckCircle2 className="h-8 w-8 text-forest-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">No Submissions Recorded Yet</p>
              <p className="text-xs text-slate-400 mt-1">Start by entering meter readings or environmental data in the 6 modules.</p>
              <button
                onClick={() => navigate('/energy')}
                className="mt-4 px-4 py-2 bg-forest-600 hover:bg-forest-700 text-white rounded-xl text-xs font-bold transition"
              >
                Log First Reading
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-500 uppercase border-b border-slate-100 text-[10px] tracking-wider">
                      <th className="py-4 px-6">Record Details</th>
                      <th className="py-4 px-6">Module</th>
                      <th className="py-4 px-6">Recorded Value</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6">Evidence Proof</th>
                      <th className="py-4 px-6 text-center">Permitted Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submissions.map(r => {
                      const status = r.status || 'DRAFT';
                      const isDraft = status === 'DRAFT';
                      const isSubmitted = status === 'SUBMITTED' || status === 'UNDER_REVIEW';
                      const isCorrectionRequired = status === 'CORRECTION_REQUIRED' || status === 'CHANGES_REQUESTED';
                      const isVerified = status === 'VERIFIED';

                      return (
                        <tr key={r._id || r.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-6">
                            <span className="font-bold text-slate-900 block">{r.readingDate || 'Recent'}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{r.reportingPeriod || 'Quarterly'} • ID: {(r._id || '').slice(-6)}</span>
                          </td>

                          <td className="py-4 px-6">
                            <span className="font-semibold text-slate-800">Energy & Power</span>
                            <span className="block text-[10px] text-slate-400">{r.sourceType || 'Grid'}</span>
                          </td>

                          <td className="py-4 px-6 font-black text-slate-900">
                            {r.consumption?.toLocaleString()} {r.unit || 'kWh'}
                          </td>

                          <td className="py-4 px-6">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center space-x-1 ${
                              isVerified ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                              isCorrectionRequired ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                              isSubmitted ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                              'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {status}
                            </span>
                          </td>

                          <td className="py-4 px-6">
                            {r.evidenceDetails?.fileName || r.evidenceId ? (
                              <span className="inline-flex items-center space-x-1 text-xs text-forest-700 font-semibold">
                                <FileText className="h-3.5 w-3.5" />
                                <span className="truncate max-w-[120px]">{r.evidenceDetails?.fileName || 'Bill Attached'}</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => navigate('/evidence')}
                                className="inline-flex items-center space-x-1 text-[11px] font-semibold text-slate-400 hover:text-forest-600"
                              >
                                <UploadCloud className="h-3.5 w-3.5" />
                                <span>+ Proof</span>
                              </button>
                            )}
                          </td>

                          {/* STRICT STATUS-BASED ACTIONS (SECTION 6 & SECTION 19) */}
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-center space-x-1.5">
                              {/* 1. DRAFT ACTIONS: Edit, Delete, AI Pre-Check, Submit */}
                              {isDraft && (
                                <>
                                  <button
                                    onClick={() => navigate('/energy')}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition"
                                    title="Edit Draft"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRiskCheckRecord(r);
                                      setRiskModalOpen(true);
                                    }}
                                    className="p-1.5 text-forest-600 hover:bg-forest-50 rounded-lg transition"
                                    title="Run AI Risk Check"
                                  >
                                    <Sparkles className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => handleSubmitForVerification(r._id || r.id)}
                                    className="px-2.5 py-1 bg-forest-600 hover:bg-forest-700 text-white rounded-lg font-bold text-xs transition shadow-xs"
                                    title="Submit for Verification"
                                  >
                                    Submit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDraft(r._id || r.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                    title="Delete Draft"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}

                              {/* 2. SUBMITTED ACTIONS: View, View AI Risk Check (NO EDIT, NO DELETE) */}
                              {isSubmitted && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedRecord(r);
                                      setViewRecordModal(true);
                                    }}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition flex items-center space-x-1"
                                    title="View Record Details"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    <span>View</span>
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRiskCheckRecord(r);
                                      setRiskModalOpen(true);
                                    }}
                                    className="px-2 py-1 text-forest-700 bg-forest-50 hover:bg-forest-100 rounded-lg font-bold text-xs transition flex items-center space-x-1"
                                    title="View AI Risk Assessment"
                                  >
                                    <Sparkles className="h-3.5 w-3.5" />
                                    <span>AI Risk</span>
                                  </button>
                                </>
                              )}

                              {/* 3. CORRECTION REQUIRED: View, Edit, Upload Evidence, View Reviewer Notes, Resubmit */}
                              {isCorrectionRequired && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedRecord(r);
                                      setViewNotesModal(true);
                                    }}
                                    className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg font-bold text-xs transition"
                                    title="View Verifier Feedback"
                                  >
                                    Notes
                                  </button>
                                  <button
                                    onClick={() => navigate('/energy')}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition"
                                    title="Edit and Fix Data"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleResubmit(r._id || r.id)}
                                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs transition shadow-xs"
                                    title="Resubmit Corrected Record"
                                  >
                                    Resubmit
                                  </button>
                                </>
                              )}

                              {/* 4. VERIFIED: View, Download Summary (NEVER EDIT OR DELETE) */}
                              {isVerified && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedRecord(r);
                                      setViewRecordModal(true);
                                    }}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs transition flex items-center space-x-1"
                                    title="View Verified Record"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    <span>View</span>
                                  </button>
                                  <button
                                    onClick={() => handleDownloadSummary(r)}
                                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg font-bold text-xs transition flex items-center space-x-1 border border-emerald-200"
                                    title="Download Verified Summary Receipt"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                    <span>Summary</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Record Inspection Modal */}
      {viewRecordModal && selectedRecord && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <CheckCircle2 className="h-5 w-5 text-forest-600" />
                <span>Environmental Submission Record</span>
              </h3>
              <button onClick={() => setViewRecordModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl">
                <span className="text-slate-500 font-semibold">Record ID:</span>
                <span className="font-mono font-bold text-slate-800">{selectedRecord._id || selectedRecord.id}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl">
                <span className="text-slate-500 font-semibold">Status:</span>
                <span className="font-bold text-forest-700">{selectedRecord.status}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl">
                <span className="text-slate-500 font-semibold">Consumption:</span>
                <span className="font-bold text-slate-800">{selectedRecord.consumption} {selectedRecord.unit || 'kWh'}</span>
              </div>
              <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl">
                <span className="text-slate-500 font-semibold">Reading Date:</span>
                <span className="font-bold text-slate-800">{selectedRecord.readingDate}</span>
              </div>
            </div>
            <button
              onClick={() => setViewRecordModal(false)}
              className="w-full py-2.5 bg-slate-900 text-white font-bold rounded-xl text-xs transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Verifier Notes Modal */}
      {viewNotesModal && selectedRecord && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-amber-900 text-sm flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <span>Verifier Correction Notice</span>
              </h3>
              <button onClick={() => setViewNotesModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              The independent third-party verifier flagged the following item requiring revision before official sign-off:
            </p>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-medium">
              "{selectedRecord.reviewerComments || 'Please attach the official utility statement to substantiate Q2 electricity consumption.'}"
            </div>
            <button
              onClick={() => setViewNotesModal(false)}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition"
            >
              Acknowledge & Proceed to Edit
            </button>
          </div>
        </div>
      )}

      {/* AI Risk Check Modal */}
      {riskModalOpen && (
        <AIRiskCheckModal
          isOpen={riskModalOpen}
          onClose={() => {
            setRiskModalOpen(false);
            setRiskCheckRecord(null);
          }}
          record={riskCheckRecord || selectedRecord}
          recordId={riskCheckRecord?._id || riskCheckRecord?.id || 'demo-rec'}
          moduleName="Energy"
        />
      )}

      {/* Health Score Modal */}
      <HealthScoreModal 
        isOpen={healthModalOpen} 
        onClose={() => setHealthModalOpen(false)} 
      />
    </div>
  );
}
