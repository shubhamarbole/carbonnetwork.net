import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import { 
  History, Search, Filter, RefreshCw, 
  ArrowLeft, Calendar, User, ShieldCheck, ChevronLeft, ChevronRight
} from 'lucide-react';

const ACTIONS = [
  'all',
  'RISK_CREATED',
  'RISK_UPDATED',
  'RISK_DELETED',
  'RISK_ASSIGNED',
  'RISK_STATUS_CHANGED'
];

export default function RiskAuditLogs() {
  const { token, user } = useAuth();
  const [searchParams] = useSearchParams();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [riskIdFilter, setRiskIdFilter] = useState(searchParams.get('riskId') || '');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchLogs = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });

      if (userFilter.trim()) params.append('user', userFilter.trim());
      if (actionFilter !== 'all') params.append('action', actionFilter);
      if (riskIdFilter.trim()) params.append('riskId', riskIdFilter.trim());
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);

      const res = await fetch(`/api/risks/audit-logs?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error(`Failed to load audit logs (${res.status})`);
      }

      const json = await res.json();
      setLogs(json.data || []);
      setTotalPages(json.pagination?.totalPages || 1);
      setTotalCount(json.pagination?.total || 0);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [token, page, actionFilter]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleResetFilters = () => {
    setUserFilter('');
    setActionFilter('all');
    setRiskIdFilter('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
    setTimeout(fetchLogs, 50);
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'RISK_CREATED':
        return <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">RISK_CREATED</span>;
      case 'RISK_UPDATED':
        return <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">RISK_UPDATED</span>;
      case 'RISK_DELETED':
        return <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">RISK_DELETED</span>;
      case 'RISK_ASSIGNED':
        return <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">RISK_ASSIGNED</span>;
      case 'RISK_STATUS_CHANGED':
        return <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">STATUS_CHANGED</span>;
      default:
        return <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">{action}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pl-64">
      <Navbar title="AI Risk Manager - Security Audit Trail" />

      <main className="p-8 max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Link
              to="/risk-manager"
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition shadow-sm"
              title="Back to Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <History className="h-6 w-6 text-emerald-600" />
                <h1 className="text-2xl font-bold text-slate-900">Risk Audit Logs</h1>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Immutable security and governance ledger for all risk operations ({totalCount} total events)
              </p>
            </div>
          </div>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-sm transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Logs</span>
          </button>
        </div>

        {/* Filter Controls */}
        <form onSubmit={handleFilterSubmit} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Filter by User */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Actor / User</label>
              <input
                type="text"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                placeholder="Email or user..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50"
              />
            </div>

            {/* Filter by Action */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Action Type</label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50"
              >
                {ACTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
              </select>
            </div>

            {/* Filter by Risk ID */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Risk ID</label>
              <input
                type="text"
                value={riskIdFilter}
                onChange={(e) => setRiskIdFilter(e.target.value)}
                placeholder="e.g. 66cf10..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 bg-slate-50"
              />
            </div>

            {/* Date From */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 bg-slate-50"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 bg-slate-50"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
            >
              Reset Filters
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 transition"
            >
              Filter Logs
            </button>
          </div>
        </form>

        {/* Audit Log Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-16 text-center space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto" />
              <p className="text-xs text-slate-500">Loading audit records...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-16 text-center space-y-2">
              <History className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No audit events match current criteria</p>
              <p className="text-xs text-slate-400">Perform risk operations to generate audit trails.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-6">Timestamp</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Actor</th>
                    <th className="py-3 px-4">Risk ID</th>
                    <th className="py-3 px-6">Event Details / Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-6 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 font-semibold whitespace-nowrap">
                        {log.user || log.userId || 'System'}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        {log.riskId ? (
                          <Link to={`/risk-manager/risks/${log.riskId}`} className="text-emerald-600 hover:underline">
                            {log.riskId}
                          </Link>
                        ) : '-'}
                      </td>

                      <td className="py-3.5 px-6">
                        {log.metadata && typeof log.metadata === 'object' && Object.keys(log.metadata).length > 0 ? (
                          <pre className="text-[11px] font-mono text-slate-600 bg-slate-50 p-2 rounded border border-slate-200 max-w-xl overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        ) : (
                          <span className="text-slate-400 italic">No additional payload</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && logs.length > 0 && (
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, totalCount)} of {totalCount} events
              </div>

              <div className="flex items-center space-x-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-semibold text-slate-700">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
