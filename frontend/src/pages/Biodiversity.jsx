import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useFacilities } from '../context/FacilityContext';
import { 
  TreePine, ClipboardCheck, Sparkles, Plus, Trash2, ArrowUpRight,
  FileText, UploadCloud, History, AlertTriangle, ShieldCheck
} from 'lucide-react';
import SubmissionStatusBadge from '../components/environmental/SubmissionStatusBadge';
import SubmissionValidationModal from '../components/environmental/SubmissionValidationModal';
import SubmissionHistoryModal from '../components/environmental/SubmissionHistoryModal';
import ReviewerWorkflowModal from '../components/environmental/ReviewerWorkflowModal';
import EvidenceUploadModal from '../components/environmental/EvidenceUploadModal';
import CorrectionAlertBanner from '../components/environmental/CorrectionAlertBanner';
import AIRiskCheckModal from '../components/environmental/AIRiskCheckModal';

export default function Biodiversity() {
  const { token, user } = useAuth();
  const { facilities, selectedFacilityId, selectedFacilityName } = useFacilities();
  
  const [assessments, setAssessments] = useState([]);
  const [initiatives, setInitiatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assessments');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Assessment form states
  const [facilityId, setFacilityId] = useState('');
  const [siteName, setSiteName] = useState('');
  const [siteArea, setSiteArea] = useState('');
  const [proximity, setProximity] = useState('');
  const [sensitivity, setSensitivity] = useState('Standard');
  const [riskLevel, setRiskLevel] = useState('LOW');
  const [impactSummary, setImpactSummary] = useState('');
  const [restoredArea, setRestoredArea] = useState('0');
  const [preservedArea, setPreservedArea] = useState('0');
  const [reportingPeriod, setReportingPeriod] = useState('Quarterly');

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

  // Initiative form states
  const [initName, setInitName] = useState('');
  const [initDesc, setInitDesc] = useState('');
  const [initStart, setInitStart] = useState('');
  const [initTarget, setInitTarget] = useState('');
  const [initPerson, setInitPerson] = useState('');
  const [initBenefit, setInitBenefit] = useState('');

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const assessUrl = statusFilter === 'ALL'
        ? '/api/environment/biodiversity/assessments'
        : `/api/environment/biodiversity/assessments?status=${statusFilter}`;

      const [assRes, initRes] = await Promise.all([
        fetch(assessUrl, { headers }),
        fetch('/api/environment/biodiversity/initiatives', { headers })
      ]);

      if (assRes.ok) {
        const list = await assRes.json();
        setAssessments(selectedFacilityId === 'all' ? list : list.filter(r => r.facilityId === selectedFacilityId));
      }
      if (initRes.ok) {
        const list = await initRes.json();
        setInitiatives(selectedFacilityId === 'all' ? list : list.filter(r => r.facilityId === selectedFacilityId));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, selectedFacilityId, statusFilter]);

  const resetAssessmentForm = () => {
    setSiteName('');
    setSiteArea('');
    setProximity('');
    setSensitivity('Standard');
    setRiskLevel('LOW');
    setImpactSummary('');
    setRestoredArea('0');
    setPreservedArea('0');
    setEditingDraftId(null);
    setAttachedEvidenceId(null);
    setAttachedEvidenceName('');
  };

  const getFormData = () => ({
    facilityId: isRestrictedDataEntry ? user.facilityId : facilityId,
    siteName: siteName || 'Ecology Zone',
    siteArea: parseFloat(siteArea || 0),
    protectedAreaProximity: parseFloat(proximity || 0),
    environmentalSensitivity: sensitivity,
    biodiversityRisk: riskLevel,
    impactAssessment: impactSummary,
    areaRestored: parseFloat(restoredArea || 0),
    areaPreserved: parseFloat(preservedArea || 0),
    reportingPeriod,
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
          module: 'biodiversity',
          data: getFormData(),
          isDraft: false
        })
      });
      const data = await res.json();
      if (data.isValid) {
        setActionMessage({ type: 'success', text: 'Validation Successful: Biodiversity assessment data is complete.' });
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
          module: 'biodiversity',
          recordId: editingDraftId,
          data: getFormData()
        })
      });
      const json = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'Biodiversity draft saved successfully to database.' });
        resetAssessmentForm();
        fetchData();
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

  const handleSubmitAssessment = async (e) => {
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
          module: 'biodiversity',
          recordId: editingDraftId,
          data: getFormData()
        })
      });

      const json = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'Biodiversity assessment submitted successfully for verification!' });
        resetAssessmentForm();
        fetchData();
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
    if (record.siteName) setSiteName(record.siteName);
    setSiteArea(record.siteArea || '');
    setProximity(record.protectedAreaProximity || '');
    if (record.environmentalSensitivity) setSensitivity(record.environmentalSensitivity);
    if (record.biodiversityRisk) setRiskLevel(record.biodiversityRisk);
    setImpactSummary(record.impactAssessment || '');
    setRestoredArea(record.areaRestored || '0');
    setPreservedArea(record.areaPreserved || '0');
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
          module: 'biodiversity',
          recordId: record._id,
          data: {
            ...record,
            status: 'SUBMITTED'
          }
        })
      });
      const json = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'Biodiversity assessment resubmitted successfully.' });
        fetchData();
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

  const handleDeleteAssessment = async (id) => {
    if (!canEdit) return;
    if (!window.confirm('Are you sure you want to delete this assessment?')) return;
    try {
      const res = await fetch(`/api/environment/biodiversity/assessments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddInitiative = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/environment/biodiversity/initiatives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          facilityId: isRestrictedDataEntry ? user.facilityId : facilityId,
          name: initName,
          description: initDesc,
          startDate: initStart,
          targetDate: initTarget,
          responsiblePerson: initPerson,
          environmentalBenefit: initBenefit,
          status: 'PLANNED'
        })
      });
      if (res.ok) {
        setInitName('');
        setInitDesc('');
        setInitStart('');
        setInitTarget('');
        setInitPerson('');
        setInitBenefit('');
        fetchData();
        setActionMessage({ type: 'success', text: 'Biodiversity initiative logged successfully.' });
        setTimeout(() => setActionMessage(null), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Aggregation
  const totalSiteArea = assessments.reduce((acc, a) => acc + (a.siteArea || 0), 0);
  const totalRestored = assessments.reduce((acc, a) => acc + (a.areaRestored || 0), 0);
  const highRiskSites = assessments.filter(a => ['HIGH', 'CRITICAL'].includes(a.biodiversityRisk)).length;

  return (
    <div className="pl-64 pr-8 py-8">
      <Navbar title="Biodiversity & Ecological Land Management" />

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
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Evaluated Site Area</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalSiteArea.toFixed(1)} ha</h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TreePine className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Restored / Preserved Area</p>
            <h3 className="text-2xl font-bold text-slate-800 mt-1">{totalRestored.toFixed(1)} ha</h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-green-50 text-green-700 rounded-lg">Active Habitat</span>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">High Risk Ecosystems</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{highRiskSites}</h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg">Requires Action</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('assessments')}
          className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'assessments'
              ? 'border-forest-600 text-forest-700'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <TreePine className="h-4 w-4" />
          <span>Ecology Assessments ({assessments.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('initiatives')}
          className={`pb-3 px-4 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center space-x-2 ${
            activeTab === 'initiatives'
              ? 'border-forest-600 text-forest-700'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>Habitat Initiatives ({initiatives.length})</span>
        </button>
      </div>

      {activeTab === 'assessments' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Table List of Assessments */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              
              {/* Header with Scope & Status Filter Tabs */}
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h2 className="font-bold text-slate-800">Biodiversity Assessments Queue</h2>
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
                <div className="p-8 text-center text-slate-500">Loading biodiversity assessments...</div>
              ) : assessments.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  No assessments found for {statusFilter === 'ALL' ? 'this scope' : `filter: ${statusFilter}`}.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        <th className="py-4 px-6">Site & Sensitivity</th>
                        <th className="py-4 px-6">Total Area</th>
                        <th className="py-4 px-6">Risk Rating</th>
                        <th className="py-4 px-6">Restored / Preserved</th>
                        <th className="py-4 px-6">Status</th>
                        <th className="py-4 px-6">Evidence</th>
                        <th className="py-4 px-6 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {assessments.map((a) => (
                        <React.Fragment key={a._id}>
                          <tr className="hover:bg-slate-50 transition-colors">
                            <td className="py-4 px-6">
                              <span className="font-bold text-slate-800 block">{a.siteName || 'Site Location'}</span>
                              <span className="text-[10px] text-slate-500">{a.environmentalSensitivity}</span>
                            </td>
                            <td className="py-4 px-6 font-semibold text-slate-900">
                              {a.siteArea} ha
                              <span className="block text-[10px] text-slate-400 font-normal">
                                Proximity: {a.protectedAreaProximity} km
                              </span>
                            </td>
                            <td className="py-4 px-6">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase ${
                                a.biodiversityRisk === 'CRITICAL' ? 'bg-red-50 text-red-700' :
                                a.biodiversityRisk === 'HIGH' ? 'bg-amber-50 text-amber-700' :
                                a.biodiversityRisk === 'MEDIUM' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                              }`}>
                                {a.biodiversityRisk}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-slate-700">
                              <span className="block font-medium">Restored: {a.areaRestored || 0} ha</span>
                              <span className="block text-[10px] text-slate-400">Preserved: {a.areaPreserved || 0} ha</span>
                            </td>
                            <td className="py-4 px-6">
                              <SubmissionStatusBadge status={a.status} />
                            </td>
                            <td className="py-4 px-6">
                              {a.evidenceDetails?.fileName ? (
                                <a
                                  href={`/api/environment/evidence/${a.evidenceId}/download`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center space-x-1 text-xs text-forest-700 hover:text-forest-800 font-semibold underline"
                                >
                                  <FileText className="w-3.5 h-3.5 shrink-0" />
                                  <span className="truncate max-w-[100px]">{a.evidenceDetails.fileName}</span>
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setEvidenceRecord(a)}
                                  className="inline-flex items-center space-x-1 text-slate-400 hover:text-forest-600 transition-colors text-[11px] font-semibold"
                                >
                                  <UploadCloud className="w-3.5 h-3.5" />
                                  <span>+ Survey</span>
                                </button>
                              )}
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center justify-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => setHistoryRecordId(a._id)}
                                  title="View Complete Audit History"
                                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                                >
                                  <History className="w-4 h-4" />
                                </button>

                                {/* AI Risk Check Button */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenRiskCheck(a)}
                                  title="Run AI Risk Check"
                                  className="p-1.5 rounded-lg text-forest-600 hover:bg-forest-50 hover:text-forest-800 transition-colors"
                                >
                                  <Sparkles className="w-4 h-4" />
                                </button>

                                {canReview && ['SUBMITTED', 'UNDER_REVIEW', 'RESUBMITTED'].includes(a.status) && (
                                  <button
                                    type="button"
                                    onClick={() => setReviewRecord(a)}
                                    className="px-2.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
                                  >
                                    Review
                                  </button>
                                )}

                                {(a.status === 'CORRECTION_REQUIRED' || a.status === 'CHANGES_REQUESTED') && (
                                  <button
                                    type="button"
                                    onClick={() => handleEditRecord(a)}
                                    className="px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors"
                                  >
                                    Fix Data
                                  </button>
                                )}

                                {canEdit && a.status === 'DRAFT' && (
                                  <button
                                    onClick={() => handleDeleteAssessment(a._id)}
                                    className="text-slate-400 hover:text-red-600 transition-colors p-1"
                                    title="Delete Draft"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {(a.status === 'CORRECTION_REQUIRED' || a.status === 'CHANGES_REQUESTED') && (
                            <tr>
                              <td colSpan={7} className="px-6 py-2 bg-amber-50/50">
                                <CorrectionAlertBanner
                                  record={a}
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
                  <ClipboardCheck className="h-5 w-5 text-forest-600" />
                  <span>{editingDraftId ? 'Edit Biodiversity Survey' : 'Submit Ecology Survey'}</span>
                </h2>
                {editingDraftId && (
                  <button
                    type="button"
                    onClick={resetAssessmentForm}
                    className="text-xs text-slate-400 hover:text-slate-700 underline"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              {!canEdit ? (
                <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl text-sm border border-yellow-100">
                  🔒 You do not have permissions to submit ecology assessment records.
                </div>
              ) : (
                <form onSubmit={handleSubmitAssessment} className="space-y-4">
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

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Site / Zone Name</label>
                    <input
                      type="text"
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                      placeholder="e.g. North Buffer Wetland"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-forest-400 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Site Area (ha)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={siteArea}
                        onChange={(e) => setSiteArea(e.target.value)}
                        placeholder="e.g. 15.5"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-forest-400 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Proximity (km)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={proximity}
                        onChange={(e) => setProximity(e.target.value)}
                        placeholder="0 = adjacent"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-forest-400 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sensitivity</label>
                      <select
                        value={sensitivity}
                        onChange={(e) => setSensitivity(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-forest-400 outline-none"
                      >
                        <option value="Standard">Standard / Low Concern</option>
                        <option value="Moderate Flora">Moderate Flora Presence</option>
                        <option value="High Flora Richness">High Flora Richness</option>
                        <option value="Endangered Species Corridor">Endangered Corridor</option>
                        <option value="Ramsar Wetland Site">Ramsar Wetland Site</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Risk Rating</label>
                      <select
                        value={riskLevel}
                        onChange={(e) => setRiskLevel(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-forest-400 outline-none font-bold"
                      >
                        <option value="LOW">LOW Risk</option>
                        <option value="MEDIUM">MEDIUM Risk</option>
                        <option value="HIGH">HIGH Risk</option>
                        <option value="CRITICAL">CRITICAL Risk</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Restored (ha)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={restoredArea}
                        onChange={(e) => setRestoredArea(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-forest-400 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Preserved (ha)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={preservedArea}
                        onChange={(e) => setPreservedArea(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-forest-400 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Impact Summary</label>
                    <textarea
                      rows={2}
                      value={impactSummary}
                      onChange={(e) => setImpactSummary(e.target.value)}
                      placeholder="Summary of ecological observations or species counts..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-forest-400 outline-none"
                    />
                  </div>

                  {/* Evidence Attachment Section */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Ecological Survey Proof
                      </label>
                      <button
                        type="button"
                        onClick={() => setEvidenceRecord({ _id: editingDraftId || 'NEW', facilityId })}
                        className="text-[11px] font-bold text-forest-700 hover:text-forest-800 underline"
                      >
                        {attachedEvidenceName ? 'Change' : 'Upload Survey'}
                      </button>
                    </div>
                    {attachedEvidenceName ? (
                      <div className="flex items-center space-x-2 text-xs text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                        <FileText className="w-4 h-4 shrink-0 text-emerald-600" />
                        <span className="truncate font-semibold">{attachedEvidenceName}</span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500">
                        Attach biodiversity survey report, GIS aerial map, or conservation audit note.
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
                      <span>{editingDraftId ? 'Submit Corrected Survey' : 'Submit for Verification'}</span>
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Initiatives Tab */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
                <h2 className="font-bold text-slate-800">Conservation Programs</h2>
              </div>
              {initiatives.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">No active conservation initiatives logged.</div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {initiatives.map(ini => (
                    <div key={ini._id} className="p-6 hover:bg-slate-50 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-800 text-sm">{ini.name}</h4>
                        <span className="px-2.5 py-1 rounded-full bg-green-50 text-green-700 font-bold text-[10px]">
                          {ini.status}
                        </span>
                      </div>
                      <p className="text-slate-600 leading-relaxed mb-3">{ini.description}</p>
                      <div className="flex items-center space-x-4 text-slate-400 text-[11px]">
                        <span>Timeline: {ini.startDate} → {ini.targetDate}</span>
                        {ini.responsiblePerson && <span>Lead: {ini.responsiblePerson}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-forest-600" />
                <span>Launch Habitat Program</span>
              </h2>
              <form onSubmit={handleAddInitiative} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Initiative Title</label>
                  <input
                    type="text"
                    required
                    value={initName}
                    onChange={(e) => setInitName(e.target.value)}
                    placeholder="e.g. Native Pollinator Meadow Planting"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-forest-400"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                  <textarea
                    rows={3}
                    value={initDesc}
                    onChange={(e) => setInitDesc(e.target.value)}
                    placeholder="Scope, species planted, ecological benefit..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-forest-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Start Date</label>
                    <input
                      type="date"
                      required
                      value={initStart}
                      onChange={(e) => setInitStart(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-forest-400"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Target Date</label>
                    <input
                      type="date"
                      required
                      value={initTarget}
                      onChange={(e) => setInitTarget(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-forest-400"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-3 rounded-xl transition-all shadow-sm flex items-center justify-center space-x-2 text-xs"
                >
                  <span>Launch Program</span>
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

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
        moduleKey="biodiversity"
        recordId={historyRecordId}
        token={token}
      />

      <ReviewerWorkflowModal
        isOpen={Boolean(reviewRecord)}
        onClose={() => setReviewRecord(null)}
        moduleKey="biodiversity"
        record={reviewRecord}
        token={token}
        currentUser={user}
        onSuccess={(updated) => {
          setActionMessage({ type: 'success', text: `Status updated to ${updated.status} successfully.` });
          fetchData();
        }}
      />

      <EvidenceUploadModal
        isOpen={Boolean(evidenceRecord)}
        onClose={() => setEvidenceRecord(null)}
        moduleKey="biodiversity"
        recordId={evidenceRecord?._id !== 'NEW' ? evidenceRecord?._id : undefined}
        facilityId={evidenceRecord?.facilityId || facilityId}
        token={token}
        onSuccess={(uploadedEvidence) => {
          setAttachedEvidenceId(uploadedEvidence._id);
          setAttachedEvidenceName(uploadedEvidence.fileName);
          setActionMessage({ type: 'success', text: `Evidence "${uploadedEvidence.fileName}" uploaded and linked.` });
          fetchData();
        }}
      />

      <AIRiskCheckModal
        isOpen={showRiskModal}
        onClose={() => setShowRiskModal(false)}
        moduleKey="biodiversity"
        data={riskCheckPayload}
        recordId={riskCheckRecordId}
        token={token}
        onFixIssues={() => {}}
        onSubmitRecord={handleSubmitAssessment}
      />
    </div>
  );
}
