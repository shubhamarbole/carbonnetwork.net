import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useFacilities } from '../context/FacilityContext';
import { Factory, Plus, MapPin, Ruler, FileText, ArrowUpRight } from 'lucide-react';

export default function Facilities() {
  const { token, user } = useAuth();
  const { facilities, refreshFacilities } = useFacilities();
  
  // Form states
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [area, setArea] = useState('');
  const [description, setDescription] = useState('');

  const isAdminOrEsgMgr = user && ['ADMIN', 'ESG_MANAGER', 'ENTERPRISE', 'SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(user.role);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!isAdminOrEsgMgr) return;
    try {
      const res = await fetch('/api/facilities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          location,
          area: parseFloat(area),
          description
        })
      });
      if (res.ok) {
        setName('');
        setLocation('');
        setArea('');
        setDescription('');
        refreshFacilities(); // refresh global dropdown context
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to register facility');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="pl-64 pr-8 py-8 min-h-screen bg-slate-50">
      <Navbar title="Facility & Site Boundary Settings" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        {/* Facilities list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Operational Boundary Sites</h3>
              <span className="text-xs bg-slate-200 text-slate-700 px-3 py-1 rounded-full font-bold">
                {facilities.length} Registered
              </span>
            </div>

            {facilities.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">No facilities registered. Register your first site to begin logging environmental ESG data.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {facilities.map((f) => (
                  <div key={f._id} className="p-6 hover:bg-slate-50 transition-colors flex items-start gap-4">
                    <div className="p-3 bg-forest-50 text-forest-600 rounded-xl border border-forest-100">
                      <Factory className="h-5 w-5" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <h4 className="text-sm font-bold text-slate-800">{f.name}</h4>
                      <p className="text-xs text-slate-500 flex items-center space-x-1">
                        <MapPin className="h-3.5 w-3.5" />
                        <span>{f.location}</span>
                      </p>
                      {f.area > 0 && (
                        <p className="text-xs text-slate-400 flex items-center space-x-1">
                          <Ruler className="h-3.5 w-3.5" />
                          <span>{f.area.toLocaleString()} m² facility footprint</span>
                        </p>
                      )}
                      {f.description && (
                        <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-2 italic">
                          "{f.description}"
                        </p>
                      )}
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
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center space-x-2">
              <Plus className="h-4.5 w-4.5 text-forest-600" />
              <span>Register New Plant / Site</span>
            </h3>

            {!isAdminOrEsgMgr ? (
              <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl text-xs border border-yellow-100">
                🔒 Access Restricted: Requires Organization Admin permissions.
              </div>
            ) : (
              <form onSubmit={handleAdd} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Facility Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Pune Assembly Unit-B"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Location Address</label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. MIDC Phase II, Pune"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Total Floor Area (m²)</label>
                  <input
                    type="number"
                    required
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. 15000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe processes run at this site..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400 h-20"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-3.5 rounded-xl transition shadow flex items-center justify-center space-x-2"
                >
                  <span>Register Site Boundary</span>
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
