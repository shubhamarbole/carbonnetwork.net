import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, AlertTriangle, FileText, Check, X, ArrowRight, 
  Paperclip, RefreshCw, Clock, ShieldCheck, Eye, MessageSquare,
  Bot, Download, Filter, Search, ChevronRight, BarChart3, AlertCircle,
  Sparkles, CheckSquare, XCircle
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AIRiskCheckModal from '../../components/environmental/AIRiskCheckModal';

export default function VerifierWorkspace() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Tab mapping
  const currentTabParam = searchParams.get('tab') || 'dashboard';
  const validTabs = ['dashboard', 'queue', 'ai-risk', 'verification'];
  const activeTab = validTabs.includes(currentTabParam) ? currentTabParam : 'dashboard';

  const setActiveTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Modals
  const [decisionModal, setDecisionModal] = useState({
    open: false,
    type: 'VERIFIED', // 'VERIFIED' | 'CHANGES_REQUESTED' | 'REJECTED'
    record: null,
    comment: '',
    reasonCode: 'DATA_DISCREPANCY'
  });
  const [riskModalRecord, setRiskModalRecord] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/environment/readings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setSubmissions(data);
      }
    } catch (e) {
      console.error(e);
      setActionError('Failed to fetch verification queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [token]);

  const handleTransitionSubmit = async () => {
    if (!decisionModal.record) return;
    
    if (decisionModal.type !== 'VERIFIED' && !decisionModal.comment.trim()) {
      setActionError('Please provide a justification comment for this action.');
      return;
    }

    setSubmitting(true);
    setActionError('');
    try {
      const res = await fetch('/api/workflow/transition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recordId: decisionModal.record._id,
          module: 'Energy',
          targetStatus: decisionModal.type,
          comment: decisionModal.comment || (decisionModal.type === 'VERIFIED' ? 'Verified against MRV baseline and GHG Protocol' : ''),
          reasonCode: decisionModal.type === 'CHANGES_REQUESTED' ? decisionModal.reasonCode : undefined
        })
      });
      const json = await res.json();
      if (json.success || res.ok) {
        setActionSuccess(`Record marked as ${decisionModal.type} successfully!`);
        fetchQueue();
        setDecisionModal({ open: false, type: 'VERIFIED', record: null, comment: '', reasonCode: 'DATA_DISCREPANCY' });
        setTimeout(() => setActionSuccess(''), 4000);
      } else {
        setActionError(json.error || json.message || 'Workflow transition failed.');
      }
    } catch (err) {
      console.error(err);
      setActionError('Network error executing transition.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadSummary = (record) => {
    const summaryData = {
      verificationId: `MRV-VER-${record._id?.substring(0, 8).toUpperCase()}`,
      verifiedAt: new Date().toISOString(),
      verifierAgency: user?.organizationId || 'SGS Climate Verification MRV Desk',
      verifierUser: user?.email || user?.name,
      recordDetails: record,
      isoStandard: 'ISO 14064-3:2019 Specification with Guidance for the Verification and Validation of GHG Statements'
    };
    const blob = new Blob([JSON.stringify(summaryData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Verification_Statement_${record._id?.substring(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Metrics
  const pendingCount = submissions.filter(s => s.status === 'SUBMITTED' || s.status === 'UNDER_REVIEW').length;
  const changesCount = submissions.filter(s => s.status === 'CHANGES_REQUESTED').length;
  const verifiedCount = submissions.filter(s => s.status === 'VERIFIED').length;
  const totalConsumption = submissions.reduce((acc, curr) => acc + (Number(curr.consumption) || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
              Verifier Workspace
            </span>
            <span className="text-xs text-slate-400 font-mono">Agency: {user?.organizationId || 'MRV Verification Authority'}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Independent MRV Verification Center
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Review Environmental Telemetry, Inspect Utility Bills, Issue Findings & Sign Off Official Verification Stamps
          </p>
        </div>

        <button
          onClick={fetchQueue}
          disabled={loading}
          className="flex items-center space-x-2 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition shadow-sm self-start"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Action Banners */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs font-bold rounded-r-xl flex items-center justify-between shadow-sm">
          <span>{actionSuccess}</span>
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        </div>
      )}
      {actionError && (
        <div className="p-3.5 bg-red-50 border-l-4 border-red-500 text-red-800 text-xs font-bold rounded-r-xl flex items-center justify-between shadow-sm">
          <span>{actionError}</span>
          <AlertCircle className="h-4 w-4 text-red-600" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
        {[
          { id: 'dashboard', label: 'Dashboard Overview', icon: BarChart3 },
          { id: 'queue', label: `Review Queue (${pendingCount})`, icon: Clock },
          { id: 'ai-risk', label: 'AI Risk Assessment', icon: Bot },
          { id: 'verification', label: `Verified Ledger (${verifiedCount})`, icon: CheckCircle2 }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === tab.id 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Pending Review</span>
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-2xl font-black text-slate-900">{pendingCount}</p>
              <p className="text-[11px] text-slate-400">Awaiting verifier evaluation</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Corrections Flagged</span>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </div>
              <p className="text-2xl font-black text-slate-900">{changesCount}</p>
              <p className="text-[11px] text-slate-400">Returned to client with notes</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Verified Records</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-slate-900">{verifiedCount}</p>
              <p className="text-[11px] text-slate-400">Official MRV stamp applied</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Audited Volume</span>
                <ShieldCheck className="h-4 w-4 text-indigo-500" />
              </div>
              <p className="text-2xl font-black text-slate-900">{totalConsumption.toLocaleString()} <span className="text-xs font-medium text-slate-500">kWh</span></p>
              <p className="text-[11px] text-slate-400">Processed across active batches</p>
            </div>
          </div>

          {/* Quick Nav Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div 
              onClick={() => setActiveTab('queue')}
              className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
                  <Clock className="h-5 w-5" />
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition" />
              </div>
              <h3 className="text-sm font-black text-slate-900">Review Queue</h3>
              <p className="text-xs text-slate-500 mt-1">
                Inspect incoming telemetry readings, execute pass/fail audits, or return for corrections.
              </p>
            </div>

            <div 
              onClick={() => setActiveTab('ai-risk')}
              className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-purple-300 hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
                  <Bot className="h-5 w-5" />
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition" />
              </div>
              <h3 className="text-sm font-black text-slate-900">AI Risk Assessment</h3>
              <p className="text-xs text-slate-500 mt-1">
                Automated anomaly detection, statistical Z-score checks, and cross-module consistency verification.
              </p>
            </div>

            <div 
              onClick={() => setActiveTab('verification')}
              className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-emerald-300 hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition" />
              </div>
              <h3 className="text-sm font-black text-slate-900">Verification Ledger</h3>
              <p className="text-xs text-slate-500 mt-1">
                Audit history of signed verification statements, certificate receipts, and exportable ledger data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REVIEW QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Pending Review & Audits</h2>
            <span className="text-xs text-slate-500">{submissions.filter(s => s.status !== 'VERIFIED').length} items awaiting decision</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-500" />
              <p className="text-xs font-semibold">Loading verification queue...</p>
            </div>
          ) : submissions.filter(s => s.status !== 'VERIFIED').length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">Review Queue is Clear</p>
              <p className="text-xs text-slate-400 mt-1">All tenant submissions have been verified or completed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.filter(s => s.status !== 'VERIFIED').map(r => (
                <div key={r._id} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-sm transition space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-slate-900">
                          Meter {r.meterNumber || 'MTR'} — {Number(r.consumption || 0).toLocaleString()} {r.unit || 'kWh'}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          r.status === 'CHANGES_REQUESTED' ? 'bg-amber-100 text-amber-800' :
                          r.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                          'bg-indigo-100 text-indigo-800'
                        }`}>
                          {r.status}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">Date: {r.readingDate}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        Source: <strong className="text-slate-700">{r.sourceType || 'Grid'}</strong> • Category: {r.usageCategory || 'Production'} • Quality: {r.dataQuality || 'Actual'}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 flex-shrink-0 flex-wrap gap-1">
                      <button
                        onClick={() => setDecisionModal({
                          open: true,
                          type: 'VERIFIED',
                          record: r,
                          comment: 'Audited and verified compliant with MRV framework.',
                          reasonCode: 'DATA_DISCREPANCY'
                        })}
                        disabled={submitting}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center space-x-1"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Verify</span>
                      </button>

                      <button
                        onClick={() => setDecisionModal({
                          open: true,
                          type: 'CHANGES_REQUESTED',
                          record: r,
                          comment: '',
                          reasonCode: 'DATA_DISCREPANCY'
                        })}
                        disabled={submitting}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center space-x-1"
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Request Changes</span>
                      </button>

                      <button
                        onClick={() => setDecisionModal({
                          open: true,
                          type: 'REJECTED',
                          record: r,
                          comment: '',
                          reasonCode: 'COMPLIANCE_BREACH'
                        })}
                        disabled={submitting}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </button>

                      <button
                        onClick={() => setRiskModalRecord(r)}
                        className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                        title="Run AI Risk Analysis"
                      >
                        <Bot className="h-3.5 w-3.5" />
                        <span>AI Risk</span>
                      </button>

                      <button
                        onClick={() => setViewRecord(r)}
                        className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition"
                        title="View Record Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() => navigate('/evidence')}
                        className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition"
                        title="View Evidence Vault"
                      >
                        <Paperclip className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {r.reviewerComments && (
                    <div className="p-2.5 bg-amber-50 rounded-xl text-xs text-amber-900 border border-amber-200">
                      <strong>Auditor Note:</strong> {r.reviewerComments}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AI RISK ASSESSMENT */}
      {activeTab === 'ai-risk' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-900 to-indigo-900 p-5 rounded-2xl text-white space-y-2">
            <div className="flex items-center space-x-2 text-purple-200">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">AI Risk Management Agent</span>
            </div>
            <h2 className="text-lg font-black">Pre-Verification Telemetry Risk Scoring</h2>
            <p className="text-xs text-purple-200 max-w-2xl">
              Every submission is continuously monitored for anomalous deviation, mismatching invoice emission factors, and scope balance anomalies prior to final verification sign-off.
            </p>
          </div>

          <div className="space-y-3">
            {submissions.map(r => (
              <div key={r._id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-sm text-slate-900">
                      {r.meterNumber || 'Meter #'} — {Number(r.consumption || 0).toLocaleString()} {r.unit || 'kWh'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      r.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      Status: {r.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Source: {r.sourceType || 'Grid'} • Usage: {r.usageCategory || 'Production'} • Quality: {r.dataQuality || 'Actual'}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setRiskModalRecord(r)}
                    className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
                  >
                    <Bot className="h-3.5 w-3.5" />
                    <span>Run Full AI Risk Scan</span>
                  </button>
                  <button
                    onClick={() => setViewRecord(r)}
                    className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: VERIFIED HISTORY */}
      {activeTab === 'verification' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">Verified Ledger Entries</h2>
            <span className="text-xs text-slate-500">{verifiedCount} signed records</span>
          </div>

          {submissions.filter(s => s.status === 'VERIFIED').length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <ShieldCheck className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">No Verified Records Yet</p>
              <p className="text-xs text-slate-400 mt-1">Verified entries will appear here with downloadable certification receipts.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {submissions.filter(s => s.status === 'VERIFIED').map(r => (
                <div key={r._id} className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="font-bold text-sm text-slate-900">
                        {r.meterNumber || 'MTR'} — {Number(r.consumption || 0).toLocaleString()} {r.unit || 'kWh'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        OFFICIALLY VERIFIED
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Reading Date: <strong className="text-slate-700">{r.readingDate}</strong> • Source: {r.sourceType} • Verifier: {user?.organizationId || 'MRV Agency'}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleDownloadSummary(r)}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download Statement</span>
                    </button>
                    <button
                      onClick={() => setViewRecord(r)}
                      className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition"
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Structured Decision Modal (Replaces window.prompt) */}
      {decisionModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                {decisionModal.type === 'VERIFIED' && <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                {decisionModal.type === 'CHANGES_REQUESTED' && <AlertTriangle className="h-5 w-5 text-amber-600" />}
                {decisionModal.type === 'REJECTED' && <XCircle className="h-5 w-5 text-rose-600" />}
                <h3 className="text-base font-black text-slate-900">
                  {decisionModal.type === 'VERIFIED' && 'Confirm MRV Verification'}
                  {decisionModal.type === 'CHANGES_REQUESTED' && 'Request Submission Corrections'}
                  {decisionModal.type === 'REJECTED' && 'Reject Submission'}
                </h3>
              </div>
              <button
                onClick={() => setDecisionModal({ open: false, type: 'VERIFIED', record: null, comment: '', reasonCode: 'DATA_DISCREPANCY' })}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              <p>
                <strong>Record:</strong> Meter {decisionModal.record?.meterNumber} ({Number(decisionModal.record?.consumption || 0).toLocaleString()} {decisionModal.record?.unit})
              </p>
              <p>
                <strong>Date:</strong> {decisionModal.record?.readingDate}
              </p>
            </div>

            {decisionModal.type === 'CHANGES_REQUESTED' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Reason Code</label>
                <select
                  value={decisionModal.reasonCode}
                  onChange={(e) => setDecisionModal({ ...decisionModal, reasonCode: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="DATA_DISCREPANCY">Data Discrepancy / Reading Outlier</option>
                  <option value="MISSING_EVIDENCE">Missing or Illegible Utility Bill Evidence</option>
                  <option value="FACTOR_MISMATCH">Grid Emission Factor Mismatch</option>
                  <option value="INCORRECT_PERIOD">Period / Date Range Misalignment</option>
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">
                {decisionModal.type === 'VERIFIED' ? 'Verification Notes / Basis' : 'Correction Instructions & Findings *'}
              </label>
              <textarea
                rows={3}
                value={decisionModal.comment}
                onChange={(e) => setDecisionModal({ ...decisionModal, comment: e.target.value })}
                placeholder={decisionModal.type === 'VERIFIED' ? 'Compliant with GHG Protocol Scopes...' : 'Please specify discrepancies and required remediations...'}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setDecisionModal({ open: false, type: 'VERIFIED', record: null, comment: '', reasonCode: 'DATA_DISCREPANCY' })}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTransitionSubmit}
                disabled={submitting}
                className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-sm ${
                  decisionModal.type === 'VERIFIED' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  decisionModal.type === 'CHANGES_REQUESTED' ? 'bg-amber-600 hover:bg-amber-700' :
                  'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {submitting ? 'Processing...' : 'Confirm Decision'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Record Details Modal */}
      {viewRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Submission Details</h3>
              <button onClick={() => setViewRecord(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block mb-1">Meter Number</span>
                <span className="font-bold text-slate-800">{viewRecord.meterNumber || 'MTR-AUTO'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block mb-1">Consumption</span>
                <span className="font-bold text-slate-800">{Number(viewRecord.consumption || 0).toLocaleString()} {viewRecord.unit || 'kWh'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block mb-1">Reading Date</span>
                <span className="font-bold text-slate-800">{viewRecord.readingDate}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block mb-1">Source Type</span>
                <span className="font-bold text-slate-800">{viewRecord.sourceType || 'Grid'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block mb-1">Data Quality</span>
                <span className="font-bold text-slate-800">{viewRecord.dataQuality || 'Actual'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block mb-1">Status</span>
                <span className="font-bold text-indigo-700">{viewRecord.status}</span>
              </div>
            </div>

            {viewRecord.reviewerComments && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <strong>Reviewer Feedback:</strong> {viewRecord.reviewerComments}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewRecord(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: AIRiskCheckModal */}
      {riskModalRecord && (
        <AIRiskCheckModal
          isOpen={true}
          onClose={() => setRiskModalRecord(null)}
          moduleKey="energy"
          recordId={riskModalRecord._id}
          token={token}
        />
      )}
    </div>
  );
}

