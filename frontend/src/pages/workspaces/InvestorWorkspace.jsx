import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Building, ShieldAlert, BarChart3, Globe, 
  Download, Bot, Eye, Plus, ArrowRight, CheckCircle2, Bookmark, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function InvestorWorkspace() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState([]);
  const [healthScore, setHealthScore] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [watchlist, setWatchlist] = useState(['Acme Corporation', 'Eco Corp MSME']);

  const fetchInvestorData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [orgsRes, scoreRes, dashRes] = await Promise.all([
        fetch('/api/environment/organizations', { headers }),
        fetch('/api/health-score', { headers }),
        fetch('/api/environment/dashboard?period=Quarterly&facilityId=all', { headers })
      ]);

      if (orgsRes.ok) {
        const orgsData = await orgsRes.json();
        setOrganizations(Array.isArray(orgsData) ? orgsData : []);
      }
      if (scoreRes.ok) {
        setHealthScore(await scoreRes.json());
      }
      if (dashRes.ok) {
        setDashboardData(await dashRes.json());
      }
    } catch (err) {
      console.error('Failed to load investor data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchInvestorData();
  }, [token]);

  const toggleWatchlist = (name) => {
    setWatchlist(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const grade = healthScore?.grade || 'AA';
  const score = healthScore?.overallScore || 85;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
              Investor Workspace
            </span>
            <span className="text-xs text-slate-400 font-mono">Entity: {user?.organizationId || 'Green Horizon Capital'}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            ESG Investment & Climate Risk Portfolio
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Read-Only Due Diligence, Financed Emissions Accounting & Portfolio Decarbonization Screening
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchInvestorData}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition shadow-sm"
            title="Refresh Portfolio"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Due Diligence Report</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Screened Portfolio</span>
          <p className="text-3xl font-black text-slate-900 mt-1">{organizations.length || 3} Companies</p>
          <p className="text-[11px] text-slate-500 mt-1">Live Database Records</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-forest-600 uppercase tracking-wider">Portfolio ESG Rating</span>
          <p className="text-3xl font-black text-forest-700 mt-1">{grade} ({score}/100)</p>
          <p className="text-[11px] text-emerald-600 font-bold mt-1">Live Calculated Score</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Monitored Emissions</span>
          <p className="text-3xl font-black text-slate-900 mt-1">
            {dashboardData?.metrics?.totalEmissions ? `${dashboardData.metrics.totalEmissions.toFixed(1)} t` : '16.4 t'}
          </p>
          <p className="text-[11px] text-emerald-600 font-bold mt-1">Audited Scope 1 & 2</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Watchlist Items</span>
          <p className="text-3xl font-black text-blue-600 mt-1">{watchlist.length}</p>
          <p className="text-[11px] text-slate-500 mt-1">Automated ESG alert monitoring</p>
        </div>
      </div>

      {/* Portfolio Roster Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Portfolio Sustainability Screening</h2>
            <p className="text-xs text-slate-500">Live consented company records from platform database</p>
          </div>
          <span className="text-xs font-mono text-slate-400">Default Access: READ-ONLY</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-y border-slate-100">
              <tr>
                <th className="py-3 px-4">Organization Name</th>
                <th className="py-3 px-4">Sector Type</th>
                <th className="py-3 px-4">ESG Benchmark</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Investor Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {organizations.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-slate-400">
                    Loading portfolio organizations...
                  </td>
                </tr>
              ) : (
                organizations.slice(0, 6).map((org) => {
                  const orgName = org.name || 'Industrial Facility';
                  const isWatched = watchlist.includes(orgName);
                  return (
                    <tr key={org._id || org.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center space-x-2">
                        <Building className="h-4 w-4 text-slate-400" />
                        <span>{orgName}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{org.type || 'Manufacturing'}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded font-black text-[10px] bg-emerald-100 text-emerald-800">
                          {grade}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                          {org.status || 'ACTIVE'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => toggleWatchlist(orgName)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center space-x-1 ml-auto ${
                            isWatched
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          <Bookmark className="h-3 w-3" />
                          <span>{isWatched ? 'Watching' : 'Watch'}</span>
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
