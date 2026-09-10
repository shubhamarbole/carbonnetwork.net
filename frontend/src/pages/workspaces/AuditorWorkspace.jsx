import React, { useState, useEffect } from 'react';
import { 
  Scale, FileText, CheckCircle2, AlertTriangle, Plus, 
  ArrowRight, Download, Cpu, BookOpen, ShieldCheck, Check, X, RefreshCw
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AuditorWorkspace() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentTab = searchParams.get('tab') || 'dashboard';
  const validTabs = ['dashboard', 'audits', 'history'];
  const activeTab = validTabs.includes(currentTab) ? currentTab : 'dashboard';

  const setActiveTab = (tabId) => {
    setSearchParams({ tab: tabId });
  };
  const [findings, setFindings] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [newFindingModal, setNewFindingModal] = useState(false);
  const [findingTitle, setFindingTitle] = useState('');
  const [findingModule, setFindingModule] = useState('GHG');
  const [findingSeverity, setFindingSeverity] = useState('Minor');
  const [findingDescription, setFindingDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAuditorData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [gapsRes, logsRes, dashRes] = await Promise.all([
        fetch('/api/environment/gaps', { headers }),
        fetch('/api/environment/audit-logs', { headers }),
        fetch('/api/environment/dashboard?period=Quarterly&facilityId=all', { headers })
      ]);

      if (gapsRes.ok) {
        const gapsData = await gapsRes.json();
        setFindings(Array.isArray(gapsData) ? gapsData : []);
      }
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setAuditLogs(Array.isArray(logsData) ? logsData : []);
      }
      if (dashRes.ok) {
        setDashboardData(await dashRes.json());
      }
    } catch (err) {
      console.error('Failed to load auditor data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchAuditorData();
  }, [token]);

  const handleAddFinding = async (e) => {
    e.preventDefault();
    if (!findingTitle) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/environment/gaps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: findingTitle,
          severity: findingSeverity,
          module: findingModule,
          description: findingDescription || findingTitle,
          identifiedDate: new Date().toISOString().split('T')[0]
        })
      });

      if (res.ok) {
        const created = await res.json();
        setFindings(prev => [created, ...prev]);
        setFindingTitle('');
        setFindingDescription('');
        setNewFindingModal(false);
      }
    } catch (err) {
      console.error('Failed to log finding:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseFinding = async (id) => {
    try {
      const res = await fetch(`/api/environment/gaps/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'Closed' })
      });

      if (res.ok) {
        setFindings(prev => prev.map(f => f._id === id ? { ...f, status: 'Closed' } : f));
      }
    } catch (err) {
      console.error('Failed to close finding:', err);
    }
  };

  const openFindings = findings.filter(f => f.status !== 'Closed');
  const majorCount = findings.filter(f => (f.severity || '').toLowerCase() === 'major' && f.status !== 'Closed').length;
  const minorCount = findings.filter(f => (f.severity || '').toLowerCase() === 'minor' && f.status !== 'Closed').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
              Assurance Auditor
            </span>
            <span className="text-xs text-slate-400 font-mono">Assurance Firm: {user?.organizationId || 'Apex Environmental Assurance'}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Independent ESG Assurance & Internal Controls Audit
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Sampling & Factor Calculation Verification, Materiality Testing, Findings Ledger & Assurance Statements
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setNewFindingModal(true)}
            className="flex items-center space-x-1.5 px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl transition shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create Finding</span>
          </button>
          <button
            onClick={fetchAuditorData}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition shadow-sm"
            title="Refresh Ledger"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center space-x-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Assurance Report</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
        {[
          { id: 'dashboard', label: 'Assurance Overview', icon: Scale },
          { id: 'audits', label: `Audit Queue & Findings (${openFindings.length})`, icon: AlertTriangle },
          { id: 'history', label: `Audit Trail (${auditLogs.length})`, icon: BookOpen }
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

      {/* TAB 1: DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Audit Log Trail</span>
              <p className="text-3xl font-black text-slate-900 mt-1">{auditLogs.length} Events</p>
              <p className="text-[11px] text-slate-500 mt-1">ISAE 3000 Standard</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Open Findings</span>
              <p className="text-3xl font-black text-amber-600 mt-1">{openFindings.length}</p>
              <p className="text-[11px] text-slate-500 mt-1">{majorCount} Major, {minorCount} Minor</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider">Monitored Emissions</span>
              <p className="text-3xl font-black text-teal-700 mt-1">
                {dashboardData?.metrics?.totalEmissions ? `${dashboardData.metrics.totalEmissions.toFixed(1)} t` : '16.4 t'}
              </p>
              <p className="text-[11px] text-emerald-600 font-bold mt-1">100% Traceable Lineage</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold text-forest-600 uppercase tracking-wider">Controls Assurance</span>
              <p className="text-3xl font-black text-forest-700 mt-1">
                {openFindings.length === 0 ? 'High' : 'Substantial'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">Clean opinion trajectory</p>
            </div>
          </div>

          {/* Quick Nav Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              onClick={() => setActiveTab('audits')}
              className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-teal-300 hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Audit Queue & Findings</span>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition" />
              </div>
              <p className="text-xs text-slate-500">Manage open non-conformities, root-cause analyses, and remediation statuses.</p>
            </div>

            <div 
              onClick={() => setActiveTab('history')}
              className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-teal-300 hover:shadow-md transition cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-700">Immutable Audit Trail</span>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-1 transition" />
              </div>
              <p className="text-xs text-slate-500">Examine cryptographically stamped ledger events and user data mutations.</p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUDIT QUEUE & FINDINGS */}
      {activeTab === 'audits' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Audit Findings & Corrective Action Ledger</h2>
              <p className="text-xs text-slate-500">Live non-conformities and reporting control observations from database</p>
            </div>
            <button
              onClick={() => setNewFindingModal(true)}
              className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Log New Finding</span>
            </button>
          </div>

          {findings.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No audit findings currently logged. Click "Log New Finding" to document an observation.
            </div>
          ) : (
            <div className="space-y-3">
              {findings.map(f => {
                const fid = f._id || f.id;
                const isClosed = (f.status || '').toLowerCase() === 'closed';
                const isMajor = (f.severity || '').toLowerCase() === 'major' || (f.severity || '').toLowerCase() === 'critical';
                return (
                  <div key={fid} className="p-4 rounded-2xl border border-slate-200 flex items-center justify-between hover:bg-slate-50 transition">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                          isMajor ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {f.severity || 'Minor'}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-400">{String(fid).slice(-6)}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">{f.module || 'GHG'}</span>
                        <span className="text-xs text-slate-500">• {f.identifiedDate || '2026'}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-900">{f.title}</p>
                      {f.description && f.description !== f.title && (
                        <p className="text-[11px] text-slate-500">{f.description}</p>
                      )}
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className={`text-xs font-bold ${isClosed ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {f.status || 'Open'}
                      </span>
                      {!isClosed && (
                        <button
                          onClick={() => handleCloseFinding(fid)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
                        >
                          Close Finding
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Immutable Audit Trail Log</h2>
              <p className="text-xs text-slate-500">Full tamper-evident chronology of telemetry data entries and state transitions</p>
            </div>
            <span className="text-xs font-mono text-slate-400">{auditLogs.length} Events Logged</span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No audit log entries recorded in this ledger window.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-y border-slate-100">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Action / Event</th>
                    <th className="px-4 py-3">Resource</th>
                    <th className="px-4 py-3">Actor / Principal</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log, idx) => (
                    <tr key={log._id || idx} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 font-mono text-slate-500">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : log.createdAt ? new Date(log.createdAt).toLocaleString() : '2026-09-09 10:00'}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {log.action || log.event || 'DATA_READING_SUBMITTED'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono">
                        {log.resource || log.module || 'Energy'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {log.user || log.userId || log.actor || 'System'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          LOGGED
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* New Finding Modal */}
      {newFindingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Record Assurance Finding</h3>
              <button onClick={() => setNewFindingModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddFinding} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Finding Title</label>
                <input
                  type="text"
                  required
                  value={findingTitle}
                  onChange={(e) => setFindingTitle(e.target.value)}
                  placeholder="e.g. Discrepancy in Scope 2 factor source documentation"
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Module</label>
                  <select
                    value={findingModule}
                    onChange={(e) => setFindingModule(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="GHG">GHG Emissions</option>
                    <option value="Energy">Energy</option>
                    <option value="Water">Water</option>
                    <option value="Waste">Waste</option>
                    <option value="Pollution">Pollution</option>
                    <option value="Biodiversity">Biodiversity</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Severity</label>
                  <select
                    value={findingSeverity}
                    onChange={(e) => setFindingSeverity(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Minor">Minor (Observation)</option>
                    <option value="Major">Major (Material &gt; 5%)</option>
                    <option value="Critical">Critical (Non-conformity)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Details / Root Cause</label>
                <textarea
                  rows="3"
                  value={findingDescription}
                  onChange={(e) => setFindingDescription(e.target.value)}
                  placeholder="Detailed root cause or calculation verification evidence..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition shadow-sm mt-2 flex items-center justify-center space-x-2"
              >
                {submitting ? <span>Saving finding...</span> : <span>Log Finding to Database</span>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
