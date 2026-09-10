import React, { useState, useEffect } from 'react';
import { 
  Briefcase, Building, AlertTriangle, Plus, ArrowRight, 
  Bot, FileText, CheckCircle2, Download, Target, Sparkles, RefreshCw, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdvisorWorkspace() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [actions, setActions] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedModule, setSelectedModule] = useState('Energy');
  const [expectedSavings, setExpectedSavings] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAdvisorData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [actionsRes, gapsRes] = await Promise.all([
        fetch('/api/environment/actions', { headers }),
        fetch('/api/environment/gaps', { headers })
      ]);

      if (actionsRes.ok) {
        const aData = await actionsRes.json();
        setActions(Array.isArray(aData) ? aData : []);
      }
      if (gapsRes.ok) {
        const gData = await gapsRes.json();
        setGaps(Array.isArray(gData) ? gData : []);
      }
    } catch (err) {
      console.error('Failed to load advisor data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAdvisorData();
  }, [token]);

  const handleAddRecommendation = async (e) => {
    e.preventDefault();
    if (!newTitle) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/environment/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newTitle,
          description: expectedSavings || 'Strategic decarbonization action proposed by Advisory Lead.',
          category: selectedModule,
          status: 'PLANNED',
          priority: 'HIGH'
        })
      });

      if (res.ok) {
        const created = await res.json();
        setActions(prev => [created, ...prev]);
        setNewTitle('');
        setExpectedSavings('');
        setModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to create action:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const completedCount = actions.filter(a => a.status === 'COMPLETED').length;
  const inProgressCount = actions.filter(a => a.status === 'IN_PROGRESS' || a.status === 'PLANNED').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
              Advisor Workspace
            </span>
            <span className="text-xs text-slate-400 font-mono">Advisory Firm: {user?.organizationId || 'EcoStrategies Advisory'}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Client Environmental Strategy & Decarbonization Advisory
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Analyze Client Environmental Gaps, Structure Decarbonization Recommendations & Track Action Plan Execution
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Structure Strategy</span>
          </button>
          <button
            onClick={fetchAdvisorData}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition shadow-sm"
            title="Refresh Actions"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Roadmap</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Roadmaps</span>
          <p className="text-3xl font-black text-slate-900 mt-1">{actions.length} Actions</p>
          <p className="text-[11px] text-slate-500 mt-1">Live Database Records</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Identified Gaps</span>
          <p className="text-3xl font-black text-amber-600 mt-1">{gaps.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Audit Findings to Resolve</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Actions Completed</span>
          <p className="text-3xl font-black text-emerald-600 mt-1">{completedCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">{inProgressCount} in execution</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-forest-600 uppercase tracking-wider">Advisory Impact</span>
          <p className="text-3xl font-black text-forest-700 mt-1">-24%</p>
          <p className="text-[11px] text-emerald-600 font-bold mt-1">Projected Scope 1 & 2 Reduction</p>
        </div>
      </div>

      {/* Recommendations Ledger */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Decarbonization Action Strategy Ledger</h2>
            <p className="text-xs text-slate-500">Structured interventions logged to database for client execution</p>
          </div>
          <span className="text-xs font-mono text-slate-400">Advisory Pipeline</span>
        </div>

        {actions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No advisory actions planned. Click "Structure Strategy" to create one.
          </div>
        ) : (
          <div className="space-y-3">
            {actions.map((act) => {
              const aid = act._id || act.id;
              const isCompleted = act.status === 'COMPLETED';
              return (
                <div key={aid} className="p-4 rounded-2xl border border-slate-200 flex items-center justify-between hover:bg-slate-50 transition">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        {act.category || 'Decarbonization'}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-400">{String(aid).slice(-6)}</span>
                      <span className="text-xs text-slate-500">• Due: {act.dueDate || '2026-12-31'}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-900">{act.title}</p>
                    {act.description && (
                      <p className="text-[11px] text-slate-500">{act.description}</p>
                    )}
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                    isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {act.status || 'PLANNED'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Strategy Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Structure Decarbonization Action</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddRecommendation} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Strategic Intervention Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Install Rooftop Solar PV Arrays at Main Facility"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="Energy">Energy Efficiency</option>
                  <option value="Renewable">Renewable Generation</option>
                  <option value="Water">Water Conservation</option>
                  <option value="Waste">Circular Economy & Waste Diversion</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expected Impact / Savings</label>
                <input
                  type="text"
                  value={expectedSavings}
                  onChange={(e) => setExpectedSavings(e.target.value)}
                  placeholder="e.g. 25% reduction in grid electricity, 85 tCO2e avoided"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm mt-2 flex items-center justify-center space-x-2"
              >
                {submitting ? <span>Saving...</span> : <span>Log Action to Client Roadmap</span>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
