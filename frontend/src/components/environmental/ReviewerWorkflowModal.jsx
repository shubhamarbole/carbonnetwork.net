import React, { useState } from 'react';
import { 
  X, CheckCircle2, AlertTriangle, XCircle, 
  Search, ShieldAlert, FileCheck, ArrowRight 
} from 'lucide-react';
import SubmissionStatusBadge from './SubmissionStatusBadge';

export default function ReviewerWorkflowModal({
  isOpen,
  onClose,
  moduleKey,
  record,
  token,
  currentUser,
  onSuccess
}) {
  const [targetAction, setTargetAction] = useState('VERIFY'); // 'REVIEW', 'CORRECTION', 'VERIFY', 'REJECT'
  const [comment, setComment] = useState('');
  const [reasonCode, setReasonCode] = useState('INVOICE_MISMATCH');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !record) return null;

  // Non-self verification check
  const isSubmitterOrg = currentUser && currentUser.organizationId && 
    (currentUser.organizationId === record.organizationId) && 
    !['SUPER_ADMIN', 'PLATFORM_ADMIN'].includes(currentUser.role);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitterOrg) {
      setError('Non-Self-Verification Rule Enforced: You cannot verify or review data submitted by your own organization.');
      return;
    }

    let targetStatus = 'VERIFIED';
    if (targetAction === 'REVIEW') targetStatus = 'UNDER_REVIEW';
    if (targetAction === 'CORRECTION') targetStatus = 'CORRECTION_REQUIRED';
    if (targetAction === 'REJECT') targetStatus = 'REJECTED';

    if ((targetAction === 'CORRECTION' || targetAction === 'REJECT') && !comment.trim()) {
      setError('Please provide detailed reviewer comments explaining the required corrections or rejection reasons.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/environment/submission/transition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          module: moduleKey,
          recordId: record._id,
          targetStatus,
          comment,
          reasonCode: targetAction === 'CORRECTION' ? reasonCode : undefined
        })
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to update record status');
      }

      setSubmitting(false);
      onSuccess(json.record);
      onClose();
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="px-6 py-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Verification & Audit Workflow
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Module: <span className="font-semibold text-slate-700 capitalize">{moduleKey}</span> | ID: <span className="font-mono">{record._id}</span>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Non-self verification warning banner */}
          {isSubmitterOrg && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start space-x-2.5">
              <ShieldAlert className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">Non-Self-Verification Rule Enforced</p>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  Platform compliance rules strictly prohibit organizations from verifying or auditing their own environmental submissions. An independent auditor or verifier must approve this record.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Record Summary */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Current Status:</span>
              <SubmissionStatusBadge status={record.status} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Facility:</span>
              <span className="font-semibold text-slate-800">{record.facilityId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Reporting Period:</span>
              <span className="font-semibold text-slate-800">{record.reportingPeriod || 'Quarterly'}</span>
            </div>
            {record.evidenceDetails && (
              <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                <span className="text-slate-500">Attached Evidence:</span>
                <span className="font-semibold text-emerald-700 truncate max-w-[200px]">
                  📎 {record.evidenceDetails.fileName}
                </span>
              </div>
            )}
          </div>

          {/* Action Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Select Workflow Action
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTargetAction('REVIEW')}
                className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                  targetAction === 'REVIEW' 
                    ? 'border-amber-400 bg-amber-50/70 text-amber-900 ring-2 ring-amber-200' 
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-bold mb-1">
                  <Search className="w-3.5 h-3.5 text-amber-600" />
                  <span>Under Review</span>
                </div>
                <p className="text-[10px] text-slate-500 font-normal">Mark in-progress audit</p>
              </button>

              <button
                type="button"
                onClick={() => setTargetAction('CORRECTION')}
                className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                  targetAction === 'CORRECTION' 
                    ? 'border-red-400 bg-red-50/70 text-red-900 ring-2 ring-red-200' 
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-bold mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                  <span>Request Correction</span>
                </div>
                <p className="text-[10px] text-slate-500 font-normal">Require submitter fixes</p>
              </button>

              <button
                type="button"
                onClick={() => setTargetAction('VERIFY')}
                className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                  targetAction === 'VERIFY' 
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 ring-2 ring-emerald-200' 
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-bold mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verify & Approve</span>
                </div>
                <p className="text-[10px] text-slate-500 font-normal">Mark officially verified</p>
              </button>

              <button
                type="button"
                onClick={() => setTargetAction('REJECT')}
                className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                  targetAction === 'REJECT' 
                    ? 'border-rose-400 bg-rose-50/70 text-rose-900 ring-2 ring-rose-200' 
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center space-x-1.5 font-bold mb-1">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>Reject Record</span>
                </div>
                <p className="text-[10px] text-slate-500 font-normal">Does not meet criteria</p>
              </button>
            </div>
          </div>

          {/* Reason Code (for correction) */}
          {targetAction === 'CORRECTION' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Reason Code
              </label>
              <select
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
              >
                <option value="INVOICE_MISMATCH">Invoice / Bill Figure Mismatch</option>
                <option value="MISSING_CALIBRATION">Missing Device Calibration Certificate</option>
                <option value="OUTLIER_DATA">Unusual Outlier / Spike Detected</option>
                <option value="UNCLEAR_CALCULATION">Unclear Activity Calculation Lineage</option>
                <option value="INCORRECT_UNIT">Incorrect Activity Unit Specified</option>
                <option value="OTHER">Other Clarification Required</option>
              </select>
            </div>
          )}

          {/* Comments */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Reviewer Notes / Feedback {targetAction === 'CORRECTION' && <span className="text-red-500">*</span>}
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                targetAction === 'VERIFY' 
                  ? 'Optional sign-off notes (e.g., utility invoice cross-verified successfully)'
                  : 'Describe clearly what the submitter needs to correct or provide...'
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-forest-500 focus:border-forest-500"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || isSubmitterOrg}
              className={`px-4 py-2 text-xs font-bold text-white rounded-xl shadow-xs transition-colors ${
                isSubmitterOrg 
                  ? 'bg-slate-300 cursor-not-allowed'
                  : targetAction === 'VERIFY'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : targetAction === 'CORRECTION'
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : targetAction === 'REJECT'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {submitting ? 'Processing...' : 'Confirm Status Change'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
