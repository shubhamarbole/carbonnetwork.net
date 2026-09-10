import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useFacilities } from '../context/FacilityContext';
import { Plus, Trash2, Truck, ShieldAlert, Award, Star } from 'lucide-react';

export default function SupplyChain() {
  const { token } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [assessed, setAssessed] = useState(false);
  const [emissions, setEmissions] = useState('');
  const [sustainableSourcing, setSustainableSourcing] = useState('');
  const [certifications, setCertifications] = useState('');
  const [violations, setViolations] = useState('0');
  const [waste, setWaste] = useState('');
  const [waterImpact, setWaterImpact] = useState('');
  const [riskLevel, setRiskLevel] = useState('Low');

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/supply-chain', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [token]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/supply-chain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          assessed,
          emissions: parseFloat(emissions) || 0,
          sustainableSourcingPct: parseFloat(sustainableSourcing) || 0,
          certifications,
          violations: parseInt(violations) || 0,
          waste: parseFloat(waste) || 0,
          waterImpact: parseFloat(waterImpact) || 0,
          riskLevel
        })
      });
      if (res.ok) {
        setName('');
        setAssessed(false);
        setEmissions('');
        setSustainableSourcing('');
        setCertifications('');
        setViolations('0');
        setWaste('');
        setWaterImpact('');
        fetchSuppliers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateRisk = async (id, newRisk) => {
    try {
      const res = await fetch(`/api/supply-chain/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ riskLevel: newRisk })
      });
      if (res.ok) fetchSuppliers();
    } catch (err) {
      console.error(err);
    }
  };

  // Calculations
  const totalSuppliers = suppliers.length || 1;
  const assessedCount = suppliers.filter(s => s.assessed).length;
  const assessedPct = (assessedCount / totalSuppliers) * 100;

  const lowRisk = suppliers.filter(s => s.riskLevel === 'Low').length;
  const medRisk = suppliers.filter(s => s.riskLevel === 'Medium').length;
  const highRisk = suppliers.filter(s => s.riskLevel === 'High').length;

  return (
    <div className="flex-1 min-h-screen bg-slate-50 pl-64 pb-12">
      <Navbar title="Supplier Environmental Assessments" />

      <main className="max-w-7xl mx-auto px-8 pt-8 space-y-8">
        
        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-indigo-50 rounded-xl">
              <Truck className="h-6 w-6 text-indigo-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Suppliers Assessed %</p>
              <p className="text-xl font-black text-slate-800">{assessedPct.toFixed(0)}% Assessed</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-emerald-50 rounded-xl">
              <Star className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Low Risk Suppliers</p>
              <p className="text-xl font-black text-emerald-600">{lowRisk} Partners</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-amber-50 rounded-xl">
              <ShieldAlert className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase">Medium Risk</p>
              <p className="text-xl font-black text-amber-600">{medRisk} Partners</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-red-50 rounded-xl">
              <ShieldAlert className="h-6 w-6 text-red-500 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-4<0 uppercase">High Risk (Violators)</p>
              <p className="text-xl font-black text-red-600">{highRisk} Partners</p>
            </div>
          </div>
        </div>

        {/* Input and directory list */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Submission Form */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-fit">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Register Supplier Profile</h3>
            
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Supplier Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aditya Metal Works"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-forest-500 mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Audit Assessed?</label>
                  <div className="flex items-center h-10 mt-1">
                    <input
                      type="checkbox"
                      id="assessed"
                      checked={assessed}
                      onChange={(e) => setAssessed(e.target.checked)}
                      className="h-4 w-4 text-forest-600 border-slate-300 rounded focus:ring-forest-500 cursor-pointer"
                    />
                    <label htmlFor="assessed" className="ml-2 text-xs text-slate-600 cursor-pointer select-none">
                      Yes, Audited
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Initial Risk Rating</label>
                  <select
                    value={riskLevel}
                    onChange={(e) => setRiskLevel(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-forest-500 mt-1"
                  >
                    <option value="Low">Low Risk</option>
                    <option value="Medium">Medium Risk</option>
                    <option value="High">High Risk</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Scope 1/2 emissions (tCO2e)</label>
                  <input
                    type="number"
                    placeholder="e.g. 450"
                    value={emissions}
                    onChange={(e) => setEmissions(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-forest-500 mt-1"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Sustainable Material %</label>
                  <input
                    type="number"
                    placeholder="e.g. 85"
                    value={sustainableSourcing}
                    onChange={(e) => setSustainableSourcing(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-forest-500 mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Environmental Certifications</label>
                <input
                  type="text"
                  placeholder="e.g. ISO 14001, FSC Certified"
                  value={certifications}
                  onChange={(e) => setCertifications(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-forest-500 mt-1"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Violations</label>
                  <input
                    type="number"
                    value={violations}
                    onChange={(e) => setViolations(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-forest-500 mt-1"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Waste (t)</label>
                  <input
                    type="number"
                    placeholder="15"
                    value={waste}
                    onChange={(e) => setWaste(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-forest-500 mt-1"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Water (m³)</label>
                  <input
                    type="number"
                    placeholder="1200"
                    value={waterImpact}
                    onChange={(e) => setWaterImpact(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-forest-500 mt-1"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-2 rounded-xl text-xs shadow-sm hover:shadow transition"
              >
                Register Supplier
              </button>
            </form>
          </div>

          {/* Directory Grid/Table */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Partner Sourcing Directory</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase">
                    <th className="py-2.5">Supplier Partner</th>
                    <th>Disclosure</th>
                    <th>Emissions</th>
                    <th>Certifications</th>
                    <th>sustainable sourcing</th>
                    <th>Risk Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {suppliers.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 font-bold text-slate-800">{s.name}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.assessed ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {s.assessed ? 'Audited' : 'Pending disclosure'}
                        </span>
                      </td>
                      <td className="text-slate-600">{s.assessed ? `${s.emissions.toLocaleString()} tCO2e` : 'N/A'}</td>
                      <td className="text-slate-500 max-w-[120px] truncate">{s.certifications || 'None'}</td>
                      <td className="font-bold text-slate-800">{s.sustainableSourcingPct}%</td>
                      <td>
                        <select
                          value={s.riskLevel}
                          onChange={(e) => handleUpdateRisk(s._id, e.target.value)}
                          className={`text-[10px] font-extrabold border rounded-lg px-2 py-0.5 focus:outline-none cursor-pointer ${
                            s.riskLevel === 'High' ? 'bg-red-50 text-red-700 border-red-200' :
                            s.riskLevel === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          <option value="Low">Low Risk</option>
                          <option value="Medium">Medium Risk</option>
                          <option value="High">High Risk</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {suppliers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                        No suppliers registered.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
