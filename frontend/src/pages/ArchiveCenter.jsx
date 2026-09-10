import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { 
  Trash2, RotateCcw, AlertTriangle, RefreshCw, FolderKanban, 
  FileText, ShieldAlert, Archive
} from 'lucide-react';

export default function ArchiveCenter() {
  const { token, user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Confirmation state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    isDangerous: false,
    onConfirm: () => {}
  });

  const fetchArchive = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/archive', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setItems(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load archive:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchive();
  }, [token]);

  const handleRestore = (item) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Restore Record',
      message: `Restore "${item.name}" back to the active workspace? It will reappear in standard project lists and reporting calculations.`,
      confirmText: 'Restore Record',
      isDangerous: false,
      onConfirm: async () => {
        try {
          const endpoint = item.entityType === 'Project'
            ? `/api/projects/${item._id}/restore`
            : `/api/archive/restore`;

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ entityType: item.entityType, id: item._id })
          });

          if (res.ok) {
            setConfirmDialog({ ...confirmDialog, isOpen: false });
            fetchArchive();
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const handlePermanentDelete = (item) => {
    setConfirmDialog({
      isOpen: true,
      title: 'PERMANENT DELETION (SUPER ADMIN ONLY)',
      message: `CRITICAL WARNING: Permanently delete "${item.name}"? This record will be completely eradicated from the database and cannot be recovered. Audit logs will preserve this deletion event.`,
      confirmText: 'Permanently Eradicate',
      isDangerous: true,
      onConfirm: async () => {
        try {
          const endpoint = item.entityType === 'Project'
            ? `/api/projects/${item._id}/permanent`
            : `/api/archive/permanent`;

          const res = await fetch(endpoint, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ entityType: item.entityType, id: item._id })
          });

          if (res.ok) {
            setConfirmDialog({ ...confirmDialog, isOpen: false });
            fetchArchive();
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar title="Recycle Bin & Archive Center" />

      <main className="flex-1 p-8 max-w-6xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
              <Archive className="h-7 w-7 text-amber-600" />
              Soft Delete Archive & Recycle Bin
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Recover accidentally archived projects, documents, and records. Only Super Admins may permanently eradicate records.
            </p>
          </div>

          <button
            onClick={fetchArchive}
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 shadow-sm transition"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Informational Banner */}
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start space-x-3 text-xs text-amber-900 leading-relaxed">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Data Retention Policy:</span> Soft-deleted items are safely preserved with immutable audit metadata (`isDeleted: true`, `deletedAt`, `deletedBy`). Authorized administrators can restore records at any time.
          </div>
        </div>

        {/* Content Table / Cards */}
        {loading ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500">
            <RefreshCw className="h-8 w-8 mx-auto animate-spin text-amber-600 mb-3" />
            <p className="font-semibold">Loading archived records...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white p-16 rounded-2xl border border-dashed border-slate-300 text-center">
            <Trash2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-700">Recycle Bin is Empty</h3>
            <p className="text-sm text-slate-500 mt-1">No soft-deleted records currently exist in your workspace.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Record Name</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Archived Date</th>
                    <th className="px-6 py-4">Archived By</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map(item => (
                    <tr key={item._id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-semibold text-slate-800 flex items-center gap-2">
                        {item.entityType === 'Project' ? (
                          <FolderKanban className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <FileText className="h-4 w-4 text-blue-600" />
                        )}
                        <span>{item.entityType}</span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700 max-w-xs truncate">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {item.category || 'General'}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        {item.deletedAt ? new Date(item.deletedAt).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                        {item.deletedBy || 'system'}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => handleRestore(item)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1"
                        >
                          <RotateCcw className="h-3 w-3" /> Restore
                        </button>

                        {isSuperAdmin && (
                          <button
                            onClick={() => handlePermanentDelete(item)}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg transition inline-flex items-center gap-1"
                            title="Permanent Eradication"
                          >
                            <Trash2 className="h-3 w-3" /> Eradicate
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
      </main>

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
