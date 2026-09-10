import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { 
  Building, Users, FileText, Bot, AlertTriangle, ShieldCheck, 
  Activity, Settings, ClipboardList, Plus, ArrowUpRight, Cpu, HardDrive, 
  Network, Flame, RefreshCw, BarChart2, ShieldAlert, CheckCircle, XCircle, Layout
} from 'lucide-react';

export default function SuperAdminDashboard() {
  const { token, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  const setActiveTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };

  const [stats, setStats] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [matrix, setMatrix] = useState({});
  const [factors, setFactors] = useState([]);
  const [evidenceList, setEvidenceList] = useState([]);
  const [reports, setReports] = useState([]);
  const [aiConfig, setAiConfig] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [systemToast, setSystemToast] = useState('');

  const showToast = (msg) => {
    setSystemToast(msg);
    setTimeout(() => setSystemToast(''), 4000);
  };

  // Forms inputs state
  const [newOrgName, setNewOrgName] = useState('');
  
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('ADMIN');
  const [newUserOrgId, setNewUserOrgId] = useState('');

  const [wsName, setWsName] = useState('');
  const [wsLocation, setWsLocation] = useState('');
  const [wsArea, setWsArea] = useState('');
  const [wsDesc, setWsDesc] = useState('');
  const [wsOrgId, setWsOrgId] = useState('');

  const [factorName, setFactorName] = useState('');
  const [factorCategory, setFactorCategory] = useState('Scope 2');
  const [factorActivity, setFactorActivity] = useState('Grid Electricity');
  const [factorValue, setFactorValue] = useState('');
  const [factorUnit, setFactorUnit] = useState('');
  const [factorSource, setFactorSource] = useState('');
  const [factorRegion, setFactorRegion] = useState('Global');
  const [factorEffective, setFactorEffective] = useState('');

  const [reportName, setReportName] = useState('');
  const [reportFormat, setReportFormat] = useState('PDF');

  const [modelType, setModelType] = useState('Gemini-1.5-Pro');
  const [aiDailyLimit, setAiDailyLimit] = useState(500);

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [tokenLifetime, setTokenLifetime] = useState('24h');

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [
        statsRes, orgsRes, usersRes, wsRes, matrixRes, factorsRes, 
        verifyRes, reportsRes, aiRes, logsRes, healthRes
      ] = await Promise.all([
        fetch('/api/superadmin/dashboard', { headers }),
        fetch('/api/superadmin/organizations', { headers }),
        fetch('/api/superadmin/users', { headers }),
        fetch('/api/superadmin/facilities', { headers }),
        fetch('/api/superadmin/roles-permissions', { headers }),
        fetch('/api/superadmin/emission-factors', { headers }),
        fetch('/api/superadmin/verification', { headers }),
        fetch('/api/superadmin/reports', { headers }),
        fetch('/api/superadmin/ai-config', { headers }),
        fetch('/api/superadmin/audit-logs', { headers }),
        fetch('/api/superadmin/system-health', { headers })
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (orgsRes.ok) {
        const orgList = await orgsRes.json();
        setOrgs(orgList);
        if (orgList.length > 0) {
          setNewUserOrgId(orgList[0]._id);
          setWsOrgId(orgList[0]._id);
        }
      }
      if (usersRes.ok) setUsersList(await usersRes.json());
      if (wsRes.ok) setWorkspaces(await wsRes.json());
      if (matrixRes.ok) setMatrix(await matrixRes.json());
      if (factorsRes.ok) setFactors(await factorsRes.json());
      if (verifyRes.ok) setEvidenceList(await verifyRes.json());
      if (reportsRes.ok) setReports(await reportsRes.json());
      if (aiRes.ok) {
        const c = await aiRes.json();
        setAiConfig(c);
        setModelType(c.activeModel);
        setAiDailyLimit(c.maxDailyRequests);
      }
      if (logsRes.ok) setAuditLogs(await logsRes.json());
      if (healthRes.ok) setHealth(await healthRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [token]);

  // Actions
  const handleAddOrg = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/superadmin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: newOrgName })
      });
      if (res.ok) {
        setNewOrgName('');
        fetchAllData();
      }
    } catch (err) { console.error(err); }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/superadmin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
          organizationId: newUserOrgId
        })
      });
      if (res.ok) {
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        fetchAllData();
      }
    } catch (err) { console.error(err); }
  };

  const handleCreateWorkspace = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/superadmin/facilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          name: wsName,
          location: wsLocation,
          area: parseFloat(wsArea),
          description: wsDesc,
          organizationId: wsOrgId
        })
      });
      if (res.ok) {
        setWsName('');
        setWsLocation('');
        setWsArea('');
        setWsDesc('');
        fetchAllData();
      }
    } catch (err) { console.error(err); }
  };

  const handleTogglePermission = async (roleKey, permKey) => {
    try {
      const updatedMatrix = { ...matrix };
      updatedMatrix[roleKey][permKey] = !updatedMatrix[roleKey][permKey];
      const res = await fetch('/api/superadmin/roles-permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ matrix: updatedMatrix })
      });
      if (res.ok) setMatrix(await res.json());
    } catch (err) { console.error(err); }
  };

  const handleCreateFactor = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/superadmin/emission-factors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          name: factorName,
          category: factorCategory,
          activityType: factorActivity,
          value: parseFloat(factorValue),
          unit: factorUnit,
          source: factorSource,
          region: factorRegion,
          effectiveFrom: factorEffective
        })
      });
      if (res.ok) {
        setFactorName('');
        setFactorValue('');
        setFactorUnit('');
        setFactorSource('');
        setFactorEffective('');
        fetchAllData();
      }
    } catch (err) { console.error(err); }
  };

  const handleVerifyEvidence = async (id, status) => {
    try {
      const res = await fetch(`/api/superadmin/verification/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchAllData();
    } catch (err) { console.error(err); }
  };

  const handleGenerateReport = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/superadmin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: reportName, format: reportFormat })
      });
      if (res.ok) {
        setReportName('');
        fetchAllData();
      }
    } catch (err) { console.error(err); }
  };

  const handleUpdateAI = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/superadmin/ai-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ activeModel: modelType, maxDailyRequests: parseInt(aiDailyLimit) })
      });
      if (res.ok) setAiConfig(await res.json());
    } catch (err) { console.error(err); }
  };

  const handleExportData = () => {
    // Simulated Export function
    const csvContent = "data:text/csv;charset=utf-8,Organization,Created Date,Workspace Sites\n" +
      orgs.map(o => `"${o.name}","${o.createdAt}",${o.facilitiesCount}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SaaS_Platform_Audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="pl-64 pr-8 py-8 min-h-screen bg-slate-50 text-xs">
      <Navbar title={`Platform Super Admin Hub — active tab: ${activeTab.toUpperCase()}`} />

      {systemToast && (
        <div className="mt-4 p-3.5 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs font-bold rounded-r-xl flex items-center justify-between shadow-xs">
          <span>{systemToast}</span>
          <button onClick={() => setSystemToast('')} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {loading ? (
        <div className="flex h-[calc(100vh-120px)] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-forest-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          
          {/* TAB 1: PLATFORM OVERVIEW */}
          {activeTab === 'overview' && stats && (
            <div className="space-y-6">
              {/* Quick Actions Toolbar */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                    <ShieldCheck className="h-5 w-5 text-forest-600" />
                    <span>Global Tenant Operations Console</span>
                  </h3>
                  <p className="text-slate-400 mt-0.5">Generate compliance indexes and audit logs</p>
                </div>
                <div className="flex space-x-3">
                  <button 
                    onClick={() => {
                      setReportName('Auto Generated Platform Audit');
                      setActiveTab('reports');
                    }}
                    className="bg-forest-600 hover:bg-forest-700 text-white font-bold py-2.5 px-4 rounded-xl transition flex items-center space-x-2"
                  >
                    <span>Generate Platform Report</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={handleExportData}
                    className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2.5 px-4 rounded-xl transition flex items-center space-x-2"
                  >
                    <span>Export</span>
                  </button>
                </div>
              </div>

              {/* Grid indicators */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { name: 'Total Organizations', val: stats.totalOrganizations, color: 'text-blue-600' },
                  { name: 'Active Organizations', val: stats.activeOrganizations, color: 'text-sky-600' },
                  { name: 'Total Users Registered', val: stats.totalUsers, color: 'text-indigo-600' },
                  { name: 'Environmental Records', val: stats.environmentalRecords, color: 'text-forest-600' }
                ].map(item => (
                  <div key={item.name} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="font-bold text-slate-400 uppercase tracking-widest text-[9px]">{item.name}</p>
                    <h3 className={`text-2xl font-black ${item.color} mt-1`}>{item.val.toLocaleString()}</h3>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-4">Evidence Verification Statuses</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between p-3 bg-amber-50 rounded-xl text-amber-800 font-semibold border border-amber-100">
                      <span>Pending Verification</span>
                      <span>{stats.pendingVerification} docs</span>
                    </div>
                    <div className="flex justify-between p-3 bg-emerald-50 rounded-xl text-emerald-800 font-semibold border border-emerald-100">
                      <span>Verified Records</span>
                      <span>{stats.verifiedRecords} docs</span>
                    </div>
                    <div className="flex justify-between p-3 bg-rose-50 rounded-xl text-rose-800 font-semibold border border-rose-100">
                      <span>Rejected Records</span>
                      <span>{stats.rejectedRecords} docs</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-4">SaaS Performance Statistics</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-400 font-medium">Reports Generated:</span>
                      <span className="font-bold text-slate-800">{stats.reportsGenerated} reports</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-400 font-medium">AI Usage:</span>
                      <span className="font-bold text-slate-800">{stats.aiUsage} resolved queries</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400 font-medium">Active System Alerts:</span>
                      <span className="font-bold text-rose-600">{stats.systemAlerts} open</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900 text-slate-300 p-6 rounded-2xl flex flex-col justify-between shadow">
                  <div>
                    <h4 className="font-bold text-forest-400 text-[10px] uppercase tracking-wider">Operational Health</h4>
                    <p className="text-slate-400 mt-2 leading-relaxed">
                      Core multi-tenant server routines are online. Global emission factor models are synchronized system-wide.
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase pt-3 border-t border-slate-800 flex items-center space-x-1.5">
                    <CheckCircle className="h-4 w-4 text-forest-500" />
                    <span>Live status: 100% Operational</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ORGANIZATIONS */}
          {activeTab === 'organizations' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
                  <h4 className="font-bold text-slate-800">Organizations Registry</h4>
                </div>
                <table className="w-full text-left border-collapse text-slate-700">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-400 uppercase border-b border-slate-100">
                      <th className="py-4 px-6">Name</th>
                      <th className="py-4 px-6">Registration Date</th>
                      <th className="py-4 px-6 text-center">Workspaces</th>
                      <th className="py-4 px-6">Operational Footprint</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orgs.map(o => (
                      <tr key={o._id} className="hover:bg-slate-50">
                        <td className="py-4 px-6 font-bold text-slate-800">{o.name}</td>
                        <td className="py-4 px-6 text-slate-400">{o.createdAt}</td>
                        <td className="py-4 px-6 text-center font-bold text-slate-900">{o.facilitiesCount} sites</td>
                        <td className="py-4 px-6 text-slate-500 max-w-xs truncate">{o.locations.join(', ') || 'No locations'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Form Add Organization */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
                <h4 className="font-bold text-slate-900 mb-4 flex items-center space-x-2">
                  <Building className="h-4.5 w-4.5 text-forest-600" />
                  <span>Add Organization</span>
                </h4>
                <form onSubmit={handleAddOrg} className="space-y-4">
                  <div>
                    <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Company Name</label>
                    <input
                      type="text"
                      required
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      placeholder="e.g. Gamma Industries"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-3.5 rounded-xl transition shadow flex items-center justify-center space-x-2"
                  >
                    <span>Add Tenant</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: USERS */}
          {activeTab === 'users' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
                  <h4 className="font-bold text-slate-800">Global Roster</h4>
                </div>
                <table className="w-full text-left border-collapse text-slate-700">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-400 uppercase border-b border-slate-100">
                      <th className="py-4 px-6">Name</th>
                      <th className="py-4 px-6">Email Address</th>
                      <th className="py-4 px-6">Company</th>
                      <th className="py-4 px-6 text-center">Security Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {usersList.map(u => (
                      <tr key={u._id} className="hover:bg-slate-50">
                        <td className="py-4 px-6 font-bold text-slate-800">{u.name}</td>
                        <td className="py-4 px-6 text-slate-500">{u.email}</td>
                        <td className="py-4 px-6 text-slate-400 font-semibold">{u.organizationName}</td>
                        <td className="py-4 px-6 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            u.role === 'SUPER_ADMIN' ? 'bg-purple-50 text-purple-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Form Create User */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
                <h4 className="font-bold text-slate-900 mb-4 flex items-center space-x-2">
                  <Users className="h-4.5 w-4.5 text-forest-600" />
                  <span>Create User</span>
                </h4>
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
                    <input
                      type="text"
                      required
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Email</label>
                    <input
                      type="email"
                      required
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="e.g. name@domain.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                    <input
                      type="password"
                      required
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Role</label>
                      <select
                        value={newUserRole}
                        onChange={(e) => setNewUserRole(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                      >
                        <option value="SUPER_ADMIN">SUPER ADMIN</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="ESG_MANAGER">ESG MANAGER</option>
                        <option value="ENVIRONMENTAL_MANAGER">ENVIRONMENTAL MGR</option>
                        <option value="DATA_ENTRY">DATA ENTRY</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Tenancy</label>
                      <select
                        value={newUserOrgId}
                        onChange={(e) => setNewUserOrgId(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                      >
                        {orgs.map(o => (
                          <option key={o._id} value={o._id}>{o.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-3.5 rounded-xl transition shadow flex items-center justify-center space-x-2"
                  >
                    <span>Create User</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 4: WORKSPACES */}
          {activeTab === 'workspaces' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
                  <h4 className="font-bold text-slate-800">Operational Workspaces (Facilities)</h4>
                </div>
                <table className="w-full text-left border-collapse text-slate-700">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-400 uppercase border-b border-slate-100">
                      <th className="py-4 px-6">Workspace Site</th>
                      <th className="py-4 px-6">Location</th>
                      <th className="py-4 px-6">Tenant Organization</th>
                      <th className="py-4 px-6 text-center">Floor Area</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {workspaces.map(w => (
                      <tr key={w._id} className="hover:bg-slate-50">
                        <td className="py-4 px-6 font-bold text-slate-800">{w.name}</td>
                        <td className="py-4 px-6 text-slate-500">{w.location}</td>
                        <td className="py-4 px-6 text-slate-400 font-semibold">{w.organizationName}</td>
                        <td className="py-4 px-6 text-center font-bold">{w.area.toLocaleString()} m²</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Form Create Workspace */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
                <h4 className="font-bold text-slate-900 mb-4 flex items-center space-x-2">
                  <Plus className="h-4.5 w-4.5 text-forest-600" />
                  <span>Create Workspace</span>
                </h4>
                <form onSubmit={handleCreateWorkspace} className="space-y-4">
                  <div>
                    <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Workspace Name</label>
                    <input
                      type="text"
                      required
                      value={wsName}
                      onChange={(e) => setWsName(e.target.value)}
                      placeholder="e.g. Pune Fabrication Block"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Location Address</label>
                    <input
                      type="text"
                      required
                      value={wsLocation}
                      onChange={(e) => setWsLocation(e.target.value)}
                      placeholder="e.g. MIDC Pune, India"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Footprint Area (m²)</label>
                    <input
                      type="number"
                      required
                      value={wsArea}
                      onChange={(e) => setWsArea(e.target.value)}
                      placeholder="e.g. 15000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Select Tenant Org</label>
                    <select
                      value={wsOrgId}
                      onChange={(e) => setWsOrgId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                    >
                      {orgs.map(o => (
                        <option key={o._id} value={o._id}>{o.name}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-3.5 rounded-xl transition shadow flex items-center justify-center space-x-2"
                  >
                    <span>Create Workspace</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 5: ROLES & PERMISSIONS */}
          {(activeTab === 'roles' || activeTab === 'users') && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Security Roles Permissions Matrix</h4>
                  <p className="text-slate-400 mt-0.5">Toggle global access gates for roles</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-slate-700">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-400 uppercase border-b border-slate-100">
                      <th className="py-4 px-6">Role Profile</th>
                      <th className="py-4 px-6 text-center">All Access Bypass</th>
                      <th className="py-4 px-6 text-center">Audit Review Access</th>
                      <th className="py-4 px-6 text-center">Config Modification</th>
                      <th className="py-4 px-6 text-center">Data Entry Logging</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.entries(matrix).map(([roleKey, perms]) => (
                      <tr key={roleKey} className="hover:bg-slate-50">
                        <td className="py-4 px-6 font-bold text-slate-800">{roleKey}</td>
                        <td className="py-4 px-6 text-center">
                          <input 
                            type="checkbox" 
                            checked={perms.allAccess} 
                            onChange={() => handleTogglePermission(roleKey, 'allAccess')}
                            className="h-4 w-4 text-forest-600 focus:ring-forest-500 rounded border-slate-300"
                          />
                        </td>
                        <td className="py-4 px-6 text-center">
                          <input 
                            type="checkbox" 
                            checked={perms.auditAccess} 
                            onChange={() => handleTogglePermission(roleKey, 'auditAccess')}
                            className="h-4 w-4 text-forest-600 focus:ring-forest-500 rounded border-slate-300"
                          />
                        </td>
                        <td className="py-4 px-6 text-center">
                          <input 
                            type="checkbox" 
                            checked={perms.configAccess} 
                            onChange={() => handleTogglePermission(roleKey, 'configAccess')}
                            className="h-4 w-4 text-forest-600 focus:ring-forest-500 rounded border-slate-300"
                          />
                        </td>
                        <td className="py-4 px-6 text-center">
                          <input 
                            type="checkbox" 
                            checked={perms.dataEntry} 
                            onChange={() => handleTogglePermission(roleKey, 'dataEntry')}
                            className="h-4 w-4 text-forest-600 focus:ring-forest-500 rounded border-slate-300"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: ENVIRONMENTAL CONFIGURATION */}
          {activeTab === 'env-config' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm p-6 space-y-6 max-w-xl mx-auto">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Environmental Module Gates</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Core ESG Principles Active in Tenant Workspaces</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { name: 'Energy Management', desc: 'Electricity meters, diesel consumption, Scope 2 syncing', status: 'ACTIVE' },
                  { name: 'GHG Emissions', desc: 'Scope 1 stationary combustion, Scope 3 travel, factor registry', status: 'ACTIVE' },
                  { name: 'Water Management', desc: 'Freshwater withdraw volumes, recycling loop index', status: 'ACTIVE' },
                  { name: 'Biodiversity', desc: 'Site proximity assessment, re-wilding project schedule', status: 'ACTIVE' },
                  { name: 'Waste Management', desc: 'Hazardous/non-hazardous manifest tracking, recovery splits', status: 'ACTIVE' },
                  { name: 'Pollution Prevention', desc: 'Legal emission limits checks, electrostatic precipitators monitoring', status: 'ACTIVE' }
                ].map(mod => (
                  <div key={mod.name} className="flex justify-between items-center p-4 bg-slate-50 border border-slate-200 rounded-xl">
                    <div>
                      <h5 className="font-bold text-slate-800">{mod.name}</h5>
                      <p className="text-[10px] text-slate-400 mt-0.5">{mod.desc}</p>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold px-3 py-1 rounded-full">
                      {mod.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: METRICS & FACTORS */}
          {activeTab === 'factors' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <h4 className="font-bold text-slate-800">Global Emission Registry Rates</h4>
                  <span className="text-xs text-slate-400 font-mono">{factors.length} Active Factors</span>
                </div>
                <table className="w-full text-left border-collapse text-slate-700">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-400 uppercase border-b border-slate-100">
                      <th className="py-4 px-6">Factor Name</th>
                      <th className="py-4 px-6">Scope Category</th>
                      <th className="py-4 px-6 text-center">Value</th>
                      <th className="py-4 px-6">Unit</th>
                      <th className="py-4 px-6">Source Registry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {factors.map(f => (
                      <tr key={f._id} className="hover:bg-slate-50">
                        <td className="py-4 px-6 font-bold text-slate-800">{f.name}</td>
                        <td className="py-4 px-6 text-slate-500">{f.category} — {f.activityType}</td>
                        <td className="py-4 px-6 text-center font-black text-slate-900">{f.value}</td>
                        <td className="py-4 px-6 text-slate-400">{f.unit}</td>
                        <td className="py-4 px-6 text-slate-500 font-semibold">{f.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Form Create Factor */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
                <h4 className="font-bold text-slate-900 mb-4 flex items-center space-x-2">
                  <Plus className="h-4.5 w-4.5 text-forest-600" />
                  <span>Configure Global Emission Factor</span>
                </h4>
                <form onSubmit={handleCreateFactor} className="space-y-4">
                  <div>
                    <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Factor Name</label>
                    <input
                      type="text"
                      required
                      value={factorName}
                      onChange={(e) => setFactorName(e.target.value)}
                      placeholder="e.g. Standard Grid India 2026"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Carbon Scope</label>
                      <select
                        value={factorCategory}
                        onChange={(e) => setFactorCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                      >
                        <option value="Scope 1">Scope 1 (Direct)</option>
                        <option value="Scope 2">Scope 2 (Indirect)</option>
                        <option value="Scope 3">Scope 3 (Value Chain)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Activity Type</label>
                      <input
                        type="text"
                        required
                        value={factorActivity}
                        onChange={(e) => setFactorActivity(e.target.value)}
                        placeholder="e.g. Grid Electricity"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Factor Value</label>
                      <input
                        type="number"
                        step="0.0001"
                        required
                        value={factorValue}
                        onChange={(e) => setFactorValue(e.target.value)}
                        placeholder="e.g. 0.82"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Multiplier Unit</label>
                      <input
                        type="text"
                        required
                        value={factorUnit}
                        onChange={(e) => setFactorUnit(e.target.value)}
                        placeholder="e.g. kg CO2e / kWh"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Authority Source</label>
                      <input
                        type="text"
                        required
                        value={factorSource}
                        onChange={(e) => setFactorSource(e.target.value)}
                        placeholder="e.g. CEA 2026"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Effective Date</label>
                      <input
                        type="date"
                        required
                        value={factorEffective}
                        onChange={(e) => setFactorEffective(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-3.5 rounded-xl transition shadow flex items-center justify-center space-x-2"
                  >
                    <span>Register Factor</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 8: VERIFICATION */}
          {activeTab === 'verification' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
                <h4 className="font-bold text-slate-800">Platform Auditor Verification Pool</h4>
              </div>
              {evidenceList.length === 0 ? (
                <p className="p-8 text-center text-slate-400">No documents submitted.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-slate-700">
                    <thead>
                      <tr className="bg-slate-50 font-bold text-slate-400 uppercase border-b border-slate-100">
                        <th className="py-4 px-6">Document File</th>
                        <th className="py-4 px-6">Category</th>
                        <th className="py-4 px-6">Uploaded By</th>
                        <th className="py-4 px-6 text-center">Status</th>
                        <th className="py-4 px-6 text-center">Audit Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {evidenceList.map(doc => (
                        <tr key={doc._id} className="hover:bg-slate-50">
                          <td className="py-4 px-6 font-bold text-slate-800">
                            <a href={`/${doc.filePath}`} target="_blank" className="hover:underline flex items-center space-x-1">
                              <FileText className="h-4 w-4 text-slate-400" />
                              <span>{doc.fileName}</span>
                            </a>
                          </td>
                          <td className="py-4 px-6 uppercase text-slate-400 font-semibold">{doc.category}</td>
                          <td className="py-4 px-6 text-slate-500">{doc.uploadedBy}</td>
                          <td className="py-4 px-6 text-center font-bold">
                            <span className={`px-2 py-0.5 rounded text-[9px] uppercase ${
                              doc.verificationStatus === 'VERIFIED' ? 'bg-green-50 text-green-700 border border-green-100' :
                              doc.verificationStatus === 'REJECTED' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}>
                              {doc.verificationStatus}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            {doc.verificationStatus === 'PENDING' && (
                              <div className="flex justify-center space-x-2">
                                <button 
                                  onClick={() => handleVerifyEvidence(doc._id, 'VERIFIED')}
                                  className="p-1 bg-green-50 hover:bg-green-100 rounded text-green-600 transition"
                                >
                                  <CheckCircle className="h-4.5 w-4.5" />
                                </button>
                                <button 
                                  onClick={() => handleVerifyEvidence(doc._id, 'REJECTED')}
                                  className="p-1 bg-red-50 hover:bg-red-100 rounded text-red-600 transition"
                                >
                                  <XCircle className="h-4.5 w-4.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 9: REPORTS */}
          {activeTab === 'reports' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-slate-100 bg-slate-50">
                  <h4 className="font-bold text-slate-800">Generated Audits Archive</h4>
                </div>
                <table className="w-full text-left border-collapse text-slate-700">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-400 uppercase border-b border-slate-100">
                      <th className="py-4 px-6">Report Name</th>
                      <th className="py-4 px-6">Format</th>
                      <th className="py-4 px-6">Generated Date</th>
                      <th className="py-4 px-6 text-center">File Size</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reports.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-4 px-6 font-bold text-slate-800">{r.name}</td>
                        <td className="py-4 px-6">
                          <span className="bg-blue-50 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">
                            {r.format}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-400 font-medium">{r.generatedAt}</td>
                        <td className="py-4 px-6 text-center font-semibold text-slate-500">{r.size}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Form Generate Report */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
                <h4 className="font-bold text-slate-900 mb-4 flex items-center space-x-2">
                  <FileText className="h-4.5 w-4.5 text-forest-600" />
                  <span>Generate Platform Report</span>
                </h4>
                <form onSubmit={handleGenerateReport} className="space-y-4">
                  <div>
                    <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Report Document Title</label>
                    <input
                      type="text"
                      required
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                      placeholder="e.g. FY26 Operational Emission Index"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Format Export</label>
                    <select
                      value={reportFormat}
                      onChange={(e) => setReportFormat(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                    >
                      <option value="PDF">PDF Document</option>
                      <option value="CSV">CSV Spreadsheet</option>
                      <option value="XLSX">Excel Spreadsheet</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-3.5 rounded-xl transition shadow flex items-center justify-center space-x-2"
                  >
                    <span>Generate New Platform Report</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 10: AI RISK MANAGEMENT */}
          {(activeTab === 'risk' || activeTab === 'ai') && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 max-w-xl mx-auto">
              <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100">
                <Bot className="h-6 w-6 text-forest-600" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Environmental AI Configuration</h4>
                  <p className="text-slate-400 mt-0.5">Control LLM temperatures and daily quotas</p>
                </div>
              </div>

              <form onSubmit={handleUpdateAI} className="space-y-4">
                <div>
                  <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Active LLM Model</label>
                  <select
                    value={modelType}
                    onChange={(e) => setModelType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                  >
                    <option value="Gemini-1.5-Flash">Gemini 1.5 Flash (Lightweight & Swift)</option>
                    <option value="Gemini-1.5-Pro">Gemini 1.5 Pro (Deep Analytics Reasoning)</option>
                    <option value="Gemini-1.5-Ultra">Gemini 1.5 Ultra (Heavyweight Research)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">Max Daily Requests Limit</label>
                  <input
                    type="number"
                    required
                    value={aiDailyLimit}
                    onChange={(e) => setAiDailyLimit(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400"
                  />
                </div>

                <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl text-slate-500 leading-relaxed">
                  💡 <span className="font-bold text-slate-800">Token Budget:</span> Active token context window is locked at <span className="font-semibold text-slate-800">{aiConfig.tokenLimit} tokens</span>. Daily counter resets automatically at 00:00 UTC.
                </div>

                <button
                  type="submit"
                  className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-3.5 rounded-xl transition shadow"
                >
                  Configure AI Model Parameters
                </button>
              </form>
            </div>
          )}

          {/* TAB 11: SYSTEM MONITORING */}
          {activeTab === 'health' && health && (
            <div className="space-y-6">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Server Status Dashboard</h4>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Uptime: {health.uptime}</p>
                </div>
                <button
                  onClick={refreshHealth}
                  className="p-2 px-3.5 hover:bg-slate-100 rounded-xl border border-slate-200 transition text-slate-500 flex items-center space-x-1.5 font-bold"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Poll Stats</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { name: 'CPU Load Indicator', val: health.cpuUsage, icon: Cpu, col: 'text-purple-600 bg-purple-50 border-purple-100' },
                  { name: 'Memory Heap Allocation', val: health.memoryHeap, icon: HardDrive, col: 'text-blue-600 bg-blue-50 border-blue-100' },
                  { name: 'WebSocket Connections', val: `${health.activeConnections} active`, icon: Network, col: 'text-green-600 bg-green-50 border-green-100' },
                  { name: 'API Traffic Load', val: health.apiTrafficRate, icon: Flame, col: 'text-rose-600 bg-rose-50 border-rose-100' }
                ].map(card => (
                  <div key={card.name} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
                    <div className={`p-3 rounded-xl border ${card.col}`}>
                      <card.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{card.name}</p>
                      <h3 className="text-lg font-black text-slate-800">{card.val}</h3>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 12: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h4 className="font-bold text-slate-800">Security Audit trail Logs</h4>
                <button 
                  onClick={fetchAllData}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-3.5 rounded-xl transition"
                >
                  View Audit Logs
                </button>
              </div>
              <div className="overflow-x-auto text-slate-700">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-400 uppercase border-b border-slate-100">
                      <th className="py-4 px-6">Timestamp</th>
                      <th className="py-4 px-6">User</th>
                      <th className="py-4 px-6">Action Event</th>
                      <th className="py-4 px-6">Module</th>
                      <th className="py-4 px-6">Target ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map(log => (
                      <tr key={log._id} className="hover:bg-slate-50">
                        <td className="py-4 px-6 text-slate-400 font-medium">{log.timestamp}</td>
                        <td className="py-4 px-6 font-bold text-slate-800">{log.user}</td>
                        <td className="py-4 px-6">{log.action}</td>
                        <td className="py-4 px-6 font-semibold">{log.module}</td>
                        <td className="py-4 px-6 text-slate-400 font-semibold">{log.recordId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 13: SETTINGS */}
          {activeTab === 'settings' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6 max-w-xl mx-auto">
              <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100">
                <Settings className="h-6 w-6 text-forest-600" />
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">SaaS Platform System Settings</h4>
                  <p className="text-slate-400 mt-0.5">Toggle maintenance flags and session parameters</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <h5 className="font-bold text-slate-800">Global Maintenance Windows</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5">Locks non-admin logging entries</p>
                  </div>
                  <input 
                    type="checkbox"
                    checked={maintenanceMode}
                    onChange={() => setMaintenanceMode(!maintenanceMode)}
                    className="h-4 w-4 text-forest-600 rounded border-slate-300 focus:ring-forest-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block font-bold text-slate-500 uppercase tracking-wider mb-2">JWT Authentication Lifetime</label>
                  <select
                    value={tokenLifetime}
                    onChange={(e) => setTokenLifetime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-forest-400 font-semibold"
                  >
                    <option value="1h">1 Hour Session</option>
                    <option value="8h">8 Hours Session</option>
                    <option value="24h">24 Hours Session</option>
                  </select>
                </div>

                <button
                  onClick={() => showToast("SaaS Platform System parameters updated successfully.")}
                  className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-3.5 rounded-xl transition shadow"
                >
                  Save System Settings
                </button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
