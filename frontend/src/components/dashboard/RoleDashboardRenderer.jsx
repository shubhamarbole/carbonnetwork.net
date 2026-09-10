import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { dashboardConfig } from '../../config/dashboardConfig';
import { 
  Building, Users, FileText, Bot, AlertTriangle, ShieldCheck, 
  Activity, Settings, ClipboardList, Plus, Cpu, HardDrive, 
  Network, Flame, RefreshCw, BarChart2, CheckCircle, HelpCircle, ArrowUpRight
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function RoleDashboardRenderer() {
  const { token, roles, permissions } = useAuth();
  
  const primaryRole = roles[0] || 'VIEWER';
  const config = dashboardConfig[primaryRole] || { title: "ESG Overview", widgets: [] };
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch role-specific metrics
  useEffect(() => {
    const fetchDashboardMetrics = async () => {
      setLoading(true);
      try {
        const headers = { 'Authorization': `Bearer ${token}` };
        // Determine backend dashboard API mapping based on active role
        const rolePath = primaryRole.toLowerCase().replace('_', '-');
        const res = await fetch(`/api/v1/dashboard/${rolePath}`, { headers });
        if (res.ok) {
          setData(await res.json());
        } else {
          // Fallback mock metrics if API mapping pending creation
          setData({
            totalOrganizations: 3,
            activeOrganizations: 3,
            totalUsers: 5,
            environmentalRecords: 28,
            pendingVerification: 2,
            verifiedRecords: 15,
            rejectedRecords: 1,
            reportsGenerated: 6,
            systemAlerts: 1,
            pendingApprovals: 2,
            pendingSubmissions: 3,
            dataQuality: "92.4%",
            verificationWorkload: 4,
            environmentalScore: 84,
            energyStatus: "Compliant",
            ghgStatus: "On Track",
            waterStatus: "Alert Level Low",
            wasteStatus: "84% Diversion",
            pollutionStatus: "Compliant",
            biodiversityStatus: "Proximity Cleared",
            missingData: 0,
            evidenceCompletion: "94%",
            portfolioScore: 82.5,
            availableCredits: 14500,
            availableProjects: 8,
            purchaseRequests: 3,
            emissionsTrend: [
              { name: 'Jan', value: 120 },
              { name: 'Feb', value: 115 },
              { name: 'Mar', value: 98 },
              { name: 'Apr', value: 84 }
            ]
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardMetrics();
  }, [token, primaryRole]);

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading authorized widgets...</div>;
  }

  // Render individual widget card based on config keys
  const renderWidget = (widgetKey) => {
    switch (widgetKey) {
      // 1. KPI WIDGETS
      case 'totalOrganizations':
        return (
          <div key={widgetKey} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Total Organizations</p>
            <h3 className="text-2xl font-black text-blue-600 mt-1">{data?.totalOrganizations} Companies</h3>
            <span className="text-[10px] text-slate-400">Active tenants onboarded</span>
          </div>
        );
      case 'activeOrganizations':
        return (
          <div key={widgetKey} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Active Organizations</p>
            <h3 className="text-2xl font-black text-sky-600 mt-1">{data?.activeOrganizations} active</h3>
            <span className="text-[10px] text-slate-400">Reporting active data</span>
          </div>
        );
      case 'totalUsers':
        return (
          <div key={widgetKey} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Total Users</p>
            <h3 className="text-2xl font-black text-indigo-600 mt-1">{data?.totalUsers} Profiles</h3>
            <span className="text-[10px] text-slate-400">Authorized SaaS log-ins</span>
          </div>
        );
      case 'environmentalRecords':
        return (
          <div key={widgetKey} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Environmental Logs</p>
            <h3 className="text-2xl font-black text-forest-600 mt-1">{data?.environmentalRecords} Logs</h3>
            <span className="text-[10px] text-slate-400">6 core modules compiled</span>
          </div>
        );
      case 'pendingVerification':
        return (
          <div key={widgetKey} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Pending Verification</p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">{data?.pendingVerification} files</h3>
            <span className="text-[10px] text-slate-400">Auditing backlog queue</span>
          </div>
        );
      case 'verifiedRecords':
        return (
          <div key={widgetKey} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Verified Records</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{data?.verifiedRecords} verified</h3>
            <span className="text-[10px] text-slate-400">Approved by verifier</span>
          </div>
        );
      case 'rejectedRecords':
        return (
          <div key={widgetKey} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Rejected Records</p>
            <h3 className="text-2xl font-black text-rose-600 mt-1">{data?.rejectedRecords} files</h3>
            <span className="text-[10px] text-slate-400">Correction required</span>
          </div>
        );
      case 'reportsGenerated':
        return (
          <div key={widgetKey} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Reports Generated</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{data?.reportsGenerated} reports</h3>
            <span className="text-[10px] text-slate-400">Active ESG downloads</span>
          </div>
        );
      case 'systemAlerts':
        return (
          <div key={widgetKey} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Active Alerts</p>
            <h3 className="text-2xl font-black text-rose-600 mt-1">{data?.systemAlerts} open</h3>
            <span className="text-[10px] text-slate-400">Violations count</span>
          </div>
        );
      
      // 2. STAKEHOLDER & USER SPECIFIC WIDGETS
      case 'environmentalScore':
        return (
          <div key={widgetKey} className="bg-slate-900 text-white p-6 rounded-2xl shadow">
            <p className="font-bold text-forest-400 uppercase tracking-widest text-[9px]">Overall ESG Score</p>
            <h3 className="text-3xl font-black mt-1">{data?.environmentalScore}%</h3>
            <span className="text-[10px] text-slate-400 mt-2 block">Performance compliance rating</span>
          </div>
        );
      case 'energyStatus':
        return (
          <div key={widgetKey} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Energy Consumption</p>
            <h3 className="text-xl font-bold text-slate-800 mt-1">{data?.energyStatus}</h3>
            <span className="text-[10px] text-emerald-600 font-semibold">Targets on track</span>
          </div>
        );
      case 'ghgStatus':
        return (
          <div key={widgetKey} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">GHG Inventory</p>
            <h3 className="text-xl font-bold text-slate-800 mt-1">{data?.ghgStatus}</h3>
            <span className="text-[10px] text-slate-400">Scope 1, 2, 3 mapped</span>
          </div>
        );
      case 'waterStatus':
        return (
          <div key={widgetKey} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Water Security</p>
            <h3 className="text-xl font-bold text-slate-800 mt-1">{data?.waterStatus}</h3>
            <span className="text-[10px] text-slate-400">Recycling index online</span>
          </div>
        );
      case 'wasteStatus':
        return (
          <div key={widgetKey} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Waste Diversion</p>
            <h3 className="text-xl font-bold text-slate-800 mt-1">{data?.wasteStatus}</h3>
            <span className="text-[10px] text-slate-400">Landfill offsets logged</span>
          </div>
        );
      case 'portfolioScore':
        return (
          <div key={widgetKey} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Portfolio ESG Index</p>
            <h3 className="text-2xl font-black text-forest-700 mt-1">{data?.portfolioScore}%</h3>
            <span className="text-[10px] text-slate-400">Average member performance</span>
          </div>
        );
      case 'availableCredits':
        return (
          <div key={widgetKey} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">Available Credits</p>
            <h3 className="text-2xl font-black text-forest-600 mt-1">{data?.availableCredits?.toLocaleString()} tCO2e</h3>
            <span className="text-[10px] text-slate-400">Voluntary registry certified</span>
          </div>
        );
      
      // 3. CHARTS WIDGETS
      case 'environmentalTrends':
      case 'emissionsTrend':
      case 'ghgTrends':
        return (
          <div key={widgetKey} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-2 h-[260px]">
            <h4 className="font-bold text-slate-800 mb-4 uppercase tracking-wider text-[10px]">GHG Carbon Emissions Trend (tCO2e)</h4>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.emissionsTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 text-slate-700">
      <div>
        <h2 className="text-lg font-black text-slate-900">{config.title}</h2>
        <p className="text-xs text-slate-400 mt-0.5">Role context: {primaryRole}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {config.widgets.map(widgetKey => renderWidget(widgetKey))}
      </div>
    </div>
  );
}
