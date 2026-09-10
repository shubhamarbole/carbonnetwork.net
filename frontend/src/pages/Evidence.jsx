import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useFacilities } from '../context/FacilityContext';
import { Paperclip, Plus, CheckCircle, XCircle, Clock, ShieldCheck, Download, History, ClipboardCheck, Trash2, ExternalLink, FileText, Upload } from 'lucide-react';

export default function Evidence() {
  const { token, user } = useAuth();
  const { facilities } = useFacilities();
  const [evidenceList, setEvidenceList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // File Upload Form
  const [selectedFile, setSelectedFile] = useState(null);
  const [facilityId, setFacilityId] = useState('');
  const [category, setCategory] = useState('Energy');
  const [recordId, setRecordId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [filterCategory, setFilterCategory] = useState('All');

  const canVerify = user && ['AUDITOR', 'SUPER_ADMIN', 'PLATFORM_ADMIN', 'ADMIN'].includes(user.role);

  useEffect(() => {
    if (facilities.length > 0 && !facilityId) {
      setFacilityId(facilities[0]._id);
    }
  }, [facilities]);

  const fetchEvidence = async () => {
    try {
      const res = await fetch('/api/environment/evidence', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEvidenceList(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/api/environment/audit-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchEvidence(), fetchAuditLogs()]);
      setLoading(false);
    };
    if (token) {
      loadAll();
    }
  }, [token]);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return alert('Select a file to upload (PDF, PNG, JPG, CSV, XLSX).');

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('facilityId', facilityId || '');
    formData.append('category', category);
    formData.append('recordId', recordId || '');
    formData.append('recordModel', `${category}Record`);

    try {
      const res = await fetch('/api/environment/evidence/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      if (res.ok) {
        setSelectedFile(null);
        setRecordId('');
        const fileInput = document.getElementById('evidenceFileInput');
        if (fileInput) fileInput.value = '';
        fetchEvidence();
        fetchAuditLogs();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to upload evidence');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteEvidence = async (id) => {
    if (!window.confirm('Are you sure you want to delete this evidence record?')) return;
    try {
      const res = await fetch(`/api/environment/evidence/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchEvidence();
        fetchAuditLogs();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete evidence');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleVerify = async (id, status) => {
    try {
      const res = await fetch(`/api/environment/evidence/${id}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchEvidence();
        fetchAuditLogs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[10px] font-bold">
            <CheckCircle className="h-3 w-3" />
            <span>Verified</span>
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center space-x-1 text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 text-[10px] font-bold">
            <XCircle className="h-3 w-3" />
            <span>Rejected</span>
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center space-x-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[10px] font-bold">
            <Clock className="h-3 w-3" />
            <span>Pending Audit</span>
          </span>
        );
    }
  };

  const filteredEvidence = filterCategory === 'All' 
    ? evidenceList 
    : evidenceList.filter(e => e.category?.toLowerCase() === filterCategory.toLowerCase());

  return (
    <div className="flex-1 min-h-screen bg-slate-50 pl-64 pb-12 text-[11px] text-slate-700 font-sans">
      <Navbar title="Evidence Document Library & Audit Trail" />
      
      <main className="max-w-7xl mx-auto px-8 pt-8 space-y-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Pane: Upload Evidence Form & File Library */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Upload Form */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Paperclip className="h-4 w-4 text-forest-600" />
                <span>Upload Verification Invoices / Utility Bills</span>
              </h3>
              
              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase">Target Facility</label>
                    <select
                      value={facilityId}
                      onChange={(e) => setFacilityId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none mt-1"
                    >
                      {facilities.map(f => (
                        <option key={f._id} value={f._id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none mt-1"
                    >
                      <option value="Energy">Energy (Electricity/Fuel Bills)</option>
                      <option value="GHG">GHG Emissions Invoices</option>
                      <option value="Water">Water Withdrawal & Discharge</option>
                      <option value="Waste">Waste Manifests / Weighbridge</option>
                      <option value="Pollution">Pollution Emission Reports</option>
                      <option value="Biodiversity">Biodiversity Certifications</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase">Record Tag / Ref (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. REC-2026-Q2-01"
                      value={recordId}
                      onChange={(e) => setRecordId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:outline-none mt-1"
                    />
                  </div>
                </div>

                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-forest-500 transition cursor-pointer">
                  <input
                    type="file"
                    id="evidenceFileInput"
                    onChange={handleFileChange}
                    accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.xls,.doc,.docx"
                    className="hidden"
                  />
                  <label htmlFor="evidenceFileInput" className="cursor-pointer space-y-1 block">
                    <Upload className="h-6 w-6 text-forest-600 mx-auto" />
                    <p className="font-bold text-xs text-slate-700">
                      {selectedFile ? selectedFile.name : 'Click or Drag file to attach'}
                    </p>
                    <p className="text-[9px] text-slate-400">PDF, PNG, JPG, CSV, XLSX up to 10MB</p>
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={uploading || !selectedFile}
                    className="bg-forest-600 hover:bg-forest-700 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-xl text-xs flex items-center space-x-1.5 transition"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>{uploading ? 'Uploading...' : 'Save & Link Evidence'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Document Library Filter & Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 px-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-800 text-xs">Attached Evidence Documents</h4>
                  <p className="text-[10px] text-slate-400">{filteredEvidence.length} files on record</p>
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-[10px] font-bold text-slate-400">Filter:</label>
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-2.5 py-1 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                  >
                    <option value="All">All Categories</option>
                    <option value="Energy">Energy</option>
                    <option value="GHG">GHG Emissions</option>
                    <option value="Water">Water</option>
                    <option value="Waste">Waste</option>
                    <option value="Pollution">Pollution</option>
                    <option value="Biodiversity">Biodiversity</option>
                  </select>
                  {filteredEvidence.length > 0 && (
                    <button
                      onClick={() => {
                        const headers = ['FileName', 'Category', 'FileSizeKB', 'UploadedBy', 'UploadedAt', 'Status'];
                        const rows = filteredEvidence.map(d => [
                          JSON.stringify(d.fileName || ''),
                          JSON.stringify(d.category || ''),
                          ((d.fileSize || 0) / 1024).toFixed(1),
                          JSON.stringify(d.uploadedBy || ''),
                          JSON.stringify(d.uploadedAt || ''),
                          JSON.stringify(d.verificationStatus || '')
                        ].join(','));
                        const csvContent = [headers.join(','), ...rows].join('\n');
                        const blob = new Blob([csvContent], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `ESG_Evidence_Index_${Date.now()}.csv`;
                        a.click();
                        window.URL.revokeObjectURL(url);
                      }}
                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-lg text-xs flex items-center gap-1 transition"
                      title="Export Evidence Index as CSV"
                    >
                      <Download className="h-3 w-3" />
                      <span>Export CSV</span>
                    </button>
                  )}
                </div>
              </div>

              {filteredEvidence.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-sm text-slate-700">No Evidence Uploaded</p>
                  <p className="text-xs text-slate-400 mt-1">Upload utility bills, manifests, and invoices to support your disclosures.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 font-bold text-slate-400 uppercase text-[9px] border-b border-slate-100">
                      <th className="py-3 px-6">Document Name</th>
                      <th className="py-3 px-6">Category</th>
                      <th className="py-3 px-6">Uploaded By</th>
                      <th className="py-3 px-6">Date</th>
                      <th className="py-3 px-6 text-center">Status</th>
                      <th className="py-3 px-6 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEvidence.map(doc => (
                      <tr key={doc._id} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-6 font-bold text-slate-800 flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-forest-600 shrink-0" />
                          <span className="truncate max-w-xs">{doc.fileName}</span>
                        </td>
                        <td className="py-3 px-6 text-slate-500 font-semibold">{doc.category}</td>
                        <td className="py-3 px-6 font-mono text-[10px] text-slate-500">{doc.uploadedBy}</td>
                        <td className="py-3 px-6 text-slate-400">{doc.uploadedAt}</td>
                        <td className="py-3 px-6 text-center">{getStatusBadge(doc.verificationStatus)}</td>
                        <td className="py-3 px-6 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            <a
                              href={`/api/environment/evidence/${doc._id}/download`}
                              download={doc.fileName || 'evidence-doc'}
                              className="p-1 text-slate-500 hover:text-emerald-600 transition"
                              title="Download Evidence File"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                            {doc.filePath && (
                              <a
                                href={doc.filePath}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-slate-500 hover:text-forest-600 transition"
                                title="Open File"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            )}
                            {canVerify && doc.verificationStatus === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleVerify(doc._id, 'VERIFIED')}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                  title="Approve Evidence"
                                >
                                  <CheckCircle className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleVerify(doc._id, 'REJECTED')}
                                  className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                                  title="Reject Evidence"
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDeleteEvidence(doc._id)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition"
                              title="Delete Evidence"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right Pane: Immutable Audit History */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <History className="h-4 w-4 text-blue-600" />
                <span>Immutable Audit History</span>
              </h3>
              <p className="text-[10px] text-slate-400">All tenant events, edits, and uploads are permanently logged.</p>

              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto pr-1">
                {auditLogs.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">
                    <p>No audit events recorded yet.</p>
                  </div>
                ) : (
                  auditLogs.map(log => (
                    <div key={log._id} className="py-3 space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-slate-800 text-[10px]">{log.action}</span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                        </span>
                      </div>
                      <p className="text-[9px] text-slate-500">
                        Module: <span className="font-semibold text-slate-700">{log.module}</span>
                      </p>
                      <p className="text-[9px] text-slate-400 truncate">
                        By: <span className="font-mono">{log.user}</span>
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
