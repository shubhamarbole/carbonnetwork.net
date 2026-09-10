import React, { useState, useEffect } from 'react';
import { 
  Users, BarChart3, Zap, Globe, Droplet, Recycle, 
  Download, Bot, ArrowRight, ShieldCheck, TrendingDown, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AssociationWorkspace() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [healthScore, setHealthScore] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAssociationData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [dashRes, scoreRes] = await Promise.all([
        fetch('/api/environment/dashboard?period=Quarterly&facilityId=all', { headers }),
        fetch('/api/health-score', { headers })
      ]);

      if (dashRes.ok) setDashboardData(await dashRes.json());
      if (scoreRes.ok) setHealthScore(await scoreRes.json());
    } catch (err) {
      console.error('Failed to load association data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAssociationData();
  }, [token]);

  const metrics = dashboardData?.metrics || {
    totalEnergy: 23650,
    totalEmissions: 16.44,
    totalWater: 3150,
    wasteRecyclePct: 100
  };

  const benchmarks = [
    { metric: 'Electricity Intensity (kWh/m²)', industryMedian: '42.5', currentPortfolio: ((metrics.totalEnergy || 23650) / 52000).toFixed(2), unit: 'kWh/m²' },
    { metric: 'GHG Scope 2 Emission Intensity', industryMedian: '0.82', currentPortfolio: '0.69', unit: 'kg CO2e/kWh' },
    { metric: 'Water Recycling Rate', industryMedian: '32.0%', currentPortfolio: `${metrics.waterRecyclePct || 28}%`, unit: '%' },
    { metric: 'Waste Diversion from Landfill', industryMedian: '45.0%', currentPortfolio: `${metrics.wasteRecyclePct || 85}%`, unit: '%' }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Industry Association
            </span>
            <span className="text-xs text-slate-400 font-mono">Alliance: {user?.organizationId || 'Sustainable Manufacturing Alliance'}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Sector-Wide Environmental Benchmarking & Peer Insights
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Aggregated Industry Decarbonization Baselines, Confidential Peer Quartiles & Sector Net-Zero Trajectory
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchAssociationData}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition shadow-sm"
            title="Refresh Benchmarks"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center space-x-1.5 px-3 py-2 bg-forest-600 hover:bg-forest-700 text-white text-xs font-bold rounded-xl transition shadow-sm self-start"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Industry Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alliance Members</span>
          <p className="text-3xl font-black text-slate-900 mt-1">4 Plants</p>
          <p className="text-[11px] text-slate-500 mt-1">Automotive, Pharma, Industrial</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-forest-600 uppercase tracking-wider">Sector Emissions</span>
          <p className="text-3xl font-black text-forest-700 mt-1">
            {metrics.totalEmissions ? `${metrics.totalEmissions.toFixed(1)} t` : '16.4 t'}
          </p>
          <p className="text-[11px] text-emerald-600 font-bold mt-1">-8.2% vs Base Year</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">Total Clean Energy</span>
          <p className="text-3xl font-black text-teal-700 mt-1">
            {metrics.totalEnergy ? `${metrics.totalEnergy.toLocaleString()} kWh` : '23,650 kWh'}
          </p>
          <p className="text-[11px] text-emerald-600 font-bold mt-1">Active Grid Matching</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Sector ESG Grade</span>
          <p className="text-3xl font-black text-blue-700 mt-1">{healthScore?.grade || 'AA'}</p>
          <p className="text-[11px] text-emerald-600 font-bold mt-1">Tier 1 Industry Decarbonization</p>
        </div>
      </div>

      {/* Benchmarking Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Industry Sustainability Decarbonization Benchmarks</h2>
            <p className="text-xs text-slate-500">Live operational data compared against national manufacturing baselines</p>
          </div>
          <span className="text-xs font-mono text-slate-400">ISIC Rev.4 C25</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-y border-slate-100">
              <tr>
                <th className="py-3 px-4">Sustainability Metric</th>
                <th className="py-3 px-4">Industry Median</th>
                <th className="py-3 px-4">Current Aggregated</th>
                <th className="py-3 px-4">Unit</th>
                <th className="py-3 px-4 text-right">Alliance Alignment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {benchmarks.map((b, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition">
                  <td className="py-3.5 px-4 font-bold text-slate-900">{b.metric}</td>
                  <td className="py-3.5 px-4 text-slate-600">{b.industryMedian}</td>
                  <td className="py-3.5 px-4 font-black text-forest-700">{b.currentPortfolio}</td>
                  <td className="py-3.5 px-4 text-slate-500">{b.unit}</td>
                  <td className="py-3.5 px-4 text-right">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                      Top Quartile
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
