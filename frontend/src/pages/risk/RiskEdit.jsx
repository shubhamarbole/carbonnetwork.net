import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import { 
  ShieldAlert, ArrowLeft, Save, CheckCircle2, 
  AlertCircle, RefreshCw
} from 'lucide-react';

const CATEGORIES = [
  'Financial', 'Operational', 'Environmental', 'ESG', 'Compliance',
  'Regulatory', 'Supplier', 'Project', 'Cybersecurity', 'Data',
  'Reputational', 'Fraud', 'Carbon', 'Documentation'
];

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUSES = ['OPEN', 'UNDER_REVIEW', 'MITIGATION_IN_PROGRESS', 'MITIGATED', 'CLOSED'];

export default function RiskEdit() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  // Deterministic 4-factor scoring engine helpers
  const calculateScore = (p, i, e, u) => {
    const raw = (Number(p) * 0.35) + (Number(i) * 0.35) + (Number(e) * 0.20) + (Number(u) * 0.10);
    return Math.round(raw * 100) / 100;
  };

  const classifySeverity = (score) => {
    if (score < 25) return 'LOW';
    if (score < 50) return 'MEDIUM';
    if (score < 75) return 'HIGH';
    return 'CRITICAL';
  };

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Operational',
    probability: 50,
    impact: 50,
    exposure: 50,
    urgency: 50,
    severity: 'MEDIUM',
    status: 'OPEN',
    projectId: '',
    ownerId: '',
    reason: ''
  });

  const [projectsList, setProjectsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});

  // Derive authoritative score and severity
  const currentCalculatedScore = calculateScore(
    formData.probability,
    formData.impact,
    formData.exposure,
    formData.urgency
  );

  useEffect(() => {
    if (!loading) {
      const suggested = classifySeverity(currentCalculatedScore);
      setFormData(prev => ({ ...prev, severity: suggested }));
    }
  }, [formData.probability, formData.impact, formData.exposure, formData.urgency]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);

    fetch(`/api/risks/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load risk');
        return res.json();
      })
      .then(json => {
        const r = json.data;
        setFormData({
          title: r.title || '',
          description: r.description || '',
          category: r.category || 'Operational',
          probability: r.probability ?? 50,
          impact: r.impact ?? 50,
          exposure: r.exposure ?? 50,
          urgency: r.urgency ?? 50,
          severity: r.severity || 'MEDIUM',
          status: r.status || 'OPEN',
          projectId: r.projectId || '',
          ownerId: r.ownerId || '',
          reason: ''
        });

        const orgQ = r.organizationId ? `?organizationId=${r.organizationId}` : '';
        // Load projects
        fetch(`/api/risks/meta/projects${orgQ}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(pj => setProjectsList(pj.data || []));

        // Load users
        fetch(`/api/risks/meta/assignable-users${orgQ}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(uj => setUsersList(uj.data || []));
      })
      .catch(err => {
        console.error('Error fetching risk for edit:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [id, token]);

  const validate = () => {
    const errs = {};
    if (!formData.title.trim()) errs.title = 'Title is required';
    if (!formData.description.trim()) errs.description = 'Description is required';
    if (formData.probability < 0 || formData.probability > 100) errs.probability = 'Probability must be 0–100';
    if (formData.impact < 0 || formData.impact > 100) errs.impact = 'Impact must be 0–100';
    if (formData.exposure < 0 || formData.exposure > 100) errs.exposure = 'Exposure must be 0–100';
    if (formData.urgency < 0 || formData.urgency > 100) errs.urgency = 'Urgency must be 0–100';
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setToast(null);

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        probability: Number(formData.probability),
        impact: Number(formData.impact),
        exposure: Number(formData.exposure),
        urgency: Number(formData.urgency),
        severity: formData.severity,
        status: formData.status,
        projectId: formData.projectId || null,
        ownerId: formData.ownerId || null,
        reason: formData.reason?.trim() || 'Updated risk assessment factors'
      };

      const res = await fetch(`/api/risks/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Failed to update risk');
      }

      setToast({ type: 'success', message: 'Risk updated successfully! Returning to details...' });
      setTimeout(() => {
        navigate(`/risk-manager/risks/${id}`);
      }, 1000);
    } catch (err) {
      console.error('Error updating risk:', err);
      setToast({ type: 'error', message: err.message || 'Failed to update risk' });
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pl-64 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto" />
          <p className="text-xs text-slate-500">Loading risk for editing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pl-64">
      <Navbar title={`Edit Risk: ${formData.title}`} />

      <main className="p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center space-x-3">
          <Link
            to={`/risk-manager/risks/${id}`}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Edit Risk Profile</h1>
            <p className="text-xs text-slate-500 mt-0.5">Modify risk assessment details and parameters</p>
          </div>
        </div>

        {toast && (
          <div className={`p-4 rounded-xl border flex items-center space-x-3 text-xs font-semibold ${
            toast.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span>{toast.message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`w-full px-4 py-2.5 rounded-xl border text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                validationErrors.title ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
              }`}
            />
            {validationErrors.title && <p className="text-[11px] text-rose-600 mt-1">{validationErrors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`w-full px-4 py-2.5 rounded-xl border text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                validationErrors.description ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200'
              }`}
            />
            {validationErrors.description && <p className="text-[11px] text-rose-600 mt-1">{validationErrors.description}</p>}
          </div>

          {/* Category & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white"
              >
                {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>

          {/* Phase 2: 4-Factor Matrix Scoring (0–100 Scale) */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Authoritative Risk Scoring (4 Factors)
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Formula: (P × 0.35) + (I × 0.35) + (E × 0.20) + (U × 0.10)
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] text-slate-500">Calculated Score:</span>
                <span className="text-sm font-black font-mono text-slate-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
                  {currentCalculatedScore.toFixed(2)}
                </span>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${
                  formData.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                  formData.severity === 'HIGH' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                  formData.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                  'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}>
                  {formData.severity}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Factor 1: Probability (35%) */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center space-x-1.5">
                    <label className="text-xs font-bold text-slate-700">Probability (P)</label>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">Weight: 35%</span>
                  </div>
                  <span className="text-xs font-mono font-black text-blue-600">{formData.probability}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={formData.probability}
                  onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) })}
                  className="w-full accent-blue-600"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-slate-400 font-mono">Contrib: +{(formData.probability * 0.35).toFixed(2)}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.probability}
                    onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) })}
                    className="w-20 px-2 py-0.5 rounded-lg border border-slate-200 text-xs font-mono text-center"
                  />
                </div>
              </div>

              {/* Factor 2: Impact (35%) */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center space-x-1.5">
                    <label className="text-xs font-bold text-slate-700">Impact (I)</label>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">Weight: 35%</span>
                  </div>
                  <span className="text-xs font-mono font-black text-rose-600">{formData.impact}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={formData.impact}
                  onChange={(e) => setFormData({ ...formData, impact: Number(e.target.value) })}
                  className="w-full accent-rose-600"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-slate-400 font-mono">Contrib: +{(formData.impact * 0.35).toFixed(2)}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.impact}
                    onChange={(e) => setFormData({ ...formData, impact: Number(e.target.value) })}
                    className="w-20 px-2 py-0.5 rounded-lg border border-slate-200 text-xs font-mono text-center"
                  />
                </div>
              </div>

              {/* Factor 3: Exposure (20%) */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center space-x-1.5">
                    <label className="text-xs font-bold text-slate-700">Exposure (E)</label>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Weight: 20%</span>
                  </div>
                  <span className="text-xs font-mono font-black text-amber-600">{formData.exposure}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={formData.exposure}
                  onChange={(e) => setFormData({ ...formData, exposure: Number(e.target.value) })}
                  className="w-full accent-amber-600"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-slate-400 font-mono">Contrib: +{(formData.exposure * 0.20).toFixed(2)}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.exposure}
                    onChange={(e) => setFormData({ ...formData, exposure: Number(e.target.value) })}
                    className="w-20 px-2 py-0.5 rounded-lg border border-slate-200 text-xs font-mono text-center"
                  />
                </div>
              </div>

              {/* Factor 4: Urgency (10%) */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center space-x-1.5">
                    <label className="text-xs font-bold text-slate-700">Urgency (U)</label>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">Weight: 10%</span>
                  </div>
                  <span className="text-xs font-mono font-black text-purple-600">{formData.urgency}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={formData.urgency}
                  onChange={(e) => setFormData({ ...formData, urgency: Number(e.target.value) })}
                  className="w-full accent-purple-600"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-slate-400 font-mono">Contrib: +{(formData.urgency * 0.10).toFixed(2)}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.urgency}
                    onChange={(e) => setFormData({ ...formData, urgency: Number(e.target.value) })}
                    className="w-20 px-2 py-0.5 rounded-lg border border-slate-200 text-xs font-mono text-center"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-200">
              <div className="text-xs text-slate-500 font-medium">
                Score Breakdown: <span className="font-mono font-bold text-slate-900">
                  {(formData.probability * 0.35).toFixed(2)} + {(formData.impact * 0.35).toFixed(2)} + {(formData.exposure * 0.20).toFixed(2)} + {(formData.urgency * 0.10).toFixed(2)} = {currentCalculatedScore.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <label className="text-xs font-bold text-slate-700">Severity Tier:</label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-800 bg-white"
                >
                  {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Reason for Modification (Audit Trail) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Reason for Modification <span className="text-slate-400 font-normal">(Recorded in Score History)</span>
            </label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="e.g. Updated factors after quarterly ESG compliance audit"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Project & Owner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Linked Project
              </label>
              <select
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white"
              >
                <option value="">-- General / Org Level --</option>
                {projectsList.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Assigned Owner
              </label>
              <select
                value={formData.ownerId}
                onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-white"
              >
                <option value="">-- Unassigned --</option>
                {usersList.map(u => <option key={u._id} value={u._id}>{u.name} ({u.role || u.email})</option>)}
              </select>
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
            <Link
              to={`/risk-manager/risks/${id}`}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>{submitting ? 'Saving Changes...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
