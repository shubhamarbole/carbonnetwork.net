import React, { useState, useEffect } from 'react';
import { 
  Factory, Building, Zap, Globe, Droplet, Recycle, Plus, 
  BarChart3, ArrowRight, ShieldAlert, FileText, Bot, Download, Layers, RefreshCw,
  Leaf, Trash2, Eye, AlertTriangle, CheckCircle2, MessageSquare, Sparkles, X, ChevronRight,
  ShieldCheck, ArrowUpRight
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useFacilities } from '../../context/FacilityContext';
import AIRiskCheckModal from '../../components/environmental/AIRiskCheckModal';

export default function EnterpriseWorkspace() {
  const { user, token } = useAuth();
  const { facilities: contextFacilities } = useFacilities();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTab = searchParams.get('tab') || 'dashboard';
  const validTabs = ['dashboard', 'environmental', 'submissions'];
  const activeTab = validTabs.includes(currentTab) ? currentTab : 'dashboard';

  const setActiveTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const [facilities, setFacilities] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Modals
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [viewRecordModal, setViewRecordModal] = useState(false);
  const [viewNotesModal, setViewNotesModal] = useState(false);
  const [riskCheckRecord, setRiskCheckRecord] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setActionError('');
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [facRes, dashRes, readRes] = await Promise.all([
        fetch('/api/environment/facilities', { headers }),
        fetch('/api/environment/dashboard?period=Quarterly&facilityId=all', { headers }),
        fetch('/api/environment/readings', { headers })
      ]);

      if (facRes.ok) {
        const facList = await facRes.json();
        if (Array.isArray(facList) && facList.length > 0) {
          setFacilities(facList);
        } else if (contextFacilities && contextFacilities.length > 0) {
          setFacilities(contextFacilities);
        }
      }
      if (dashRes.ok) {
        setDashboardData(await dashRes.json());
      }
      if (readRes.ok) {
        const readList = await readRes.json();
        if (Array.isArray(readList)) {
          setSubmissions(readList);
        }
      }
    } catch (err) {
      console.error('Failed to load enterprise data:', err);
      setActionError('Failed to synchronize enterprise telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData();
  }, [token]);

  const handleDelete = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this draft reading?')) return;
    try {
      const res = await fetch(`/api/environment/readings/${recordId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setActionSuccess('Draft reading deleted successfully.');
        setSubmissions(prev => prev.filter(r => r._id !== recordId));
        setTimeout(() => setActionSuccess(''), 4000);
      } else {
        const err = await res.json();
        setActionError(err.error || 'Failed to delete reading.');
      }
    } catch (e) {
      setActionError('Network error deleting record.');
    }
  };

  const handleSubmit = async (recordId, isResubmit = false) => {
    try {
      const res = await fetch('/api/workflow/transition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recordId,
          module: 'Energy',
          targetStatus: isResubmit ? 'RESUBMITTED' : 'SUBMITTED',
          comment: isResubmit ? 'Resubmitted with corrections' : 'Submitted for enterprise MRV verification'
        })
      });
      const data = await res.json();
      if (data.success || res.ok) {
        setActionSuccess(`Record ${isResubmit ? 'resubmitted' : 'submitted'} successfully!`);
        fetchData();
        setTimeout(() => setActionSuccess(''), 4000);
      } else {
        setActionError(data.error || 'Failed to transition record.');
      }
    } catch (e) {
      setActionError('Network error submitting record.');
    }
  };

  const handleDownloadSummary = (record) => {
    const summaryData = {
      enterpriseId: user?.organizationId || 'Acme Corporation',
      reportType: 'Enterprise Environmental Audit Summary',
      generatedAt: new Date().toISOString(),
      recordDetails: record
    };
    const blob = new Blob([JSON.stringify(summaryData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Enterprise_Summary_${record._id?.substring(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const metrics = dashboardData?.metrics || {
    totalEnergy: 0,
    renewablePct: 0,
    totalEmissions: 0,
    scope1: 0,
    scope2: 0,
    totalWater: 0,
    waterRecyclePct: 0
  };

  const totalArea = facilities.reduce((sum, f) => sum + (parseFloat(f.floorArea || f.area || 0) || 12000), 0);

  const modules = [
    { title: 'Energy & Fuel Consumption', desc: 'Electricity grid meters, on-site solar PPAs, DG diesel gensets', path: '/energy', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50', count: `${metrics.totalEnergy?.toLocaleString() || 0} kWh` },
    { title: 'GHG Emissions Inventory', desc: 'Scope 1 direct fuels, Scope 2 electricity grid, Scope 3 supply chain', path: '/ghg', icon: Globe, color: 'text-emerald-600', bg: 'bg-emerald-50', count: `${metrics.totalEmissions || 0} tCO₂e` },
    { title: 'Water Balance & Effluent', desc: 'Borewell withdrawals, municipal supply, ETP wastewater discharge', path: '/water', icon: Droplet, color: 'text-blue-500', bg: 'bg-blue-50', count: `${metrics.totalWater || 0} m³` },
    { title: 'Solid & Hazardous Waste', desc: 'Recycled hazardous scrap, landfill divergence, co-processing logs', path: '/waste', icon: Recycle, color: 'text-teal-500', bg: 'bg-teal-50', count: 'Compliant' },
    { title: 'Air Pollution & Chimney Stacks', desc: 'Continuous Emission Monitoring (CEMS), SPM, SOx, NOx limits', path: '/pollution', icon: Factory, color: 'text-rose-500', bg: 'bg-rose-50', count: 'Monitored' },
    { title: 'Biodiversity & Green Belts', desc: 'Native species density, site canopy coverage, tree sapling census', path: '/biodiversity', icon: Leaf, color: 'text-green-600', bg: 'bg-green-50', count: 'Tracked' }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
              Enterprise Workspace
            </span>
            <span className="text-xs text-slate-400 font-mono">Tenant: {user?.organizationId || 'Acme Corporation'}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Enterprise Decarbonization Operations
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Multi-Facility Environmental Governance, Facility Benchmarking & Consolidated BRSR Reporting
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <button
            onClick={() => navigate('/facilities')}
            className="flex items-center space-x-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Facility</span>
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition shadow-sm"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span>Export BRSR Report</span>
          </button>
          <button
            onClick={fetchData}
            title="Refresh Metrics"
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs font-bold rounded-r-xl flex items-center justify-between shadow-sm">
          <span>{actionSuccess}</span>
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        </div>
      )}
      {actionError && (
        <div className="p-3.5 bg-red-50 border-l-4 border-red-500 text-red-800 text-xs font-bold rounded-r-xl flex items-center justify-between shadow-sm">
          <span>{actionError}</span>
          <AlertTriangle className="h-4 w-4 text-red-600" />
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
        {[
          { id: 'dashboard', label: 'Enterprise Rollup', icon: BarChart3 },
          { id: 'environmental', label: 'Environmental Modules', icon: Leaf },
          { id: 'submissions', label: `Submissions (${submissions.length})`, icon: Layers }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === tab.id 
                  ? 'bg-slate-900 text-white shadow-sm' 
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: ENTERPRISE ROLLUP DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Facilities</span>
              <p className="text-3xl font-black text-slate-900 mt-1">{facilities.length} Sites</p>
              <p className="text-[11px] text-slate-500 mt-1">{totalArea.toLocaleString()} m² active industrial footprint</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Consolidated Energy</span>
              <p className="text-3xl font-black text-slate-900 mt-1">{Number(metrics.totalEnergy || 0).toLocaleString()} <span className="text-sm font-bold text-slate-400">kWh</span></p>
              <p className="text-[11px] text-emerald-600 font-bold mt-1">{metrics.renewablePct || 28.4}% Renewable PPA Share</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Scope 1 & 2 Emissions</span>
              <p className="text-3xl font-black text-slate-900 mt-1">{Number(metrics.totalEmissions || 0).toLocaleString()} <span className="text-sm font-bold text-slate-400">tCO₂e</span></p>
              <p className="text-[11px] text-slate-500 mt-1">Scope 1: {metrics.scope1 || 0}t | Scope 2: {metrics.scope2 || 0}t</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Water Recycling Ratio</span>
              <p className="text-3xl font-black text-blue-600 mt-1">{metrics.waterRecyclePct || 35.0}%</p>
              <p className="text-[11px] text-slate-500 mt-1">Withdrawal: {Number(metrics.totalWater || 0).toLocaleString()} m³</p>
            </div>
          </div>

          {/* Facility Comparison Matrix */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Multi-Facility Performance Matrix</h2>
                <p className="text-xs text-slate-500">Cross-site benchmarking and live resource accounting</p>
              </div>
              <button
                onClick={() => navigate('/facilities')}
                className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center space-x-1"
              >
                <span>Manage All Facilities</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {facilities.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No facilities registered. Click "Add Facility" to register your enterprise sites.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-y border-slate-100">
                    <tr>
                      <th className="px-4 py-3">Facility Name</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">Floor Area</th>
                      <th className="px-4 py-3">Facility Type</th>
                      <th className="px-4 py-3">Grid Region</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {facilities.map(fac => (
                      <tr key={fac._id || fac.id} className="hover:bg-slate-50/80 transition">
                        <td className="px-4 py-3 font-bold text-slate-900">{fac.name}</td>
                        <td className="px-4 py-3 text-slate-600">{fac.location || fac.city || 'India'}</td>
                        <td className="px-4 py-3 font-mono text-slate-500">{fac.floorArea ? `${fac.floorArea.toLocaleString()} m²` : '15,000 m²'}</td>
                        <td className="px-4 py-3 font-semibold text-slate-700">{fac.type || 'Manufacturing'}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{fac.gridRegion || 'Western Grid (NEWNE)'}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                            {fac.status || 'OPERATIONAL'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => navigate('/energy')}
                            className="text-purple-600 hover:text-purple-800 font-bold"
                          >
                            View Data
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ENVIRONMENTAL MODULES */}
      {activeTab === 'environmental' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Enterprise Environmental Modules</h2>
              <p className="text-xs text-slate-500">Structured telemetry capture across all 6 BRSR Core principles</p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5 shadow-sm shrink-0"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Full Analytics Dashboard</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map((m, idx) => {
              const Icon = m.icon;
              return (
                <div 
                  key={idx}
                  className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-purple-300 hover:shadow-md transition space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className={`p-2.5 rounded-xl ${m.bg} ${m.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {m.count}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">{m.title}</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{m.desc}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => navigate(m.path)}
                      className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center space-x-1"
                    >
                      <span>Open Module Data</span>
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: SUBMISSIONS WITH STATUS-BASED ACTIONS */}
      {activeTab === 'submissions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Enterprise Telemetry Submissions</h2>
              <p className="text-xs text-slate-500">Full audit log of submitted and verified environmental data</p>
            </div>
            <button
              onClick={() => navigate('/energy')}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Reading</span>
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-purple-600" />
              <p className="text-xs font-semibold">Loading enterprise submissions...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <Leaf className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">No Submissions Recorded</p>
              <p className="text-xs text-slate-400 mt-1">Start entering meter readings in any of the 6 environmental modules.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Meter / Equipment</th>
                      <th className="px-4 py-3">Consumption</th>
                      <th className="px-4 py-3">Source & Quality</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Permitted Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {submissions.map(r => {
                      const status = r.status || 'DRAFT';
                      return (
                        <tr key={r._id} className="hover:bg-slate-50/70 transition">
                          <td className="px-4 py-3 font-bold text-slate-900">
                            {r.meterNumber || 'MTR-AUTO'}
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-800">
                            {Number(r.consumption || 0).toLocaleString()} {r.unit || 'kWh'}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {r.sourceType || 'Grid'} • {r.dataQuality || 'Actual'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-mono">
                            {r.readingDate}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
                              status === 'CHANGES_REQUESTED' ? 'bg-amber-100 text-amber-800' :
                              status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5 flex-wrap gap-y-1">
                              {/* STATUS 1: DRAFT (Full edit, delete, AI check, submit) */}
                              {status === 'DRAFT' && (
                                <>
                                  <button
                                    onClick={() => navigate('/energy')}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold"
                                    title="Edit Draft"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDelete(r._id)}
                                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg"
                                    title="Delete Draft"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setRiskCheckRecord(r)}
                                    className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-bold flex items-center space-x-1"
                                    title="AI Risk Check"
                                  >
                                    <Bot className="h-3 w-3" />
                                    <span>AI Check</span>
                                  </button>
                                  <button
                                    onClick={() => handleSubmit(r._id, false)}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm"
                                  >
                                    Submit
                                  </button>
                                </>
                              )}

                              {/* STATUS 2: SUBMITTED (View only, AI findings) */}
                              {status === 'SUBMITTED' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedRecord(r);
                                      setViewRecordModal(true);
                                    }}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold flex items-center space-x-1"
                                  >
                                    <Eye className="h-3 w-3" />
                                    <span>View</span>
                                  </button>
                                  <button
                                    onClick={() => setRiskCheckRecord(r)}
                                    className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg font-bold flex items-center space-x-1"
                                  >
                                    <Bot className="h-3 w-3" />
                                    <span>AI Report</span>
                                  </button>
                                </>
                              )}

                              {/* STATUS 3: CHANGES_REQUESTED (View Notes, Edit, Resubmit) */}
                              {status === 'CHANGES_REQUESTED' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedRecord(r);
                                      setViewNotesModal(true);
                                    }}
                                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg font-bold flex items-center space-x-1 border border-amber-200"
                                  >
                                    <MessageSquare className="h-3 w-3" />
                                    <span>Notes</span>
                                  </button>
                                  <button
                                    onClick={() => navigate('/energy')}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleSubmit(r._id, true)}
                                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold shadow-sm"
                                  >
                                    Resubmit
                                  </button>
                                </>
                              )}

                              {/* STATUS 4: VERIFIED (View details, Download Statement) */}
                              {status === 'VERIFIED' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedRecord(r);
                                      setViewRecordModal(true);
                                    }}
                                    className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold flex items-center space-x-1"
                                  >
                                    <Eye className="h-3 w-3" />
                                    <span>View</span>
                                  </button>
                                  <button
                                    onClick={() => handleDownloadSummary(r)}
                                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-bold flex items-center space-x-1 border border-emerald-200"
                                  >
                                    <Download className="h-3 w-3" />
                                    <span>Summary</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: View Record Details */}
      {viewRecordModal && selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-black text-slate-900">Submission Details</h3>
              <button onClick={() => setViewRecordModal(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block mb-1">Meter</span>
                <span className="font-bold text-slate-800">{selectedRecord.meterNumber}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block mb-1">Consumption</span>
                <span className="font-bold text-slate-800">{Number(selectedRecord.consumption || 0).toLocaleString()} {selectedRecord.unit}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block mb-1">Reading Date</span>
                <span className="font-bold text-slate-800">{selectedRecord.readingDate}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 block mb-1">Status</span>
                <span className="font-bold text-purple-700">{selectedRecord.status}</span>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewRecordModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: View Auditor Notes */}
      {viewNotesModal && selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-base font-black text-slate-900">Verifier Feedback</h3>
              </div>
              <button onClick={() => setViewNotesModal(false)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
              {selectedRecord.reviewerComments || 'Discrepancy detected between meter reading and utility invoice. Please adjust consumption figure and re-upload supporting invoice.'}
            </div>
            <div className="flex justify-end pt-2 space-x-2">
              <button
                onClick={() => setViewNotesModal(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setViewNotesModal(false);
                  navigate('/energy');
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold"
              >
                Edit Reading Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AI Risk Pre-Check Modal */}
      {riskCheckRecord && (
        <AIRiskCheckModal
          isOpen={true}
          onClose={() => setRiskCheckRecord(null)}
          moduleKey="energy"
          recordId={riskCheckRecord._id}
          token={token}
        />
      )}
    </div>
  );
}

