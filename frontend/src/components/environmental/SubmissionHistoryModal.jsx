import React, { useEffect, useState } from 'react';
import { 
  X, History, FileText, Download, CheckCircle2, 
  AlertTriangle, Clock, User, Calendar, ExternalLink 
} from 'lucide-react';
import SubmissionStatusBadge from './SubmissionStatusBadge';

export default function SubmissionHistoryModal({
  isOpen,
  onClose,
  moduleKey,
  recordId,
  token
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !moduleKey || !recordId) return;

    setLoading(true);
    setError(null);

    fetch(`/api/environment/submission/history/${moduleKey}/${recordId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch submission history');
        return res.json();
      })
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [isOpen, moduleKey, recordId, token]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-forest-50 text-forest-700 rounded-xl">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Audit Trail & Submission History
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Record ID: <span className="font-mono">{recordId}</span>
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Loading audit trail...
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          ) : (
            <>
              {/* Current Status Overview */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                    Current Stage
                  </span>
                  <SubmissionStatusBadge status={data.status} />
                </div>
                {data.evidence && (
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                      Attached Proof
                    </span>
                    <a
                      href={`/api/environment/evidence/${data.evidence._id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-xs font-semibold text-forest-700 hover:text-forest-800 underline"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[150px]">{data.evidence.fileName}</span>
                      <Download className="w-3 h-3 ml-0.5" />
                    </a>
                  </div>
                )}
              </div>

              {/* Reviewer Comments Warning (if correction required or rejected) */}
              {(data.reviewerComments || data.correctionReason) && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="flex items-center space-x-2 text-amber-800 font-bold text-xs mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Reviewer Comments</span>
                  </div>
                  <p className="text-xs text-amber-900 leading-relaxed font-medium">
                    "{data.reviewerComments || data.correctionReason}"
                  </p>
                </div>
              )}

              {/* Chronological Timeline */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">
                  Lifecycle Timeline
                </h4>

                {(!data.history || data.history.length === 0) ? (
                  <p className="text-xs text-slate-400 italic">No historical transitions recorded yet.</p>
                ) : (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {data.history.map((step, idx) => (
                      <div key={idx} className="relative group">
                        {/* Timeline node */}
                        <div className="absolute -left-[27px] top-1 w-5 h-5 rounded-full bg-white border-2 border-forest-600 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-forest-600" />
                        </div>

                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-colors">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-bold text-slate-800">
                              {step.action}
                            </span>
                            <SubmissionStatusBadge status={step.status} />
                          </div>

                          {step.comment && (
                            <p className="text-xs text-slate-600 my-1 font-medium bg-slate-50 p-2 rounded-lg border border-slate-100">
                              "{step.comment}"
                            </p>
                          )}

                          <div className="flex items-center space-x-4 text-[11px] text-slate-400 mt-2">
                            <span className="flex items-center space-x-1">
                              <User className="w-3 h-3" />
                              <span>{step.user}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>{step.timestamp ? new Date(step.timestamp).toLocaleString() : 'N/A'}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Close Audit Trail
          </button>
        </div>

      </div>
    </div>
  );
}
