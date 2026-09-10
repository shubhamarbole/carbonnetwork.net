import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useFacilities } from '../context/FacilityContext';
import { 
  Globe, Plus, Trash2, ArrowUpRight, CheckCircle2, 
  HelpCircle, Sparkles, Building2, Calendar, ClipboardList,
  FileText, UploadCloud, History, AlertTriangle, ShieldCheck
} from 'lucide-react';
import SubmissionStatusBadge from '../components/environmental/SubmissionStatusBadge';
import SubmissionValidationModal from '../components/environmental/SubmissionValidationModal';
import SubmissionHistoryModal from '../components/environmental/SubmissionHistoryModal';
import ReviewerWorkflowModal from '../components/environmental/ReviewerWorkflowModal';
import EvidenceUploadModal from '../components/environmental/EvidenceUploadModal';
import CorrectionAlertBanner from '../components/environmental/CorrectionAlertBanner';
import AIRiskCheckModal from '../components/environmental/AIRiskCheckModal';

export default function GHGEmissions() {
  const { token, user } = useAuth();
  const { facilities, selectedFacilityId, selectedFacilityName } = useFacilities();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Form states
  const [facilityId, setFacilityId] = useState('');
  const [scope, setScope] = useState(1);
  const [category, setCategory] = useState('Stationary combustion');
  const [sourceName, setSourceName] = useState('Natural Gas');
  const [activityValue, setActivityValue] = useState('');
  const [activityUnit, setActivityUnit] = useState('m3');
  const [reportingPeriod, setReportingPeriod] = useState('Quarterly');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

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

  // Mapping categories to sources
  const scopeCategories = {
    1: ['Stationary combustion', 'Company vehicles'],
    2: ['Purchased electricity'],
    3: ['Logistics', 'Business travel', 'Waste operations']
  };

  const activityUnits = {
    'Electricity': 'kWh',
    'Diesel': 'Liters',
    'Petrol': 'Liters',
    'Natural Gas': 'm3',
    'LPG': 'Liters'
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
    if (activityUnits[sourceName]) {
      setActivityUnit(activityUnits[sourceName]);
    }
  }, [sourceName]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const url = statusFilter === 'ALL' 
        ? '/api/environment/ghg' 
        : `/api/environment/ghg?status=${statusFilter}`;
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
    setActivityValue('');
    setPeriodStart('');
    setPeriodEnd('');
    setEditingDraftId(null);
    setAttachedEvidenceId(null);
    setAttachedEvidenceName('');
  };

  const getFormData = () => ({
    facilityId: isRestrictedDataEntry ? user.facilityId : facilityId,
    scope: parseInt(scope, 10),
    category,
    sourceName,
    activityValue: parseFloat(activityValue || 0),
    activityUnit,
    reportingPeriod,
    periodStart,
    periodEnd,
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
          module: 'ghg',
          data: getFormData(),
          isDraft: false
        })
      });
      const data = await res.json();
      if (data.isValid) {
        setActionMessage({ type: 'success', text: 'Validation Successful: GHG data meets all protocol rules and proof constraints.' });
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
          module: 'ghg',
          recordId: editingDraftId,
          data: getFormData()
        })
      });
      const json = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'GHG emission draft saved successfully to database.' });
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
          module: 'ghg',
          recordId: editingDraftId,
          data: getFormData()
        })
      });

      const json = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'GHG emission record submitted successfully for verification!' });
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
    if (record.scope) setScope(record.scope);
    if (record.category) setCategory(record.category);
    if (record.sourceName) setSourceName(record.sourceName);
    setActivityValue(record.activityValue || '');
    if (record.activityUnit) setActivityUnit(record.activityUnit);
    if (record.reportingPeriod) setReportingPeriod(record.reportingPeriod);
    if (record.periodStart) setPeriodStart(record.periodStart);
    if (record.periodEnd) setPeriodEnd(record.periodEnd);
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
          module: 'ghg',
          recordId: record._id,
          data: {
            ...record,
            status: 'SUBMITTED'
          }
        })
      });
      const json = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'GHG record resubmitted successfully for verification.' });
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
    if (!window.confirm('Are you sure you want to delete this emission log?')) return;
    try {
      const res = await fetch(`/api/environment/ghg/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchRecords();
    } catch (err) {
      console.error(err);
    }
  };

  const totalCalculated = records.reduce((acc, r) => acc + (r.calculatedCO2e || 0), 0);

  return (
    <div className="pl-64 pr-8 py-8">
      <Navbar title="Greenhouse Gas (GHG) Emissions Accounting" />

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
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Carbon Footprint</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalCalculated.toFixed(2)} tCO₂e</h3>
          </div>
          <div className="p-3 bg-forest-50 text-forest-600 rounded-xl">
            <Globe className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scope 1 (Direct)</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">
              {records.filter(r => r.scope === 1).reduce((acc, r) => acc + (r.calculatedCO2e || 0), 0).toFixed(2)} tCO₂e
            </h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg">Direct Fuels</span>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scope 2 (Indirect)</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">
              {records.filter(r => r.scope === 2).reduce((acc, r) => acc + (r.calculatedCO2e || 0), 0).toFixed(2)} tCO₂e
            </h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-sky-50 text-sky-700 rounded-lg">Electricity</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Table of logs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            
            {/* Header with Scope & Status Filter Tabs */}
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="font-bold text-slate-800">Emissions Log Files & Verification Queue</h2>
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
              <div className="p-8 text-center text-slate-500">Loading emission logs...</div>
            ) : records.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No emission records found for {statusFilter === 'ALL' ? 'this scope' : `filter: ${statusFilter}`}.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="py-4 px-6">Period</th>
                      <th className="py-4 px-6">Scope & Source</th>
                      <th className="py-4 px-6">Activity Amount</th>
                      <th className="py-4 px-6">Calculated CO2e</th>
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
                            <span className="block font-medium text-slate-800">{r.reportingPeriod}</span>
                            <span className="block text-[10px] text-slate-400">
                              {r.periodStart ? `${r.periodStart} → ${r.periodEnd}` : 'N/A'}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              r.scope === 1 ? 'bg-amber-50 text-amber-800' : r.scope === 2 ? 'bg-sky-50 text-sky-800' : 'bg-purple-50 text-purple-800'
                            }`}>
                              Scope {r.scope}
                            </span>
                            <span className="block font-semibold text-slate-800 mt-1">{r.sourceName}</span>
                            <span className="block text-[10px] text-slate-400">{r.category}</span>
                          </td>
                          <td className="py-4 px-6 font-semibold text-slate-700">
                            {(r.activityValue || 0).toLocaleString()} {r.activityUnit}
                          </td>
                          <td className="py-4 px-6 font-bold text-slate-900 text-sm">
                            {(r.calculatedCO2e || 0).toFixed(3)} tCO₂e
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
                <span>{editingDraftId ? 'Edit Emission Submission' : 'Log GHG Activity Data'}</span>
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
                🔒 You do not have permissions to submit data logs.
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
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">GHG Scope</label>
                    <select
                      value={scope}
                      onChange={(e) => {
                        const newScope = parseInt(e.target.value, 10);
                        setScope(newScope);
                        setCategory(scopeCategories[newScope][0]);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-forest-400 outline-none font-semibold"
                    >
                      <option value={1}>Scope 1 (Direct)</option>
                      <option value={2}>Scope 2 (Electricity)</option>
                      <option value={3}>Scope 3 (Value Chain)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-forest-400 outline-none"
                    >
                      {scopeCategories[scope].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Source / Fuel</label>
                    <input
                      type="text"
                      value={sourceName}
                      onChange={(e) => setSourceName(e.target.value)}
                      placeholder="e.g. Natural Gas"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-forest-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Activity Amount ({activityUnit})
                    </label>
                    <input
                      type="number"
                      value={activityValue}
                      onChange={(e) => setActivityValue(e.target.value)}
                      placeholder="e.g. 500"
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
                      Attach fuel purchase invoice, utility electric bill, or flight log.
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
        moduleKey="ghg"
        recordId={historyRecordId}
        token={token}
      />

      <ReviewerWorkflowModal
        isOpen={Boolean(reviewRecord)}
        onClose={() => setReviewRecord(null)}
        moduleKey="ghg"
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
        moduleKey="ghg"
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
        moduleKey="ghg"
        data={riskCheckPayload}
        recordId={riskCheckRecordId}
        token={token}
        onFixIssues={() => {}}
        onSubmitRecord={handleSubmit}
      />
    </div>
  );
}
