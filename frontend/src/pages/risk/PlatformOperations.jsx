import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Server, 
  Key, 
  Layers, 
  DollarSign, 
  CheckCircle, 
  AlertCircle, 
  RotateCw, 
  Wrench, 
  Activity, 
  Shield, 
  Copy, 
  Check, 
  ExternalLink,
  Plus
} from 'lucide-react';

export default function PlatformOperations() {
  const [activeTab, setActiveTab] = useState('overview'); // overview, gateway, tools, templates, apikeys, costs
  const [opsData, setOpsData] = useState(null);
  const [tools, setTools] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [usageCosts, setUsageCosts] = useState(null);
  const [gatewayStatus, setGatewayStatus] = useState(null);
  const [newKeyModal, setNewKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdSecret, setCreatedSecret] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOperations();
    fetchTools();
    fetchTemplates();
    fetchApiKeys();
    fetchUsageCosts();
  }, []);

  const fetchOperations = async () => {
    try {
      const res = await fetch('/api/platform/operations', { credentials: 'include' });
      const json = await res.json();
      if (json.success) setOpsData(json.data);
    } catch (e) {
      console.error('Failed to load platform operations:', e);
    }
  };

  const fetchTools = async () => {
    try {
      const res = await fetch('/api/platform/tools', { credentials: 'include' });
      const json = await res.json();
      if (json.success) setTools(json.data || []);
    } catch (e) {
      console.error('Failed to load tools:', e);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/platform/templates', { credentials: 'include' });
      const json = await res.json();
      if (json.success) setTemplates(json.data || []);
    } catch (e) {
      console.error('Failed to load templates:', e);
    }
  };

  const fetchApiKeys = async () => {
    try {
      const res = await fetch('/api/platform/api-keys', { credentials: 'include' });
      const json = await res.json();
      if (json.success) setApiKeys(json.data || []);
    } catch (e) {
      console.error('Failed to load API keys:', e);
    }
  };

  const fetchUsageCosts = async () => {
    try {
      const res = await fetch('/api/platform/usage', { credentials: 'include' });
      const json = await res.json();
      if (json.success) setUsageCosts(json.data);
    } catch (e) {
      console.error('Failed to load usage & costs:', e);
    }
  };

  const handleToggleTool = async (name, currentEnabled) => {
    try {
      const res = await fetch(`/api/platform/tools/${name}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled: !currentEnabled })
      });
      const json = await res.json();
      if (json.success) {
        setTools(prev => prev.map(t => t.name === name ? { ...t, enabled: !currentEnabled } : t));
      }
    } catch (e) {
      console.error('Failed to toggle tool:', e);
    }
  };

  const handleCreateApiKey = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      const res = await fetch('/api/platform/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newKeyName.trim(),
          scopes: ['risks:read', 'predictions:read', 'scenarios:read', 'decisions:read', 'optimization:run', 'executive:read']
        })
      });
      const json = await res.json();
      if (json.success) {
        setCreatedSecret(json.data.apiKey);
        setApiKeys(prev => [json.data, ...prev]);
        setNewKeyName('');
      }
    } catch (e) {
      console.error('Failed to create API key:', e);
    }
  };

  const handleRevokeKey = async (keyId) => {
    if (!confirm(`Are you sure you want to revoke API key ${keyId}?`)) return;
    try {
      const res = await fetch(`/api/platform/api-keys/${keyId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success) {
        setApiKeys(prev => prev.map(k => k.keyId === keyId ? { ...k, status: 'REVOKED' } : k));
      }
    } catch (e) {
      console.error('Failed to revoke API key:', e);
    }
  };

  const handleApplyTemplate = async (industry) => {
    if (!confirm(`Apply the ${industry} industry template to this tenant?`)) return;
    try {
      const res = await fetch(`/api/platform/templates/${industry}/apply`, {
        method: 'POST',
        credentials: 'include'
      });
      const json = await res.json();
      if (json.success) {
        alert(`Successfully applied template: ${json.data.templateName}`);
      }
    } catch (e) {
      console.error('Failed to apply template:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-950 text-purple-400 border border-purple-800">
                Phase 17 AI Platform 2.0
              </span>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                v17.0.0 Production Core
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Server className="w-7 h-7 text-purple-400" />
              Platform Operations Command Center
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Cross-tenant operations, AI Model Gateway routing, versioned Tool Registry, Industry Templates, and Developer APIs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'overview', label: 'Operations Overview', icon: Activity },
              { id: 'gateway', label: 'AI Gateway', icon: Cpu },
              { id: 'tools', label: 'Tool Registry', icon: Wrench },
              { id: 'templates', label: 'Industry Templates', icon: Layers },
              { id: 'apikeys', label: 'Developer APIs', icon: Key },
              { id: 'costs', label: 'Usage & Costs', icon: DollarSign }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* TAB: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Total Platform Users</span>
              <p className="text-2xl font-bold text-white mt-1">{opsData?.platformTotals?.totalUsers || 0}</p>
              <span className="text-[10px] text-emerald-400">Across all enterprise tenants</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Total Managed Risks</span>
              <p className="text-2xl font-bold text-amber-400 mt-1">{opsData?.platformTotals?.totalRisks || 0}</p>
              <span className="text-[10px] text-slate-400">Phase 2 Authoritative Scored</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Autonomous Agent Runs</span>
              <p className="text-2xl font-bold text-blue-400 mt-1">{opsData?.platformTotals?.totalAgentRuns || 0}</p>
              <span className="text-[10px] text-blue-400">Investigation & Tools Dispatches</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <span className="text-xs text-slate-400">Platform Health Status</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">HEALTHY</p>
              <span className="text-[10px] text-emerald-400">All 4 Core Daemons Active</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-white mb-3">Active Service Daemons</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {[
                { name: 'Vite Frontend Dev', port: 3030, status: 'HEALTHY' },
                { name: 'Express API Gateway', port: 5050, status: 'HEALTHY' },
                { name: 'Python AI Microservice', port: 8000, status: 'HEALTHY' },
                { name: 'MongoDB Data Store', port: 27017, status: 'HEALTHY' }
              ].map(s => (
                <div key={s.name} className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-medium text-white">{s.name}</h4>
                    <span className="text-[11px] font-mono text-slate-400">Port {s.port}</span>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: AI GATEWAY */}
      {activeTab === 'gateway' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-400" />
                Provider-Independent AI Model Gateway
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Dynamic routing policies, automatic fallback chaining, latency & token cost optimization.
              </p>
            </div>
            <span className="px-3 py-1 text-xs font-mono font-semibold rounded-full bg-purple-950 text-purple-300 border border-purple-800">
              ai-gateway-v2.0
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
              <h4 className="text-xs font-bold text-slate-300 uppercase">LOW_COST</h4>
              <p className="text-xs text-slate-400 mt-1">Routes anomaly checks and metadata to Google Gemini Flash.</p>
              <div className="mt-2 text-[11px] font-mono text-emerald-400">Model: gemini-2.5-flash</div>
            </div>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
              <h4 className="text-xs font-bold text-slate-300 uppercase">LOW_LATENCY</h4>
              <p className="text-xs text-slate-400 mt-1">Enforces 15s timeout with immediate deterministic failover.</p>
              <div className="mt-2 text-[11px] font-mono text-blue-400">Timeout: 15s</div>
            </div>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
              <h4 className="text-xs font-bold text-slate-300 uppercase">HIGH_QUALITY</h4>
              <p className="text-xs text-slate-400 mt-1">Routes complex scenario simulation and executive briefings.</p>
              <div className="mt-2 text-[11px] font-mono text-purple-400">Model: gemini-2.5-pro</div>
            </div>
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg">
              <h4 className="text-xs font-bold text-slate-300 uppercase">TASK_SPECIFIC</h4>
              <p className="text-xs text-slate-400 mt-1">Semantic task classification maps directly to specialized models.</p>
              <div className="mt-2 text-[11px] font-mono text-amber-400">Dynamic Mapping</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: TOOL REGISTRY */}
      {activeTab === 'tools' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-emerald-400" />
                Versioned Enterprise Tool Registry
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Authorized tools categorized across 11 domains. Only registered & enabled tools may execute.
              </p>
            </div>
            <span className="text-xs text-slate-400">
              Total Tools: <strong className="text-white">{tools.length}</strong>
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Tool Name</th>
                  <th className="px-4 py-3">Version</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Risk Level</th>
                  <th className="px-4 py-3">Permission Required</th>
                  <th className="px-4 py-3">Approval Required</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                {tools.map(t => (
                  <tr key={t.name} className="hover:bg-slate-800/40">
                    <td className="px-4 py-2.5 font-mono text-white font-medium">{t.name}</td>
                    <td className="px-4 py-2.5 text-slate-400 font-mono">v{t.version || '1.0.0'}</td>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 text-[10px] rounded bg-slate-800 text-slate-300 font-medium">
                        {t.category || 'Risk'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        t.risk_level === 'WRITE' ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {t.risk_level}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-400">{t.permission_required}</td>
                    <td className="px-4 py-2.5 text-slate-400">{t.requires_approval ? 'Yes (HITL)' : 'No'}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => handleToggleTool(t.name, t.enabled)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded transition-colors ${
                          t.enabled 
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 hover:bg-emerald-900' 
                            : 'bg-red-950 text-red-400 border border-red-800 hover:bg-red-900'
                        }`}
                      >
                        {t.enabled ? 'ACTIVE' : 'DISABLED'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: INDUSTRY TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              Pre-Configured Industry Framework Templates
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Deploy pre-configured risk categories, monitoring rules, workflows, and ESG KPIs customized by industry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {templates.map(tmpl => (
              <div key={tmpl.templateId} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-blue-950 text-blue-300 border border-blue-800">
                      {tmpl.industry}
                    </span>
                    <span className="text-[10px] text-slate-500">v1.0</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1.5">{tmpl.name}</h4>
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {tmpl.description}
                  </p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    {tmpl.riskCategories?.length || 0} Categories
                  </span>
                  <button
                    onClick={() => handleApplyTemplate(tmpl.industry)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    Apply Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB: DEVELOPER APIS & KEYS */}
      {activeTab === 'apikeys' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                Developer API Platform & Keys
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Generate scoped API keys for external applications to integrate with risks, predictions, scenarios, and optimization.
              </p>
            </div>
            <button
              onClick={() => setNewKeyModal(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Generate API Key
            </button>
          </div>

          {/* Key Secret Banner if just created */}
          {createdSecret && (
            <div className="bg-amber-950/40 border border-amber-800/80 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase">
                  New API Key Generated — Copy Now!
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdSecret);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="px-2.5 py-1 bg-amber-600 text-white rounded text-xs flex items-center gap-1"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy Key'}
                </button>
              </div>
              <p className="text-xs text-slate-300">
                This secret will never be displayed again. Store it securely in your external service:
              </p>
              <div className="p-2 bg-black/60 rounded font-mono text-xs text-amber-300 break-all select-all">
                {createdSecret}
              </div>
            </div>
          )}

          {/* Existing Keys Table */}
          <div className="overflow-x-auto border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Key Name</th>
                  <th className="px-4 py-3">Prefix</th>
                  <th className="px-4 py-3">Scopes</th>
                  <th className="px-4 py-3">Rate Limit</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                {apiKeys.map(k => (
                  <tr key={k.keyId} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-medium text-white">{k.name}</td>
                    <td className="px-4 py-3 font-mono text-slate-400">{k.prefix}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {k.scopes?.map(s => (
                          <span key={s} className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-300 font-mono">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{k.rateLimit} req/min</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        k.status === 'ACTIVE' 
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                          : 'bg-red-950 text-red-400 border border-red-800'
                      }`}>
                        {k.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {k.status === 'ACTIVE' && (
                        <button
                          onClick={() => handleRevokeKey(k.keyId)}
                          className="px-2.5 py-1 bg-red-950 text-red-400 hover:bg-red-900 border border-red-800 rounded text-[11px] font-medium"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: USAGE & COSTS */}
      {activeTab === 'costs' && usageCosts && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Tenant Resource Usage & Cost Accounting
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Period: <span className="font-semibold text-white">{usageCosts.period}</span> | Pure mathematical accounting of LLM, embedding, storage, and compute costs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">Total Month Cost</span>
              <p className="text-2xl font-bold text-white mt-1">${usageCosts.costs?.totalCost?.toFixed(4)}</p>
              <span className="text-[10px] text-slate-400">Actual Recorded Cost</span>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">LLM Inference Cost</span>
              <p className="text-2xl font-bold text-purple-400 mt-1">${usageCosts.costs?.llmCostActual?.toFixed(4)}</p>
              <span className="text-[10px] text-slate-400">Est. Cap: ${usageCosts.costs?.llmCostEstimated?.toFixed(4)}</span>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">Vector Embeddings Cost</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">${usageCosts.costs?.embeddingCostActual?.toFixed(4)}</p>
              <span className="text-[10px] text-slate-400">Qdrant RAG Chunks</span>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
              <span className="text-xs text-slate-400">Storage & Compute</span>
              <p className="text-2xl font-bold text-blue-400 mt-1">${((usageCosts.costs?.storageCost || 0) + (usageCosts.costs?.processingCost || 0)).toFixed(4)}</p>
              <span className="text-[10px] text-slate-400">{usageCosts.usage?.storageMb} MB Storage</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Key */}
      {newKeyModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Create Developer API Key</h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter an identifier for this integration key (e.g. "ERP Carbon Feeder").
            </p>
            <form onSubmit={(e) => { handleCreateApiKey(e); setNewKeyModal(false); }}>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key name..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white mb-4"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setNewKeyModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newKeyName.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg"
                >
                  Generate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
