import React from 'react';
import { AlertTriangle, Edit3, UploadCloud, RefreshCw } from 'lucide-react';

export default function CorrectionAlertBanner({
  record,
  onEdit,
  onUploadEvidence,
  onResubmit
}) {
  if (!record || (record.status !== 'CORRECTION_REQUIRED' && record.status !== 'CHANGES_REQUESTED')) {
    return null;
  }

  return (
    <div className="bg-amber-50/90 border border-amber-300 rounded-xl p-3.5 mb-3 text-xs text-amber-900 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start space-x-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-amber-950">Correction Required by Reviewer</span>
              {record.correctionReason && (
                <span className="px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 font-mono text-[10px] font-bold">
                  {record.correctionReason}
                </span>
              )}
            </div>
            <p className="mt-1 text-amber-900 text-xs leading-relaxed font-medium">
              "{record.reviewerComments || 'Please review and adjust entered parameters or upload missing verification proof.'}"
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2 shrink-0">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(record)}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-white hover:bg-amber-100/50 text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-700" />
              <span>Fix Data</span>
            </button>
          )}

          {onUploadEvidence && (
            <button
              type="button"
              onClick={() => onUploadEvidence(record)}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-white hover:bg-amber-100/50 text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
            >
              <UploadCloud className="w-3.5 h-3.5 text-amber-700" />
              <span>Attach Evidence</span>
            </button>
          )}

          {onResubmit && (
            <button
              type="button"
              onClick={() => onResubmit(record)}
              className="inline-flex items-center space-x-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Resubmit</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
