import React, { useState } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export default function EvidenceUploadModal({
  isOpen,
  onClose,
  moduleKey,
  recordId,
  facilityId,
  token,
  onSuccess
}) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const categoryMap = {
    water: 'Water',
    energy: 'Energy',
    ghg: 'GHG',
    waste: 'Waste',
    pollution: 'Pollution',
    biodiversity: 'Biodiversity'
  };
  const category = categoryMap[moduleKey.toLowerCase()] || 'Energy';

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    formData.append('recordId', recordId || '');
    formData.append('facilityId', facilityId || 'fac-main');

    try {
      const res = await fetch('/api/environment/evidence/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to upload evidence');
      }

      setUploading(false);
      if (onSuccess) onSuccess(json);
      onClose();
    } catch (err) {
      setError(err.message);
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-forest-50 text-forest-700 rounded-xl">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Upload Verification Evidence
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Category: <span className="font-semibold text-slate-700">{category}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleUpload} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="border-2 border-dashed border-slate-300 hover:border-forest-500 rounded-2xl p-6 text-center transition-colors bg-slate-50/50">
            <input
              type="file"
              id="evidenceFileInput"
              className="hidden"
              onChange={handleFileChange}
              accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.xls,.docx"
            />
            <label
              htmlFor="evidenceFileInput"
              className="cursor-pointer flex flex-col items-center justify-center space-y-2"
            >
              <div className="w-12 h-12 rounded-full bg-forest-50 text-forest-600 flex items-center justify-center">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  {file ? file.name : 'Click to select proof document'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  PDF, PNG, JPG, CSV, XLSX, DOCX (Max 10MB)
                </p>
              </div>
            </label>
          </div>

          {file && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-800">
              <div className="flex items-center space-x-2 truncate">
                <FileText className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="font-semibold truncate">{file.name}</span>
              </div>
              <span className="text-[11px] text-emerald-600 shrink-0">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>
          )}

          <div className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
            ℹ️ Invoices, utility bills, meter calibration certificates, and waste disposal manifests are permanently logged in the audit trail.
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className="px-4 py-2 text-xs font-bold text-white bg-forest-600 hover:bg-forest-700 disabled:bg-slate-300 rounded-xl shadow-xs transition-colors"
            >
              {uploading ? 'Uploading...' : 'Attach & Upload Proof'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
