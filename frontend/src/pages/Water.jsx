import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useFacilities } from '../context/FacilityContext';
import { 
  Droplet, Plus, Trash2, ArrowUpRight, HelpCircle, 
  ClipboardCheck, AlertTriangle, FileText, UploadCloud, 
  History, ShieldCheck, Check, Search, Filter, Sparkles 
} from 'lucide-react';
import SubmissionStatusBadge from '../components/environmental/SubmissionStatusBadge';
import SubmissionValidationModal from '../components/environmental/SubmissionValidationModal';
import SubmissionHistoryModal from '../components/environmental/SubmissionHistoryModal';
import ReviewerWorkflowModal from '../components/environmental/ReviewerWorkflowModal';
import EvidenceUploadModal from '../components/environmental/EvidenceUploadModal';
import CorrectionAlertBanner from '../components/environmental/CorrectionAlertBanner';
import AIRiskCheckModal from '../components/environmental/AIRiskCheckModal';

export default function Water() {
  const { token, user } = useAuth();
  const { facilities, selectedFacilityId, selectedFacilityName } = useFacilities();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Form states
  const [facilityId, setFacilityId] = useState('');
  const [actionType, setActionType] = useState('Withdrawal');
  const [source, setSource] = useState('Municipal Water');
  const [amount, setAmount] = useState('');
  const [waterStressed, setWaterStressed] = useState(false);
  const [reportingPeriod, setReportingPeriod] = useState('Quarterly');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [notes, setNotes] = useState('');

  // Workflow states
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [attachedEvidenceId, setAttachedEvidenceId] = useState(null);
  const [attachedEvidenceName, setAttachedEvidenceName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Modals
  const [historyRecordId, setHistoryRecordId] = useState(null);
  const [reviewRecord, setReviewRecord] = useState(null);
  const [evidenceRecord, setEvidenceRecord] = useState(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationIssues, setValidationIssues] = useState([]);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [riskCheckPayload, setRiskCheckPayload] = useState(null);
  const [riskCheckRecordId, setRiskCheckRecordId] = useState(null);

  const sourcesByAction = {
    Withdrawal: ['Municipal Water', 'Surface Water', 'Groundwater', 'Rainwater', 'Other'],
    Reuse: ['STP Recycled Water', 'Process Recycled Water', 'Other Reuse'],
    Consumption: ['Process Evaporation', 'Irrigation & Landscaping', 'Sanitation Loss']
  };

  const isRestrictedDataEntry = user && user.role === 'DATA_ENTRY' && user.facilityId;
  const canEdit = user && ['ADMIN', 'SUPER_ADMIN', 'PLATFORM_ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'DATA_ENTRY', 'MSME', 'ENTERPRISE'].includes(user.role);
  const canReview = user && ['VERIFIER', 'AUDITOR', 'SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(user.role);

  useEffect(() => {
    if (facilities.length > 0) {
      if (isRestrictedDataEntry) {
        setFacilityId(user.facilityId);
      } else if (!facilityId) {
        setFacilityId(facilities[0]._id);
      }
    }
  }, [facilities, user]);

  useEffect(() => {
    setSource(sourcesByAction[actionType][0]);
  }, [actionType]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const url = statusFilter === 'ALL' 
        ? '/api/environment/water' 
        : `/api/environment/water?status=${statusFilter}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const list = await res.json();
        const filtered = selectedFacilityId === 'all'
          ? list
          : list.filter(r => r.facilityId === selectedFacilityId);
        setRecords(filtered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [token, selectedFacilityId, statusFilter]);

  const resetForm = () => {
    setAmount('');
    setPeriodStart('');
    setPeriodEnd('');
    setNotes('');
    setEditingDraftId(null);
    setAttachedEvidenceId(null);
    setAttachedEvidenceName('');
  };

  // Build current form payload
  const getFormData = () => ({
    facilityId: isRestrictedDataEntry ? user.facilityId : facilityId,
    actionType,
    source,
    consumption: parseFloat(amount || 0),
    amount: parseFloat(amount || 0),
    unit: 'm3',
    waterStressedLocation: waterStressed,
    reportingPeriod,
    periodStart,
    periodEnd,
    evidenceId: attachedEvidenceId,
    notes
  });

  // Pre-submission validation
  const handleValidateOnly = async () => {
    try {
      const res = await fetch('/api/environment/submission/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          module: 'water',
          data: getFormData(),
          isDraft: false
        })
      });
      const data = await res.json();
      if (data.isValid) {
        setActionMessage({ type: 'success', text: 'Validation Successful: All required fields and proof constraints are satisfied.' });
        setTimeout(() => setActionMessage(null), 5000);
      } else {
        setValidationIssues(data.issues || ['Please check required fields']);
        setShowValidationModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenRiskCheck = (record = null) => {
    if (record) {
      setRiskCheckRecordId(record._id);
      setRiskCheckPayload(record);
    } else {
      setRiskCheckRecordId(editingDraftId);
      setRiskCheckPayload(getFormData());
    }
    setShowRiskModal(true);
  };

  // Save as Draft
  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/environment/submission/save-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          module: 'water',
          recordId: editingDraftId,
          data: getFormData()
        })
      });
      const json = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'Water draft saved successfully to database.' });
        resetForm();
        fetchRecords();
      } else {
        setActionMessage({ type: 'error', text: json.error || 'Failed to save draft' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  // Formal Submission
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/environment/submission/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          module: 'water',
          recordId: editingDraftId,
          data: getFormData()
        })
      });

      const json = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'Water record submitted successfully for verification!' });
        resetForm();
        fetchRecords();
      } else if (res.status === 422 || json.issues) {
        setValidationIssues(json.issues || [json.error]);
        setShowValidationModal(true);
      } else {
        setActionMessage({ type: 'error', text: json.error || 'Submission failed' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  // Edit / Populate Form
  const handleEditRecord = (record) => {
    setEditingDraftId(record._id);
    if (record.facilityId) setFacilityId(record.facilityId);
    if (record.actionType) setActionType(record.actionType);
    if (record.source) setSource(record.source);
    setAmount(record.consumption || record.amount || '');
    if (record.reportingPeriod) setReportingPeriod(record.reportingPeriod);
    if (record.periodStart) setPeriodStart(record.periodStart);
    if (record.periodEnd) setPeriodEnd(record.periodEnd);
    if (record.waterStressedLocation !== undefined) setWaterStressed(record.waterStressedLocation);
    if (record.evidenceId) setAttachedEvidenceId(record.evidenceId);
    if (record.evidenceDetails?.fileName) setAttachedEvidenceName(record.evidenceDetails.fileName);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  // Resubmit directly
  const handleResubmitRecord = async (record) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/environment/submission/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          module: 'water',
          recordId: record._id,
          data: {
            ...record,
            status: 'SUBMITTED'
          }
        })
      });
      const json = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'Record resubmitted successfully for verification.' });
        fetchRecords();
      } else {
        setActionMessage({ type: 'error', text: json.error || 'Failed to resubmit' });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
      setTimeout(() => setActionMessage(null), 5000);
    }
  };

  const handleDelete = async (id) => {
    if (!canEdit) return;
    if (!window.confirm('Are you sure you want to delete this water record?')) return;
    try {
      const res = await fetch(`/api/environment/water/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchRecords();
    } catch (err) {
      console.error(err);
    }
  };

  // Aggregation
  const withdrawals = records.filter(r => r.actionType === 'Withdrawal').reduce((acc, r) => acc + (r.consumption || r.amount || 0), 0);
  const recycled = records.filter(r => r.actionType === 'Reuse').reduce((acc, r) => acc + (r.consumption || r.amount || 0), 0);
  const recycleRate = withdrawals > 0 ? (recycled / withdrawals) * 100 : 0;

  return (
    <div className="pl-64 pr-8 py-8">
      <Navbar title="Water Withdrawal & Circular Reuse" />

      {/* Alert toast message */}
      {actionMessage && (
        <div className={`mt-4 p-4 rounded-xl text-xs font-semibold flex items-center justify-between border shadow-sm animate-in fade-in duration-200 ${
          actionMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-700">✕</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Water Withdrawal</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{withdrawals.toLocaleString()} m³</h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Droplet className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recycled / Reused Water</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{recycled.toLocaleString()} m³</h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-green-50 text-green-700 rounded-lg">Circular Loops</span>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Water Reuse Ratio</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{recycleRate.toFixed(1)}%</h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg">Target: 25%+</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Table of Logs & Verification Queue */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            
            {/* Header with Scope & Status Filter Tabs */}
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="font-bold text-slate-800">Water Data Submission Queue</h2>
                <span className="text-xs text-slate-500">
                  Facility: <strong className="text-slate-700">{selectedFacilityName}</strong>
                </span>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center space-x-1 overflow-x-auto p-1 bg-slate-200/70 rounded-xl">
                {[
                  { key: 'ALL', label: 'All' },
                  { key: 'DRAFT', label: 'Drafts' },
                  { key: 'SUBMITTED', label: 'Submitted' },
                  { key: 'UNDER_REVIEW', label: 'Under Review' },
                  { key: 'CORRECTION_REQUIRED', label: 'Needs Fix' },
                  { key: 'VERIFIED', label: 'Verified' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                      statusFilter === tab.key
                        ? 'bg-white text-forest-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading water records...</div>
            ) : records.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No water records found for {statusFilter === 'ALL' ? 'this scope' : `filter: ${statusFilter}`}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="py-4 px-6">Period & Date</th>
                      <th className="py-4 px-6">Type & Source</th>
                      <th className="py-4 px-6">Quantity</th>
                      <th className="py-4 px-6">Lifecycle Status</th>
                      <th className="py-4 px-6">Evidence</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {records.map((r) => (
                      <React.Fragment key={r._id}>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-6">
                            <span className="block font-medium text-slate-800">{r.reportingPeriod}</span>
                            <span className="block text-[10px] text-slate-400">
                              {r.periodStart ? `${r.periodStart} → ${r.periodEnd}` : 'No dates'}
                            </span>
                          </td>

                          <td className="py-4 px-6">
                            <span className="font-bold text-slate-800 block">{r.source}</span>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider mt-0.5 ${
                              r.actionType === 'Withdrawal' ? 'bg-blue-50 text-blue-700' : r.actionType === 'Reuse' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {r.actionType}
                            </span>
                          </td>

                          <td className="py-4 px-6">
                            <span className="font-bold text-slate-900 text-sm">
                              {(r.consumption || r.amount || 0).toLocaleString()} m³
                            </span>
                            {r.waterStressedLocation && (
                              <span className="block text-[10px] text-red-600 font-semibold mt-0.5">
                                ⚠️ Water Stressed
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-6">
                            <SubmissionStatusBadge status={r.status} />
                          </td>

                          <td className="py-4 px-6">
                            {r.evidenceDetails?.fileName ? (
                              <a
                                href={`/api/environment/evidence/${r.evidenceId}/download`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center space-x-1 text-xs text-forest-700 hover:text-forest-800 font-semibold underline"
                              >
                                <FileText className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate max-w-[100px]">{r.evidenceDetails.fileName}</span>
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEvidenceRecord(r)}
                                className="inline-flex items-center space-x-1 text-slate-400 hover:text-forest-600 transition-colors text-[11px] font-semibold"
                              >
                                <UploadCloud className="w-3.5 h-3.5" />
                                <span>+ Proof</span>
                              </button>
                            )}
                          </td>

                          <td className="py-4 px-6">
                            <div className="flex items-center justify-center space-x-2">
                              {/* Audit Trail Button */}
                              <button
                                type="button"
                                onClick={() => setHistoryRecordId(r._id)}
                                title="View Complete Audit History"
                                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                              >
                                <History className="w-4 h-4" />
                              </button>

                              {/* AI Risk Check Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenRiskCheck(r)}
                                title="Run AI Risk Check"
                                className="p-1.5 rounded-lg text-forest-600 hover:bg-forest-50 hover:text-forest-800 transition-colors"
                              >
                                <Sparkles className="w-4 h-4" />
                              </button>

                              {/* Review / Verify Button (Verifier/Auditor/Admin) */}
                              {canReview && ['SUBMITTED', 'UNDER_REVIEW', 'RESUBMITTED'].includes(r.status) && (
                                <button
                                  type="button"
                                  onClick={() => setReviewRecord(r)}
                                  className="px-2.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
                                >
                                  Review
                                </button>
                              )}

                              {/* Fix Data button if correction required */}
                              {(r.status === 'CORRECTION_REQUIRED' || r.status === 'CHANGES_REQUESTED') && (
                                <button
                                  type="button"
                                  onClick={() => handleEditRecord(r)}
                                  className="px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors"
                                >
                                  Fix Data
                                </button>
                              )}

                              {/* Delete (if draft) */}
                              {canEdit && r.status === 'DRAFT' && (
                                <button
                                  onClick={() => handleDelete(r._id)}
                                  className="text-slate-400 hover:text-red-600 transition-colors p-1"
                                  title="Delete Draft"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* If Correction Required, display correction banner */}
                        {(r.status === 'CORRECTION_REQUIRED' || r.status === 'CHANGES_REQUESTED') && (
                          <tr>
                            <td colSpan={6} className="px-6 py-2 bg-amber-50/50">
                              <CorrectionAlertBanner
                                record={r}
                                onEdit={handleEditRecord}
                                onUploadEvidence={setEvidenceRecord}
                                onResubmit={handleResubmitRecord}
                              />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Input Form & Submission Controller */}
        <div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <ClipboardCheck className="h-5 w-5 text-forest-600" />
                <span>{editingDraftId ? 'Edit Water Submission' : 'Submit Water Flow Data'}</span>
              </h2>
              {editingDraftId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-slate-700 underline"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            {!canEdit ? (
              <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl text-sm border border-yellow-100">
                🔒 You do not have permissions to submit water flow records.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Facility</label>
                  {isRestrictedDataEntry ? (
                    <div className="bg-slate-100 border border-slate-200 text-slate-600 rounded-xl px-4 py-3 text-sm font-semibold">
                      {facilities.find(f => f._id === user.facilityId)?.name || 'Assigned Facility'} (Locked)
                    </div>
                  ) : (
                    <select
                      value={facilityId}
                      onChange={(e) => setFacilityId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-forest-400 outline-none"
                    >
                      {facilities.map(f => (
                        <option key={f._id} value={f._id}>{f.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Action Type</label>
                    <select
                      value={actionType}
                      onChange={(e) => setActionType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-forest-400 outline-none"
                    >
                      <option value="Withdrawal">Withdrawal</option>
                      <option value="Reuse">Circular Reuse</option>
                      <option value="Consumption">Consumption</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Periodicity</label>
                    <select
                      value={reportingPeriod}
                      onChange={(e) => setReportingPeriod(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-forest-400 outline-none"
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Source / Path</label>
                    <select
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-forest-400 outline-none"
                    >
                      {sourcesByAction[actionType].map(src => (
                        <option key={src} value={src}>{src}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Flow Amount (m³)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 1500"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-forest-400 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Period Start</label>
                    <input
                      type="date"
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-forest-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Period End</label>
                    <input
                      type="date"
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-forest-400 outline-none"
                    />
                  </div>
                </div>

                {/* Evidence Attachment Section */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Supporting Evidence <span className="text-amber-600 font-normal">(Mandatory)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setEvidenceRecord({ _id: editingDraftId || 'NEW', facilityId })}
                      className="text-[11px] font-bold text-forest-700 hover:text-forest-800 underline"
                    >
                      {attachedEvidenceName ? 'Change' : 'Upload File'}
                    </button>
                  </div>
                  {attachedEvidenceName ? (
                    <div className="flex items-center space-x-2 text-xs text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                      <FileText className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span className="truncate font-semibold">{attachedEvidenceName}</span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Attach water utility bill, meter log sheet, or flow sensor telemetry.
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <input
                    type="checkbox"
                    id="stressedCheck"
                    checked={waterStressed}
                    onChange={(e) => setWaterStressed(e.target.checked)}
                    className="h-4 w-4 text-forest-600 focus:ring-forest-500 border-slate-300 rounded"
                  />
                  <label htmlFor="stressedCheck" className="text-xs text-slate-600 font-semibold cursor-pointer select-none">
                    Water Stressed Location?
                  </label>
                </div>

                {/* Form Action Controls */}
                <div className="pt-2 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={handleSaveDraft}
                      disabled={isSubmitting}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all text-xs border border-slate-300 flex items-center justify-center space-x-1"
                    >
                      <span>Save Draft</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleValidateOnly}
                      disabled={isSubmitting}
                      className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl transition-all text-xs border border-slate-200 flex items-center justify-center space-x-1"
                    >
                      <span>Validate Data</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenRiskCheck()}
                      disabled={isSubmitting}
                      className="w-full bg-forest-50 hover:bg-forest-100 text-forest-800 font-bold py-2.5 rounded-xl transition-all text-xs border border-forest-200 flex items-center justify-center space-x-1.5 shadow-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-forest-600" />
                      <span>AI Risk Check</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-3 rounded-xl transition-all shadow-sm flex items-center justify-center space-x-2 text-xs"
                  >
                    <span>{editingDraftId ? 'Submit Corrected Record' : 'Submit for Verification'}</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Reusable Modals */}
      <SubmissionValidationModal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        issues={validationIssues}
        onFixData={() => {}}
        onSaveDraft={handleSaveDraft}
      />

      <SubmissionHistoryModal
        isOpen={Boolean(historyRecordId)}
        onClose={() => setHistoryRecordId(null)}
        moduleKey="water"
        recordId={historyRecordId}
        token={token}
      />

      <ReviewerWorkflowModal
        isOpen={Boolean(reviewRecord)}
        onClose={() => setReviewRecord(null)}
        moduleKey="water"
        record={reviewRecord}
        token={token}
        currentUser={user}
        onSuccess={(updated) => {
          setActionMessage({ type: 'success', text: `Status updated to ${updated.status} successfully.` });
          fetchRecords();
        }}
      />

      <EvidenceUploadModal
        isOpen={Boolean(evidenceRecord)}
        onClose={() => setEvidenceRecord(null)}
        moduleKey="water"
        recordId={evidenceRecord?._id !== 'NEW' ? evidenceRecord?._id : undefined}
        facilityId={evidenceRecord?.facilityId || facilityId}
        token={token}
        onSuccess={(uploadedEvidence) => {
          setAttachedEvidenceId(uploadedEvidence._id);
          setAttachedEvidenceName(uploadedEvidence.fileName);
          setActionMessage({ type: 'success', text: `Evidence "${uploadedEvidence.fileName}" uploaded and linked.` });
          fetchRecords();
        }}
      />

      <AIRiskCheckModal
        isOpen={showRiskModal}
        onClose={() => setShowRiskModal(false)}
        moduleKey="water"
        data={riskCheckPayload}
        recordId={riskCheckRecordId}
        token={token}
        onFixIssues={() => {}}
        onSubmitRecord={handleSubmit}
      />
    </div>
  );
}
