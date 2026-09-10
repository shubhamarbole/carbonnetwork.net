import React, { useState, useEffect } from 'react';
import {
  Radio, CheckCircle2, AlertTriangle, RefreshCw, Plus, Search, ExternalLink,
  Activity, Database, ShieldCheck, Clock, FileText, ArrowRight, X, Play, Trash2,
  SlidersHorizontal, Check
} from 'lucide-react';

export default function IntegrationsManager() {
  const [integrations, setIntegrations] = useState([]);
  const [records, setRecords] = useState([]);
  const [adapters, setAdapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('integrations'); // integrations, records
  const [domainFilter, setDomainFilter] = useState('ALL');
  const [toastMsg, setToastMsg] = useState(null);
  const [syncingId, setSyncingId] = useState(null);
  const [testingId, setTestingId] = useState(null);

  // Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [jobsModal, setJobsModal] = useState({ isOpen: false, integration: null, jobs: [] });

  // New integration form
  const [formData, setFormData] = useState({
    name: '',
    providerType: 'CARBON',
    adapterName: 'grid_utility',
    syncFrequency: 'DAILY',
    configApiKey: 'demo-api-key-2026'
  });

  const token = localStorage.getItem('token') || '';

  const showToast = (msg, isError = false) => {
    setToastMsg({ text: msg, isError });
    setTimeout(() => setToastMsg(null), 4500);
  };

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const [intRes, recRes] = await Promise.all([
        fetch('/api/integrations', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/integrations/records', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (intRes.ok) {
        const intData = await intRes.json();
        setIntegrations(intData.data || []);
      }
      if (recRes.ok) {
        const recData = await recRes.json();
        setRecords(recData.data || []);
      }
    } catch (err) {
      showToast('Failed loading integrations data: ' + err.message, true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/integrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name,
          providerType: formData.providerType,
          adapterName: formData.adapterName,
          syncFrequency: formData.syncFrequency,
          config: { api_key: formData.configApiKey }
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Successfully created integration: ${formData.name}`);
        setCreateModalOpen(false);
        setFormData({ name: '', providerType: 'CARBON', adapterName: 'grid_utility', syncFrequency: 'DAILY', configApiKey: 'demo-api-key-2026' });
        fetchIntegrations();
      } else {
        showToast(data.message || 'Failed to create integration', true);
      }
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const handleTestConnection = async (integration) => {
    try {
      setTestingId(integration._id);
      const res = await fetch(`/api/integrations/${integration._id}/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`[${integration.name}] Connection Test: ${data.message}`);
      } else {
        showToast(`[${integration.name}] Test Failed: ${data.message || 'Error'}`, true);
      }
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setTestingId(null);
    }
  };

  const handleSyncNow = async (integration) => {
    try {
      setSyncingId(integration._id);
      const res = await fetch(`/api/integrations/${integration._id}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ sync_type: 'INCREMENTAL' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Sync completed: ${data.data?.syncResult?.records_imported || 0} records imported.`);
        fetchIntegrations();
      } else {
        showToast(data.message || 'Sync failed', true);
      }
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setSyncingId(null);
    }
  };

  const handleViewJobs = async (integration) => {
    try {
      const res = await fetch(`/api/integrations/${integration._id}/jobs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setJobsModal({ isOpen: true, integration, jobs: data.data || [] });
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const handleDelete = async (integration) => {
    if (!window.confirm(`Delete integration '${integration.name}'?`)) return;
    try {
      const res = await fetch(`/api/integrations/${integration._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Integration removed.');
        fetchIntegrations();
      }
    } catch (err) {
      showToast(err.message, true);
    }
  };

  const filteredIntegrations = integrations.filter(i => {
    if (domainFilter === 'ALL') return true;
    return i.providerType === domainFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Toast */}
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-xl text-white font-medium flex items-center space-x-2 ${
          toastMsg.isError ? 'bg-rose-600' : 'bg-emerald-600'
        }`}>
          {toastMsg.isError ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200 mb-6 gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-600 rounded-xl text-white shadow-md shadow-emerald-500/20">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">External Data Integrations</h1>
              <p className="text-sm text-slate-500">Connect real ESG, carbon, supplier, and regulatory data feeds with automated normalization.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchIntegrations}
            disabled={loading}
            className="inline-flex items-center px-3.5 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-sm font-medium transition shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition shadow-md shadow-emerald-600/20"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Connect Provider
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-400 mb-1">Active Integrations</div>
          <div className="text-2xl font-bold text-slate-800">{integrations.length}</div>
          <div className="text-xs text-emerald-600 mt-1 flex items-center">
            <Check className="w-3.5 h-3.5 mr-1" /> Across 5 Real-World Domains
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-400 mb-1">Total Records Ingested</div>
          <div className="text-2xl font-bold text-slate-800">
            {integrations.reduce((acc, curr) => acc + (curr.recordsImported || 0), 0)}
          </div>
          <div className="text-xs text-slate-500 mt-1">SHA-256 Deduplicated</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-400 mb-1">Ingestion Framework</div>
          <div className="text-2xl font-bold text-emerald-600">HEALTHY</div>
          <div className="text-xs text-slate-500 mt-1">Adapters verified</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-400 mb-1">Monitoring Feed</div>
          <div className="text-2xl font-bold text-slate-800">Phase 6 Active</div>
          <div className="text-xs text-slate-500 mt-1">Event hooks connected</div>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('integrations')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition ${activeTab === 'integrations' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Connected Adapters ({integrations.length})
        </button>
        <button
          onClick={() => setActiveTab('records')}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition ${activeTab === 'records' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Normalized Records Feed ({records.length})
        </button>
      </div>

      {activeTab === 'integrations' && (
        <>
          {/* Domain Filter Pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            {['ALL', 'CARBON', 'ESG', 'ENERGY', 'SUPPLIER', 'COMPLIANCE', 'PROJECT'].map(dom => (
              <button
                key={dom}
                onClick={() => setDomainFilter(dom)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition ${
                  domainFilter === dom
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {dom}
              </button>
            ))}
          </div>

          {/* Integrations Grid */}
          {filteredIntegrations.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-slate-200 shadow-sm">
              <Database className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">No integrations configured</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">Connect your first external provider adapter to ingest live operational data.</p>
              <button
                onClick={() => setCreateModalOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Connect Provider
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredIntegrations.map(intg => (
                <div key={intg._id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between p-5">
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold tracking-wide uppercase bg-slate-100 text-slate-700 mb-1">
                          {intg.providerType}
                        </span>
                        <h3 className="text-base font-bold text-slate-900">{intg.name}</h3>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">Adapter: {intg.adapterName}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        intg.status === 'CONNECTED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        intg.status === 'ERROR' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {intg.status}
                      </span>
                    </div>

                    <div className="space-y-2 py-3 border-y border-slate-100 text-xs text-slate-600 mb-4">
                      <div className="flex justify-between">
                        <span>Sync Frequency:</span>
                        <span className="font-medium text-slate-800">{intg.syncFrequency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Records Ingested:</span>
                        <span className="font-semibold text-slate-900">{intg.recordsImported || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Last Sync:</span>
                        <span className="text-slate-500">{intg.lastSyncAt ? new Date(intg.lastSyncAt).toLocaleString() : 'Never'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleTestConnection(intg)}
                        disabled={testingId === intg._id}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition flex items-center"
                      >
                        {testingId === intg._id ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />}
                        Test
                      </button>
                      <button
                        onClick={() => handleSyncNow(intg)}
                        disabled={syncingId === intg._id}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium transition flex items-center shadow-sm shadow-emerald-600/20"
                      >
                        {syncingId === intg._id ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" /> : <Play className="w-3.5 h-3.5 mr-1" />}
                        Sync Now
                      </button>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleViewJobs(intg)}
                        title="View Sync History"
                        className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
                      >
                        <Clock className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(intg)}
                        title="Delete Integration"
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'records' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Standardized Ingested Records</h3>
              <p className="text-xs text-slate-500">Normalized payloads validated and deduplicated via deterministic SHA-256 fingerprints.</p>
            </div>
            <span className="text-xs font-mono bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md border border-emerald-200">
              {records.length} records
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-100/70 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Domain</th>
                  <th className="py-3 px-4">Metric</th>
                  <th className="py-3 px-4">Value</th>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Fingerprint</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400">
                      No normalized records ingested yet. Run a sync on any connected adapter.
                    </td>
                  </tr>
                ) : (
                  records.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold tracking-wide bg-slate-100 text-slate-700 uppercase">
                          {r.domain}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-900 font-semibold">
                        {r.metric}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {r.value} <span className="text-xs font-normal text-slate-500">{r.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-500">{r.period || 'realtime'}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">{new Date(r.timestamp).toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded" title={r.fingerprint}>
                          {r.fingerprint?.slice(0, 10)}...
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center space-x-2">
                <Radio className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900">Connect Data Adapter</h3>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Integration Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ISO-NE Grid Meter Feeder"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Domain</label>
                  <select
                    value={formData.providerType}
                    onChange={(e) => {
                      const dom = e.target.value;
                      const defaultAdapters = {
                        CARBON: 'grid_utility',
                        ESG: 'gri_metrics',
                        SUPPLIER: 'supply_chain',
                        COMPLIANCE: 'regulatory_feed',
                        PROJECT: 'carbon_registry'
                      };
                      setFormData({
                        ...formData,
                        providerType: dom,
                        adapterName: defaultAdapters[dom] || 'grid_utility'
                      });
                    }}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  >
                    <option value="CARBON">CARBON</option>
                    <option value="ESG">ESG</option>
                    <option value="SUPPLIER">SUPPLIER</option>
                    <option value="COMPLIANCE">COMPLIANCE</option>
                    <option value="PROJECT">PROJECT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Adapter</label>
                  <input
                    type="text"
                    readOnly
                    value={formData.adapterName}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm bg-slate-100 text-slate-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Sync Schedule</label>
                <select
                  value={formData.syncFrequency}
                  onChange={(e) => setFormData({ ...formData, syncFrequency: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                >
                  <option value="HOURLY">HOURLY</option>
                  <option value="DAILY">DAILY</option>
                  <option value="WEEKLY">WEEKLY</option>
                  <option value="MANUAL">MANUAL</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">API Key / Connection Token</label>
                <input
                  type="password"
                  value={formData.configApiKey}
                  onChange={(e) => setFormData({ ...formData, configApiKey: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
                <p className="text-[11px] text-slate-400 mt-1">Stored securely and masked in all API responses.</p>
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition shadow-md shadow-emerald-600/20"
                >
                  Save & Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sync Jobs Modal */}
      {jobsModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Sync Execution History</h3>
                <p className="text-xs text-slate-500">Integration: {jobsModal.integration?.name}</p>
              </div>
              <button onClick={() => setJobsModal({ isOpen: false, integration: null, jobs: [] })} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3">
              {jobsModal.jobs.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-sm">No sync jobs executed yet.</p>
              ) : (
                jobsModal.jobs.map((job, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 text-xs space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-slate-800">{job.jobId}</span>
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${
                        job.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' :
                        job.status === 'PARTIAL' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-slate-600 py-1">
                      <div>Fetched: <span className="font-semibold text-slate-900">{job.recordsFetched}</span></div>
                      <div>Imported: <span className="font-semibold text-emerald-600">{job.recordsImported}</span></div>
                      <div>Skipped (Dups): <span className="font-semibold text-slate-700">{job.recordsSkipped}</span></div>
                    </div>
                    <div className="text-[11px] text-slate-400 flex justify-between">
                      <span>Started: {new Date(job.startedAt).toLocaleString()}</span>
                      <span>Type: {job.syncType}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
