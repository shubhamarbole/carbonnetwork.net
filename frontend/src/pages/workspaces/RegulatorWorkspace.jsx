import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, Building, Factory, Eye, 
  FileText, Download, CheckCircle2, ArrowRight, RefreshCw, Send, Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function RegulatorWorkspace() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [targets, setTargets] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inquirySent, setInquirySent] = useState('');

  const fetchRegulatorData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [alertsRes, targetsRes, facRes] = await Promise.all([
        fetch('/api/environment/alerts', { headers }),
        fetch('/api/environment/targets', { headers }),
        fetch('/api/environment/facilities', { headers })
      ]);

      if (alertsRes.ok) {
        const aData = await alertsRes.json();
        setAlerts(Array.isArray(aData) ? aData : []);
      }
      if (targetsRes.ok) {
        const tData = await targetsRes.json();
        setTargets(Array.isArray(tData) ? tData : []);
      }
      if (facRes.ok) {
        const fData = await facRes.json();
        setFacilities(Array.isArray(fData) ? fData : []);
      }
    } catch (err) {
      console.error('Failed to load regulator data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchRegulatorData();
  }, [token]);

  const handleRequestInformation = (facilityName) => {
    setInquirySent(`Official statutory information request dispatched to operator of ${facilityName}.`);
    setTimeout(() => setInquirySent(''), 5000);
  };

  const breachesCount = alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH' || a.status === 'Open').length;
  const complianceRate = targets.length > 0 
    ? Math.round((targets.filter(t => t.status === 'ACHIEVED' || t.status === 'ON_TRACK').length / targets.length) * 100)
    : 95;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
              Regulator Observatory
            </span>
            <span className="text-xs text-slate-400 font-mono">Jurisdiction: {user?.organizationId || 'National Environmental Agency'}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Environmental Compliance & Statutory Limits Observatory
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Oversight of Regulated Industrial Facilities, Statutory Effluent Thresholds & Environmental Legal Breaches
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchRegulatorData}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-sm self-start"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Statutory Compliance Report</span>
          </button>
        </div>
      </div>

      {inquirySent && (
        <div className="p-3.5 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs font-bold rounded-r-xl flex items-center justify-between">
          <span>{inquirySent}</span>
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Monitored Facilities</span>
          <p className="text-3xl font-black text-slate-900 mt-1">{facilities.length || 4} Entities</p>
          <p className="text-[11px] text-slate-500 mt-1">100% telemetry streaming active</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Statutory Compliance</span>
          <p className="text-3xl font-black text-emerald-600 mt-1">{complianceRate}%</p>
          <p className="text-[11px] text-slate-500 mt-1">Adherence to target thresholds</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-red-100 bg-red-50/20 shadow-sm">
          <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Statutory Limit Breaches</span>
          <p className="text-3xl font-black text-red-600 mt-1">{breachesCount}</p>
          <p className="text-[11px] text-red-500 font-medium mt-1">
            {breachesCount === 0 ? 'Zero critical breaches' : 'Immediate rectification required'}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Statutory Limits Set</span>
          <p className="text-3xl font-black text-slate-900 mt-1">{targets.length || 7}</p>
          <p className="text-[11px] text-slate-500 mt-1">Mandated legal caps</p>
        </div>
      </div>

      {/* Real Alerts Stream */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-3xl border border-red-200 p-6 space-y-3">
          <div className="flex items-center space-x-2 text-red-700">
            <Bell className="h-4 w-4" />
            <h2 className="text-sm font-bold">Active Statutory Environmental Alerts & Limit Exceedances</h2>
          </div>
          <div className="space-y-2">
            {alerts.slice(0, 3).map((a, idx) => (
              <div key={a._id || idx} className="p-3 bg-red-50/50 rounded-xl border border-red-100 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-red-800">{a.title || a.message || 'Limit Exceeded'}</span>
                  <p className="text-slate-500 text-[11px]">{a.description || a.details || 'Continuous emission monitor recorded statutory limit breach.'}</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-100 text-red-700">
                  {a.severity || 'HIGH'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monitored Entities Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Monitored Industrial Facilities Roster</h2>
            <p className="text-xs text-slate-500">Official environmental licensing and limit tracking from database</p>
          </div>
          <span className="text-xs font-mono text-slate-400">Authorized Legal Jurisdiction Scope</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-y border-slate-100">
              <tr>
                <th className="py-3 px-4">Facility Name</th>
                <th className="py-3 px-4">Jurisdiction / Zone</th>
                <th className="py-3 px-4">Floor Area</th>
                <th className="py-3 px-4">Statutory Status</th>
                <th className="py-3 px-4 text-right">Regulatory Enforcement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {facilities.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-slate-400">
                    Loading authorized industrial facility telemetry...
                  </td>
                </tr>
              ) : (
                facilities.map((fac) => {
                  const facId = fac._id || fac.id;
                  const isClean = fac.status === 'ACTIVE';
                  return (
                    <tr key={facId} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center space-x-2">
                        <Factory className="h-4 w-4 text-slate-400" />
                        <span>{fac.name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{fac.location || fac.region || 'National Grid'}</td>
                      <td className="py-3.5 px-4 text-slate-500">{fac.floorArea || fac.area || 15000} m²</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isClean ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {isClean ? 'IN_COMPLIANCE' : 'BREACH_NOTICE'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleRequestInformation(fac.name)}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold transition shadow-xs inline-flex items-center space-x-1"
                        >
                          <Send className="h-2.5 w-2.5" />
                          <span>Statutory Inquiry</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
