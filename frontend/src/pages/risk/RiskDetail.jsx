import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { 
  ShieldAlert, ArrowLeft, Edit, Trash2, UserCheck, 
  RefreshCw, CheckCircle2, AlertCircle, Clock, 
  Calendar, Layers, Building, History, Activity, 
  User, Check, ChevronRight, X, Calculator, 
  TrendingUp, TrendingDown, Minus, Sparkles, Bot, FileText, BookOpen, AlertTriangle
} from 'lucide-react';

const STATUSES = ['OPEN', 'UNDER_REVIEW', 'MITIGATION_IN_PROGRESS', 'MITIGATED', 'CLOSED'];

export default function RiskDetail() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Status Change Modal
  const [statusModal, setStatusModal] = useState({
    isOpen: false,
    newStatus: 'OPEN',
    reason: '',
    submitting: false
  });

  // Owner Assignment Modal
  const [ownerModal, setOwnerModal] = useState({
    isOpen: false,
    newOwnerId: '',
    usersList: [],
    loadingUsers: false,
    submitting: false
  });

  // Recalculate Score Modal (Phase 2)
  const [recalculateModal, setRecalculateModal] = useState({
    isOpen: false,
    exposure: 50,
    urgency: 50,
    reason: '',
    submitting: false
  });

  // Delete Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Score History (Phase 2)
  const [scoreHistory, setScoreHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Audit Logs for this specific risk
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // AI Analysis (Phase 3)
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [aiAnalyses, setAiAnalyses] = useState([]);
  const [loadingAi, setLoadingAi] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Predictive Intelligence (Phase 9)
  const [prediction, setPrediction] = useState(null);
  const [predictionsList, setPredictionsList] = useState([]);
  const [predicting, setPredicting] = useState(false);
  const [predictionHorizon, setPredictionHorizon] = useState(30);
  const [predHistoryModalOpen, setPredHistoryModalOpen] = useState(false);

  const isViewer = user?.role === 'VIEWER';
  const canDelete = ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ORGANIZATION_ADMIN', 'ADMIN'].includes(user?.role);

  const fetchRiskDetails = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/risks/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error(`Failed to load risk details (${res.status})`);
      }
      const json = await res.json();
      setRisk(json.data);
      setStatusModal(prev => ({ ...prev, newStatus: json.data?.status || 'OPEN' }));
      setOwnerModal(prev => ({ ...prev, newOwnerId: json.data?.ownerId || '' }));
    } catch (err) {
      console.error('Error loading risk:', err);
      setError(err.message || 'Error loading risk details');
    } finally {
      setLoading(false);
    }
  };

  const fetchScoreHistory = async () => {
    if (!token || !id) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/risks/${id}/score-history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setScoreHistory(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load risk score history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchAuditLogs = async () => {
    if (!token || !id) return;
    setLoadingLogs(true);
    try {
      const res = await fetch(`/api/risks/audit-logs?riskId=${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setAuditLogs(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load risk audit logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleRecalculateScore = async (e) => {
    e.preventDefault();
    setRecalculateModal(prev => ({ ...prev, submitting: true }));
    try {
      const res = await fetch(`/api/risks/${id}/score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          exposure: Number(recalculateModal.exposure),
          urgency: Number(recalculateModal.urgency),
          reason: recalculateModal.reason || 'Manual recalculation'
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Recalculation failed');

      setToast({ type: 'success', message: json.message });
      setRecalculateModal(prev => ({ ...prev, isOpen: false }));
      fetchRiskDetails();
      fetchScoreHistory();
      fetchAuditLogs();
    } catch (err) {
      console.error('Score recalculation failed:', err);
      setToast({ type: 'error', message: err.message });
    } finally {
      setRecalculateModal(prev => ({ ...prev, submitting: false }));
    }
  };

  const fetchAiAnalyses = async () => {
    if (!token || !id) return;
    setLoadingAi(true);
    try {
      const res = await fetch(`/api/risks/${id}/ai-analyses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.data || [];
        setAiAnalyses(list);
        if (list.length > 0) {
          setCurrentAnalysis(prev => prev || list[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load AI analyses:', err);
    } finally {
      setLoadingAi(false);
    }
  };

  const handleRunAiAnalysis = async () => {
    if (analyzing || !token || !id) return;
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/risks/${id}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'AI analysis request failed');
      }
      setCurrentAnalysis(json.data);
      setToast({ type: 'success', message: 'LLM Risk Analysis successfully generated!' });
      fetchAiAnalyses();
      fetchAuditLogs();
    } catch (err) {
      console.error('AI analysis error:', err);
      setToast({ type: 'error', message: `AI Analysis Error: ${err.message}` });
    } finally {
      setAnalyzing(false);
    }
  };

  const fetchPredictions = async () => {
    if (!token || !id) return;
    try {
      const res = await fetch(`/api/risks/${id}/predictions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const list = json.data || [];
        setPredictionsList(list);
        if (list.length > 0) {
          setPrediction(list[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load predictions:', err);
    }
  };

  const handleRunPrediction = async () => {
    if (predicting || !token || !id) return;
    setPredicting(true);
    try {
      const res = await fetch(`/api/risks/${id}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ horizon_days: predictionHorizon })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Prediction failed');
      }
      setPrediction(json.data);
      setToast({ type: 'success', message: `Predictive forecast generated for ${predictionHorizon}-day horizon!` });
      fetchPredictions();
      fetchAuditLogs();
    } catch (err) {
      console.error('Prediction error:', err);
      setToast({ type: 'error', message: `Prediction error: ${err.message}` });
    } finally {
      setPredicting(false);
    }
  };

  useEffect(() => {
    fetchRiskDetails();
    fetchScoreHistory();
    fetchAuditLogs();
    fetchAiAnalyses();
    fetchPredictions();
  }, [id, token]);

  const handleOpenOwnerModal = async () => {
    setOwnerModal(prev => ({ ...prev, isOpen: true, loadingUsers: true }));
    try {
      const q = risk?.organizationId ? `?organizationId=${risk.organizationId}` : '';
      const res = await fetch(`/api/risks/meta/assignable-users${q}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setOwnerModal(prev => ({
          ...prev,
          usersList: json.data || [],
          newOwnerId: risk?.ownerId || '',
          loadingUsers: false
        }));
      }
    } catch (e) {
      setOwnerModal(prev => ({ ...prev, loadingUsers: false }));
    }
  };

  const handleSaveStatus = async (e) => {
    e.preventDefault();
    setStatusModal(prev => ({ ...prev, submitting: true }));
    try {
      const res = await fetch(`/api/risks/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: statusModal.newStatus,
          reason: statusModal.reason
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Status transition failed');

      setStatusModal({ isOpen: false, newStatus: '', reason: '', submitting: false });
      setToast({ type: 'success', message: `Status transitioned to ${json.data.status}.` });
      fetchRiskDetails();
      fetchAuditLogs();
    } catch (err) {
      alert(`Status transition error: ${err.message}`);
      setStatusModal(prev => ({ ...prev, submitting: false }));
    }
  };

  const handleSaveOwner = async (e) => {
    e.preventDefault();
    setOwnerModal(prev => ({ ...prev, submitting: true }));
    try {
      const res = await fetch(`/api/risks/${id}/owner`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ownerId: ownerModal.newOwnerId || null
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Owner assignment failed');

      setOwnerModal(prev => ({ ...prev, isOpen: false, submitting: false }));
      setToast({ type: 'success', message: 'Owner successfully assigned.' });
      fetchRiskDetails();
      fetchAuditLogs();
    } catch (err) {
      alert(`Owner assignment error: ${err.message}`);
      setOwnerModal(prev => ({ ...prev, submitting: false }));
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      const res = await fetch(`/api/risks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || 'Failed to delete risk');
      }
      navigate('/risk-manager/risks');
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">MEDIUM</span>;
      case 'LOW':
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">LOW</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-3 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-200">Open</span>;
      case 'UNDER_REVIEW':
        return <span className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">Under Review</span>;
      case 'MITIGATION_IN_PROGRESS':
        return <span className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">Mitigation In Progress</span>;
      case 'MITIGATED':
        return <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Mitigated</span>;
      case 'CLOSED':
        return <span className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300">Closed</span>;
      default:
        return <span className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pl-64 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading risk details...</p>
        </div>
      </div>
    );
  }

  if (error || !risk) {
    return (
      <div className="min-h-screen bg-slate-50 pl-64">
        <Navbar title="AI Risk Manager - Details" />
        <main className="p-8 max-w-4xl mx-auto text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">{error || 'Risk record not found'}</h2>
          <Link
            to="/risk-manager/risks"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Risk Registry</span>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pl-64">
      <Navbar title={`Risk Detail: ${risk.title}`} />

      <main className="p-8 max-w-6xl mx-auto space-y-6">
        {/* Navigation Breadcrumb & Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Link
              to="/risk-manager/risks"
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition shadow-sm"
              title="Back to Risk Registry"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold text-slate-400">ID: {risk._id}</span>
                <span className="text-slate-300">|</span>
                <span className="text-xs font-bold text-slate-500">{risk.category}</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 mt-0.5">{risk.title}</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isViewer && (
              <>
                <button
                  onClick={handleRunAiAnalysis}
                  disabled={analyzing}
                  className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition ${
                    analyzing
                      ? 'bg-purple-100 text-purple-400 border border-purple-200 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700'
                  }`}
                  title="Run structured LLM risk evaluation"
                >
                  {analyzing ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Analyzing with AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Analyze with AI</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setRecalculateModal({
                    isOpen: true,
                    exposure: risk.exposure ?? 50,
                    urgency: risk.urgency ?? 50,
                    reason: '',
                    submitting: false
                  })}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 shadow-sm transition"
                  title="Run deterministic authoritative scoring formula"
                >
                  <Calculator className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Recalculate Score</span>
                </button>

                <button
                  onClick={() => setStatusModal(prev => ({ ...prev, isOpen: true, newStatus: risk.status }))}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-sm transition"
                >
                  Change Status
                </button>

                <button
                  onClick={handleOpenOwnerModal}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-sm transition"
                >
                  Assign Owner
                </button>

                <Link
                  to={`/risk-manager/risks/${risk._id}/edit`}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 transition shadow-sm"
                >
                  <Edit className="h-3.5 w-3.5" />
                  <span>Edit</span>
                </Link>
              </>
            )}

            {canDelete && (
              <button
                onClick={() => setDeleteDialogOpen(true)}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>{toast.message}</span>
          </div>
        )}

        {/* Primary Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Context Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</h2>
                <p className="text-sm text-slate-800 leading-relaxed mt-2 whitespace-pre-wrap">
                  {risk.description}
                </p>
              </div>

              {/* Phase 2: Authoritative Risk Scoring & 4-Factor Matrix */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/60 border border-slate-200 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Calculator className="h-4 w-4 text-emerald-600" />
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        Authoritative Risk Score Engine
                      </h3>
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                        v{risk.score_version || 1}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {risk.last_scored_at ? `Scored on ${new Date(risk.last_scored_at).toLocaleString()}` : 'Initial baseline score'}
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className="text-2xl font-black font-mono text-slate-900 leading-none">
                        {risk.risk_score != null ? Number(risk.risk_score).toFixed(2) : '—'}
                        <span className="text-xs font-medium text-slate-400"> / 100</span>
                      </div>
                    </div>
                    {getSeverityBadge(risk.severity)}
                  </div>
                </div>

                {/* 4 Factor Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Probability */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-600">Probability</span>
                      <span className="font-mono font-bold text-blue-600">{risk.probability}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-1.5">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${risk.probability}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Weight: 35%</span>
                      <span className="text-blue-700 font-bold">+{(risk.probability * 0.35).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Impact */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-600">Impact</span>
                      <span className="font-mono font-bold text-rose-600">{risk.impact}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-1.5">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: `${risk.impact}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Weight: 35%</span>
                      <span className="text-rose-700 font-bold">+{(risk.impact * 0.35).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Exposure */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-600">Exposure</span>
                      <span className="font-mono font-bold text-amber-600">{risk.exposure ?? 50}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-1.5">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${risk.exposure ?? 50}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Weight: 20%</span>
                      <span className="text-amber-700 font-bold">+{((risk.exposure ?? 50) * 0.20).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Urgency */}
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-600">Urgency</span>
                      <span className="font-mono font-bold text-purple-600">{risk.urgency ?? 50}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mb-1.5">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${risk.urgency ?? 50}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Weight: 10%</span>
                      <span className="text-purple-700 font-bold">+{((risk.urgency ?? 50) * 0.10).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Formula Breakdown Card */}
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 space-y-1">
                  <div className="font-bold text-slate-700 flex items-center justify-between">
                    <span>Formula Specification:</span>
                    <span className="font-mono text-slate-500 text-[11px]">
                      Risk Score = (P × 0.35) + (I × 0.35) + (E × 0.20) + (U × 0.10)
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-800">
                    Calculated: ({risk.probability} × 0.35) + ({risk.impact} × 0.35) + ({risk.exposure ?? 50} × 0.20) + ({risk.urgency ?? 50} × 0.10) = <strong className="text-emerald-700 font-black">{Number(risk.risk_score || 0).toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Phase 3: LLM-Powered AI Risk Analysis */}
            <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-5">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-200">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-base font-black text-slate-900">AI Risk Analysis</h2>
                      {currentAnalysis?.model && (
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          {currentAnalysis.model}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {currentAnalysis?.created_at
                        ? `Generated on ${new Date(currentAnalysis.created_at).toLocaleString()}`
                        : 'Structured analysis based on authoritative metrics'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {aiAnalyses.length > 0 && (
                    <button
                      onClick={() => setHistoryModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                      title="View historical AI analyses for this risk"
                    >
                      History ({aiAnalyses.length})
                    </button>
                  )}
                  {!isViewer && (
                    <button
                      onClick={handleRunAiAnalysis}
                      disabled={analyzing}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition shadow-sm flex items-center space-x-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{analyzing ? 'Analyzing...' : 'Re-analyze'}</span>
                    </button>
                  )}
                </div>
              </div>

              {analyzing ? (
                <div className="p-8 text-center space-y-3 bg-purple-50/50 rounded-2xl border border-purple-100 animate-pulse">
                  <RefreshCw className="h-8 w-8 text-purple-600 animate-spin mx-auto" />
                  <h3 className="text-sm font-bold text-slate-900">Generating LLM Risk Analysis...</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Evaluating authoritative 4-factor parameters, threat category, and historical velocity to produce actionable mitigation recommendations.
                  </p>
                </div>
              ) : currentAnalysis ? (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Executive Summary</h3>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-sm text-slate-800 leading-relaxed">
                      {currentAnalysis.summary}
                    </div>
                  </div>

                  {/* Key Factors */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Key Contributing Factors</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {currentAnalysis.key_factors?.map((factor, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 flex items-start space-x-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0" />
                          <span>{factor}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Potential Impact */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Potential Impact Analysis</h3>
                    <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs text-amber-900 leading-relaxed">
                      {currentAnalysis.potential_impact}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Recommended Mitigation Actions</h3>
                    <div className="space-y-2">
                      {currentAnalysis.recommendations?.map((rec, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 flex items-start space-x-3 shadow-xs">
                          <span className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] shrink-0">
                            {idx + 1}
                          </span>
                          <span className="pt-0.5 leading-relaxed">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Knowledge Evidence (RAG) Section */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="h-4 w-4 text-indigo-600" />
                        Knowledge Evidence (RAG)
                      </h3>
                      {currentAnalysis.evidence && currentAnalysis.evidence.length > 0 ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Evidence-Grounded ({currentAnalysis.evidence.length} sources)
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">
                          General AI Assessment (No document citations retrieved)
                        </span>
                      )}
                    </div>

                    {currentAnalysis.evidence && currentAnalysis.evidence.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {currentAnalysis.evidence.map((ev, idx) => (
                          <div key={idx} className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 text-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 flex items-center gap-1 truncate">
                                <FileText className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                                <span className="truncate">{ev.filename}</span>
                              </span>
                              {ev.relevance != null && (
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                                  {(ev.relevance * 100).toFixed(0)}% match
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 font-mono">
                              {ev.page != null && (
                                <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                  Page {ev.page}
                                </span>
                              )}
                              {ev.section && (
                                <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                  {ev.section}
                                </span>
                              )}
                              <span className="text-slate-400 text-[10px] truncate">
                                {ev.chunk_id}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 italic">
                        No specific organizational knowledge documents were retrieved for this risk category or project. You can upload relevant policies and SOPs in the Knowledge Base to enable evidence-grounded risk analysis.
                      </div>
                    )}
                  </div>

                  {/* AI Confidence & Authoritative Guardrail Banner */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black text-slate-900">AI Confidence:</span>
                        <span className="text-xs font-black font-mono px-2 py-0.5 rounded bg-purple-600 text-white">
                          {(currentAnalysis.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Confidence reflects model assessment certainty based on context completeness.
                      </p>
                    </div>

                    <div className="text-right sm:border-l sm:border-purple-200/60 sm:pl-4">
                      <span className="text-[11px] font-bold text-slate-500 block">Authoritative Risk Score</span>
                      <span className="text-base font-black font-mono text-slate-900">
                        {Number(risk.risk_score || 0).toFixed(2)} / 100 ({risk.severity})
                      </span>
                    </div>
                  </div>

                  {/* Metadata Footer */}
                  <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-100">
                    <span>Analysis ID: {currentAnalysis.analysis_id}</span>
                    <span>Prompt v{currentAnalysis.prompt_version || '1.0.0'}</span>
                    <span>Analyst: {currentAnalysis.created_by || 'System'}</span>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <Bot className="h-10 w-10 text-slate-400 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-800">No AI Analysis Generated Yet</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Click "Analyze with AI" above to generate a structured evaluation of this risk profile, including primary drivers, consequence analysis, and mitigation recommendations.
                  </p>
                  {!isViewer && (
                    <button
                      onClick={handleRunAiAnalysis}
                      disabled={analyzing}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition shadow-sm"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Analyze with AI</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Phase 9: Predictive Risk Intelligence */}
            <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-5">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-forest-50 text-forest-700 border border-forest-200">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-base font-black text-slate-900">Predictive Risk Intelligence</h2>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-forest-50 text-forest-800 border border-forest-200">
                        risk-predictor-v1
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Machine Learning risk trajectory & critical escalation forecasting over 7, 30, and 90-day horizons
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Horizon Selector */}
                  <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
                    {[7, 30, 90].map(h => (
                      <button
                        key={h}
                        onClick={() => setPredictionHorizon(h)}
                        className={`px-2.5 py-1 rounded-lg transition ${
                          predictionHorizon === h
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {h}d
                      </button>
                    ))}
                  </div>

                  {predictionsList.length > 0 && (
                    <button
                      onClick={() => setPredHistoryModalOpen(true)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                      title="View historical predictive forecasts"
                    >
                      History ({predictionsList.length})
                    </button>
                  )}

                  {!isViewer && (
                    <button
                      onClick={handleRunPrediction}
                      disabled={predicting}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-forest-700 hover:bg-forest-800 disabled:opacity-50 transition shadow-sm flex items-center space-x-1.5"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>{predicting ? 'Forecasting...' : 'Run Forecast'}</span>
                    </button>
                  )}
                </div>
              </div>

              {predicting ? (
                <div className="p-8 text-center space-y-3 bg-forest-50/40 rounded-2xl border border-forest-100 animate-pulse">
                  <RefreshCw className="h-8 w-8 text-forest-600 animate-spin mx-auto" />
                  <h3 className="text-sm font-bold text-slate-900">Computing Predictive Trajectory...</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Extracting 21 time-aware features, evaluating historical velocity and variance against trained classification ensembles.
                  </p>
                </div>
              ) : prediction ? (
                <div className="space-y-6">
                  {/* Score & Horizon Comparison Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Authoritative Current Score */}
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Current Score</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono">
                          Phase 2
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black font-mono text-slate-900">
                          {prediction.current_score}
                        </span>
                        {getSeverityBadge(prediction.current_severity)}
                      </div>
                      <p className="text-[10px] text-slate-400">Deterministic Authoritative Score</p>
                    </div>

                    {/* Forecast Score at Horizon */}
                    <div className="p-4 rounded-xl bg-forest-50/60 border border-forest-200/80 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-forest-800 uppercase tracking-wider">
                          {prediction.prediction_horizon_days}-Day Forecast
                        </span>
                        <span className="text-[10px] font-mono font-bold text-forest-700">
                          {prediction.predicted_score > prediction.current_score ? '+' : ''}
                          {(prediction.predicted_score - prediction.current_score).toFixed(1)} pts
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black font-mono text-forest-900">
                          {prediction.predicted_score}
                        </span>
                        {getSeverityBadge(prediction.predicted_severity)}
                      </div>
                      <p className="text-[10px] text-forest-600/80">Estimated Risk Score at Horizon</p>
                    </div>

                    {/* Critical Probability & Trajectory */}
                    <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Critical Probability</span>
                        {prediction.trend === 'INCREASING' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                            <TrendingUp className="h-3 w-3" /> Escalating
                          </span>
                        ) : prediction.trend === 'DECREASING' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <TrendingDown className="h-3 w-3" /> Improving
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <Minus className="h-3 w-3" /> Stable
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex items-baseline justify-between">
                          <span className={`text-2xl font-black font-mono ${
                            prediction.critical_probability >= 0.6 ? 'text-red-700' :
                            prediction.critical_probability >= 0.35 ? 'text-amber-700' : 'text-emerald-700'
                          }`}>
                            {Math.round(prediction.critical_probability * 100)}%
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">high/critical tier</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              prediction.critical_probability >= 0.6 ? 'bg-red-500' :
                              prediction.critical_probability >= 0.35 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.round(prediction.critical_probability * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top Explainability Drivers */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-forest-600" />
                      <span>Key Predictive Drivers (Explainability)</span>
                    </h3>
                    <div className="space-y-2">
                      {prediction.top_predictive_factors?.map((factor, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800 flex items-start space-x-2.5">
                          <span className="flex items-center justify-center h-4 w-4 rounded-full bg-forest-100 text-forest-800 font-bold text-[10px] shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed">{factor}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Authoritative Guardrail Notice */}
                  <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-900 flex items-start gap-2.5">
                    <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Deterministic Score Protection:</span> Current risk score ({risk.risk_score}) is authoritative and unaffected. Forecasts represent model trajectory estimates based on historical features.
                    </div>
                  </div>

                  {/* Metadata Footer */}
                  <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-100">
                    <span>Forecast ID: {prediction.prediction_id}</span>
                    <span>Model: {prediction.model_version || 'risk-predictor-v1'}</span>
                    <span>Predicted at: {new Date(prediction.prediction_timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                  <TrendingUp className="h-10 w-10 text-slate-400 mx-auto" />
                  <h3 className="text-sm font-bold text-slate-800">No Predictive Forecast Generated Yet</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Select a forecast horizon (7, 30, or 90 days) and click "Run Forecast" to evaluate trajectory velocity and critical escalation probability.
                  </p>
                  {!isViewer && (
                    <button
                      onClick={handleRunPrediction}
                      disabled={predicting}
                      className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-forest-700 hover:bg-forest-800 transition shadow-sm"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Run {predictionHorizon}-Day Forecast</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Phase 2: Risk Score History Table */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-sm font-bold text-slate-900">Risk Score History</h2>
                  <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                    {scoreHistory.length}
                  </span>
                </div>
                <button
                  onClick={fetchScoreHistory}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center space-x-1"
                  title="Refresh score history"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingHistory ? (
                <p className="text-xs text-slate-400 text-center py-4">Loading score history...</p>
              ) : scoreHistory.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No score history records recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-2.5 px-3">Timestamp</th>
                        <th className="py-2.5 px-3">Actor</th>
                        <th className="py-2.5 px-3">Score Evolution</th>
                        <th className="py-2.5 px-3">Severity</th>
                        <th className="py-2.5 px-3">Factors (P/I/E/U)</th>
                        <th className="py-2.5 px-3">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {scoreHistory.map((h) => {
                        const isIncrease = h.old_score != null && h.new_score > h.old_score;
                        const isDecrease = h.old_score != null && h.new_score < h.old_score;
                        const isBaseline = h.old_score == null;

                        return (
                          <tr key={h._id || h.timestamp} className="hover:bg-slate-50/60 transition">
                            <td className="py-3 px-3 text-[11px] font-mono text-slate-500">
                              {new Date(h.timestamp).toLocaleString()}
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-800">
                              {h.changed_by || 'System'}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono text-slate-400">
                                  {h.old_score != null ? Number(h.old_score).toFixed(2) : 'Baseline'}
                                </span>
                                <span className="text-slate-300">→</span>
                                <span className="font-mono font-bold text-slate-900">
                                  {Number(h.new_score).toFixed(2)}
                                </span>

                                {isIncrease && (
                                  <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    <TrendingUp className="h-2.5 w-2.5" />
                                    <span>Escalation</span>
                                  </span>
                                )}
                                {isDecrease && (
                                  <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <TrendingDown className="h-2.5 w-2.5" />
                                    <span>Reduction</span>
                                  </span>
                                )}
                                {isBaseline && (
                                  <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                    <Minus className="h-2.5 w-2.5" />
                                    <span>Initial</span>
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center space-x-1 font-bold text-[11px]">
                                {h.old_severity && <span className="text-slate-400">{h.old_severity} →</span>}
                                <span className={
                                  h.new_severity === 'CRITICAL' ? 'text-rose-700' :
                                  h.new_severity === 'HIGH' ? 'text-orange-700' :
                                  h.new_severity === 'MEDIUM' ? 'text-amber-700' : 'text-emerald-700'
                                }>{h.new_severity}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                              P:{h.probability} I:{h.impact} E:{h.exposure} U:{h.urgency}
                            </td>
                            <td className="py-3 px-3 text-slate-600 italic">
                              {h.reason || '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Embedded Audit Trail Section */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <History className="h-5 w-5 text-slate-600" />
                  <h2 className="text-sm font-bold text-slate-900">Audit Trail History</h2>
                </div>
                <button
                  onClick={fetchAuditLogs}
                  className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center space-x-1"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {loadingLogs ? (
                <p className="text-xs text-slate-400 text-center py-4">Loading audit entries...</p>
              ) : auditLogs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No audit entries found for this risk.</p>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div key={log._id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">{log.action}</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Actor: <span className="font-semibold text-slate-700">{log.user || log.userId || 'System'}</span>
                      </div>
                      {log.metadata && typeof log.metadata === 'object' && Object.keys(log.metadata).length > 0 && (
                        <div className="text-[11px] font-mono text-slate-600 bg-white p-2 rounded border border-slate-200 overflow-x-auto">
                          {JSON.stringify(log.metadata, null, 2)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Metadata Card */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Status & Scope
              </h2>

              {/* Status */}
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Status</span>
                {getStatusBadge(risk.status)}
              </div>

              {/* Category */}
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Category</span>
                <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {risk.category}
                </span>
              </div>

              {/* Organization */}
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Organization</span>
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800">
                  <Building className="h-4 w-4 text-slate-400" />
                  <span>{risk.organizationName || risk.organizationId}</span>
                </div>
              </div>

              {/* Project */}
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Project</span>
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800">
                  <Layers className="h-4 w-4 text-slate-400" />
                  <span>{risk.projectName || 'General / Org Level'}</span>
                </div>
              </div>

              {/* Owner */}
              <div>
                <span className="text-[11px] text-slate-400 block mb-1">Assigned Owner</span>
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-800">
                  <User className="h-4 w-4 text-slate-400" />
                  <span>{risk.ownerName || 'Unassigned'}</span>
                </div>
                {risk.ownerEmail && (
                  <span className="text-[11px] text-slate-400 pl-6 block">{risk.ownerEmail}</span>
                )}
              </div>

              {/* Creator & Timestamps */}
              <div className="pt-4 border-t border-slate-100 space-y-2 text-[11px] text-slate-500">
                <div>Created By: <span className="font-semibold text-slate-700">{risk.creatorName || risk.createdBy}</span></div>
                <div>Created: <span className="font-mono text-slate-700">{new Date(risk.createdAt).toLocaleString()}</span></div>
                <div>Last Updated: <span className="font-mono text-slate-700">{new Date(risk.updatedAt).toLocaleString()}</span></div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Change Status Modal */}
      {statusModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Change Risk Status</h3>
              <button onClick={() => setStatusModal({ ...statusModal, isOpen: false })}>
                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleSaveStatus} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Select New Status</label>
                <select
                  value={statusModal.newStatus}
                  onChange={(e) => setStatusModal({ ...statusModal, newStatus: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
                >
                  {STATUSES.map(s => (
                    <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Reason / Notes (Optional)</label>
                <textarea
                  rows={3}
                  value={statusModal.reason}
                  onChange={(e) => setStatusModal({ ...statusModal, reason: e.target.value })}
                  placeholder="Explain why status is changing..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStatusModal({ ...statusModal, isOpen: false })}
                  className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={statusModal.submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                >
                  {statusModal.submitting ? 'Updating...' : 'Save Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Owner Modal */}
      {ownerModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Assign Risk Owner</h3>
              <button onClick={() => setOwnerModal({ ...ownerModal, isOpen: false })}>
                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleSaveOwner} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Authorized Member
                </label>
                {ownerModal.loadingUsers ? (
                  <p className="text-xs text-slate-400">Loading authorized users...</p>
                ) : (
                  <select
                    value={ownerModal.newOwnerId}
                    onChange={(e) => setOwnerModal({ ...ownerModal, newOwnerId: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800"
                  >
                    <option value="">-- Unassigned --</option>
                    {ownerModal.usersList.map(u => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.role || u.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOwnerModal({ ...ownerModal, isOpen: false })}
                  className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ownerModal.submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                >
                  {ownerModal.submitting ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recalculate Score Modal (Phase 2) */}
      {recalculateModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calculator className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Authoritative Score Recalculation</h3>
              </div>
              <button onClick={() => setRecalculateModal({ ...recalculateModal, isOpen: false })}>
                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Deterministic scoring formula: <code className="font-mono text-slate-800">(P × 0.35) + (I × 0.35) + (E × 0.20) + (U × 0.10)</code>
            </p>

            <form onSubmit={handleRecalculateScore} className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block mb-1">Current Probability</span>
                  <span className="text-base font-black font-mono text-blue-600">{risk.probability}%</span>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block mb-1">Current Impact</span>
                  <span className="text-base font-black font-mono text-rose-600">{risk.impact}%</span>
                </div>
              </div>

              {/* Exposure Slider */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-700">Exposure Factor (0-100)</span>
                  <span className="font-mono text-amber-600">{recalculateModal.exposure}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={recalculateModal.exposure}
                  onChange={(e) => setRecalculateModal({ ...recalculateModal, exposure: Number(e.target.value) })}
                  className="w-full accent-amber-600"
                />
              </div>

              {/* Urgency Slider */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-slate-700">Urgency Factor (0-100)</span>
                  <span className="font-mono text-purple-600">{recalculateModal.urgency}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={recalculateModal.urgency}
                  onChange={(e) => setRecalculateModal({ ...recalculateModal, urgency: Number(e.target.value) })}
                  className="w-full accent-purple-600"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Recalculation (Recorded in Audit Trail)
                </label>
                <input
                  type="text"
                  value={recalculateModal.reason}
                  onChange={(e) => setRecalculateModal({ ...recalculateModal, reason: e.target.value })}
                  placeholder="e.g. Factor calibration after quarterly vendor audit"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Projected Score Preview */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800 flex items-center justify-between">
                <span>Projected Authoritative Score:</span>
                <span className="font-mono font-black text-sm text-emerald-900">
                  {((risk.probability * 0.35) + (risk.impact * 0.35) + (recalculateModal.exposure * 0.20) + (recalculateModal.urgency * 0.10)).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRecalculateModal({ ...recalculateModal, isOpen: false })}
                  className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recalculateModal.submitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <Calculator className="h-3.5 w-3.5" />
                  <span>{recalculateModal.submitting ? 'Recalculating...' : 'Run Authoritative Calculation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Analysis History Modal */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                <h3 className="text-base font-bold text-slate-900">AI Analysis History</h3>
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  {aiAnalyses.length}
                </span>
              </div>
              <button onClick={() => setHistoryModalOpen(false)}>
                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {aiAnalyses.map((item) => (
                <div
                  key={item._id || item.analysis_id}
                  onClick={() => {
                    setCurrentAnalysis(item);
                    setHistoryModalOpen(false);
                  }}
                  className={`p-4 rounded-xl border transition cursor-pointer ${
                    currentAnalysis?.analysis_id === item.analysis_id
                      ? 'border-purple-500 bg-purple-50/40 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      {new Date(item.created_at).toLocaleString()}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                        {item.model}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                        {(item.confidence * 100).toFixed(0)}% Conf
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {item.summary}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setHistoryModalOpen(false)}
                className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 9: Predictive Forecast History Modal */}
      {predHistoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-forest-600" />
                <h3 className="text-base font-bold text-slate-900">Predictive Forecast History</h3>
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  {predictionsList.length}
                </span>
              </div>
              <button onClick={() => setPredHistoryModalOpen(false)}>
                <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 flex-1 pr-1">
              {predictionsList.map((item) => (
                <div
                  key={item._id || item.prediction_id}
                  onClick={() => {
                    setPrediction(item);
                    setPredHistoryModalOpen(false);
                  }}
                  className={`p-4 rounded-xl border transition cursor-pointer ${
                    prediction?.prediction_id === item.prediction_id
                      ? 'border-forest-500 bg-forest-50/30 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-800 font-mono">
                      {new Date(item.prediction_timestamp).toLocaleString()}
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                        {item.prediction_horizon_days}d Horizon
                      </span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-forest-100 text-forest-800">
                        {Math.round(item.critical_probability * 100)}% Prob
                      </span>
                      {getSeverityBadge(item.predicted_severity)}
                    </div>
                  </div>
                  <div className="text-xs text-slate-600 flex items-center gap-2">
                    <span>Forecast: <strong className="font-mono">{item.predicted_score}</strong></span>
                    <span>•</span>
                    <span>Trajectory: <strong>{item.trend}</strong></span>
                    <span>•</span>
                    <span className="truncate text-slate-500">{item.top_predictive_factors?.[0]}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setPredHistoryModalOpen(false)}
                className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        title="Delete Risk Record"
        message={`Are you sure you want to delete "${risk.title}"? This action cannot be undone and will be logged in the security audit trail.`}
        confirmText="Yes, Permanently Delete"
        isDangerous={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </div>
  );
}
