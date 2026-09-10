import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useFacilities } from '../context/FacilityContext';
import { 
  AlertOctagon, Plus, Trash2, ArrowUpRight, ClipboardList, 
  ShieldAlert, FileText, UploadCloud, History, AlertTriangle, Sparkles 
} from 'lucide-react';
import SubmissionStatusBadge from '../components/environmental/SubmissionStatusBadge';
import SubmissionValidationModal from '../components/environmental/SubmissionValidationModal';
import SubmissionHistoryModal from '../components/environmental/SubmissionHistoryModal';
import ReviewerWorkflowModal from '../components/environmental/ReviewerWorkflowModal';
import EvidenceUploadModal from '../components/environmental/EvidenceUploadModal';
import CorrectionAlertBanner from '../components/environmental/CorrectionAlertBanner';
import AIRiskCheckModal from '../components/environmental/AIRiskCheckModal';

export default function Pollution() {
  const { token, user } = useAuth();
  const { facilities, selectedFacilityId, selectedFacilityName } = useFacilities();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Form states
  const [facilityId, setFacilityId] = useState('');
  const [medium, setMedium] = useState('Air');
  const [pollutantType, setPollutantType] = useState('NOx');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('ppm');
  const [source, setSource] = useState('');
  const [legalLimit, setLegalLimit] = useState('');
  const [actualValue, setActualValue] = useState('');
  const [reportingPeriod, setReportingPeriod] = useState('Quarterly');
  const [date, setDate] = useState('');
  const [severity, setSeverity] = useState('Low');
  const [cause, setCause] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');

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

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const url = statusFilter === 'ALL' 
        ? '/api/environment/pollution' 
        : `/api/environment/pollution?status=${statusFilter}`;
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
    setLegalLimit('');
    setActualValue('');
    setSource('');
    setDate('');
    setCause('');
    setCorrectiveAction('');
    setEditingDraftId(null);
    setAttachedEvidenceId(null);
    setAttachedEvidenceName('');
  };

  const getFormData = () => ({
    facilityId: isRestrictedDataEntry ? user.facilityId : facilityId,
    medium,
    pollutantType,
    quantity: parseFloat(amount || 0),
    unit,
    source,
    legalLimit: parseFloat(legalLimit || 0),
    actualValue: parseFloat(actualValue || amount || 0),
    reportingPeriod,
    date: date || new Date().toISOString().split('T')[0],
    severity,
    cause,
    correctiveAction,
    evidenceId: attachedEvidenceId
  });

  const handleValidateOnly = async () => {
    try {
      const res = await fetch('/api/environment/submission/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          module: 'pollution',
          data: getFormData(),
          isDraft: false
        })
      });
      const data = await res.json();
      if (data.isValid) {
        setActionMessage({ type: 'success', text: 'Validation Successful: Pollution incident and stack measurements are valid.' });
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
          module: 'pollution',
          recordId: editingDraftId,
          data: getFormData()
        })
      });
      const json = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'Pollution log draft saved successfully to database.' });
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
          module: 'pollution',
          recordId: editingDraftId,
          data: getFormData()
        })
      });

      const json = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'Pollution log submitted successfully for compliance review!' });
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

  const handleEditRecord = (record) => {
    setEditingDraftId(record._id);
    if (record.facilityId) setFacilityId(record.facilityId);
    if (record.medium) setMedium(record.medium);
    if (record.pollutantType) setPollutantType(record.pollutantType);
    setAmount(record.quantity || record.actualValue || '');
    if (record.unit) setUnit(record.unit);
    if (record.source) setSource(record.source);
    if (record.legalLimit) setLegalLimit(record.legalLimit);
    if (record.actualValue) setActualValue(record.actualValue);
    if (record.reportingPeriod) setReportingPeriod(record.reportingPeriod);
    if (record.date) setDate(record.date);
    if (record.severity) setSeverity(record.severity);
    if (record.cause) setCause(record.cause);
    if (record.correctiveAction) setCorrectiveAction(record.correctiveAction);
    if (record.evidenceId) setAttachedEvidenceId(record.evidenceId);
    if (record.evidenceDetails?.fileName) setAttachedEvidenceName(record.evidenceDetails.fileName);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

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
          module: 'pollution',
          recordId: record._id,
          data: {
            ...record,
            status: 'SUBMITTED'
          }
        })
      });
      const json = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'Pollution log resubmitted successfully.' });
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
    if (!window.confirm('Are you sure you want to delete this pollution record?')) return;
    try {
      const res = await fetch(`/api/environment/pollution/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchRecords();
    } catch (err) {
      console.error(err);
    }
  };

  const airCount = records.filter(r => r.medium === 'Air').length;
  const waterCount = records.filter(r => r.medium === 'Water').length;
  const breaches = records.filter(r => r.complianceStatus === 'NON_COMPLIANT' || (r.legalLimit && r.actualValue > r.legalLimit)).length;

  return (
    <div className="pl-64 pr-8 py-8">
      <Navbar title="Pollution Control & Regulatory Limits" />

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
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Air Emission Sources</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{airCount} Points</h3>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <AlertOctagon className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Effluent / Water Discharges</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{waterCount} Outfalls</h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg">Continuous Monitoring</span>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Limit Exceedances</p>
            <h3 className="text-2xl font-bold text-red-600 mt-1">{breaches}</h3>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
            breaches === 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {breaches === 0 ? 'Fully Compliant' : 'Requires Mitigation'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Table of logs & verification queue */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            
            {/* Header with Scope & Status Filter Tabs */}
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="font-bold text-slate-800">Discharge Logs & Compliance Queue</h2>
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
              <div className="p-8 text-center text-slate-500">Loading pollution records...</div>
            ) : records.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No pollution records found for {statusFilter === 'ALL' ? 'this scope' : `filter: ${statusFilter}`}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="py-4 px-6">Date</th>
                      <th className="py-4 px-6">Medium & Source</th>
                      <th className="py-4 px-6">Pollutant</th>
                      <th className="py-4 px-6">Measured vs Limit</th>
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6">Evidence</th>
                      <th className="py-4 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {records.map((r) => (
                      <React.Fragment key={r._id}>
                        <tr className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-6">
                            <span className="block font-medium text-slate-800">{r.date}</span>
                            <span className="block text-[10px] text-slate-400">{r.reportingPeriod}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-bold text-slate-800 block">{r.medium}</span>
                            <span className="text-[10px] text-slate-500">{r.source || 'Facility Stack'}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-bold text-slate-900">{r.pollutantType}</span>
                            <span className="block text-[10px] text-slate-400">{(r.quantity || 0)} {r.unit}</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`font-bold block ${
                              r.legalLimit && r.actualValue > r.legalLimit ? 'text-red-600' : 'text-slate-800'
                            }`}>
                              {r.actualValue || r.quantity} {r.unit}
                            </span>
                            {r.legalLimit ? (
                              <span className="text-[10px] text-slate-400">Limit: {r.legalLimit} {r.unit}</span>
                            ) : null}
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
                                <span>+ Lab Report</span>
                              </button>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center justify-center space-x-2">
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

                              {canReview && ['SUBMITTED', 'UNDER_REVIEW', 'RESUBMITTED'].includes(r.status) && (
                                <button
                                  type="button"
                                  onClick={() => setReviewRecord(r)}
                                  className="px-2.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
                                >
                                  Review
                                </button>
                              )}

                              {(r.status === 'CORRECTION_REQUIRED' || r.status === 'CHANGES_REQUESTED') && (
                                <button
                                  type="button"
                                  onClick={() => handleEditRecord(r)}
                                  className="px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors"
                                >
                                  Fix Data
                                </button>
                              )}

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

                        {(r.status === 'CORRECTION_REQUIRED' || r.status === 'CHANGES_REQUESTED') && (
                          <tr>
                            <td colSpan={7} className="px-6 py-2 bg-amber-50/50">
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

        {/* Input Form container */}
        <div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <ClipboardList className="h-5 w-5 text-forest-600" />
                <span>{editingDraftId ? 'Edit Pollution Log' : 'Log Pollution Monitoring'}</span>
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
                🔒 You do not have permissions to submit pollution data logs.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Facility</label>
                  {isRestrictedDataEntry ? (
                    <div className="bg-slate-100 border border-slate-200 text-slate-600 rounded-xl px-4 py-2.5 text-sm font-semibold">
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
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Medium</label>
                    <select
                      value={medium}
                      onChange={(e) => setMedium(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-forest-400 outline-none"
                    >
                      <option value="Air">Air Emissions</option>
                      <option value="Water">Water Discharge</option>
                      <option value="Soil">Soil Spillage</option>
                      <option value="Incident">Spill Incident</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pollutant</label>
                    <input
                      type="text"
                      value={pollutantType}
                      onChange={(e) => setPollutantType(e.target.value)}
                      placeholder="e.g. NOx, SO2, COD, TSS"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-forest-400 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Reading / Value</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 35"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-forest-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Unit</label>
                    <select
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-forest-400 outline-none"
                    >
                      <option value="ppm">ppm</option>
                      <option value="mg/m3">mg/m³</option>
                      <option value="mg/L">mg/L</option>
                      <option value="kg">kg</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Source / Stack</label>
                    <input
                      type="text"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      placeholder="e.g. Boiler Stack #2"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-forest-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Legal Limit</label>
                    <input
                      type="number"
                      value={legalLimit}
                      onChange={(e) => setLegalLimit(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-forest-400 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sampling Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-forest-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Period</label>
                    <select
                      value={reportingPeriod}
                      onChange={(e) => setReportingPeriod(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-forest-400 outline-none"
                    >
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                  </div>
                </div>

                {/* Evidence Attachment Section */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Lab Test / Calibration Certificate
                    </label>
                    <button
                      type="button"
                      onClick={() => setEvidenceRecord({ _id: editingDraftId || 'NEW', facilityId })}
                      className="text-[11px] font-bold text-forest-700 hover:text-forest-800 underline"
                    >
                      {attachedEvidenceName ? 'Change' : 'Upload Report'}
                    </button>
                  </div>
                  {attachedEvidenceName ? (
                    <div className="flex items-center space-x-2 text-xs text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                      <FileText className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span className="truncate font-semibold">{attachedEvidenceName}</span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Attach stack emissions certificate, water lab test, or continuous monitor audit log.
                    </p>
                  )}
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
        moduleKey="pollution"
        recordId={historyRecordId}
        token={token}
      />

      <ReviewerWorkflowModal
        isOpen={Boolean(reviewRecord)}
        onClose={() => setReviewRecord(null)}
        moduleKey="pollution"
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
        moduleKey="pollution"
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
        moduleKey="pollution"
        data={riskCheckPayload}
        recordId={riskCheckRecordId}
        token={token}
        onFixIssues={() => {}}
        onSubmitRecord={handleSubmit}
      />
    </div>
  );
}
