import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { 
  FolderKanban, Plus, Search, Filter, CheckCircle2, Clock, 
  AlertCircle, ShieldCheck, Award, Eye, Send, FileText, Trash2, 
  RefreshCw, ArrowRight, History, Calendar, Target, Layers, Download
} from 'lucide-react';

export default function Projects() {
  const { token, user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [reviewComments, setReviewComments] = useState('');
  const [verifiedCredits, setVerifiedCredits] = useState('');
  
  // Confirmation state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    isDangerous: false,
    onConfirm: () => {}
  });

  // Create project form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'ENERGY_EFFICIENCY',
    description: '',
    baselineCO2e: '',
    targetCO2eReduction: '',
    startDate: new Date().toISOString().split('T')[0],
    completionDate: '',
    standard: 'VCS (Verified Carbon Standard)'
  });

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setProjects(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [token]);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        setShowCreateModal(false);
        setFormData({
          name: '',
          category: 'ENERGY_EFFICIENCY',
          description: '',
          baselineCO2e: '',
          targetCO2eReduction: '',
          startDate: new Date().toISOString().split('T')[0],
          completionDate: '',
          standard: 'VCS (Verified Carbon Standard)'
        });
        fetchProjects();
      }
    } catch (err) {
      console.error('Error creating project:', err);
    }
  };

  const handleViewDetails = async (projectId) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setSelectedProject(json.data);
        setShowDetailsModal(true);
      }
    } catch (err) {
      console.error('Failed to fetch details:', err);
    }
  };

  const handleSubmitForReview = (project) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Submit Project for Review',
      message: `Are you ready to submit "${project.name}" for formal verification? Once submitted, platform auditors will review your baseline calculations and evidence.`,
      confirmText: 'Submit Project',
      isDangerous: false,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/projects/${project._id}/submit`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            setConfirmDialog({ ...confirmDialog, isOpen: false });
            fetchProjects();
            if (selectedProject) setShowDetailsModal(false);
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handleReviewAction = async (action, projectId) => {
    try {
      let endpoint = `/api/projects/${projectId}/${action}`;
      let body = {};
      if (action === 'request-changes') {
        body = { comments: reviewComments };
      } else if (action === 'approve') {
        body = { comments: reviewComments };
      } else if (action === 'verify') {
        body = { verifiedReduction: verifiedCredits || selectedProject?.targetCO2eReduction };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setReviewComments('');
        setVerifiedCredits('');
        setShowDetailsModal(false);
        fetchProjects();
      }
    } catch (err) {
      console.error('Review action failed:', err);
    }
  };

  const handleArchiveProject = (project) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Archive Project',
      message: `Move "${project.name}" to the Recycle Bin? The project will be hidden from the active workspace but can be restored from the Archive Center.`,
      confirmText: 'Archive',
      isDangerous: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/projects/${project._id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            setConfirmDialog({ ...confirmDialog, isOpen: false });
            fetchProjects();
            if (selectedProject) setShowDetailsModal(false);
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  // Filtered projects
  const filteredProjects = projects.filter(p => {
    const matchesSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Calculate high-level KPIs
  const totalTargetReduction = projects.reduce((sum, p) => sum + (p.targetCO2eReduction || 0), 0);
  const totalVerifiedCredits = projects.reduce((sum, p) => sum + (p.creditsIssued || 0), 0);
  const pendingReviewCount = projects.filter(p => p.status === 'SUBMITTED' || p.status === 'UNDER_REVIEW').length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">Draft</span>;
      case 'SUBMITTED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 flex items-center gap-1"><Clock className="h-3 w-3" /> Submitted</span>;
      case 'UNDER_REVIEW':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700 flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Under Review</span>;
      case 'CHANGES_REQUESTED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Changes Needed</span>;
      case 'APPROVED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-teal-100 text-teal-700 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Approved</span>;
      case 'VERIFIED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1"><Award className="h-3 w-3" /> Verified Carbon</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  const isReviewer = user?.role === 'PLATFORM_ADMIN' || user?.role === 'SUPER_ADMIN' || user?.role === 'AUDITOR';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar title="Carbon & ESG Project Management" />

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
              <FolderKanban className="h-7 w-7 text-emerald-600" />
              Project Registry & Verification
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage decarbonization projects, evidence documentation, and carbon credit issuance workflows.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchProjects}
              className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-slate-800 hover:bg-slate-50 shadow-sm transition"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition"
            >
              <Plus className="h-4 w-4" />
              <span>New Carbon Project</span>
            </button>
          </div>
        </div>

        {/* High-Level Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Projects</span>
              <Layers className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-slate-800 mt-2">{projects.length}</p>
            <span className="text-xs text-slate-500 mt-1 block">Active across organization</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">In Verification</span>
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-black text-blue-700 mt-2">{pendingReviewCount}</p>
            <span className="text-xs text-slate-500 mt-1 block">Under auditor review</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Target Reduction</span>
              <Target className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-2xl font-black text-purple-700 mt-2">{totalTargetReduction.toLocaleString()} <span className="text-sm font-semibold text-slate-500">tCO₂e</span></p>
            <span className="text-xs text-slate-500 mt-1 block">Aggregate emission target</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Verified Credits</span>
              <Award className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-2xl font-black text-emerald-600 mt-2">{totalVerifiedCredits.toLocaleString()} <span className="text-sm font-semibold text-slate-500">Credits</span></p>
            <span className="text-xs text-slate-500 mt-1 block">Eligible for retirement</span>
          </div>
        </div>

        {/* Search, Filter & Tabs */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center space-x-3 w-full md:w-auto">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-sm font-medium text-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Categories</option>
                <option value="ENERGY_EFFICIENCY">Energy Efficiency</option>
                <option value="RENEWABLE_ENERGY">Renewable Energy</option>
                <option value="METHANE_CAPTURE">Methane Capture</option>
                <option value="REFORESTATION">Reforestation</option>
                <option value="WASTE_DIVERSION">Waste Diversion</option>
                <option value="WATER_CONSERVATION">Water Conservation</option>
              </select>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center space-x-2 border-t border-slate-100 pt-3 overflow-x-auto pb-1 text-sm">
            {[
              { id: 'all', label: 'All Projects' },
              { id: 'DRAFT', label: 'Drafts' },
              { id: 'SUBMITTED', label: 'Submitted' },
              { id: 'UNDER_REVIEW', label: 'Under Review' },
              { id: 'CHANGES_REQUESTED', label: 'Revisions Needed' },
              { id: 'APPROVED', label: 'Approved' },
              { id: 'VERIFIED', label: 'Verified' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                  statusFilter === tab.id
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Project Cards / Grid */}
        {loading ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500">
            <RefreshCw className="h-8 w-8 mx-auto animate-spin text-emerald-600 mb-3" />
            <p className="font-semibold">Loading projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center">
            <FolderKanban className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-700">No Projects Found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              No projects match your filter criteria. Create a new carbon offset or sustainability project to get started.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 inline-flex items-center space-x-2 bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-emerald-700 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Create First Project</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map(project => (
              <div
                key={project._id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                      {project.category.replace('_', ' ')}
                    </span>
                    {getStatusBadge(project.status)}
                  </div>

                  <h3 className="text-lg font-bold text-slate-800 leading-snug hover:text-emerald-600 transition cursor-pointer" onClick={() => handleViewDetails(project._id)}>
                    {project.name}
                  </h3>
                  <p className="text-sm text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {project.description || 'No description provided for this decarbonization project.'}
                  </p>

                  {/* Metrics Box */}
                  <div className="mt-5 p-3.5 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Target Reduction</span>
                      <span className="font-bold text-slate-800 text-sm">{project.targetCO2eReduction} tCO₂e</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Standard</span>
                      <span className="font-bold text-slate-700 truncate block">{project.standard}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Start Date</span>
                      <span className="font-semibold text-slate-600">{project.startDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Credits Minted</span>
                      <span className="font-bold text-emerald-700">{project.creditsIssued || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => handleViewDetails(project._id)}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <Eye className="h-3.5 w-3.5" /> View Details
                  </button>

                  <div className="flex items-center space-x-2">
                    {(project.status === 'DRAFT' || project.status === 'CHANGES_REQUESTED') && (
                      <button
                        onClick={() => handleSubmitForReview(project)}
                        className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition flex items-center gap-1"
                      >
                        <Send className="h-3 w-3" /> Submit
                      </button>
                    )}

                    <button
                      onClick={() => handleArchiveProject(project)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Archive Project"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* CREATE PROJECT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-1">New Carbon & ESG Project</h2>
            <p className="text-xs text-slate-500 mb-6">Register a project to track carbon abatement and qualify for verified credits.</p>

            <form onSubmit={handleCreateProject} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 500kW Rooftop Solar Transition"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                  >
                    <option value="ENERGY_EFFICIENCY">Energy Efficiency</option>
                    <option value="RENEWABLE_ENERGY">Renewable Energy</option>
                    <option value="METHANE_CAPTURE">Methane Capture</option>
                    <option value="REFORESTATION">Reforestation</option>
                    <option value="WASTE_DIVERSION">Waste Diversion</option>
                    <option value="WATER_CONSERVATION">Water Conservation</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Verification Standard</label>
                  <input
                    type="text"
                    value={formData.standard}
                    onChange={(e) => setFormData({ ...formData, standard: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Baseline Emissions (tCO₂e)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 450.5"
                    value={formData.baselineCO2e}
                    onChange={(e) => setFormData({ ...formData, baselineCO2e: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Reduction (tCO₂e) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="e.g. 120"
                    value={formData.targetCO2eReduction}
                    onChange={(e) => setFormData({ ...formData, targetCO2eReduction: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Completion</label>
                  <input
                    type="date"
                    value={formData.completionDate}
                    onChange={(e) => setFormData({ ...formData, completionDate: e.target.value })}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Project Description</label>
                <textarea
                  rows="3"
                  placeholder="Detail the technical specifications and emission reduction methodology..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md transition"
                >
                  Create Project Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROJECT DETAILS & REVIEW MODAL */}
      {showDetailsModal && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg">
                    {selectedProject.category}
                  </span>
                  {getStatusBadge(selectedProject.status)}
                </div>
                <h2 className="text-xl font-bold text-slate-800">{selectedProject.name}</h2>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-6 text-sm">
              {/* Description */}
              <div>
                <h4 className="font-bold text-slate-700 mb-1">Description</h4>
                <p className="text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  {selectedProject.description || 'No detailed description provided.'}
                </p>
              </div>

              {/* Carbon Reduction Specifications */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-400 font-medium block">Baseline Emissions</span>
                  <span className="text-lg font-bold text-slate-800">{selectedProject.baselineCO2e || 0} tCO₂e</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-400 font-medium block">Target Reduction</span>
                  <span className="text-lg font-bold text-purple-700">{selectedProject.targetCO2eReduction || 0} tCO₂e</span>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="text-xs text-slate-400 font-medium block">Verified Credits Minted</span>
                  <span className="text-lg font-bold text-emerald-600">{selectedProject.creditsIssued || 0}</span>
                </div>
              </div>

              {/* Reviewer Comments (if any) */}
              {selectedProject.reviewerComments && (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <h4 className="font-bold text-amber-800 flex items-center gap-1.5 mb-1">
                    <AlertCircle className="h-4 w-4" /> Reviewer Notes & Revision Comments
                  </h4>
                  <p className="text-amber-900 text-xs leading-relaxed">{selectedProject.reviewerComments}</p>
                </div>
              )}

              {/* Linked Evidence Documents */}
              <div>
                <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-slate-400" /> Linked Verification Evidence ({selectedProject.documents?.length || 0})
                </h4>
                {(!selectedProject.documents || selectedProject.documents.length === 0) ? (
                  <p className="text-xs text-slate-400 italic">No evidence invoices or engineering reports attached yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedProject.documents.map(doc => (
                      <div key={doc._id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="font-medium text-slate-700 truncate">{doc.fileName}</span>
                        <div className="flex items-center space-x-3">
                          <span className="text-xs text-slate-400">{(doc.fileSize / 1024).toFixed(1)} KB</span>
                          <a
                            href={`/api/environment/evidence/${doc._id}/download`}
                            download={doc.fileName || 'evidence-doc'}
                            className="p-1 text-slate-500 hover:text-emerald-600 rounded transition"
                            title="Download Evidence"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Auditor / Reviewer Action Panel */}
              {isReviewer && (
                <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-4">
                  <h4 className="font-bold text-slate-200 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-emerald-400" /> Platform Auditor Review Controls
                  </h4>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Review Comments / Revisions Required</label>
                    <textarea
                      rows="2"
                      placeholder="Add compliance notes or specific revision requirements..."
                      value={reviewComments}
                      onChange={(e) => setReviewComments(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    ></textarea>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {selectedProject.status === 'SUBMITTED' && (
                      <button
                        onClick={() => handleReviewAction('review', selectedProject._id)}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition"
                      >
                        Start Review
                      </button>
                    )}

                    <button
                      onClick={() => handleReviewAction('request-changes', selectedProject._id)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition"
                    >
                      Request Changes
                    </button>

                    <button
                      onClick={() => handleReviewAction('approve', selectedProject._id)}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg transition"
                    >
                      Approve Project
                    </button>

                    <button
                      onClick={() => handleReviewAction('verify', selectedProject._id)}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition flex items-center gap-1"
                    >
                      <Award className="h-3.5 w-3.5" /> Verify & Mint Carbon Credits
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => handleArchiveProject(selectedProject)}
                className="text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" /> Archive Project
              </button>

              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        isDangerous={confirmDialog.isDangerous}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />
    </div>
  );
}
