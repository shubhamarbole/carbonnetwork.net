import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { AlertOctagon, HelpCircle, ArrowUpRight, CheckCircle2, Check, Trash2, Plus, ShieldAlert } from 'lucide-react';

export default function Gaps() {
  const { token, user } = useAuth();
  const [gaps, setGaps] = useState([]);
  const [completenessData, setCompletenessData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [gapTitle, setGapTitle] = useState('');
  const [category, setCategory] = useState('Energy');
  const [severity, setSeverity] = useState('MEDIUM');
  const [whyItMatters, setWhyItMatters] = useState('');
  const [recommendedAction, setRecommendedAction] = useState('');
  const [owner, setOwner] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const categories = ['Energy', 'GHG', 'Water', 'Biodiversity', 'Waste', 'Pollution'];
  const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

  const fetchAll = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [gapsRes, compRes] = await Promise.all([
        fetch('/api/environment/gaps', { headers }),
        fetch('/api/environment/completeness', { headers })
      ]);

      if (gapsRes.ok) setGaps(await gapsRes.json());
      if (compRes.ok) setCompletenessData(await compRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAll();
  }, [token]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/environment/gaps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category,
          gapTitle,
          severity,
          whyItMatters,
          recommendedAction,
          owner: owner || user.email,
          targetDate,
          status: 'Open'
        })
      });
      if (res.ok) {
        setGapTitle('');
        setWhyItMatters('');
        setRecommendedAction('');
        setOwner('');
        setTargetDate('');
        fetchAll();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to submit gap');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Open' ? 'Closed' : 'Open';
    try {
      const res = await fetch(`/api/environment/gaps/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) fetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this gap entry?')) return;
    try {
      const res = await fetch(`/api/environment/gaps/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  const missingItems = completenessData?.missingItems || [];

  return (
    <div className="pl-64 pr-8 py-8 min-h-screen bg-slate-50 text-[11px] text-slate-700 font-sans">
      <Navbar title="Environmental Gap Analysis & Completeness Deficits" />

      {/* Top Automatic Deficit Warning */}
      {missingItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-amber-900 text-xs flex items-center space-x-1.5">
              <AlertOctagon className="h-4 w-4 text-amber-600" />
              <span>Real-Time Reporting Gaps & Evidence Deficits</span>
            </h4>
            <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2.5 py-0.5 rounded-full">
              {missingItems.length} Requirements Missing
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {missingItems.map((item, idx) => (
              <div key={idx} className="bg-white p-3 rounded-xl border border-amber-200 flex justify-between items-center">
                <div>
                  <span className="bg-amber-50 text-amber-800 text-[8px] font-bold px-1.5 py-0.2 rounded uppercase">{item.module}</span>
                  <p className="font-bold text-slate-800 text-[10px] mt-0.5">{item.issue}</p>
                </div>
                <a href={item.link} className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[9px] px-2.5 py-1 rounded-md transition shrink-0 ml-2">
                  Resolve
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Table of gaps */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-xs">Logged Compliance & Operational Gaps</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Identified weak areas requiring remediation</p>
              </div>
              <span className="text-[10px] bg-slate-200 text-slate-700 px-3 py-1 rounded-full font-bold">
                {gaps.filter(g => g.status === 'Open').length} Open
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400">Loading gaps list...</div>
            ) : gaps.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <CheckCircle2 className="h-8 w-8 text-forest-500 mx-auto mb-2" />
                <p className="font-bold text-sm text-slate-700">No Operational Gaps Logged</p>
                <p className="text-xs text-slate-400 mt-1">Systems and disclosure policies are fully aligned.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {gaps.map(g => (
                  <div key={g._id} className="p-5 hover:bg-slate-50 transition-colors flex justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                          g.severity === 'CRITICAL' ? 'bg-red-50 text-red-700 border border-red-200' :
                          g.severity === 'HIGH' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {g.severity}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">{g.category}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800">{g.gapTitle}</h4>
                      <p className="text-slate-500 text-[10px]"><span className="font-semibold text-slate-700">Why It Matters:</span> {g.whyItMatters}</p>
                      {g.recommendedAction && (
                        <p className="text-[10px] text-forest-600 font-semibold bg-forest-50 p-1.5 rounded-lg border border-forest-100 w-fit">
                          Recommendation: {g.recommendedAction}
                        </p>
                      )}
                      <div className="flex space-x-4 pt-1 text-[9px] text-slate-400 font-bold">
                        <span>OWNER: {g.owner}</span>
                        {g.targetDate && <span>TARGET: {g.targetDate}</span>}
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-between shrink-0 space-y-2">
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        g.status === 'Open' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {g.status}
                      </span>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleToggleStatus(g._id, g.status)}
                          className={`text-[9px] font-bold px-2 py-1 rounded-md transition ${
                            g.status === 'Open' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {g.status === 'Open' ? 'Mark Resolved' : 'Reopen'}
                        </button>
                        <button
                          onClick={() => handleDelete(g._id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition"
                          title="Delete Gap"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Input Form */}
        <div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-6">
            <h3 className="text-xs font-bold text-slate-900 mb-4 flex items-center space-x-1.5">
              <ShieldAlert className="h-4 w-4 text-forest-600" />
              <span>Log Sustainability Gap</span>
            </h3>

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Gap Title</label>
                <input
                  type="text"
                  required
                  value={gapTitle}
                  onChange={(e) => setGapTitle(e.target.value)}
                  placeholder="e.g. Missing Scope 3 freight emissions factor"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Why It Matters</label>
                <textarea
                  required
                  value={whyItMatters}
                  onChange={(e) => setWhyItMatters(e.target.value)}
                  placeholder="Explain why this gap impacts audit readiness..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none h-16"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Recommended Action</label>
                <input
                  type="text"
                  value={recommendedAction}
                  onChange={(e) => setRecommendedAction(e.target.value)}
                  placeholder="e.g. Request DEFRA supplier log sheet"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Severity</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                  >
                    {severities.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Target Date</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-2.5 rounded-xl transition shadow flex items-center justify-center space-x-1.5 text-xs"
              >
                <span>Save Gap Entry</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
