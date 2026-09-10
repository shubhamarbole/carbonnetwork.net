import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, Upload, Search, FileText, CheckCircle2, AlertCircle, Clock,
  RefreshCw, Trash2, Eye, ExternalLink, ShieldAlert, ArrowLeft, Filter,
  Layers, Database, Sparkles, X, FileCheck, FileWarning, Cpu
} from 'lucide-react';

const CATEGORIES = [
  'ALL',
  'ESG Policy',
  'Environmental Policy',
  'Compliance Policy',
  'Risk Policy',
  'SOP',
  'Audit Report',
  'Project Document',
  'Supplier Document',
  'Carbon Methodology',
  'Regulatory Document',
  'Internal Policy',
  'Other'
];

const STATUS_OPTIONS = ['ALL', 'READY', 'PROCESSING', 'FAILED', 'UPLOADED', 'ARCHIVED'];

export default function RiskKnowledge() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [projectsList, setProjectsList] = useState([]);

  // Upload modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [uploadCategory, setUploadCategory] = useState('ESG Policy');
  const [uploadProjectId, setUploadProjectId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);

  // Detail preview modal
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Reprocessing state
  const [reprocessingId, setReprocessingId] = useState(null);

  // Semantic Vector Search test box
  const [searchTestQuery, setSearchTestQuery] = useState('');
  const [isSearchingTest, setIsSearchingTest] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [searchTestError, setSearchTestError] = useState(null);

  const token = localStorage.getItem('token') || '';

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (projectFilter !== 'ALL') params.append('project_id', projectFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/knowledge/documents?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setDocuments(json.data || []);
      } else {
        setError(json.message || 'Failed to fetch knowledge documents.');
      }
    } catch (err) {
      setError(`Network error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/risks/meta/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setProjectsList(json.data || []);
      }
    } catch (err) {
      console.warn('Could not fetch projects list:', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchProjects();
  }, [categoryFilter, statusFilter, projectFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDocuments();
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a file to upload.');
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);
      setUploadSuccess(null);

      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('display_name', displayName || uploadFile.name);
      formData.append('category', uploadCategory);
      if (uploadProjectId) {
        formData.append('project_id', uploadProjectId);
      }

      const res = await fetch('/api/knowledge/documents', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setUploadSuccess(`'${json.data.filename}' uploaded and indexed successfully (${json.data.chunk_count} chunks).`);
        setUploadFile(null);
        setDisplayName('');
        fetchDocuments();
        setTimeout(() => {
          setIsUploadOpen(false);
          setUploadSuccess(null);
        }, 1500);
      } else {
        setUploadError(json.message || 'Upload failed.');
      }
    } catch (err) {
      setUploadError(`Upload network error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleReprocess = async (docId) => {
    try {
      setReprocessingId(docId);
      const res = await fetch(`/api/knowledge/documents/${docId}/reprocess`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok && json.success) {
        fetchDocuments();
      } else {
        alert(json.message || 'Reprocessing failed.');
      }
    } catch (err) {
      alert(`Reprocess error: ${err.message}`);
    } finally {
      setReprocessingId(null);
    }
  };

  const handleDelete = async (docId, filename) => {
    if (!window.confirm(`Are you sure you want to delete '${filename}' and remove all its vectors from Qdrant?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/knowledge/documents/${docId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok && json.success) {
        fetchDocuments();
        if (selectedDoc?.document_id === docId) {
          setSelectedDoc(null);
        }
      } else {
        alert(json.message || 'Deletion failed.');
      }
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const handleSemanticSearchTest = async (e) => {
    e.preventDefault();
    if (!searchTestQuery.trim()) return;

    try {
      setIsSearchingTest(true);
      setSearchTestError(null);
      setSearchResults(null);

      const res = await fetch('/api/knowledge/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          query_text: searchTestQuery.trim(),
          top_k: 5,
          min_score: 0.1
        })
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setSearchResults(json.data || []);
      } else {
        setSearchTestError(json.message || 'Semantic search test failed.');
      }
    } catch (err) {
      setSearchTestError(`Search error: ${err.message}`);
    } finally {
      setIsSearchingTest(false);
    }
  };

  // Summary counts
  const totalCount = documents.length;
  const readyCount = documents.filter(d => d.processing_status === 'READY').length;
  const processingCount = documents.filter(d => d.processing_status === 'PROCESSING' || d.processing_status === 'UPLOADED').length;
  const failedCount = documents.filter(d => d.processing_status === 'FAILED').length;

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'READY':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            READY
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <RefreshCw className="w-3 h-3 mr-1 text-blue-600 animate-spin" />
            PROCESSING
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertCircle className="w-3 h-3 mr-1 text-rose-600" />
            FAILED
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            ARCHIVED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3 mr-1 text-amber-600" />
            {status || 'UPLOADED'}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-6 lg:p-8">
      {/* Header Breadcrumb */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <Link to="/risk-manager" className="hover:text-slate-700 flex items-center">
              <ShieldAlert className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              Risk Manager
            </Link>
            <span>/</span>
            <span className="text-slate-800 flex items-center">
              <BookOpen className="w-3.5 h-3.5 mr-1 text-indigo-600" />
              Knowledge Base
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-indigo-600" />
            RAG Knowledge Base
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage organizational policies, standard operating procedures, and audit reports to ground AI risk analysis.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchDocuments()}
            className="inline-flex items-center px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-sm transition"
            title="Refresh documents"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => {
              setUploadError(null);
              setUploadSuccess(null);
              setIsUploadOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            Upload Document
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Documents</span>
            <Database className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{totalCount}</p>
          <span className="text-xs text-slate-400 mt-1 block">In knowledge base</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ready / Indexed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-2">{readyCount}</p>
          <span className="text-xs text-slate-400 mt-1 block">Available for RAG</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Processing</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-blue-700 mt-2">{processingCount}</p>
          <span className="text-xs text-slate-400 mt-1 block">Ingesting & chunking</span>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Errors / Failed</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-700 mt-2">{failedCount}</p>
          <span className="text-xs text-slate-400 mt-1 block">Requires re-indexing</span>
        </div>
      </div>

      {/* Semantic Vector Search Sandbox */}
      <div className="max-w-7xl mx-auto mb-6 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-xl p-5 text-white shadow-sm border border-indigo-950">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-300" />
            <h2 className="text-base font-bold text-white">Semantic Vector Search Sandbox</h2>
            <span className="text-xs bg-indigo-500/30 text-indigo-200 px-2 py-0.5 rounded border border-indigo-400/30 font-mono">
              Qdrant Vector Engine
            </span>
          </div>
          <span className="text-xs text-indigo-300 hidden sm:inline">Tenant Isolated Retrieval</span>
        </div>
        <p className="text-xs text-indigo-200 mb-3">
          Test semantic vector retrieval in real-time. Enter a risk scenario or topic to inspect matching knowledge chunks and relevance scores.
        </p>

        <form onSubmit={handleSemanticSearchTest} className="flex gap-2">
          <input
            type="text"
            value={searchTestQuery}
            onChange={(e) => setSearchTestQuery(e.target.value)}
            placeholder="e.g. Flare tip inspection protocol, carbon methodology leakage risk, water discharge pH standards..."
            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3.5 py-2 text-sm text-white placeholder:text-indigo-200/50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            type="submit"
            disabled={isSearchingTest || !searchTestQuery.trim()}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
          >
            {isSearchingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            Retrieve
          </button>
        </form>

        {searchTestError && (
          <div className="mt-3 p-2.5 bg-rose-500/20 border border-rose-400/30 rounded text-xs text-rose-200">
            {searchTestError}
          </div>
        )}

        {searchResults && (
          <div className="mt-4 bg-white/5 border border-white/10 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-indigo-200">
                Retrieved {searchResults.length} relevant chunk(s)
              </span>
              <button
                onClick={() => setSearchResults(null)}
                className="text-xs text-indigo-300 hover:text-white"
              >
                Close Results
              </button>
            </div>
            {searchResults.length === 0 ? (
              <p className="text-xs text-indigo-300/80 italic">No matching evidence chunks found above threshold.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {searchResults.map((hit, idx) => (
                  <div key={idx} className="bg-white/10 border border-white/10 rounded p-2.5 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-white flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-indigo-300" />
                        {hit.filename}
                      </span>
                      <span className="bg-indigo-400/20 text-indigo-200 px-1.5 py-0.5 rounded font-mono text-[11px]">
                        {Math.round(hit.score * 100)}% match
                      </span>
                    </div>
                    <div className="text-[11px] text-indigo-200/80 flex gap-3 mb-1.5 font-mono">
                      {hit.page && <span>Page: {hit.page}</span>}
                      {hit.section && <span>Section: {hit.section}</span>}
                      <span>Chunk: {hit.chunk_id}</span>
                    </div>
                    <p className="text-slate-200 font-serif text-[12px] bg-black/20 p-1.5 rounded">
                      "{hit.text}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters and Controls */}
      <div className="max-w-7xl mx-auto bg-white rounded-xl p-4 border border-slate-200 shadow-sm mb-6">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Keyword Search */}
          <div className="lg:col-span-2 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by filename or title..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'ALL' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Project Filter */}
          <div>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Projects</option>
              {projectsList.map(proj => (
                <option key={proj._id || proj.id} value={proj._id || proj.id}>
                  {proj.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {STATUS_OPTIONS.map(st => (
                <option key={st} value={st}>
                  {st === 'ALL' ? 'All Statuses' : st}
                </option>
              ))}
            </select>
          </div>
        </form>
      </div>

      {/* Main Documents Table */}
      <div className="max-w-7xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
            <p className="text-sm font-medium">Loading knowledge base documents...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 flex flex-col items-center">
            <AlertCircle className="w-8 h-8 mb-2 text-rose-500" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center">
            <FileText className="w-12 h-12 text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-700">No Knowledge Documents Found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              Upload PDF, DOCX, TXT, or CSV documents such as ESG policies, SOPs, and compliance guidelines to enable evidence-backed AI risk analysis.
            </p>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="mt-4 inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Upload First Document
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Document</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Chunks</th>
                  <th className="px-4 py-3">Uploaded By</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <tr key={doc.document_id || doc._id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 leading-snug">
                            {doc.display_name || doc.filename}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {doc.filename} &bull; {(doc.size / 1024).toFixed(1)} KB
                          </p>
                          {doc.processing_error && (
                            <p className="text-[11px] text-rose-600 mt-0.5 flex items-center gap-1 font-sans">
                              <AlertCircle className="w-3 h-3 flex-shrink-0" />
                              {doc.processing_error}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {doc.category || 'Other'}
                      </span>
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap">
                      {renderStatusBadge(doc.processing_status)}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap font-mono text-slate-700">
                      {doc.chunk_count || 0}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {doc.uploaded_by || 'System'}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-slate-400">
                      {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'N/A'}
                    </td>

                    <td className="px-4 py-3 whitespace-nowrap text-right space-x-1">
                      <button
                        onClick={() => setSelectedDoc(doc)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 transition"
                        title="View Metadata"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleReprocess(doc.document_id)}
                        disabled={reprocessingId === doc.document_id}
                        className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-100 transition disabled:opacity-40"
                        title="Reprocess / Re-index"
                      >
                        <RefreshCw className={`w-4 h-4 ${reprocessingId === doc.document_id ? 'animate-spin text-blue-600' : ''}`} />
                      </button>

                      <button
                        onClick={() => handleDelete(doc.document_id, doc.filename)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition"
                        title="Delete Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-indigo-600" />
                Upload Knowledge Document
              </h2>
              <button
                onClick={() => setIsUploadOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {/* File input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document File * (PDF, DOCX, TXT, CSV up to 25MB)
                </label>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.csv"
                  onChange={(e) => {
                    const f = e.target.files[0];
                    setUploadFile(f);
                    if (f && !displayName) {
                      setDisplayName(f.name.replace(/\.[^/.]+$/, ''));
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 border border-slate-300 rounded-lg cursor-pointer bg-slate-50"
                  required
                />
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Acme Corp ESG Policy 2026"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category *
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CATEGORIES.filter(c => c !== 'ALL').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Project Scope */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Project Scope (Optional)
                </label>
                <select
                  value={uploadProjectId}
                  onChange={(e) => setUploadProjectId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">General / Organization-Wide</option>
                  {projectsList.map(proj => (
                    <option key={proj._id || proj.id} value={proj._id || proj.id}>
                      {proj.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadFile}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Indexing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      Upload & Index
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Metadata Detail Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                Document Metadata
              </h2>
              <button
                onClick={() => setSelectedDoc(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Document ID:</span>
                <span className="font-mono text-slate-800">{selectedDoc.document_id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Display Name:</span>
                <span className="font-semibold text-slate-800">{selectedDoc.display_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Filename:</span>
                <span className="text-slate-800">{selectedDoc.filename}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Category:</span>
                <span className="font-medium text-slate-800">{selectedDoc.category}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Status:</span>
                <span>{renderStatusBadge(selectedDoc.processing_status)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Indexed Chunks:</span>
                <span className="font-mono text-slate-800">{selectedDoc.chunk_count || 0}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Embedding Model:</span>
                <span className="font-mono text-slate-800">{selectedDoc.embedding_model || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Uploaded By:</span>
                <span className="text-slate-800">{selectedDoc.uploaded_by}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Upload Date:</span>
                <span className="text-slate-800">{selectedDoc.created_at}</span>
              </div>
              {selectedDoc.processing_error && (
                <div className="py-2">
                  <span className="text-rose-600 font-semibold block mb-1">Processing Error:</span>
                  <p className="p-2 bg-rose-50 border border-rose-200 rounded text-rose-800 font-mono text-[11px]">
                    {selectedDoc.processing_error}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 flex justify-end gap-2 border-t border-slate-100">
              <button
                onClick={() => handleReprocess(selectedDoc.document_id)}
                className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reprocess
              </button>
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-800 rounded-lg hover:bg-slate-900 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
