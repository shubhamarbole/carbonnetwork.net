import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Target, Plus, Trash2, Edit2, ShieldAlert, CheckCircle, Clock } from 'lucide-react';

export default function Targets() {
  const { token, user } = useAuth();
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [category, setCategory] = useState('GHG Reduction');
  const [name, setName] = useState('');
  const [baselineValue, setBaselineValue] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [baselineYear, setBaselineYear] = useState('2024');
  const [targetYear, setTargetYear] = useState('2030');

  const [editId, setEditId] = useState(null);
  const [editValue, setEditValue] = useState('');

  const fetchTargets = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/environment/targets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTargets(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchTargets();
  }, [token]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/environment/targets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category,
          name,
          baselineValue: parseFloat(baselineValue),
          targetValue: parseFloat(targetValue),
          currentValue: parseFloat(currentValue || baselineValue),
          baselineYear: parseInt(baselineYear, 10),
          targetYear: parseInt(targetYear, 10)
        })
      });
      if (res.ok) {
        setName('');
        setBaselineValue('');
        setTargetValue('');
        setCurrentValue('');
        fetchTargets();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create target');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateCurrentValue = async (t) => {
    try {
      const res = await fetch(`/api/environment/targets/${t._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentValue: parseFloat(editValue)
        })
      });
      if (res.ok) {
        setEditId(null);
        setEditValue('');
        fetchTargets();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTarget = async (id) => {
    if (!window.confirm('Delete this target?')) return;
    try {
      const res = await fetch(`/api/environment/targets/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchTargets();
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACHIEVED':
      case 'ON_TRACK':
      case 'ON TRACK':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'AT_RISK':
      case 'AT RISK':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'OFF_TRACK':
      case 'OFF TRACK':
      default:
        return 'bg-rose-50 text-rose-700 border-rose-200';
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-50 pl-64 pb-12 text-[11px] text-slate-700 font-sans">
      <Navbar title="Sustainability Targets Registry" />

      <main className="max-w-7xl mx-auto px-8 pt-8 space-y-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Form */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-fit">
            <h3 className="text-xs font-bold text-slate-800 mb-4 flex items-center space-x-1.5">
              <Target className="h-4 w-4 text-forest-600" />
              <span>Define ESG Target</span>
            </h3>
            
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase">Target Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none mt-1"
                >
                  <option value="GHG Reduction">GHG Reduction (tCO2e)</option>
                  <option value="Energy Reduction">Energy Reduction (kWh)</option>
                  <option value="Renewable Energy">Renewable Energy (%)</option>
                  <option value="Water Reduction">Water Reduction (m³)</option>
                  <option value="Water Recycling">Water Recycling (%)</option>
                  <option value="Waste Reduction">Waste Reduction (kg)</option>
                  <option value="Waste Recycling">Waste Diversion (%)</option>
                  <option value="Pollution Reduction">Pollution Reduction</option>
                  <option value="Biodiversity Improvement">Biodiversity Restoration</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase">Target Name / Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 25% Reduction in Grid Electricity"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase">Baseline Value</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="1200"
                    value={baselineValue}
                    onChange={(e) => setBaselineValue(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none mt-1"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase">Target Value</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="900"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase">Current</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="1100"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none mt-1"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase">Base Year</label>
                  <input
                    type="number"
                    required
                    value={baselineYear}
                    onChange={(e) => setBaselineYear(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none mt-1"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase">Target Year</label>
                  <input
                    type="number"
                    required
                    value={targetYear}
                    onChange={(e) => setTargetYear(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none mt-1"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-2 rounded-xl text-xs transition"
              >
                Log Target
              </button>
            </form>
          </div>

          {/* Targets list */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-800">Organizational Sustainability Targets ({targets.length})</h3>
              <span className="text-[10px] text-slate-400 font-bold">{targets.filter(t => t.status === 'ACHIEVED').length} Achieved</span>
            </div>
            
            {targets.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Target className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-sm text-slate-700">No Environmental Targets Set</p>
                <p className="text-xs text-slate-400 mt-1">Define reduction and renewable targets for your organization.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {targets.map(t => {
                  const isEditing = editId === t._id;
                  
                  let progressPct = 0;
                  const base = t.baselineValue || 0;
                  const curr = t.currentValue || 0;
                  const tgt = t.targetValue || 0;

                  if (base > tgt) {
                    const gap = base - tgt;
                    const achieved = base - curr;
                    progressPct = gap > 0 ? (achieved / gap) * 100 : 0;
                  } else {
                    const gap = tgt - base;
                    const achieved = curr - base;
                    progressPct = gap > 0 ? (achieved / gap) * 100 : 0;
                  }
                  progressPct = Math.max(0, Math.min(100, Math.round(progressPct)));

                  return (
                    <div key={t._id} className="border border-slate-100 rounded-xl p-4 bg-slate-50 space-y-3 hover:shadow-sm transition">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">{t.category}</span>
                          <h4 className="text-xs font-bold text-slate-800 mt-0.5">{t.name}</h4>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full border ${getStatusColor(t.status)}`}>
                            {t.status || 'ON_TRACK'}
                          </span>
                          <button
                            onClick={() => handleDeleteTarget(t._id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                            title="Delete Target"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-xs text-slate-500 py-1.5 border-y border-slate-200/50 font-medium">
                        <div>
                          <p className="text-[9px] uppercase text-slate-400 font-bold">Baseline ({t.baselineYear})</p>
                          <p className="text-slate-800 font-bold">{t.baselineValue}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase text-slate-400 font-bold">Target ({t.targetYear})</p>
                          <p className="text-slate-800 font-bold">{t.targetValue}</p>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase text-slate-400 font-bold">Current</p>
                          {isEditing ? (
                            <div className="flex items-center space-x-1 mt-0.5">
                              <input
                                type="number"
                                step="any"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-16 border rounded px-1.5 py-0.5 text-xs focus:outline-none"
                              />
                              <button
                                onClick={() => handleUpdateCurrentValue(t)}
                                className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1.5">
                              <p className="text-slate-800 font-bold">{t.currentValue}</p>
                              <button
                                onClick={() => {
                                  setEditId(t._id);
                                  setEditValue(t.currentValue);
                                }}
                                className="text-slate-400 hover:text-forest-600 transition"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-[9px] uppercase text-slate-400 font-bold">Progress</p>
                          <p className="text-forest-600 font-bold">{progressPct}%</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              t.status === 'ACHIEVED' ? 'bg-forest-600' :
                              t.status === 'AT_RISK' ? 'bg-amber-500' :
                              'bg-emerald-500'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </main>
    </div>
  );
}
