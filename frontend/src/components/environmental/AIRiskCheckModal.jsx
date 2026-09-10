import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, AlertCircle, CheckCircle2, 
  Sparkles, RefreshCw, X, ArrowRight, Check, Activity, 
  FileText, Layers, Database, Compass, Eye, ArrowUpRight
} from 'lucide-react';

export default function AIRiskCheckModal({
  isOpen,
  onClose,
  moduleKey = 'energy',
  data = null,
  recordId = null,
  token = '',
  onFixIssues,
  onSubmitRecord,
  initialAssessment = null
}) {
  const [assessment, setAssessment] = useState(initialAssessment);
  const [loading, setLoading] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('ALL');

  const scanStages = [
    { label: 'Auditing Data Quality & Field Types', icon: Database },
    { label: 'Running Baseline Z-Score & Anomaly Detection', icon: Activity },
    { label: 'Verifying Evidence Document Hashes & Formats', icon: FileText },
    { label: 'Reconciling Cross-Module Balances & Emission Factors', icon: Layers },
    { label: 'Synthesizing AI Contextual Reasoning & Recommendations', icon: Sparkles }
  ];

  const runRiskCheck = async () => {
    if (!data && !recordId) return;
    setLoading(true);
    setError(null);
    setScanStep(0);

    // Progressive stage animation
    const interval = setInterval(() => {
      setScanStep(prev => {
        if (prev < scanStages.length - 1) return prev + 1;
        return prev;
      });
    }, 400);

    try {
      const res = await fetch('/api/environment/submission/risk-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          module: moduleKey,
          recordId: recordId || undefined,
          data: data || {}
        })
      });

      const result = await res.json();
      clearInterval(interval);

      if (res.ok && result.success) {
        setAssessment(result.assessment);
      } else {
        setError(result.error || 'Failed to complete AI Risk Check');
      }
    } catch (err) {
      clearInterval(interval);
      setError(err.message || 'Network error during AI Risk Check');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (initialAssessment) {
        setAssessment(initialAssessment);
      } else if (data || recordId) {
        runRiskCheck();
      }
    } else {
      setError(null);
    }
  }, [isOpen, initialAssessment, recordId]);

  if (!isOpen) return null;

  // Severity color helpers
  const getSeverityTheme = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          badge: 'bg-red-100 text-red-800 border-red-300',
          meter: '#ef4444',
          icon: AlertCircle,
          label: 'CRITICAL RISK'
        };
      case 'HIGH':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          badge: 'bg-orange-100 text-orange-800 border-orange-300',
          meter: '#f97316',
          icon: AlertTriangle,
          label: 'HIGH RISK'
        };
      case 'MODERATE':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          badge: 'bg-amber-100 text-amber-800 border-amber-300',
          meter: '#eab308',
          icon: AlertTriangle,
          label: 'MODERATE RISK'
        };
      case 'LOW':
      default:
        return {
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          meter: '#10b981',
          icon: ShieldCheck,
          label: 'LOW RISK'
        };
    }
  };

  const theme = assessment ? getSeverityTheme(assessment.severity) : getSeverityTheme('LOW');
  const score = assessment ? assessment.riskScore : 0;
  const strokeDashoffset = 283 - (283 * score) / 100;

  const filteredFindings = assessment?.findings ? (
    activeFilter === 'ALL' 
      ? assessment.findings 
      : assessment.findings.filter(f => f.severity === activeFilter)
  ) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200 my-8">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-forest-950 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-forest-500/20 text-forest-400 rounded-2xl border border-forest-400/30 flex items-center justify-center">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-black tracking-tight text-white">AI Risk Management Agent</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-forest-500/30 text-forest-300 border border-forest-400/40 uppercase">
                  Decision Support
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Multi-stage deterministic risk evaluation & assurance readiness check
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">

          {/* Loading Animation State */}
          {loading && (
            <div className="py-12 px-6 flex flex-col items-center justify-center text-center space-y-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-slate-100 border-t-forest-600 animate-spin" />
                <Sparkles className="w-8 h-8 text-forest-600 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Evaluating Environmental Record</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Running multi-layered deterministic rules and anomaly detection algorithms...
                </p>
              </div>

              {/* Progress Steps */}
              <div className="w-full max-w-md space-y-2 text-left">
                {scanStages.map((stage, idx) => {
                  const Icon = stage.icon;
                  const isDone = scanStep > idx;
                  const isCurrent = scanStep === idx;
                  return (
                    <div 
                      key={idx}
                      className={`flex items-center space-x-3 p-2.5 rounded-xl text-xs transition-all ${
                        isDone 
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                          : isCurrent 
                            ? 'bg-forest-50 text-forest-900 border border-forest-200 font-semibold'
                            : 'text-slate-400 opacity-60'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                        isDone ? 'bg-emerald-500 text-white' : isCurrent ? 'bg-forest-600 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {isDone ? <Check className="w-3 h-3" /> : idx + 1}
                      </div>
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{stage.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error State */}
          {!loading && error && (
            <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
              <h4 className="font-bold text-red-900">Risk Assessment Failed</h4>
              <p className="text-xs text-red-700">{error}</p>
              <button
                onClick={runRiskCheck}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          )}

          {/* Assessment Results State */}
          {!loading && !error && assessment && (
            <>
              {/* Top Overview: Radial Gauge & Severity Summary */}
              <div className={`p-6 rounded-3xl border ${theme.border} ${theme.bg} transition-all`}>
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  
                  {/* Circular Risk Meter */}
                  <div className="flex items-center space-x-6">
                    <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                        {/* Background track */}
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          stroke="#e2e8f0"
                          strokeWidth="8"
                          fill="transparent"
                        />
                        {/* Progress meter */}
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          stroke={theme.meter}
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray="283"
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center text-center">
                        <span className="text-3xl font-black text-slate-900 tracking-tight">{score}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest -mt-1">/ 100</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-black border tracking-wider ${theme.badge}`}>
                          {theme.label}
                        </span>
                        {assessment.workflowAction && (
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-wider uppercase ${
                            assessment.workflowAction === 'ENHANCED_REVIEW' ? 'bg-red-100 text-red-800 border-red-300' :
                            assessment.workflowAction === 'CORRECTION_RECOMMENDED' ? 'bg-orange-100 text-orange-800 border-orange-300' :
                            assessment.workflowAction === 'WARNING' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                            'bg-emerald-100 text-emerald-800 border-emerald-300'
                          }`}>
                            {assessment.workflowAction.replace('_', ' ')}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-slate-500">
                          {typeof assessment.confidence === 'number' ? (assessment.confidence > 1 ? assessment.confidence : Math.round(assessment.confidence * 100)) : 90}% Confidence
                        </span>
                      </div>
                      <h4 className="text-base font-black text-slate-900">
                        {assessment.severity === 'LOW' && 'Verified Low Risk for Submission'}
                        {assessment.severity === 'MODERATE' && 'Procedural & Reporting Observations'}
                        {assessment.severity === 'HIGH' && 'Elevated Verification Risk Detected'}
                        {assessment.severity === 'CRITICAL' && 'Action Required: High Risk of Rejection'}
                      </h4>
                      <p className="text-xs text-slate-600 leading-relaxed max-w-md">
                        {assessment.summary}
                      </p>
                    </div>
                  </div>

                  {/* Model Metadata Card */}
                  <div className="bg-white/80 backdrop-blur-xs p-4 rounded-2xl border border-slate-200/80 text-right space-y-1 shrink-0 w-full md:w-auto">
                    <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Scoring Engine</div>
                    <div className="text-xs font-mono font-bold text-slate-800">{assessment.modelVersion || 'deterministic-v1'}</div>
                    <div className="text-[10px] text-slate-500 font-mono">Rule-pack: {assessment.rulesetVersion || 'v1'}</div>
                    <div className="pt-1 flex items-center justify-end space-x-1">
                      <span className="inline-flex items-center text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <Check className="w-3 h-3 mr-1" /> {assessment.engineType || 'deterministic'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Component Sub-scores Breakdown Grid */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Component Risk Breakdown (Total 100)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Data Quality', score: assessment.componentScores?.dataQuality || 0, max: 25, desc: 'Completeness & tiers' },
                    { label: 'Anomaly Detection', score: assessment.componentScores?.anomalyDetection || 0, max: 25, desc: 'Historical Z-score' },
                    { label: 'Evidence Integrity', score: assessment.componentScores?.evidenceIntegrity || 0, max: 20, desc: 'Document audit proof' },
                    { label: 'Cross-Module Balance', score: assessment.componentScores?.crossModuleConsistency || 0, max: 15, desc: 'Scope 2 / Water sanity' },
                    { label: 'Process Risk', score: assessment.componentScores?.processRisk || 0, max: 10, desc: 'Latency & revision churn' },
                    { label: 'AI Contextual', score: assessment.componentScores?.aiContextual || 0, max: 5, desc: 'Qualitative synthesis' }
                  ].map((comp, idx) => {
                    const pct = Math.round((comp.score / comp.max) * 100);
                    const isHigh = pct >= 60;
                    const isMed = pct > 0 && pct < 60;
                    return (
                      <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700">{comp.label}</span>
                          <span className={`font-black ${isHigh ? 'text-red-600' : isMed ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {comp.score} <span className="text-slate-400 font-normal">/ {comp.max}</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isHigh ? 'bg-red-500' : isMed ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{comp.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Identified Findings Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-2">
                    <span>Identified Risk Findings ({assessment.findings?.length || 0})</span>
                  </h4>

                  {/* Filter chips */}
                  {assessment.findings?.length > 0 && (
                    <div className="flex items-center space-x-1 text-[10px] font-bold">
                      {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(f => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setActiveFilter(f)}
                          className={`px-2.5 py-1 rounded-lg transition-colors ${
                            activeFilter === f 
                              ? 'bg-slate-900 text-white' 
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {filteredFindings.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold">No High-Priority Findings</span>
                      <p className="text-[11px] text-emerald-700 mt-0.5">
                        Record satisfies data completeness, anomaly tolerances, and evidence checks.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {filteredFindings.map((finding, idx) => {
                      const isCrit = finding.severity === 'CRITICAL';
                      const isHigh = finding.severity === 'HIGH';
                      const isMed = finding.severity === 'MEDIUM';
                      return (
                        <div 
                          key={finding.id || idx}
                          className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                            isCrit ? 'bg-red-50/60 border-red-200' :
                            isHigh ? 'bg-orange-50/60 border-orange-200' :
                            isMed ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                isCrit ? 'bg-red-100 text-red-800' :
                                isHigh ? 'bg-orange-100 text-orange-800' :
                                isMed ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700'
                              }`}>
                                {finding.severity}
                              </span>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white border border-slate-200 text-slate-600">
                                {finding.category}
                              </span>
                              <h5 className="font-bold text-slate-900">{finding.title}</h5>
                            </div>
                            {finding.field && !finding.affectedFields?.length && (
                              <span className="text-[10px] text-slate-400 font-mono">{finding.field}</span>
                            )}
                          </div>

                          <p className="text-slate-700 leading-relaxed">{finding.description || finding.message}</p>

                          {(finding.affectedFields?.length > 0 || finding.field) && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              <span className="text-[10px] text-slate-400 font-semibold">Affected:</span>
                              {(finding.affectedFields || [finding.field]).map((fld, fIdx) => (
                                <span key={fIdx} className="px-1.5 py-0.5 bg-white border border-slate-200 text-slate-700 rounded text-[10px] font-mono">
                                  {fld}
                                </span>
                              ))}
                            </div>
                          )}

                          {finding.baselineReference && (
                            <div className="p-2 rounded-xl bg-slate-100/80 border border-slate-200 text-[10px] text-slate-600 font-mono flex flex-wrap gap-x-3 gap-y-1">
                              {finding.baselineReference.mean !== undefined && <span>μ (mean): {finding.baselineReference.mean}</span>}
                              {finding.baselineReference.standardDeviation !== undefined && <span>σ: {finding.baselineReference.standardDeviation}</span>}
                              {finding.baselineReference.zScore !== undefined && <span>Z-Score: {finding.baselineReference.zScore}</span>}
                              {finding.baselineReference.sampleCount !== undefined && <span>Historical n: {finding.baselineReference.sampleCount}</span>}
                            </div>
                          )}

                          {(finding.recommendedAction || finding.suggestedAction) && (
                            <div className="flex items-start space-x-2 p-2 rounded-xl bg-white/80 border border-slate-200/80 text-[11px] text-slate-800">
                              <span className="font-bold text-forest-700 shrink-0">Recommended Action:</span>
                              <span className="leading-tight">{finding.recommendedAction || finding.suggestedAction}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actionable Recommendations */}
              {assessment.recommendations?.length > 0 && (
                <div className="p-4 rounded-2xl bg-forest-50/70 border border-forest-100 space-y-2 text-xs text-forest-900">
                  <div className="flex items-center space-x-2 font-bold text-forest-950">
                    <Sparkles className="w-4 h-4 text-forest-600" />
                    <span>Prioritized AI Assurance Recommendations</span>
                  </div>
                  <ul className="space-y-1.5 list-disc list-inside text-forest-800 text-[11px]">
                    {assessment.recommendations.map((rec, idx) => (
                      <li key={idx} className="leading-relaxed font-medium">{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Controls */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={runRiskCheck}
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Re-scan Data</span>
            </button>

            {onFixIssues && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  const affected = assessment?.findings?.flatMap(f => f.affectedFields || (f.field ? [f.field] : [])) || [];
                  onFixIssues(affected);
                }}
                className="inline-flex items-center space-x-1 px-3 py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition"
              >
                <span>Fix Issues</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition"
            >
              Close
            </button>

            {onSubmitRecord && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSubmitRecord();
                }}
                className="inline-flex items-center space-x-1.5 px-5 py-2.5 text-xs font-bold text-white bg-forest-600 hover:bg-forest-700 rounded-xl shadow-xs transition"
              >
                <span>Proceed to Submit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
