import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Filter,
  ExternalLink,
  Clock,
  Scale,
  FileText,
  Send
} from 'lucide-react';

export default function ExecutiveDecisionCenter() {
  const [loading, setLoading] = useState(true);
  const [decisions, setDecisions] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [error, setError] = useState(null);
  const [acknowledgedIds, setAcknowledgedIds] = useState(new Set());

  const fetchDecisions = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/executive-risk/decisions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load executive decisions.');
      const data = await res.json();
      setDecisions(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecisions();
  }, []);

  const handleAcknowledge = (id) => {
    setAcknowledgedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const filteredDecisions = decisions.filter(d => {
    if (filter === 'ALL') return true;
    if (filter === 'P1') return d.priority?.includes('P1') || d.priority?.includes('CRITICAL');
    if (filter === 'P2') return d.priority?.includes('P2') || d.priority?.includes('HIGH');
    if (filter === 'ESCALATING') return d.category?.includes('Escalat');
    if (filter === 'APPROVAL') return d.category?.includes('Approval');
    if (filter === 'COMPLIANCE') return d.category?.includes('Compliance');
    return true;
  });

  return (
    <div className="p-6 lg:p-8 space-y-8 bg-slate-50 min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-600 text-white rounded-lg shadow-sm">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Executive Decision Center</h1>
              <p className="text-sm text-slate-500">Actionable, prioritized intervention cards synthesized across predictive trajectories, compliance deadlines, and workflow pauses</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchDecisions}
            className="px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 flex items-center transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
          </button>
          <Link
            to="/executive-risk"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium flex items-center transition-colors shadow-sm"
          >
            <ShieldAlert className="w-4 h-4 mr-1.5" /> Risk Dashboard
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'ALL', label: `All Action Items (${decisions.length})` },
          { id: 'P1', label: 'P1 - Critical Priority' },
          { id: 'P2', label: 'P2 - High Priority' },
          { id: 'ESCALATING', label: 'Escalating Trajectories' },
          { id: 'APPROVAL', label: 'Pending Approvals' },
          { id: 'COMPLIANCE', label: 'Compliance Deadlines' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === t.id
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content Body */}
      {loading ? (
        <div className="py-16 text-center text-slate-500">
          <RefreshCw className="w-8 h-8 text-amber-600 animate-spin mx-auto mb-2" />
          <p className="text-sm font-medium">Synthesizing decision items from predictive, workflow, and compliance models...</p>
        </div>
      ) : filteredDecisions.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm max-w-xl mx-auto space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">Zero Outstanding Decisions</h3>
          <p className="text-sm text-slate-500">All operational trajectories, workflow sign-offs, and compliance checkpoints are currently in verified state.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredDecisions.map((item, index) => {
            const isAck = acknowledgedIds.has(item.id);
            return (
              <div 
                key={item.id || index}
                className={`bg-white rounded-2xl p-6 border transition-all shadow-sm relative ${
                  isAck ? 'opacity-60 border-slate-200' : 'border-slate-300/80 hover:border-slate-400'
                }`}
              >
                {/* Header Tag */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                    item.priority?.includes('P1') || item.priority?.includes('CRITICAL')
                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {item.priority || 'P2 - HIGH'}
                  </span>
                  <span className="text-xs font-medium text-slate-500">{item.category}</span>
                </div>

                {/* Title & Description */}
                <h3 className="text-base font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 mb-4 leading-relaxed">{item.description}</p>

                {/* Evidence Traceability Callout */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-700 mb-4 font-mono leading-normal">
                  <span className="font-bold text-slate-900 font-sans">Evidence & Traceability: </span>
                  {item.evidence}
                </div>

                {/* Recommended Priority Box */}
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-xs text-amber-900 mb-5 leading-normal">
                  <strong>Recommended Executive Action: </strong>
                  {item.recommendedAction}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <Link
                    to={item.targetUrl || '/risk-manager'}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center"
                  >
                    Execute Intervention <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>

                  <button
                    onClick={() => handleAcknowledge(item.id)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      isAck
                        ? 'bg-slate-100 text-slate-400 cursor-default'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isAck ? 'Acknowledged' : 'Acknowledge'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
