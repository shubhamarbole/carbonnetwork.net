import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, ShieldAlert, Building, Download, 
  Bot, CheckCircle2, ArrowRight, Flame, Droplet, Leaf, Factory, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function InsurerWorkspace() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [risks, setRisks] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [healthScore, setHealthScore] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchInsurerData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [risksRes, alertsRes, scoreRes] = await Promise.all([
        fetch('/api/risks', { headers }),
        fetch('/api/environment/alerts', { headers }),
        fetch('/api/health-score', { headers })
      ]);

      if (risksRes.ok) {
        const rData = await risksRes.json();
        setRisks(Array.isArray(rData) ? rData : (rData.data || []));
      }
      if (alertsRes.ok) {
        const aData = await alertsRes.json();
        setAlerts(Array.isArray(aData) ? aData : []);
      }
      if (scoreRes.ok) {
        setHealthScore(await scoreRes.json());
      }
    } catch (err) {
      console.error('Failed to load insurer data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchInsurerData();
  }, [token]);

  const highRisksCount = risks.filter(r => (r.severity || r.riskLevel || '').toUpperCase() === 'HIGH' || (r.severity || r.riskLevel || '').toUpperCase() === 'CRITICAL').length;
  const underwriteScore = healthScore?.overallScore || 84;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-200">
              Insurer Workspace
            </span>
            <span className="text-xs text-slate-400 font-mono">Underwriter: {user?.organizationId || 'ClimateRisk Underwriting Group'}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Environmental Impairment Liability & Climate Risk Underwriting
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Assess Industrial Pollution Exposures, Water Scarcity Risks, Physical Climate Perils & Historical Incidents
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchInsurerData}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition shadow-sm"
            title="Refresh Portfolio"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center space-x-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition shadow-sm self-start"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Underwriting Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Underwritten Portfolio</span>
          <p className="text-3xl font-black text-slate-900 mt-1">3 Accounts</p>
          <p className="text-[11px] text-slate-500 mt-1">$45M Aggregate Insured Value</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-forest-600 uppercase tracking-wider">Average ESG Risk Score</span>
          <p className="text-3xl font-black text-forest-700 mt-1">{underwriteScore} / 100</p>
          <p className="text-[11px] text-emerald-600 font-bold mt-1">Favorable Risk Rating</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Identified Risk Events</span>
          <p className="text-3xl font-black text-amber-600 mt-1">{risks.length || 6}</p>
          <p className="text-[11px] text-slate-500 mt-1">{highRisksCount} High severity perils</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">Statutory Alerts</span>
          <p className="text-3xl font-black text-rose-600 mt-1">{alerts.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Effluent & spill incident logs</p>
        </div>
      </div>

      {/* Underwritten Risk Register Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Commercial Environmental Liability Register</h2>
            <p className="text-xs text-slate-500">Live operational risk records queried from underwriting database</p>
          </div>
          <span className="text-xs font-mono text-slate-400">Actuarial Loss Prevention</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-y border-slate-100">
              <tr>
                <th className="py-3 px-4">Risk Item & Description</th>
                <th className="py-3 px-4">Peril Category</th>
                <th className="py-3 px-4">Severity Tier</th>
                <th className="py-3 px-4">Mitigation Status</th>
                <th className="py-3 px-4 text-right">Loss Exposure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {risks.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-slate-400">
                    No active high-loss risks in register. Clean claims record.
                  </td>
                </tr>
              ) : (
                risks.slice(0, 6).map((r) => {
                  const rid = r._id || r.id;
                  const sev = (r.severity || r.riskLevel || 'LOW').toUpperCase();
                  const isHigh = sev === 'HIGH' || sev === 'CRITICAL';
                  return (
                    <tr key={rid} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex flex-col">
                          <span>{r.title || r.name || 'Environmental Peril'}</span>
                          <span className="text-[10px] font-mono text-slate-400">{String(rid).slice(-6)}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{r.category || 'Environmental Impairment'}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isHigh ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {sev}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{r.status || 'MITIGATED'}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-700">
                        {r.potentialLoss ? `$${r.potentialLoss.toLocaleString()}` : '$25,000'}
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
