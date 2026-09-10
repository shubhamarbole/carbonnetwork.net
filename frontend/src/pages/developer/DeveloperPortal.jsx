import React, { useState, useEffect } from 'react';
import { 
  Code2, Key, Shield, Radio, Terminal, Copy, Check, RefreshCw, 
  ExternalLink, Layers, AlertTriangle, CheckCircle2, XCircle, 
  Plus, Trash2, Eye, EyeOff, FileText, Zap, Clock, ShieldAlert,
  Server, Cpu, Play, BarChart3, Database, Globe
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const ALL_SCOPES = [
  { id: 'risk:read', label: 'Read Risks', desc: 'Query risk registry and authoritative Phase 2 scores' },
  { id: 'risk:write', label: 'Write Risks', desc: 'Create, update, and categorize enterprise risks' },
  { id: 'prediction:read', label: 'Read Predictions', desc: 'Retrieve ML trajectory forecasts and emerging risks' },
  { id: 'analysis:run', label: 'Run AI Analysis', desc: 'Execute deep LLM evaluations on risk factors' },
  { id: 'agent:run', label: 'Run AI Agent', desc: 'Trigger autonomous Phase 5 agent investigations' },
  { id: 'scenario:read', label: 'Read Scenarios', desc: 'Inspect climate and economic stress scenarios' },
  { id: 'scenario:run', label: 'Run Scenarios', desc: 'Simulate macroeconomic stress tests on risks' },
  { id: 'alert:read', label: 'Read Alerts', desc: 'Inspect active operational early-warning alerts' },
  { id: 'alert:write', label: 'Manage Alerts', desc: 'Acknowledge, resolve, and update operational alerts' },
  { id: 'workflow:read', label: 'Read Workflows', desc: 'Inspect mitigation workflow instances and states' },
  { id: 'executive:read', label: 'Executive Intelligence', desc: 'Access high-level board briefings and portfolio index' }
];

export default function DeveloperPortal() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // overview, apps, credentials, docs, usage, logs, webhooks, sandbox

  // Data states
  const [apps, setApps] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [usageStats, setUsageStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Modals
  const [createAppModalOpen, setCreateAppModalOpen] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [newAppDesc, setNewAppDesc] = useState('');
  const [newAppTier, setNewAppTier] = useState('STANDARD');
  const [newAppSandbox, setNewAppSandbox] = useState(false);
  const [newAppScopes, setNewAppScopes] = useState(['risk:read', 'prediction:read']);

  const [createKeyModalOpen, setCreateKeyModalOpen] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState(['risk:read']);

  // Single-Reveal Secret Modal
  const [secretRevealModal, setSecretRevealModal] = useState({
    isOpen: false,
    title: '',
    secretType: 'API Key',
    secretValue: '',
    copied: false
  });

  // Webhook Modal
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState(['risk.created', 'risk.escalated']);

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 4000);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!');
  };

  // Fetch initial portal data
  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [appsRes, whRes, usageRes, logsRes] = await Promise.all([
        fetch('/api/v1/developer/applications', { headers }),
        fetch('/api/v1/webhooks', { headers }),
        fetch('/api/v1/developer/usage', { headers }),
        fetch('/api/v1/developer/logs', { headers })
      ]);

      if (appsRes.ok) {
        const json = await appsRes.json();
        setApps(json.data || []);
        if (json.data?.length > 0 && !selectedAppId) {
          setSelectedAppId(json.data[0].application_id);
        }
      }
      if (whRes.ok) {
        const json = await whRes.json();
        setWebhooks(json.data || []);
      }
      if (usageRes.ok) {
        const json = await usageRes.json();
        setUsageStats(json.data);
      }
      if (logsRes.ok) {
        const json = await logsRes.json();
        setLogs(json.data || []);
      }
    } catch (err) {
      showToast('Failed to load Developer Platform data.', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Create Developer Application
  const handleCreateApp = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/developer/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newAppName,
          description: newAppDesc,
          rate_limit_tier: newAppTier,
          is_sandbox: newAppSandbox,
          scopes: newAppScopes
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to create application');

      setCreateAppModalOpen(false);
      setNewAppName('');
      setNewAppDesc('');
      fetchData();

      // Reveal client secret ONCE
      setSecretRevealModal({
        isOpen: true,
        title: `Application "${json.data.name}" Created`,
        secretType: 'Client Secret (OAuth 2.0)',
        secretValue: json.data.client_secret,
        copied: false
      });
    } catch (err) {
      showToast(err.message, true);
    }
  };

  // Generate API Credential
  const handleCreateCredential = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/v1/developer/applications/${selectedAppId}/credentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ scopes: newKeyScopes })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to create credential');

      setCreateKeyModalOpen(false);
      fetchData();

      // Reveal API Key ONCE
      setSecretRevealModal({
        isOpen: true,
        title: 'New API Key Generated',
        secretType: 'API Secret Key',
        secretValue: json.data.api_key,
        copied: false
      });
    } catch (err) {
      showToast(err.message, true);
    }
  };

  // Rotate Key
  const handleRotateKey = async (credId) => {
    if (!window.confirm('Are you sure you want to rotate this key? The current key will be revoked immediately.')) return;
    try {
      const res = await fetch(`/api/v1/developer/credentials/${credId}/rotate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Rotation failed');

      fetchData();
      setSecretRevealModal({
        isOpen: true,
        title: 'API Key Rotated Successfully',
        secretType: 'New API Secret Key',
        secretValue: json.data.api_key,
        copied: false
      });
    } catch (err) {
      showToast(err.message, true);
    }
  };

  // Register Webhook
  const handleRegisterWebhook = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          url: webhookUrl,
          events: webhookEvents
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to register webhook');

      setWebhookModalOpen(false);
      setWebhookUrl('');
      fetchData();

      setSecretRevealModal({
        isOpen: true,
        title: 'Webhook Endpoint Registered',
        secretType: 'Webhook HMAC Signing Secret',
        secretValue: json.data.secret,
        copied: false
      });
    } catch (err) {
      showToast(err.message, true);
    }
  };

  // Send Test Ping
  const handleTestPing = async (webhookId) => {
    try {
      const res = await fetch(`/api/v1/webhooks/${webhookId}/test`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Webhook test event queued successfully!');
      } else {
        throw new Error('Test event failed');
      }
    } catch (err) {
      showToast(err.message, true);
    }
  };

  // Reset Sandbox Data
  const handleResetSandbox = async () => {
    if (!window.confirm('Reset all synthetic sandbox records for this workspace?')) return;
    try {
      const res = await fetch('/api/v1/sandbox/reset', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-API-Key': 'esg_test_reset'
        }
      });
      if (res.ok) {
        showToast('Sandbox synthetic data reset complete!');
      } else {
        throw new Error('Sandbox reset failed');
      }
    } catch (err) {
      showToast(err.message, true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 text-sm font-semibold border ${
          toast.isError ? 'bg-rose-950 border-rose-800 text-rose-200' : 'bg-emerald-950 border-emerald-800 text-emerald-200'
        }`}>
          {toast.isError ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Code2 className="w-7 h-7 text-emerald-400" />
              Enterprise Developer API Platform
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              PUBLIC API v1.0.0
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative External Gateway • Programmatic Access to Risks, ML Forecasts, AI Agent & Workflows
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <a
            href="/api/v1/openapi.json"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 transition-colors min-h-[40px]"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>OpenAPI Spec</span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </a>

          <button
            onClick={() => setCreateAppModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 transition-all min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>Create Application</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto no-scrollbar gap-2 border-b border-slate-800 pb-2">
        {[
          { id: 'overview', label: 'Overview', icon: Globe },
          { id: 'apps', label: 'Applications', icon: Layers },
          { id: 'credentials', label: 'API Credentials', icon: Key },
          { id: 'docs', label: 'API Reference', icon: Terminal },
          { id: 'usage', label: 'Usage & AI Quotas', icon: BarChart3 },
          { id: 'logs', label: 'Request Logs', icon: Clock },
          { id: 'webhooks', label: 'Webhooks', icon: Radio },
          { id: 'sandbox', label: 'Sandbox Mode', icon: Database }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap min-h-[40px] ${
              activeTab === tab.id
                ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Status Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Gateway Status</span>
              <div className="flex items-center space-x-2 pt-1">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xl font-bold text-white font-mono">HEALTHY</span>
              </div>
              <p className="text-[11px] text-slate-500">Port 5050 Gateway Online</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Invocations</span>
              <div className="text-xl font-bold text-white font-mono pt-1">
                {usageStats?.total_requests || 0}
              </div>
              <p className="text-[11px] text-slate-500">Avg Latency: {usageStats?.avg_latency_ms || 18}ms</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Active Apps</span>
              <div className="text-xl font-bold text-emerald-400 font-mono pt-1">
                {apps.length}
              </div>
              <p className="text-[11px] text-slate-500">{apps.filter(a => a.is_sandbox).length} Sandbox • {apps.filter(a => !a.is_sandbox).length} Live</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Webhooks Registered</span>
              <div className="text-xl font-bold text-cyan-400 font-mono pt-1">
                {webhooks.length}
              </div>
              <p className="text-[11px] text-slate-500">HMAC SHA-256 Verified</p>
            </div>
          </div>

          {/* Quick-Start Code Samples */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Terminal className="h-4 w-4 text-emerald-400" />
              <span>Quick Start: Authenticated cURL Request</span>
            </h3>
            <div className="relative">
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto">
{`curl -X GET "http://localhost:5050/api/v1/risks" \\
  -H "X-API-Key: esg_live_YOUR_API_KEY" \\
  -H "X-Request-ID: REQ-12345"`}
              </pre>
              <button
                onClick={() => copyToClipboard('curl -X GET "http://localhost:5050/api/v1/risks" -H "X-API-Key: esg_live_YOUR_API_KEY"')}
                className="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                title="Copy snippet"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: APPLICATIONS */}
      {activeTab === 'apps' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-white">Registered Developer Applications</h3>
            <button
              onClick={() => setCreateAppModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>New App</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {apps.map((app) => (
              <div key={app.application_id} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-white text-base">{app.name}</h4>
                    <p className="text-xs text-slate-400">{app.description || 'No description provided'}</p>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {app.is_sandbox ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">SANDBOX</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">LIVE</span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">{app.rate_limit_tier}</span>
                  </div>
                </div>

                <div className="space-y-1 font-mono text-xs bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex justify-between text-slate-400">
                    <span>App ID:</span>
                    <span className="text-white">{app.application_id}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Client ID:</span>
                    <span className="text-cyan-400">{app.client_id}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {app.scopes?.map((s) => (
                    <span key={s} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-mono">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: API CREDENTIALS */}
      {activeTab === 'credentials' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-white">Scoped API Credentials</h3>
              <p className="text-xs text-slate-400">Secret keys are stored as SHA-256 hashes and displayed only once upon generation.</p>
            </div>
            <button
              onClick={() => setCreateKeyModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Generate API Key</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400">Select Application:</span>
              <select
                value={selectedAppId}
                onChange={(e) => setSelectedAppId(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
              >
                {apps.map(a => (
                  <option key={a.application_id} value={a.application_id}>{a.name} ({a.application_id})</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: API DOCUMENTATION */}
      {activeTab === 'docs' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white">Public Gateway Route Catalog (/api/v1/*)</h3>
          <div className="space-y-3">
            {[
              { method: 'GET', path: '/api/v1/risks', scope: 'risk:read', desc: 'List paginated enterprise risks with filters' },
              { method: 'POST', path: '/api/v1/risks', scope: 'risk:write', desc: 'Create risk record with Idempotency-Key support' },
              { method: 'GET', path: '/api/v1/risks/:id/predictions', scope: 'prediction:read', desc: 'Retrieve machine learning trajectory forecasts' },
              { method: 'POST', path: '/api/v1/risks/:id/predict', scope: 'prediction:read', desc: 'Generate 30d/90d risk trajectory forecast' },
              { method: 'POST', path: '/api/v1/risks/:id/analyze', scope: 'analysis:run', desc: 'Execute deep LLM risk synthesis' },
              { method: 'POST', path: '/api/v1/agent/runs', scope: 'agent:run', desc: 'Trigger autonomous Phase 5 AI Agent run' },
              { method: 'POST', path: '/api/v1/scenarios/:id/run', scope: 'scenario:run', desc: 'Run macroeconomic climate stress test' },
              { method: 'GET', path: '/api/v1/alerts', scope: 'alert:read', desc: 'List operational early-warning alerts' },
              { method: 'GET', path: '/api/v1/executive/overview', scope: 'executive:read', desc: 'Authoritative executive risk index' },
              { method: 'POST', path: '/api/v1/webhooks', scope: 'alert:write', desc: 'Register signed HMAC webhook endpoint' }
            ].map((route, i) => (
              <div key={i} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="flex items-center space-x-3">
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-mono ${
                    route.method === 'GET' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                    route.method === 'POST' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {route.method}
                  </span>
                  <span className="font-mono text-xs text-white font-semibold">{route.path}</span>
                </div>
                <div className="flex items-center space-x-3 text-xs">
                  <span className="text-slate-400">{route.desc}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 text-[10px] font-mono">{route.scope}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: USAGE & AI QUOTAS */}
      {activeTab === 'usage' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white">Usage & AI Quota Analytics</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 uppercase font-bold">Total Invocations</span>
              <div className="text-2xl font-black text-white font-mono">{usageStats?.total_requests || 0}</div>
            </div>
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 uppercase font-bold">Average Latency</span>
              <div className="text-2xl font-black text-emerald-400 font-mono">{usageStats?.avg_latency_ms || 0} ms</div>
            </div>
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 uppercase font-bold">AI Invocations</span>
              <div className="text-2xl font-black text-cyan-400 font-mono">{usageStats?.ai_invocations || 0}</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: REQUEST LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-white">Recent Gateway Request Logs</h3>
            <button onClick={fetchData} className="p-2 rounded-lg bg-slate-900 text-slate-400 hover:text-white">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Method</th>
                  <th className="p-3">Endpoint</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Latency</th>
                  <th className="p-3">Request ID</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-6 text-center text-slate-500 font-sans">No API calls recorded yet.</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.log_id || log._id} className="hover:bg-slate-900/50">
                      <td className="p-3 font-bold text-white">{log.method}</td>
                      <td className="p-3 text-slate-300">{log.endpoint}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status_code < 400 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {log.status_code}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">{log.latency_ms}ms</td>
                      <td className="p-3 text-slate-500">{log.request_id}</td>
                      <td className="p-3 text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: WEBHOOKS */}
      {activeTab === 'webhooks' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-white">Registered Webhooks</h3>
              <p className="text-xs text-slate-400">Events are dispatched asynchronously with HMAC SHA-256 signatures.</p>
            </div>
            <button
              onClick={() => setWebhookModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Register Webhook</span>
            </button>
          </div>

          <div className="space-y-3">
            {webhooks.length === 0 ? (
              <div className="p-8 text-center text-slate-500 rounded-xl bg-slate-900 border border-slate-800">
                No webhook endpoints registered. Click "Register Webhook" to get started.
              </div>
            ) : (
              webhooks.map((wh) => (
                <div key={wh.webhook_id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-white">{wh.url}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">{wh.status}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {wh.events?.map(e => (
                        <span key={e} className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400 font-mono">{e}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleTestPing(wh.webhook_id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
                    >
                      Test Ping
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 8: SANDBOX MODE */}
      {activeTab === 'sandbox' && (
        <div className="p-6 rounded-2xl bg-amber-950/20 border border-amber-800/40 space-y-4">
          <div className="flex items-center space-x-2 text-amber-400 font-bold">
            <Database className="h-5 w-5" />
            <span className="text-base">Synthetic Sandbox Environment</span>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            The Sandbox provides an isolated environment using synthetic data marked with <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-400 font-mono">X-Sandbox: true</code>. Keys prefixed with <code className="bg-slate-900 px-1.5 py-0.5 rounded text-amber-400 font-mono">esg_test_...</code> can never inspect or alter production customer data.
          </p>
          <div className="pt-2">
            <button
              onClick={handleResetSandbox}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/20"
            >
              Reset Synthetic Sandbox Data
            </button>
          </div>
        </div>
      )}

      {/* SINGLE REVEAL SECRET MODAL */}
      {secretRevealModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">{secretRevealModal.title}</h3>
              <button onClick={() => setSecretRevealModal({ ...secretRevealModal, isOpen: false })} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-400" />
              <span><strong>Security Notice:</strong> This secret will only be shown once. Please store it securely in your secret manager or environment configuration.</span>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">{secretRevealModal.secretType}</span>
              <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-xl p-3">
                <input
                  type="text"
                  readOnly
                  value={secretRevealModal.secretValue}
                  className="bg-transparent font-mono text-xs text-emerald-400 flex-1 focus:outline-none"
                />
                <button
                  onClick={() => copyToClipboard(secretRevealModal.secretValue)}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center space-x-1"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy</span>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSecretRevealModal({ ...secretRevealModal, isOpen: false })}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white"
              >
                I have saved this secret
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE APPLICATION MODAL */}
      {createAppModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateApp} className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Create Developer Application</h3>
              <button type="button" onClick={() => setCreateAppModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Application Name</label>
                <input
                  type="text"
                  required
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  placeholder="e.g. ERP Integration Service"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Description</label>
                <input
                  type="text"
                  value={newAppDesc}
                  onChange={(e) => setNewAppDesc(e.target.value)}
                  placeholder="Brief description of application purpose..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Rate Limit Tier</label>
                  <select
                    value={newAppTier}
                    onChange={(e) => setNewAppTier(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                  >
                    <option value="STANDARD">Standard (60 req/min)</option>
                    <option value="PROFESSIONAL">Professional (180 req/min)</option>
                    <option value="ENTERPRISE">Enterprise (600 req/min)</option>
                  </select>
                </div>

                <div className="flex items-center pt-5 space-x-2">
                  <input
                    type="checkbox"
                    id="sandboxCheck"
                    checked={newAppSandbox}
                    onChange={(e) => setNewAppSandbox(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-emerald-500"
                  />
                  <label htmlFor="sandboxCheck" className="text-xs font-semibold text-slate-300">Sandbox Mode</label>
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setCreateAppModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/20"
              >
                Create App
              </button>
            </div>
          </form>
        </div>
      )}

      {/* GENERATE KEY MODAL */}
      {createKeyModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateCredential} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Generate API Key</h3>
              <button type="button" onClick={() => setCreateKeyModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Target Application</label>
                <select
                  value={selectedAppId}
                  onChange={(e) => setSelectedAppId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
                >
                  {apps.map(a => (
                    <option key={a.application_id} value={a.application_id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-2">Authorized Scopes</label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-950 rounded-xl border border-slate-800">
                  {ALL_SCOPES.map(s => (
                    <label key={s.id} className="flex items-start space-x-2 text-xs text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newKeyScopes.includes(s.id)}
                        onChange={(e) => {
                          if (e.target.checked) setNewKeyScopes([...newKeyScopes, s.id]);
                          else setNewKeyScopes(newKeyScopes.filter(x => x !== s.id));
                        }}
                        className="mt-0.5 rounded bg-slate-900 border-slate-700 text-emerald-500"
                      />
                      <div>
                        <span className="font-semibold text-white block">{s.id}</span>
                        <span className="text-[10px] text-slate-500">{s.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setCreateKeyModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white"
              >
                Generate Key
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REGISTER WEBHOOK MODAL */}
      {webhookModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleRegisterWebhook} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Register Webhook Endpoint</h3>
              <button type="button" onClick={() => setWebhookModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Payload URL (HTTPS recommended)</label>
                <input
                  type="url"
                  required
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://your-service.com/api/webhooks"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Subscribed Events</label>
                <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                  {['risk.created', 'risk.escalated', 'prediction.critical', 'alert.created', 'workflow.completed', 'agent.completed'].map(ev => (
                    <label key={ev} className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={webhookEvents.includes(ev)}
                        onChange={(e) => {
                          if (e.target.checked) setWebhookEvents([...webhookEvents, ev]);
                          else setWebhookEvents(webhookEvents.filter(x => x !== ev));
                        }}
                        className="rounded bg-slate-900 border-slate-700 text-emerald-500"
                      />
                      <span className="font-mono">{ev}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setWebhookModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white"
              >
                Register Endpoint
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
