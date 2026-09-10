import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useFacilities } from '../context/FacilityContext';
import { ShieldCheck, Trash2, ShieldAlert, Award, FileText } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Compliance() {
  const { token } = useAuth();
  const { facilities, selectedFacilityId, selectedFacilityName } = useFacilities();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [facilityId, setFacilityId] = useState('');
  const [permitName, setPermitName] = useState('');
  const [authority, setAuthority] = useState('');
  const [status, setStatus] = useState('Compliant');
  const [expirationDate, setExpirationDate] = useState('');
  const [violations, setViolations] = useState('');
  const [fines, setFines] = useState('');
  const [penalties, setPenalties] = useState('');
  const [correctiveActions, setCorrectiveActions] = useState('');

  useEffect(() => {
    if (facilities.length > 0) {
      setFacilityId(facilities[0]._id);
    }
  }, [facilities]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/compliance', {
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
  }, [token, selectedFacilityId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/compliance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          facilityId,
          permitName,
          authority,
          status,
          expirationDate,
          violations,
          fines: parseFloat(fines) || 0,
          penalties,
          correctiveActions
        })
      });
      if (res.ok) {
        setPermitName('');
        setAuthority('');
        setExpirationDate('');
        setViolations('');
        setFines('');
        setPenalties('');
        setCorrectiveActions('');
        fetchRecords();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`/api/compliance/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) fetchRecords();
    } catch (err) {
      console.error(err);
    }
  };

  // Calculations
  const total = records.length;
  const compliant = records.filter(r => r.status === 'Compliant').length;
  const nonCompliant = records.filter(r => r.status === 'Non-compliant').length;
  const expiring = records.filter(r => r.status === 'Expiring soon').length;
  const actionRequired = records.filter(r => r.status === 'Corrective action required').length;
  
  const complianceRate = total > 0 ? Math.round((compliant / total) * 100) : 96;

  const pieData = [
    { value: complianceRate },
    { value: 100 - complianceRate }
  ];

  const facilityNames = {};
  facilities.forEach(f => {
    facilityNames[f._id] = f.name;
  });

  return (
    <div className="flex-1 min-h-screen bg-slate-50 pl-64 pb-12">
      <Navbar title={`Environmental Compliance — ${selectedFacilityName}`} />

      <main className="max-w-7xl mx-auto px-8 pt-8 space-y-8">
        
        {/* Compliance dashboard circle */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col items-center justify-center">
            <h3 className="text-sm font-semibold text-slate-500 tracking-wider uppercase mb-2">
              Environmental Compliance Rating
            </h3>
            
            <div className="relative w-40 h-40 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={70}
                    startAngle={220}
                    endAngle={-40}
                    dataKey="value"
                  >
                    <Cell fill="#10b981" />
                    <Cell fill="#e2e8f0" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold text-slate-800">{complianceRate}%</span>
                <span className="text-xs font-bold text-slate-400">Compliant</span>
              </div>
            </div>
            
            <div className="text-center mt-3">
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                ✔️ Level 3 Standard Audit passed
              </span>
            </div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-6 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-fit self-center">
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Compliant</span>
              <p className="text-2xl font-black text-emerald-600 mt-1">{compliant}</p>
            </div>
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Non-Compliant</span>
              <p className="text-2xl font-black text-red-600 mt-1">{nonCompliant}</p>
            </div>
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Expiring soon</span>
              <p className="text-2xl font-black text-amber-600 mt-1">{expiring}</p>
            </div>
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Action required</span>
              <p className="text-2xl font-black text-rose-600 mt-1">{actionRequired}</p>
            </div>
          </div>

        </div>

        {/* Input form & permit directory list */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Submission Form */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-fit">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Register Regulatory Permit</h3>
            
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Target Facility</label>
                <select
                  value={facilityId}
                  onChange={(e) => setFacilityId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-forest-500 mt-1"
                >
                  {facilities.map(f => (
                    <option key={f._id} value={f._id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Permit / License Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hazardous Waste Authorization"
                  value={permitName}
                  onChange={(e) => setPermitName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-forest-500 mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Authority body</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MPCB"
                    value={authority}
                    onChange={(e) => setAuthority(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-forest-500 mt-1"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-forest-500 mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none focus:ring-1 focus:ring-forest-500 mt-1"
                  >
                    <option value="Compliant">Compliant</option>
                    <option value="Non-compliant">Non-compliant</option>
                    <option value="Expiring soon">Expiring soon</option>
                    <option value="Corrective action required">Corrective action required</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Fines / Fees ($)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={fines}
                    onChange={(e) => setFines(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-forest-500 mt-1"
                  />
                </div>
              </div>

              {status !== 'Compliant' && (
                <div className="space-y-3.5 border-t border-slate-100 pt-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Violations noted</label>
                    <input
                      type="text"
                      value={violations}
                      onChange={(e) => setViolations(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-forest-500 mt-1"
                      placeholder="Identify violation clauses"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Penalties / warnings</label>
                    <input
                      type="text"
                      value={penalties}
                      onChange={(e) => setPenalties(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-forest-500 mt-1"
                      placeholder="Local council notices"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Corrective action plan</label>
                    <textarea
                      value={correctiveActions}
                      onChange={(e) => setCorrectiveActions(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-forest-500 mt-1 h-16"
                      placeholder="Resolving milestones..."
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-2 rounded-xl text-xs shadow-sm hover:shadow transition"
              >
                Register Permit
              </button>
            </form>
          </div>

          {/* Table register */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Compliance & Licenses Register</h3>
            
            <div className="space-y-4 overflow-y-auto max-h-[500px]">
              {records.map(permit => (
                <div key={permit._id} className="border border-slate-100 rounded-xl p-4 bg-slate-50 space-y-3.5 hover:shadow-sm transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4.5 w-4.5 text-forest-500" />
                        <span className="text-[11px] text-slate-400 font-bold">
                          {facilityNames[permit.facilityId] || permit.facilityId}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 mt-1">{permit.permitName}</h4>
                      <p className="text-xs text-slate-500 font-semibold">{permit.authority}</p>
                    </div>

                    <div className="flex items-center space-x-2">
                      <select
                        value={permit.status}
                        onChange={(e) => handleUpdateStatus(permit._id, e.target.value)}
                        className={`text-[10px] font-extrabold border rounded-lg px-2 py-0.5 focus:outline-none cursor-pointer ${
                          permit.status === 'Compliant' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          permit.status === 'Expiring soon' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        <option value="Compliant">Compliant</option>
                        <option value="Non-compliant">Non-compliant</option>
                        <option value="Expiring soon">Expiring soon</option>
                        <option value="Corrective action required">Corrective action required</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-y border-slate-200/50 py-2 text-slate-500">
                    <div>
                      <span className="font-semibold text-slate-400 block text-[9px] uppercase">Expiration Date</span>
                      <span className="font-bold text-slate-700">{permit.expirationDate}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-slate-400 block text-[9px] uppercase">Associated Fines</span>
                      <span className="font-bold text-rose-600 font-bold">${permit.fines || 0}</span>
                    </div>
                  </div>

                  {permit.status !== 'Compliant' && (
                    <div className="space-y-1.5 text-xs bg-white p-2.5 rounded-lg border border-slate-150">
                      {permit.violations && <p className="text-slate-500"><strong className="text-slate-700">Violation:</strong> {permit.violations}</p>}
                      {permit.penalties && <p className="text-slate-500"><strong className="text-slate-700">Penalty:</strong> {permit.penalties}</p>}
                      {permit.correctiveActions && <p className="text-slate-500"><strong className="text-slate-700">Corrective Action:</strong> {permit.correctiveActions}</p>}
                    </div>
                  )}
                </div>
              ))}
              {records.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs font-medium">
                  No permits logged.
                </div>
              )}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
