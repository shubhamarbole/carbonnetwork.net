import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useFacilities } from '../context/FacilityContext';
import { 
  Zap, Plus, Trash2, ArrowUpRight, HelpCircle, Activity, 
  ShieldCheck, Target, Layers, Sparkles, FileText, UploadCloud, 
  History, AlertTriangle, Check 
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import SubmissionStatusBadge from '../components/environmental/SubmissionStatusBadge';
import SubmissionValidationModal from '../components/environmental/SubmissionValidationModal';
import SubmissionHistoryModal from '../components/environmental/SubmissionHistoryModal';
import ReviewerWorkflowModal from '../components/environmental/ReviewerWorkflowModal';
import EvidenceUploadModal from '../components/environmental/EvidenceUploadModal';
import CorrectionAlertBanner from '../components/environmental/CorrectionAlertBanner';
import AIRiskCheckModal from '../components/environmental/AIRiskCheckModal';

export default function Energy() {
  const { token, user } = useAuth();
  const { facilities, selectedFacilityId, selectedFacilityName } = useFacilities();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [meters, setMeters] = useState([]);
  const [readings, setReadings] = useState([]);
  const [initiatives, setInitiatives] = useState([]);
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Meter form states
  const [facId, setFacId] = useState('');
  const [meterNumber, setMeterNumber] = useState('');
  const [location, setLocation] = useState('');
  const [meterType, setMeterType] = useState('MANUAL');
  const [connectionType, setConnectionType] = useState('SINGLE_PHASE');
  const [voltage, setVoltage] = useState('230');
  const [installDate, setInstallDate] = useState('');

  // Reading form states
  const [selectedMeterId, setSelectedMeterId] = useState('');
  const [prevReading, setPrevReading] = useState('');
  const [currReading, setCurrReading] = useState('');
  const [readingDate, setReadingDate] = useState('');
  const [sourceType, setSourceType] = useState('GRID');
  const [usageCategory, setUsageCategory] = useState('OTHER');
  const [period, setPeriod] = useState('Quarterly');

  // Reading workflow states
  const [readingStatusFilter, setReadingStatusFilter] = useState('ALL');
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

  // Initiatives form states
  const [initName, setInitName] = useState('');
  const [initDesc, setInitDesc] = useState('');
  const [baselinePower, setBaselinePower] = useState('');
  const [expectedSavings, setExpectedSavings] = useState('');
  const [initPerson, setInitPerson] = useState('');

  const isRestrictedDataEntry = user && user.role === 'DATA_ENTRY' && user.facilityId;
  const canEdit = user && ['ADMIN', 'SUPER_ADMIN', 'PLATFORM_ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER', 'DATA_ENTRY', 'MSME', 'ENTERPRISE'].includes(user.role);
  const canReview = user && ['VERIFIER', 'AUDITOR', 'SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(user.role);

  useEffect(() => {
    if (facilities.length > 0) {
      setFacId(isRestrictedDataEntry ? user.facilityId : facilities[0]._id);
    }
  }, [facilities, user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [metRes, readRes, initRes, tarRes] = await Promise.all([
        fetch('/api/environment/energy/meters', { headers }),
        fetch('/api/environment/energy', { headers }),
        fetch('/api/environment/energy/initiatives', { headers }),
        fetch('/api/environment/targets', { headers })
      ]);

      if (metRes.ok) setMeters(await metRes.json());
      if (readRes.ok) setReadings(await readRes.json());
      if (initRes.ok) setInitiatives(await initRes.json());
      if (tarRes.ok) setTargets(await tarRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, selectedFacilityId]);

  // Handle previous readings calculation automatically
  useEffect(() => {
    if (selectedMeterId) {
      const meterReadings = readings.filter(r => r.meterId === selectedMeterId);
      if (meterReadings.length > 0) {
        const sorted = [...meterReadings].sort((a, b) => new Date(b.readingDate) - new Date(a.readingDate));
        setPrevReading(sorted[0].currentReading);
      } else {
        setPrevReading('0');
      }
    }
  }, [selectedMeterId, readings]);

  const handleAddMeter = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/environment/energy/meters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          facilityId: isRestrictedDataEntry ? user.facilityId : facId,
          meterNumber,
          location,
          meterType,
          connectionType,
          voltage: parseFloat(voltage),
          installationDate: installDate
        })
      });
      if (res.ok) {
        setMeterNumber('');
        setLocation('');
        setInstallDate('');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to add meter');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetReadingForm = () => {
    setCurrReading('');
    setReadingDate('');
    setEditingDraftId(null);
    setAttachedEvidenceId(null);
    setAttachedEvidenceName('');
  };

  const getReadingFormData = () => ({
    facilityId: isRestrictedDataEntry ? user.facilityId : facId,
    meterId: selectedMeterId,
    previousReading: parseFloat(prevReading || 0),
    currentReading: parseFloat(currReading || 0),
    readingDate,
    sourceType,
    usageCategory,
    reportingPeriod: period,
    evidenceId: attachedEvidenceId
  });

  const handleValidateReading = async () => {
    try {
      const res = await fetch('/api/environment/submission/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          module: 'energy',
          data: getReadingFormData(),
          isDraft: false
        })
      });
      const data = await res.json();
      if (data.isValid) {
        setActionMessage({ type: 'success', text: 'Validation Successful: Meter readings and evidence meet all criteria.' });
        setTimeout(() => setActionMessage(null), 5000);
      } else {
        setValidationIssues(data.issues || ['Please check required reading fields']);
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
      setRiskCheckPayload(getReadingFormData());
    }
    setShowRiskModal(true);
  };

  const handleSaveDraftReading = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/environment/submission/save-draft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          module: 'energy',
          recordId: editingDraftId,
          data: getReadingFormData()
        })
      });
      const json = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'Energy meter draft saved successfully to database.' });
        resetReadingForm();
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

  const handleSubmitReading = async (e) => {
    if (e) e.preventDefault();
    if (parseFloat(currReading) < parseFloat(prevReading)) {
      setValidationIssues(['Validation Error: Current reading cannot be lower than previous reading.']);
      setShowValidationModal(true);
      return;
    }
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/environment/submission/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          module: 'energy',
          recordId: editingDraftId,
          data: getReadingFormData()
        })
      });

      const json = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'Energy reading submitted successfully for verification!' });
        resetReadingForm();
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

  const handleEditReading = (record) => {
    setEditingDraftId(record._id);
    if (record.facilityId) setFacId(record.facilityId);
    if (record.meterId) setSelectedMeterId(record.meterId);
    setPrevReading(record.previousReading || '0');
    setCurrReading(record.currentReading || '');
    if (record.readingDate) setReadingDate(record.readingDate);
    if (record.sourceType) setSourceType(record.sourceType);
    if (record.usageCategory) setUsageCategory(record.usageCategory);
    if (record.reportingPeriod) setPeriod(record.reportingPeriod);
    if (record.evidenceId) setAttachedEvidenceId(record.evidenceId);
    if (record.evidenceDetails?.fileName) setAttachedEvidenceName(record.evidenceDetails.fileName);
  };

  const handleResubmitReading = async (record) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/environment/submission/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          module: 'energy',
          recordId: record._id,
          data: {
            ...record,
            status: 'SUBMITTED'
          }
        })
      });
      const json = await res.json();
      if (res.ok) {
        setActionMessage({ type: 'success', text: 'Energy reading resubmitted successfully for verification.' });
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

  const handleDeleteReading = async (id) => {
    if (!canEdit) return;
    if (!window.confirm('Are you sure you want to delete this energy reading draft?')) return;
    try {
      const res = await fetch(`/api/environment/energy/${id}`, {
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
      const res = await fetch('/api/environment/energy/initiatives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          facilityId: isRestrictedDataEntry ? user.facilityId : facId,
          name: initName,
          description: initDesc,
          baselineConsumption: parseFloat(baselinePower),
          expectedConsumption: parseFloat(baselinePower - expectedSavings),
          expectedSavings: parseFloat(expectedSavings),
          startDate: new Date().toISOString().split('T')[0],
          targetDate: new Date().toISOString().split('T')[0],
          status: 'PLANNED',
          responsiblePerson: initPerson
        })
      });
      if (res.ok) {
        setInitName('');
        setInitDesc('');
        setBaselinePower('');
        setExpectedSavings('');
        setInitPerson('');
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to add initiative');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter local arrays by facility scope
  const activeMeters = selectedFacilityId === 'all' ? meters : meters.filter(m => m.facilityId === selectedFacilityId);
  const activeReadings = selectedFacilityId === 'all' ? readings : readings.filter(r => r.facilityId === selectedFacilityId);
  const filteredReadings = activeReadings.filter(r => {
    if (readingStatusFilter === 'ALL') return true;
    return r.status === readingStatusFilter;
  });
  const activeInitiatives = selectedFacilityId === 'all' ? initiatives : initiatives.filter(i => i.facilityId === selectedFacilityId);

  // Calculations
  const totalConsumption = activeReadings.reduce((acc, r) => acc + r.consumption, 0);
  const gridConsumption = activeReadings.filter(r => r.sourceType === 'GRID').reduce((acc, r) => acc + r.consumption, 0);
  const renewableConsumption = activeReadings.filter(r => ['SOLAR', 'WIND', 'HYDRO', 'OTHER_RENEWABLE'].includes(r.sourceType)).reduce((acc, r) => acc + r.consumption, 0);
  const renewablePct = totalConsumption > 0 ? (renewableConsumption / totalConsumption) * 100 : 0;
  
  // Scope 2 emissions: Grid power * 0.82 kg/kWh / 1000
  const scope2Emissions = (gridConsumption * 0.82) / 1000;
  const energySaved = activeInitiatives.filter(i => i.status === 'COMPLETED').reduce((acc, i) => acc + i.expectedSavings, 0);

  // Sources breakdown array
  const sourcesData = [
    { name: 'Grid Power', value: gridConsumption, color: '#475569' },
    { name: 'Solar', value: activeReadings.filter(r => r.sourceType === 'SOLAR').reduce((acc, r) => acc + r.consumption, 0), color: '#fbbf24' },
    { name: 'Wind', value: activeReadings.filter(r => r.sourceType === 'WIND').reduce((acc, r) => acc + r.consumption, 0), color: '#38bdf8' },
    { name: 'Hydro', value: activeReadings.filter(r => r.sourceType === 'HYDRO').reduce((acc, r) => acc + r.consumption, 0), color: '#34d399' },
    { name: 'Generators', value: activeReadings.filter(r => r.sourceType === 'GENERATOR').reduce((acc, r) => acc + r.consumption, 0), color: '#f87171' }
  ].filter(d => d.value > 0);

  // Category breakdown array
  const categoriesData = [
    { name: 'Machinery', value: activeReadings.filter(r => r.usageCategory === 'PRODUCTION_MACHINERY').reduce((acc, r) => acc + r.consumption, 0) },
    { name: 'HVAC / Cooling', value: activeReadings.filter(r => r.usageCategory === 'HVAC' || r.usageCategory === 'REFRIGERATION').reduce((acc, r) => acc + r.consumption, 0) },
    { name: 'Lighting', value: activeReadings.filter(r => r.usageCategory === 'LIGHTING').reduce((acc, r) => acc + r.consumption, 0) },
    { name: 'Pumps & Motors', value: activeReadings.filter(r => r.usageCategory === 'PUMPS' || r.usageCategory === 'MOTORS').reduce((acc, r) => acc + r.consumption, 0) },
    { name: 'IT & Offices', value: activeReadings.filter(r => r.usageCategory === 'IT_EQUIPMENT' || r.usageCategory === 'OFFICE_EQUIPMENT').reduce((acc, r) => acc + r.consumption, 0) },
    { name: 'Other', value: activeReadings.filter(r => r.usageCategory === 'OTHER').reduce((acc, r) => acc + r.consumption, 0) }
  ].filter(d => d.value > 0);

  return (
    <div className="pl-64 pr-8 py-8 min-h-screen bg-slate-50">
      <Navbar title={`Energy & Electricity Management — ${selectedFacilityName}`} />

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mt-6 mb-6 flex-wrap gap-1">
        {[
          { id: 'overview', name: 'Overview' },
          { id: 'meters', name: 'Electricity Meters' },
          { id: 'readings', name: 'Meter Readings' },
          { id: 'sources', name: 'Energy Sources' },
          { id: 'usage', name: 'Energy Usage' },
          { id: 'initiatives', name: 'Efficiency Initiatives' },
          { id: 'targets', name: 'Energy Targets' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`pb-3 px-4 font-bold text-xs transition-all border-b-2 ${
              activeTab === t.id ? 'border-forest-600 text-forest-600 font-extrabold' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400">Loading energy records...</div>
      ) : (
        <div>
          {/* 1. OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Consumption</p>
                  <h3 className="text-2xl font-black text-slate-800 mt-1">{totalConsumption.toLocaleString()} kWh</h3>
                  <span className="text-[10px] font-medium text-slate-400">Aggregated readings</span>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Renewable Electricity</p>
                  <h3 className="text-2xl font-black text-emerald-600 mt-1">{renewablePct.toFixed(1)}%</h3>
                  <span className="text-[10px] font-medium text-slate-400">Solar, Wind, Hydro</span>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scope 2 (CO2e)</p>
                  <h3 className="text-2xl font-black text-rose-600 mt-1">{scope2Emissions.toFixed(2)} tCO₂e</h3>
                  <span className="text-[10px] font-medium text-slate-400">Indirect carbon footprint</span>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Energy Saved</p>
                  <h3 className="text-2xl font-black text-blue-600 mt-1">{energySaved.toLocaleString()} kWh</h3>
                  <span className="text-[10px] font-medium text-slate-400">Via completed LED/HVAC initiatives</span>
                </div>
              </div>

              {/* Graphical Overview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-4">Electricity Sourcing Ratios</h4>
                  {sourcesData.length === 0 ? (
                    <p className="text-xs text-slate-400">No active reading logs recorded.</p>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={sourcesData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label>
                            {sourcesData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-4">Electricity Usage Category Splits</h4>
                  {categoriesData.length === 0 ? (
                    <p className="text-xs text-slate-400">No category allocation readings logged.</p>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoriesData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                          <YAxis stroke="#64748b" fontSize={10} />
                          <Tooltip />
                          <Bar dataKey="value" fill="#16a34a" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. ELECTRICITY METERS TAB */}
          {activeTab === 'meters' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
                  <h4 className="font-bold text-slate-800">Installed Electricity Meters Inventory</h4>
                </div>
                {activeMeters.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">No active meters registered.</div>
                ) : (
                  <div className="overflow-x-auto text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 font-bold text-slate-400 uppercase border-b border-slate-100">
                          <th className="py-4 px-6">Meter Number</th>
                          <th className="py-4 px-6">Location</th>
                          <th className="py-4 px-6">Type</th>
                          <th className="py-4 px-6 text-center">Connection</th>
                          <th className="py-4 px-6 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {activeMeters.map(m => (
                          <tr key={m._id} className="hover:bg-slate-50">
                            <td className="py-4 px-6 font-bold text-slate-800">{m.meterNumber}</td>
                            <td className="py-4 px-6 text-slate-500">{m.location}</td>
                            <td className="py-4 px-6">{m.meterType}</td>
                            <td className="py-4 px-6 text-center font-semibold">{m.connectionType}</td>
                            <td className="py-4 px-6 text-center">
                              <span className="bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded text-[10px] border border-emerald-100">
                                {m.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Meter Form */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
                <h4 className="font-bold text-slate-900 mb-4 flex items-center space-x-2">
                  <Plus className="h-4.5 w-4.5 text-forest-600" />
                  <span>Register Meter Profile</span>
                </h4>
                {!canEdit ? (
                  <p className="text-xs text-yellow-800 bg-yellow-50 p-4 border border-yellow-100 rounded-xl">🔒 Restricted Access</p>
                ) : (
                  <form onSubmit={handleAddMeter} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Target Facility</label>
                      <select
                        value={facId}
                        onChange={(e) => setFacId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                      >
                        {facilities.map(f => (
                          <option key={f._id} value={f._id}>{f.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Meter Number</label>
                      <input
                        type="text"
                        required
                        value={meterNumber}
                        onChange={(e) => setMeterNumber(e.target.value)}
                        placeholder="e.g. MTR-Pune-04"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Location inside site</label>
                      <input
                        type="text"
                        required
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="e.g. Main Substation"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Meter Type</label>
                        <select
                          value={meterType}
                          onChange={(e) => setMeterType(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                        >
                          <option value="MANUAL">MANUAL</option>
                          <option value="DIGITAL">DIGITAL</option>
                          <option value="SMART_METER">SMART METER</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Connection Phase</label>
                        <select
                          value={connectionType}
                          onChange={(e) => setConnectionType(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                        >
                          <option value="SINGLE_PHASE">SINGLE PHASE</option>
                          <option value="THREE_PHASE">THREE PHASE</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Voltage rating</label>
                        <input
                          type="number"
                          value={voltage}
                          onChange={(e) => setVoltage(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Installation Date</label>
                        <input
                          type="date"
                          required
                          value={installDate}
                          onChange={(e) => setInstallDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-3.5 rounded-xl transition shadow flex items-center justify-center space-x-2"
                    >
                      <span>Create Profile</span>
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* 3. METER READINGS TAB */}
          {activeTab === 'readings' && (
            <div className="space-y-6">
              {actionMessage && (
                <div className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between border shadow-sm ${
                  actionMessage.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                    : 'bg-red-50 text-red-800 border-red-200'
                }`}>
                  <span>{actionMessage.text}</span>
                  <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-700">✕</button>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  {/* Header with Scope & Status Filter Tabs */}
                  <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-slate-800">Meter Reading Ledgers & Verification Queue</h4>
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
                          onClick={() => setReadingStatusFilter(tab.key)}
                          className={`px-3 py-1 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                            readingStatusFilter === tab.key
                              ? 'bg-white text-forest-700 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredReadings.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No energy readings found for {readingStatusFilter === 'ALL' ? 'this facility' : `filter: ${readingStatusFilter}`}.
                    </div>
                  ) : (
                    <div className="overflow-x-auto text-xs text-slate-700">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 font-bold text-slate-400 uppercase border-b border-slate-100 text-[10px] tracking-wider">
                            <th className="py-4 px-6">Read Date</th>
                            <th className="py-4 px-6">Meter No.</th>
                            <th className="py-4 px-6">Prev / Curr</th>
                            <th className="py-4 px-6">Consumption</th>
                            <th className="py-4 px-6">Status</th>
                            <th className="py-4 px-6">Evidence</th>
                            <th className="py-4 px-6 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredReadings.map(r => (
                            <React.Fragment key={r._id}>
                              <tr className="hover:bg-slate-50 transition-colors">
                                <td className="py-4 px-6 font-medium">
                                  <span>{r.readingDate}</span>
                                  <span className="block text-[10px] text-slate-400">{r.reportingPeriod || 'Monthly'}</span>
                                </td>
                                <td className="py-4 px-6 font-semibold text-slate-800">
                                  <div>{meters.find(m => m._id === r.meterId)?.meterNumber || 'MTR'}</div>
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase mt-0.5 ${
                                    ['SOLAR', 'WIND', 'HYDRO'].includes(r.sourceType) ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {r.sourceType}
                                  </span>
                                </td>
                                <td className="py-4 px-6">
                                  <span className="text-slate-500">{r.previousReading?.toLocaleString() || 0}</span> → <span className="font-semibold text-slate-800">{r.currentReading?.toLocaleString()}</span>
                                </td>
                                <td className="py-4 px-6 font-black text-slate-900">
                                  {r.consumption?.toLocaleString()} kWh
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

                                    {/* Fix Data button if correction required or draft */}
                                    {canEdit && (r.status === 'CORRECTION_REQUIRED' || r.status === 'CHANGES_REQUESTED' || r.status === 'DRAFT') && (
                                      <button
                                        type="button"
                                        onClick={() => handleEditReading(r)}
                                        className="px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors"
                                      >
                                        Edit
                                      </button>
                                    )}

                                    {/* Delete (if draft) */}
                                    {canEdit && r.status === 'DRAFT' && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteReading(r._id)}
                                        className="text-slate-400 hover:text-red-600 transition-colors p-1"
                                        title="Delete Draft"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>

                              {/* Correction Alert Banner */}
                              {(r.status === 'CORRECTION_REQUIRED' || r.status === 'CHANGES_REQUESTED') && (
                                <tr>
                                  <td colSpan={7} className="px-6 py-2 bg-amber-50/50">
                                    <CorrectionAlertBanner
                                      record={r}
                                      onEdit={handleEditReading}
                                      onUploadEvidence={setEvidenceRecord}
                                      onResubmit={handleResubmitReading}
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

                {/* Reading Form */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-slate-900 flex items-center space-x-2">
                      <Activity className="h-4.5 w-4.5 text-forest-600" />
                      <span>{editingDraftId ? 'Edit Reading Entry' : 'Log Meter Read Entry'}</span>
                    </h4>
                    {editingDraftId && (
                      <button
                        type="button"
                        onClick={resetReadingForm}
                        className="text-[11px] font-bold text-slate-400 hover:text-slate-600 underline"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {!canEdit ? (
                    <p className="text-xs text-yellow-800 bg-yellow-50 p-4 border border-yellow-100 rounded-xl">🔒 Restricted Access</p>
                  ) : (
                    <form onSubmit={handleSubmitReading} className="space-y-4 text-xs">
                      <div>
                        <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Select Meter</label>
                        <select
                          value={selectedMeterId}
                          onChange={(e) => setSelectedMeterId(e.target.value)}
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                        >
                          <option value="">-- Choose Meter --</option>
                          {activeMeters.map(m => (
                            <option key={m._id} value={m._id}>{m.meterNumber} ({m.location})</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Previous Reading</label>
                          <input
                            type="number"
                            required
                            value={prevReading}
                            onChange={(e) => setPrevReading(e.target.value)}
                            className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 outline-none cursor-not-allowed"
                            readOnly
                          />
                        </div>

                        <div>
                          <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Current Reading</label>
                          <input
                            type="number"
                            required
                            value={currReading}
                            onChange={(e) => setCurrReading(e.target.value)}
                            placeholder="e.g. 135000"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Sourcing Type</label>
                          <select
                            value={sourceType}
                            onChange={(e) => setSourceType(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                          >
                            <option value="GRID">GRID POWER</option>
                            <option value="SOLAR">SOLAR PV</option>
                            <option value="WIND">WIND PV</option>
                            <option value="HYDRO">HYDRO POWER</option>
                            <option value="GENERATOR">DIESEL GENERATOR</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Usage Category</label>
                          <select
                            value={usageCategory}
                            onChange={(e) => setUsageCategory(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                          >
                            <option value="OTHER">OTHER</option>
                            <option value="PRODUCTION_MACHINERY">PRODUCTION MACHINERY</option>
                            <option value="HVAC">HVAC</option>
                            <option value="REFRIGERATION">REFRIGERATION</option>
                            <option value="LIGHTING">LIGHTING</option>
                            <option value="IT_EQUIPMENT">IT SYSTEM CENTERS</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Reporting Period</label>
                          <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                          >
                            <option value="Monthly">Monthly</option>
                            <option value="Quarterly">Quarterly</option>
                            <option value="Yearly">Yearly</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Reading Date</label>
                          <input
                            type="date"
                            required
                            value={readingDate}
                            onChange={(e) => setReadingDate(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                          />
                        </div>
                      </div>

                      {currReading && prevReading && (
                        <div className="bg-slate-50 p-4 border border-slate-100 rounded-xl text-slate-600">
                          Calculated Consumption: <span className="font-bold text-slate-900">{(parseFloat(currReading) - parseFloat(prevReading)).toLocaleString()} kWh</span>
                        </div>
                      )}

                      {/* Evidence Attachment Section */}
                      <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Supporting Evidence <span className="text-amber-600 font-normal">(Mandatory)</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setEvidenceRecord({ _id: editingDraftId || 'NEW', facilityId: isRestrictedDataEntry ? user.facilityId : facId })}
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
                            Attach electricity utility bill, meter log sheet, or energy interval data.
                          </p>
                        )}
                      </div>

                      {/* Form Action Controls */}
                      <div className="pt-2 space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={handleSaveDraftReading}
                            disabled={isSubmitting}
                            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all text-xs border border-slate-300 flex items-center justify-center space-x-1"
                          >
                            <span>Save Draft</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleValidateReading}
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
          )}

          {/* 4. ENERGY SOURCES TAB */}
          {activeTab === 'sources' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm max-w-xl mx-auto space-y-6 text-xs text-slate-600">
              <h4 className="font-black text-sm text-slate-800 uppercase tracking-wider">Electricity Sourcing Ratios</h4>
              <div className="space-y-4">
                {sourcesData.map(s => (
                  <div key={s.name} className="space-y-1">
                    <div className="flex justify-between font-bold text-slate-700">
                      <span>{s.name}</span>
                      <span>{s.value.toLocaleString()} kWh ({(s.value / (totalConsumption || 1) * 100).toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${(s.value / (totalConsumption || 1)) * 100}%`, backgroundColor: s.color }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. ENERGY USAGE TAB */}
          {activeTab === 'usage' && (
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm max-w-xl mx-auto space-y-6 text-xs text-slate-600">
              <h4 className="font-black text-sm text-slate-800 uppercase tracking-wider">Electricity Consumption by Category</h4>
              <div className="space-y-4">
                {categoriesData.map(c => (
                  <div key={c.name} className="space-y-1">
                    <div className="flex justify-between font-bold text-slate-700">
                      <span>{c.name}</span>
                      <span>{c.value.toLocaleString()} kWh ({(c.value / (totalConsumption || 1) * 100).toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-forest-600 transition-all" style={{ width: `${(c.value / (totalConsumption || 1)) * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. EFFICIENCY INITIATIVES TAB */}
          {activeTab === 'initiatives' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-4">
                {activeInitiatives.length === 0 ? (
                  <div className="bg-white p-8 text-center text-slate-400 border border-slate-200 rounded-2xl shadow-sm text-xs">
                    No energy efficiency initiatives registered.
                  </div>
                ) : (
                  activeInitiatives.map(i => (
                    <div key={i._id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center gap-6">
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                          <Layers className="h-4.5 w-4.5 text-forest-600" />
                          <span>{i.name}</span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-1">{i.description}</p>
                        <div className="flex space-x-4 mt-3 text-[10px] text-slate-400 font-bold uppercase">
                          <span>EXPECTED SAVINGS: {i.expectedSavings.toLocaleString()} kWh</span>
                          <span>OWNER: {i.responsiblePerson || 'N/A'}</span>
                        </div>
                      </div>
                      <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-3 py-1 rounded-full border border-emerald-100">
                        {i.status}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Initiative Form */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
                <h4 className="font-bold text-slate-900 mb-4 flex items-center space-x-2">
                  <Sparkles className="h-4.5 w-4.5 text-forest-600" />
                  <span>Register Saving Initiative</span>
                </h4>
                {!canEdit ? (
                  <p className="text-xs text-yellow-800 bg-yellow-50 p-4 border border-yellow-100 rounded-xl">🔒 Restricted Access</p>
                ) : (
                  <form onSubmit={handleAddInitiative} className="space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Facility</label>
                      <select
                        value={facId}
                        onChange={(e) => setFacId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                      >
                        {facilities.map(f => (
                          <option key={f._id} value={f._id}>{f.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Initiative Name</label>
                      <input
                        type="text"
                        required
                        value={initName}
                        onChange={(e) => setInitName(e.target.value)}
                        placeholder="e.g. LED bulb retrofit"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                      <textarea
                        required
                        value={initDesc}
                        onChange={(e) => setInitDesc(e.target.value)}
                        placeholder="Detailed saving measures..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400 h-20"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Baseline Power (kWh)</label>
                        <input
                          type="number"
                          required
                          value={baselinePower}
                          onChange={(e) => setBaselinePower(e.target.value)}
                          placeholder="e.g. 15000"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Expected Savings (kWh)</label>
                        <input
                          type="number"
                          required
                          value={expectedSavings}
                          onChange={(e) => setExpectedSavings(e.target.value)}
                          placeholder="e.g. 3000"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Assignee Owner</label>
                      <input
                        type="text"
                        required
                        value={initPerson}
                        onChange={(e) => setInitPerson(e.target.value)}
                        placeholder="e.g. Site Engineer"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-3.5 rounded-xl transition shadow flex items-center justify-center space-x-2"
                    >
                      <span>Submit Initiative</span>
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* 7. ENERGY TARGETS TAB */}
          {activeTab === 'targets' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm text-xs text-slate-700">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
                <h4 className="font-bold text-slate-800">Target Progress Monitor</h4>
              </div>
              <div className="p-6 space-y-6">
                {targets.filter(t => ['Energy Reduction', 'Renewable Energy'].includes(t.category)).map(t => {
                  const diff = t.baselineValue - t.targetValue;
                  const achieved = t.baselineValue - t.currentValue;
                  const pct = Math.min(100, Math.max(0, (achieved / (diff || 1)) * 100));
                  return (
                    <div key={t._id} className="space-y-2">
                      <div className="flex justify-between items-center font-bold">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">{t.name}</h4>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">{t.category} ({t.targetYear})</p>
                        </div>
                        <span className="bg-blue-50 text-blue-800 text-[10px] px-2 py-0.5 rounded font-bold border border-blue-100 uppercase">
                          {t.status}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative">
                        <div className="bg-forest-600 h-full rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-semibold">
                        <span>Baseline: {t.baselineValue.toLocaleString()}</span>
                        <span>Current: {t.currentValue.toLocaleString()}</span>
                        <span>Target: {t.targetValue.toLocaleString()} ({pct.toFixed(0)}% Progress)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Reusable Submission Modals */}
      <SubmissionValidationModal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        issues={validationIssues}
        onFixData={() => {}}
        onSaveDraft={handleSaveDraftReading}
      />

      <SubmissionHistoryModal
        isOpen={Boolean(historyRecordId)}
        onClose={() => setHistoryRecordId(null)}
        moduleKey="energy"
        recordId={historyRecordId}
        token={token}
      />

      <ReviewerWorkflowModal
        isOpen={Boolean(reviewRecord)}
        onClose={() => setReviewRecord(null)}
        moduleKey="energy"
        record={reviewRecord}
        token={token}
        currentUser={user}
        onSuccess={(updated) => {
          setActionMessage({ type: 'success', text: `Energy reading status updated to ${updated.status} successfully.` });
          fetchData();
        }}
      />

      <EvidenceUploadModal
        isOpen={Boolean(evidenceRecord)}
        onClose={() => setEvidenceRecord(null)}
        moduleKey="energy"
        recordId={evidenceRecord?._id !== 'NEW' ? evidenceRecord?._id : undefined}
        facilityId={evidenceRecord?.facilityId || (isRestrictedDataEntry ? user.facilityId : facId)}
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
        moduleKey="energy"
        data={riskCheckPayload}
        recordId={riskCheckRecordId}
        token={token}
        onFixIssues={() => {}}
        onSubmitRecord={handleSubmitReading}
      />
    </div>
  );
}
