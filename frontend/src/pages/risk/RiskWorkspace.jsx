import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MessageSquare, 
  Send, 
  Share2, 
  Network, 
  Layers, 
  ShieldAlert, 
  CheckCircle, 
  Clock, 
  TrendingDown, 
  ExternalLink,
  ChevronRight,
  Filter,
  AlertTriangle,
  Building2,
  Factory
} from 'lucide-react';

export default function RiskWorkspace() {
  const [activeTab, setActiveTab] = useState('collaboration'); // collaboration, graph, impact
  const [risks, setRisks] = useState([]);
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [mentionType, setMentionType] = useState('user');
  const [mentionTarget, setMentionTarget] = useState('');
  const [graphData, setGraphData] = useState({ nodes: [], edges: [], summary: {} });
  const [impactData, setImpactData] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState({ type: 'Supplier', id: 'sup_alpha_materials' });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const token = localStorage.getItem('token');

  // 1. Fetch initial risks and graph
  useEffect(() => {
    fetchRisks();
    fetchGraph();
  }, []);

  // 2. Fetch comments when selectedRisk changes
  useEffect(() => {
    if (selectedRisk?._id) {
      fetchComments(selectedRisk._id);
    }
  }, [selectedRisk]);

  const fetchRisks = async () => {
    try {
      const res = await fetch('/api/risks', { credentials: 'include' });
      const json = await res.json();
      const list = json.data || json || [];
      if (Array.isArray(list) && list.length > 0) {
        setRisks(list);
        setSelectedRisk(list[0]);
      }
    } catch (e) {
      console.error('Failed to load risks:', e);
    }
  };

  const fetchComments = async (riskId) => {
    try {
      const res = await fetch(`/api/risks/${riskId}/comments`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setComments(json.data || []);
      }
    } catch (e) {
      console.error('Failed to load comments:', e);
    }
  };

  const fetchGraph = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/risk-graph', { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setGraphData(json.data);
      }
    } catch (e) {
      console.error('Failed to load risk graph:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchEntityImpact = async (type, id) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/risk-graph/${type}/${id}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setImpactData(json.data);
      }
    } catch (e) {
      console.error('Failed to load impact analysis:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedRisk) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/risks/${selectedRisk._id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: newComment.trim() })
      });
      const json = await res.json();
      if (json.success) {
        setComments(prev => [...prev, json.data]);
        setNewComment('');
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInsertMention = (target) => {
    setNewComment(prev => `${prev} @${target} `);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                Phase 16 Enterprise Collaboration
              </span>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-950 text-blue-400 border border-blue-800">
                Relationship Graph 1.0
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-7 h-7 text-emerald-400" />
              Collaborative Risk Intelligence Workspace
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Multi-stakeholder risk collaboration, scoped discussions, targeted mentions, and authoritative relationship graph traversal.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('collaboration')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'collaboration'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <MessageSquare className="w-4 h-4" /> Discussions & Notes
            </button>
            <button
              onClick={() => {
                setActiveTab('graph');
                fetchGraph();
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'graph'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <Network className="w-4 h-4" /> Risk Graph
            </button>
            <button
              onClick={() => {
                setActiveTab('impact');
                fetchEntityImpact(selectedEntity.type, selectedEntity.id);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'impact'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <Layers className="w-4 h-4" /> Cross-Domain Impact
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: COLLABORATION & COMMENTS */}
      {activeTab === 'collaboration' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Risk Selector */}
          <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center justify-between">
              <span>Tenant Risks ({risks.length})</span>
              <Filter className="w-4 h-4 text-slate-400" />
            </h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {risks.map(r => (
                <div
                  key={r._id}
                  onClick={() => setSelectedRisk(r)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedRisk?._id === r._id
                      ? 'bg-slate-800 border-emerald-500 shadow-md'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-400 truncate">
                      {r.category || 'Risk'}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      r.score >= 70 ? 'bg-red-950 text-red-400 border border-red-800' :
                      r.score >= 40 ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                      'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    }`}>
                      Score: {r.score}
                    </span>
                  </div>
                  <h4 className="text-sm font-medium text-white truncate">{r.title}</h4>
                  <div className="flex items-center gap-2 mt-2 text-[11px] text-slate-400">
                    <span>Status: {r.status}</span>
                    <span>•</span>
                    <span>Severity: {r.severity}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Active Discussion Thread */}
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col h-[680px]">
            {selectedRisk ? (
              <>
                {/* Risk Context Banner */}
                <div className="pb-4 border-b border-slate-800 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-amber-400" />
                      {selectedRisk.title}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Risk ID: <span className="font-mono text-slate-300">{selectedRisk._id}</span> | 
                      Category: <span className="text-slate-300">{selectedRisk.category}</span> | 
                      Authoritative Score: <span className="font-bold text-emerald-400">{selectedRisk.score}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => handleInsertMention('ESG_MANAGER')}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded border border-slate-700"
                    >
                      @ESG_MANAGER
                    </button>
                    <button 
                      onClick={() => handleInsertMention('COMPLIANCE_MANAGER')}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded border border-slate-700"
                    >
                      @COMPLIANCE
                    </button>
                    <button 
                      onClick={() => handleInsertMention('ADMIN')}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded border border-slate-700"
                    >
                      @ADMIN
                    </button>
                  </div>
                </div>

                {/* Comment Feed */}
                <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-2">
                  {comments.length === 0 ? (
                    <div className="text-center py-16 text-slate-500 text-sm">
                      <MessageSquare className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                      No discussion notes yet on this risk. Start the collaboration below.
                    </div>
                  ) : (
                    comments.map(c => (
                      <div key={c.commentId || c._id} className="bg-slate-950/70 border border-slate-800 rounded-lg p-3.5">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center text-xs font-bold">
                              {(c.userName || c.userEmail || 'U')[0].toUpperCase()}
                            </div>
                            <span className="text-xs font-semibold text-slate-200">
                              {c.userName || c.userEmail}
                            </span>
                            {c.mentions && c.mentions.length > 0 && (
                              <div className="flex gap-1">
                                {c.mentions.map((m, idx) => (
                                  <span key={idx} className="px-1.5 py-0.2 text-[10px] rounded bg-purple-950 text-purple-300 border border-purple-800">
                                    @{m.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {c.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Input */}
                <form onSubmit={handleSendComment} className="pt-3 border-t border-slate-800">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a collaborative risk note or mention @user, @ESG_MANAGER, @COMPLIANCE..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      disabled={submitting || !newComment.trim()}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                      Post
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="text-center py-24 text-slate-500 text-sm">
                Select a risk on the left to view discussions.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RISK GRAPH */}
      {activeTab === 'graph' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Network className="w-5 h-5 text-emerald-400" />
                Authoritative Multi-Domain Relationship Graph
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Connected graph linking Organization, Projects, Suppliers, Risks, Metrics, and Workflows.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span>Nodes: <strong className="text-white">{graphData.summary?.totalNodes || 0}</strong></span>
              <span>Edges: <strong className="text-white">{graphData.summary?.totalEdges || 0}</strong></span>
            </div>
          </div>

          {/* Node Category Badges */}
          <div className="flex flex-wrap gap-2">
            {['Organization', 'Project', 'Supplier', 'Risk', 'ESGMetric', 'CarbonMetric', 'ComplianceRequirement', 'Workflow', 'Decision', 'Scenario'].map(type => (
              <span key={type} className="px-2.5 py-1 text-xs font-mono rounded-md bg-slate-950 border border-slate-800 text-slate-300">
                {type}
              </span>
            ))}
          </div>

          {/* Visual Graph Nodes Table */}
          <div className="overflow-x-auto max-h-[500px] border border-slate-800 rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Node Type</th>
                  <th className="px-4 py-3">Identifier</th>
                  <th className="px-4 py-3">Label / Name</th>
                  <th className="px-4 py-3">Connected Relations</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                {graphData.nodes?.slice(0, 20).map(n => {
                  const relations = graphData.edges?.filter(e => e.source === n.id || e.target === n.id).length || 0;
                  return (
                    <tr key={n.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-emerald-400">{n.type}</td>
                      <td className="px-4 py-2.5 font-mono text-slate-400">{n.id}</td>
                      <td className="px-4 py-2.5 text-white font-medium">{n.label}</td>
                      <td className="px-4 py-2.5 text-slate-300">{relations} link(s)</td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedEntity({ type: n.type, id: n.id });
                            setActiveTab('impact');
                            fetchEntityImpact(n.type, n.id);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium"
                        >
                          Explore Impact
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: CROSS-DOMAIN IMPACT */}
      {activeTab === 'impact' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-400" />
                Cross-Domain Impact Explorer
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Authoritative BFS multi-hop dependency traversal: "What is affected if this entity fails or escalates?"
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedEntity.id}
                onChange={(e) => {
                  const id = e.target.value;
                  const type = id.startsWith('sup_') ? 'Supplier' : 'Risk';
                  setSelectedEntity({ type, id });
                  fetchEntityImpact(type, id);
                }}
                className="bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-3 py-2"
              >
                <option value="sup_alpha_materials">Supplier: Alpha Heavy Materials Corp</option>
                <option value="sup_beta_grid">Supplier: Beta Regional Power Utility</option>
                <option value="sup_gamma_logistics">Supplier: Gamma Global Transport Fleet</option>
              </select>
              <button
                onClick={() => fetchEntityImpact(selectedEntity.type, selectedEntity.id)}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium"
              >
                Traverse
              </button>
            </div>
          </div>

          {impactData ? (
            <div className="space-y-6">
              {/* Executive Impact Synthesis Banner */}
              <div className="bg-blue-950/30 border border-blue-800/60 rounded-lg p-4">
                <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
                  Authoritative Impact Synthesis
                </h4>
                <p className="text-sm text-slate-200 leading-relaxed">
                  {impactData.synthesis}
                </p>
              </div>

              {/* Impact Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400">Impacted Projects</span>
                  <p className="text-xl font-bold text-white mt-1">
                    {impactData.impactAnalysis?.projects?.length || 0}
                  </p>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400">Exposed Risks</span>
                  <p className="text-xl font-bold text-amber-400 mt-1">
                    {impactData.impactAnalysis?.risks?.length || 0}
                  </p>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400">Total Risk Score</span>
                  <p className="text-xl font-bold text-red-400 mt-1">
                    {impactData.impactAnalysis?.totalRiskScoreExposure || 0}
                  </p>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400">Compliance Mandates</span>
                  <p className="text-xl font-bold text-purple-400 mt-1">
                    {impactData.impactAnalysis?.complianceRequirements?.length || 0}
                  </p>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400">ESG & Carbon Metrics</span>
                  <p className="text-xl font-bold text-emerald-400 mt-1">
                    {(impactData.impactAnalysis?.esgMetrics?.length || 0) + (impactData.impactAnalysis?.carbonMetrics?.length || 0)}
                  </p>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400">Active Workflows</span>
                  <p className="text-xl font-bold text-blue-400 mt-1">
                    {impactData.impactAnalysis?.workflows?.length || 0}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500 text-sm">
              Click 'Traverse' to compute dependency graph for selected entity.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
