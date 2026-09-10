import React from 'react';
import { 
  FileEdit, Send, Clock, AlertTriangle, 
  RefreshCw, CheckCircle2, XCircle 
} from 'lucide-react';

const STATUS_CONFIG = {
  DRAFT: {
    label: 'Draft',
    bg: 'bg-slate-100 text-slate-700 border-slate-300',
    icon: FileEdit
  },
  SUBMITTED: {
    label: 'Submitted',
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: Send
  },
  UNDER_REVIEW: {
    label: 'Under Review',
    bg: 'bg-amber-50 text-amber-800 border-amber-300',
    icon: Clock
  },
  CORRECTION_REQUIRED: {
    label: 'Correction Required',
    bg: 'bg-red-50 text-red-700 border-red-200',
    icon: AlertTriangle
  },
  CHANGES_REQUESTED: {
    label: 'Changes Requested',
    bg: 'bg-red-50 text-red-700 border-red-200',
    icon: AlertTriangle
  },
  RESUBMITTED: {
    label: 'Resubmitted',
    bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    icon: RefreshCw
  },
  VERIFIED: {
    label: 'Verified',
    bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
    icon: CheckCircle2
  },
  REJECTED: {
    label: 'Rejected',
    bg: 'bg-rose-50 text-rose-800 border-rose-300',
    icon: XCircle
  }
};

export default function SubmissionStatusBadge({ status, className = '' }) {
  const normStatus = (status || 'DRAFT').toUpperCase();
  const config = STATUS_CONFIG[normStatus] || {
    label: status || 'Draft',
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: FileEdit
  };
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-xs tracking-wide ${config.bg} ${className}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{config.label}</span>
    </span>
  );
}
