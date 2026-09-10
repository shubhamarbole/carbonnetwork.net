import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { 
  ShieldAlert, AlertTriangle, Plus, Search, Filter, 
  RefreshCw, Eye, Edit, Trash2, ArrowUpDown, Layers,
  ChevronLeft, ChevronRight, XCircle
} from 'lucide-react';

const CATEGORIES = [
  'Financial', 'Operational', 'Environmental', 'ESG', 'Compliance',
  'Regulatory', 'Supplier', 'Project', 'Cybersecurity', 'Data',
  'Reputational', 'Fraud', 'Carbon', 'Documentation'
];

const SEVERITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const STATUSES = ['OPEN', 'UNDER_REVIEW', 'MITIGATION_IN_PROGRESS', 'MITIGATED', 'CLOSED'];

export default function RiskList() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state sync
  const initialCategory = searchParams.get('category') || 'all';
  const initialSeverity = searchParams.get('severity') || 'all';
  const initialStatus = searchParams.get('status') || 'all';

  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination State
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(initialCategory);
  const [severityFilter, setSeverityFilter] = useState(initialSeverity);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [projectFilter, setProjectFilter] = useState('all');
  const [projectsList, setProjectsList] = useState([]);
  
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Sorting
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Confirmation dialog for delete
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    riskId: null,
    riskTitle: ''
  });

  const isViewer = user?.role === 'VIEWER';
  const canDelete = ['SUPER_ADMIN', 'PLATFORM_ADMIN', 'ORGANIZATION_ADMIN', 'ADMIN'].includes(user?.role);

  // Fetch project list for filter dropdown
  useEffect(() => {
    if (!token) return;
    fetch('/api/risks/meta/projects', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(json => {
        if (json.success) setProjectsList(json.data || []);
      })
      .catch(err => console.error('Error fetching projects for filter:', err));
  }, [token]);

  // Fetch Risks with all current filter parameters
  const fetchRisks = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder
      });

      if (search.trim()) params.append('search', search.trim());
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (severityFilter !== 'all') params.append('severity', severityFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (projectFilter !== 'all') params.append('projectId', projectFilter);

      const res = await fetch(`/api/risks?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error(`Failed to load risks (${res.status})`);
      }

      const json = await res.json();
      setRisks(json.data || []);
      setTotalPages(json.pagination?.totalPages || 1);
      setTotalCount(json.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to load risks:', err);
      setError(err.message || 'Error loading risk records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRisks();
  }, [token, page, limit, categoryFilter, severityFilter, statusFilter, projectFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchRisks();
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setSeverityFilter('all');
    setStatusFilter('all');
    setProjectFilter('all');
    setPage(1);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.riskId) return;
    try {
      const res = await fetch(`/api/risks/${deleteDialog.riskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || 'Failed to delete risk');
      }

      setDeleteDialog({ isOpen: false, riskId: null, riskTitle: '' });
      fetchRisks();
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">MEDIUM</span>;
      case 'LOW':
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">LOW</span>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">Open</span>;
      case 'UNDER_REVIEW':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">Under Review</span>;
      case 'MITIGATION_IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">Mitigating</span>;
      case 'MITIGATED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">Mitigated</span>;
      case 'CLOSED':
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">Closed</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pl-64">
      <Navbar title="AI Risk Manager - Risk Registry" />

      <main className="p-8 max-w-7xl mx-auto space-y-6">
        {/* Header Breadcrumb & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Link to="/risk-manager" className="text-slate-400 hover:text-slate-600 text-xs font-semibold">
                Risk Manager
              </Link>
              <span className="text-slate-300">/</span>
              <h1 className="text-2xl font-bold text-slate-900">Risk Registry</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Active enterprise risk register ({totalCount} total records)
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchRisks}
              disabled={loading}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-sm transition"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            {!isViewer && (
              <Link
                to="/risk-manager/risks/new"
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition"
              >
                <Plus className="h-4 w-4" />
                <span>Create Risk</span>
              </Link>
            )}
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search risks by title, description, or category..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition min-h-[42px]"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 transition min-h-[42px] flex items-center justify-center"
            >
              Search
            </button>
          </form>

          {/* Filter Dropdowns Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
            {/* Category */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Categories ({CATEGORIES.length})</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Severity</label>
              <select
                value={severityFilter}
                onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Severities</option>
                {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Statuses</option>
                {STATUSES.map(st => <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>)}
              </select>
            </div>

            {/* Project */}
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Project Scope</label>
              <select
                value={projectFilter}
                onChange={(e) => { setProjectFilter(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Projects</option>
                {projectsList.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>

            {/* Reset Filters */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleResetFilters}
                className="w-full py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>

        {/* Risk Registry Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-16 text-center space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent mx-auto" />
              <p className="text-xs text-slate-500">Loading risk registry...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-rose-600 space-y-2">
              <XCircle className="h-8 w-8 mx-auto" />
              <p className="text-sm font-semibold">{error}</p>
              <button onClick={fetchRisks} className="underline text-xs font-bold">Retry</button>
            </div>
          ) : risks.length === 0 ? (
            <div className="p-16 text-center space-y-3">
              <Layers className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-700">No risks match current criteria</p>
              <p className="text-xs text-slate-400">Try clearing filters or search terms.</p>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              {/* Desktop/Tablet Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-6 cursor-pointer hover:text-slate-800" onClick={() => handleSort('title')}>
                        <div className="flex items-center space-x-1">
                          <span>Risk Title</span>
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="py-3.5 px-4 cursor-pointer hover:text-slate-800" onClick={() => handleSort('category')}>
                        <div className="flex items-center space-x-1">
                          <span>Category</span>
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="py-3.5 px-4 cursor-pointer hover:text-slate-800" onClick={() => handleSort('severity')}>
                        <div className="flex items-center space-x-1">
                          <span>Severity</span>
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="py-3.5 px-4 text-center cursor-pointer hover:text-slate-800" onClick={() => handleSort('probability')}>
                        <div className="flex items-center justify-center space-x-1">
                          <span>Probability / Impact</span>
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="py-3.5 px-4 cursor-pointer hover:text-slate-800" onClick={() => handleSort('status')}>
                        <div className="flex items-center space-x-1">
                          <span>Status</span>
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </th>
                      <th className="py-3.5 px-4">Owner / Scope</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {risks.map((risk) => (
                      <tr key={risk._id} className="hover:bg-slate-50 transition">
                        <td className="py-4 px-6 max-w-xs">
                          <Link
                            to={`/risk-manager/risks/${risk._id}`}
                            className="font-bold text-slate-900 hover:text-emerald-600 block truncate"
                          >
                            {risk.title}
                          </Link>
                          <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {risk.description}
                          </div>
                        </td>

                        <td className="py-4 px-4 font-medium text-slate-700">
                          {risk.category}
                        </td>

                        <td className="py-4 px-4">
                          {getSeverityBadge(risk.severity)}
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex flex-col items-center space-y-1">
                            <div className="flex items-center justify-center space-x-2 text-[11px] font-mono text-slate-600">
                              <span>P: {risk.probability}%</span>
                              <span className="text-slate-300">|</span>
                              <span>I: {risk.impact}%</span>
                            </div>
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                              <div className="bg-blue-500 h-full" style={{ width: `${risk.probability}%` }} />
                              <div className="bg-rose-500 h-full" style={{ width: `${risk.impact}%` }} />
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          {getStatusBadge(risk.status)}
                        </td>

                        <td className="py-4 px-4 text-slate-600">
                          <div className="font-semibold text-slate-800 truncate max-w-[130px]">
                            {risk.ownerName || 'Unassigned'}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
                            {risk.projectName || 'Org Level'}
                          </div>
                        </td>

                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Link
                              to={`/risk-manager/risks/${risk._id}`}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition"
                              title="View Risk Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>

                            {!isViewer && (
                              <Link
                                to={`/risk-manager/risks/${risk._id}/edit`}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                                title="Edit Risk"
                              >
                                <Edit className="h-4 w-4" />
                              </Link>
                            )}

                            {canDelete && (
                              <button
                                onClick={() => setDeleteDialog({
                                  isOpen: true,
                                  riskId: risk._id,
                                  riskTitle: risk.title
                                })}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                                title="Delete Risk"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View (<768px) */}
              <div className="md:hidden divide-y divide-slate-100">
                {risks.map((risk) => (
                  <div key={risk._id} className="p-4 space-y-3 bg-white hover:bg-slate-50 transition">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to={`/risk-manager/risks/${risk._id}`}
                        className="font-bold text-sm text-slate-900 hover:text-emerald-600 transition flex-1 leading-snug"
                      >
                        {risk.title}
                      </Link>
                      <div className="flex-shrink-0">
                        {getSeverityBadge(risk.severity)}
                      </div>
                    </div>

                    {risk.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {risk.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                        {risk.category}
                      </span>
                      {getStatusBadge(risk.status)}
                      <span className="text-slate-400 text-[11px] ml-auto truncate max-w-[150px]">
                        {risk.ownerName || 'Unassigned'}
                      </span>
                    </div>

                    {/* Probability & Impact Progress Bar */}
                    <div className="space-y-1 pt-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-600">
                        <span>Probability: <strong>{risk.probability}%</strong></span>
                        <span>Impact: <strong>{risk.impact}%</strong></span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
                        <div className="bg-blue-500 h-full transition-all" style={{ width: `${risk.probability}%` }} />
                        <div className="bg-rose-500 h-full transition-all" style={{ width: `${risk.impact}%` }} />
                      </div>
                    </div>

                    {/* Mobile Action Buttons with accessible touch targets */}
                    <div className="flex items-center gap-2 pt-1">
                      <Link
                        to={`/risk-manager/risks/${risk._id}`}
                        className="flex-1 py-2 px-3 text-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center space-x-1.5 min-h-[40px] transition"
                        title="View Risk Details"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View</span>
                      </Link>

                      {!isViewer && (
                        <Link
                          to={`/risk-manager/risks/${risk._id}/edit`}
                          className="flex-1 py-2 px-3 text-center rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center space-x-1.5 min-h-[40px] transition"
                          title="Edit Risk"
                        >
                          <Edit className="h-4 w-4" />
                          <span>Edit</span>
                        </Link>
                      )}

                      {canDelete && (
                        <button
                          onClick={() => setDeleteDialog({
                            isOpen: true,
                            riskId: risk._id,
                            riskTitle: risk.title
                          })}
                          className="py-2 px-3 text-center rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs flex items-center justify-center min-h-[40px] min-w-[40px] transition"
                          title="Delete Risk"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Pagination Footer */}
          {!loading && risks.length > 0 && (
            <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3 sm:items-center justify-between text-xs text-slate-500">
              <div>
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalCount)} of {totalCount} risks
              </div>

              <div className="flex items-center space-x-2 self-end sm:self-auto">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 min-h-[38px] min-w-[38px] flex items-center justify-center"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="font-semibold text-slate-700 px-1">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 min-h-[38px] min-w-[38px] flex items-center justify-center"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Risk Record"
        message={`Are you sure you want to delete the risk "${deleteDialog.riskTitle}"? This will permanently remove the record and write an audit entry.`}
        confirmText="Yes, Delete Risk"
        isDangerous={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialog({ isOpen: false, riskId: null, riskTitle: '' })}
      />
    </div>
  );
}
