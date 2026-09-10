import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useFacilities } from '../context/FacilityContext';
import { ShieldAlert, Trash2, ArrowUpRight, HelpCircle, CheckCircle, AlertTriangle, User, Calendar } from 'lucide-react';

export default function ClimateRisk() {
  const { token, user } = useAuth();
  const { facilities, selectedFacilityId, selectedFacilityName } = useFacilities();
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [facilityId, setFacilityId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Flood');
  const [probability, setProbability] = useState(3);
  const [impact, setImpact] = useState(3);
  const [description, setDescription] = useState('');
  const [mitigationPlan, setMitigationPlan] = useState('');
  const [owner, setOwner] = useState('');
  const [deadline, setDeadline] = useState('');

  const categories = ['Flood', 'Drought', 'Extreme Heat', 'Storm', 'Wildfire', 'Water Scarcity', 'Other'];

  const canEdit = user && ['ADMIN', 'ESG_MANAGER', 'ENVIRONMENTAL_MANAGER'].includes(user.role);

  useEffect(() => {
    if (facilities.length > 0) {
      setFacilityId(facilities[0]._id);
    }
  }, [facilities]);

  const fetchRisks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/climate', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const list = await res.json();
        const filtered = selectedFacilityId === 'all'
          ? list
          : list.filter(r => r.facilityId === selectedFacilityId);
        setRisks(filtered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRisks();
  }, [token, selectedFacilityId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    try {
      const res = await fetch('/api/climate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          facilityId,
          name,
          category,
          probability: parseInt(probability),
          impact: parseInt(impact),
          description,
          mitigationPlan,
          owner,
          deadline,
          status: 'Identified'
        })
      });
      if (res.ok) {
        setName('');
        setDescription('');
        setMitigationPlan('');
        setOwner('');
        setDeadline('');
        fetchRisks();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to add climate risk');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    if (!canEdit) return;
    try {
      const res = await fetch(`/api/climate/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchRisks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!canEdit) return;
    if (!window.confirm('Are you sure you want to delete this climate risk analysis record?')) return;
    try {
      const res = await fetch(`/api/climate/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchRisks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getSeverityBadgeClass = (severity) => {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const activeRisks = risks.filter(r => r.status !== 'Mitigated' && r.status !== 'Closed');
  const avgRiskScore = activeRisks.length > 0
    ? (activeRisks.reduce((acc, r) => acc + r.riskScore, 0) / activeRisks.length).toFixed(1)
    : '0.0';

  return (
    <div className="pl-64 pr-8 py-8">
      <Navbar title="Climate Risk Adaptation" />

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 mt-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-orange-50 text-orange-600">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Total Risks Registered</p>
              <h3 className="text-2xl font-bold text-slate-900">{risks.length}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-red-50 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Active (Unmitigated) Risks</p>
              <h3 className="text-2xl font-bold text-slate-900">{activeRisks.length}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-yellow-50 text-yellow-600">
              <HelpCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Avg Risk Score (Unmitigated)</p>
              <h3 className="text-2xl font-bold text-slate-900">{avgRiskScore} <span className="text-xs font-normal text-slate-400">/25</span></h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-green-50 text-green-600">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500">Mitigated / Closed</p>
              <h3 className="text-2xl font-bold text-slate-900">{risks.filter(r => ['Mitigated', 'Closed'].includes(r.status)).length}</h3>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Risks List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h2 className="font-bold text-slate-800">Identified Vulnerabilities & Risks</h2>
              <span className="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-full font-medium">
                Scope: {selectedFacilityName}
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading risk assessments...</div>
            ) : risks.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No climate risks identified or logged for this scope.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {risks.map((risk) => (
                  <div key={risk._id} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getSeverityBadgeClass(risk.severity)}`}>
                            {risk.severity} (Score: {risk.riskScore}/25)
                          </span>
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{risk.category}</span>
                        </div>
                        <h4 className="text-lg font-bold text-slate-900">{risk.name}</h4>
                        <p className="text-sm text-slate-600 mt-2">{risk.description}</p>
                      </div>

                      {canEdit && (
                        <button
                          onClick={() => handleDelete(risk._id)}
                          className="text-slate-400 hover:text-red-600 transition-colors p-1"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      )}
                    </div>

                    <div className="mt-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Mitigation Plan</p>
                      <p className="text-sm text-slate-600 mt-1">{risk.mitigationPlan || 'No formal mitigation plan submitted yet.'}</p>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1.5">
                          <User className="h-4 w-4 text-slate-400" />
                          <span>Owner: <strong>{risk.owner || 'Unassigned'}</strong></span>
                        </div>
                        {risk.deadline && (
                          <div className="flex items-center space-x-1.5">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <span>Deadline: <strong>{risk.deadline}</strong></span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium">Status:</span>
                        {canEdit ? (
                          <select
                            value={risk.status}
                            onChange={(e) => handleUpdateStatus(risk._id, e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-forest-400 outline-none"
                          >
                            <option value="Identified">Identified</option>
                            <option value="Mitigation In Progress">Mitigation In Progress</option>
                            <option value="Mitigated">Mitigated</option>
                            <option value="Closed">Closed</option>
                          </select>
                        ) : (
                          <span className="font-bold uppercase tracking-wider">{risk.status}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Risk Registry Input Form */}
        <div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center space-x-2">
              <ShieldAlert className="h-5 w-5 text-forest-600" />
              <span>Log Vulnerability / Risk</span>
            </h2>

            {!canEdit ? (
              <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl text-sm border border-yellow-100">
                🔒 You do not have permissions to register climate risks. This is limited to <strong>ADMIN</strong>, <strong>ESG_MANAGER</strong>, and <strong>ENVIRONMENTAL_MANAGER</strong> roles.
              </div>
            ) : (
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Target Facility</label>
                  <select
                    value={facilityId}
                    onChange={(e) => setFacilityId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-forest-400 outline-none"
                  >
                    {facilities.map(f => (
                      <option key={f._id} value={f._id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Vulnerability/Risk Title</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Extreme summer drought and cooling tower shutdown"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-forest-400 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-forest-400 outline-none"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Deadline Date</label>
                    <input
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-forest-400 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Probability (1-5)</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      required
                      value={probability}
                      onChange={(e) => setProbability(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-forest-400 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Impact (1-5)</label>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      required
                      value={impact}
                      onChange={(e) => setImpact(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-forest-400 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Risk Owner</label>
                  <input
                    type="text"
                    required
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="e.g. Pune Site Engineering Lead"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-forest-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Risk Description</label>
                  <textarea
                    rows="3"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Details about specific assets threatened or operational exposure..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-forest-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mitigation Action Plan</label>
                  <textarea
                    rows="3"
                    value={mitigationPlan}
                    onChange={(e) => setMitigationPlan(e.target.value)}
                    placeholder="Steps, budgets, and engineering projects to minimize impact or likelihood..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-forest-400 outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-forest-600 hover:bg-forest-700 text-white font-semibold py-3.5 rounded-xl transition-all shadow-sm flex items-center justify-center space-x-2"
                >
                  <span>Submit Assessment</span>
                  <ArrowUpRight className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
