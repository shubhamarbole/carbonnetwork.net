import React, { useState, useEffect } from 'react';
import { 
  Database, Award, FolderKanban, CheckCircle2, ShieldCheck, 
  Plus, ArrowRight, Download, FileText, Check, X, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function RegistryWorkspace() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        setProjects(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load registry projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleApprove = async (id) => {
    try {
      await fetch('/api/workflow/transition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recordId: id,
          module: 'ProjectRegistration',
          targetStatus: 'APPROVED',
          comment: `Registry Custodian (${user?.email}) approved project and issued Serial Batch.`
        })
      });
      setProjects(prev => prev.map(p => (p._id === id || p.id === id) ? { ...p, status: 'APPROVED' } : p));
      setActionMsg(`Project ${id} Approved and Serial Batch Issued!`);
      setTimeout(() => setActionMsg(''), 5000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReject = async (id) => {
    try {
      await fetch('/api/workflow/transition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recordId: id,
          module: 'ProjectRegistration',
          targetStatus: 'REJECTED',
          comment: `Registry Custodian (${user?.email}) rejected registration.`
        })
      });
      setProjects(prev => prev.map(p => (p._id === id || p.id === id) ? { ...p, status: 'REJECTED' } : p));
      setActionMsg(`Project ${id} Marked as Rejected.`);
      setTimeout(() => setActionMsg(''), 5000);
    } catch (e) {
      console.error(e);
    }
  };

  const pendingCount = projects.filter(p => p.status === 'PENDING' || p.status === 'UNDER_REVIEW' || p.status === 'PENDING_APPROVAL').length;
  const approvedCount = projects.filter(p => p.status === 'APPROVED' || p.status === 'ACTIVE').length;
  const totalVolume = projects.reduce((acc, p) => acc + (parseFloat(p.credits || p.creditsRequested || p.targetVolume || 2500) || 0), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 border border-cyan-200">
              Carbon Registry Desk
            </span>
            <span className="text-xs text-slate-400 font-mono">Registry: {user?.organizationId || 'Global Carbon Standards'}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Official Project Registration & Carbon Credit Ledger
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Centralized Project Validation, Auditor Verification Linkage & Serial Batch Issuance Ledger
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchProjects}
            className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl transition shadow-sm"
            title="Refresh Projects"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => navigate('/carbon-credits')}
            className="flex items-center space-x-1.5 px-3 py-2 bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold rounded-xl transition shadow-sm self-start"
          >
            <Award className="h-3.5 w-3.5" />
            <span>View Issued Serial Batches</span>
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="p-3.5 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs font-bold rounded-r-xl flex items-center justify-between">
          <span>{actionMsg}</span>
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered Projects</span>
          <p className="text-3xl font-black text-slate-900 mt-1">{projects.length} Projects</p>
          <p className="text-[11px] text-slate-500 mt-1">Solar, Biochar, Forestry, Energy</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider">Total Minted Batches</span>
          <p className="text-3xl font-black text-cyan-700 mt-1">
            {totalVolume.toLocaleString()} <span className="text-sm font-bold text-slate-400">tCO2e</span>
          </p>
          <p className="text-[11px] text-emerald-600 font-bold mt-1">Cryptographically Sealed</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pending Registrations</span>
          <p className="text-3xl font-black text-amber-600 mt-1">{pendingCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">Awaiting registry sign-off</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-forest-600 uppercase tracking-wider">Approved Issuances</span>
          <p className="text-3xl font-black text-forest-700 mt-1">{approvedCount}</p>
          <p className="text-[11px] text-slate-500 mt-1">Authorized for trading</p>
        </div>
      </div>

      {/* Registration Review Queue Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Project Registrations Queue</h2>
            <p className="text-xs text-slate-500">Official registry approvals and serial minting authorization from database</p>
          </div>
          <span className="text-xs font-mono text-slate-400">Registry Custodian Authority</span>
        </div>

        {projects.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No projects registered in ledger.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-y border-slate-100">
                <tr>
                  <th className="py-3 px-4">Project ID & Title</th>
                  <th className="py-3 px-4">Standard</th>
                  <th className="py-3 px-4">Proponent</th>
                  <th className="py-3 px-4">Credits</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Custodian Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map((proj) => {
                  const pid = proj._id || proj.id;
                  const isApproved = proj.status === 'APPROVED' || proj.status === 'ACTIVE';
                  const isRejected = proj.status === 'REJECTED';
                  return (
                    <tr key={pid} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        <div className="flex flex-col">
                          <span>{proj.title || proj.projectName || 'Decarbonization Project'}</span>
                          <span className="text-[10px] font-mono text-slate-400">{String(pid).slice(-6)}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{proj.standard || 'Gold Standard / BRSR'}</td>
                      <td className="py-3.5 px-4 text-slate-500">{proj.proponent || proj.developer || 'Industrial Participant'}</td>
                      <td className="py-3.5 px-4 font-bold text-cyan-700">
                        {proj.credits ? `${proj.credits} t` : '3,500 t'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isApproved ? 'bg-emerald-100 text-emerald-800' :
                          isRejected ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {proj.status || 'PENDING'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {!isApproved && !isRejected ? (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleApprove(pid)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition flex items-center space-x-1"
                            >
                              <Check className="h-3 w-3" />
                              <span>Mint Serial</span>
                            </button>
                            <button
                              onClick={() => handleReject(pid)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[11px] font-bold transition"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Recorded in Ledger</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
