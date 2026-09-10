import React from 'react';
import { AlertCircle, X, CheckCircle2, ArrowRight } from 'lucide-react';

export default function SubmissionValidationModal({ 
  isOpen, 
  onClose, 
  issues = [], 
  onFixData, 
  onSaveDraft 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="px-6 py-5 bg-red-50/80 border-b border-red-100 flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-red-100 text-red-600 rounded-xl">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Submission Blocked</h3>
              <p className="text-xs text-red-700 mt-0.5">
                Pre-submission validation failed ({issues.length} issue{issues.length === 1 ? '' : 's'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-white/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-xs text-slate-600 mb-4 leading-relaxed">
            Your environmental data cannot be formally submitted for verification until the following requirements are met:
          </p>

          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {issues.map((issue, idx) => (
              <div 
                key={idx}
                className="flex items-start space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800"
              >
                <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">
                  !
                </span>
                <span className="font-medium leading-tight pt-0.5">{issue}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center space-x-2.5">
            <span className="text-base">💡</span>
            <p>
              You can save this record as a <strong>Draft</strong> anytime to avoid losing entered numbers while you collect supporting evidence or invoices.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-3">
          {onSaveDraft && (
            <button
              type="button"
              onClick={() => {
                onSaveDraft();
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Save as Draft Instead
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (onFixData) onFixData();
              onClose();
            }}
            className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-forest-600 hover:bg-forest-700 rounded-xl shadow-xs transition-colors"
          >
            <span>Fix Data</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
