import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, CheckCircle2, AlertTriangle, ArrowRight, Activity, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function HealthScoreModal({ isOpen, onClose }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [scoreData, setScoreData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    const fetchScore = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/health-score', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success) {
          setScoreData(json.data);
        }
      } catch (err) {
        console.error('Failed to load health score:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchScore();
  }, [isOpen, token]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 p-6 space-y-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-forest-50 text-forest-600 rounded-xl">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Organization Health Score</h2>
              <p className="text-xs text-slate-500 font-medium">Measurable ESG Data Integrity & Assurance Index</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <Activity className="h-6 w-6 animate-pulse mx-auto mb-2 text-forest-500" />
            <p className="text-xs font-semibold">Calculating organizational audit telemetry...</p>
          </div>
        ) : scoreData ? (
          <div className="space-y-6">
            {/* Top Score Banner */}
            <div className="bg-gradient-to-br from-forest-900 to-slate-900 rounded-2xl p-6 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-forest-300 uppercase block mb-1">
                  Assurance Grade
                </span>
                <div className="flex items-baseline space-x-3">
                  <span className="text-5xl font-black text-white">{scoreData.overallScore}</span>
                  <span className="text-lg text-forest-300 font-bold">/ 100</span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-forest-500/30 text-forest-200 border border-forest-400/40">
                    Grade {scoreData.grade}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-medium mt-2">
                  Status: <strong className="text-white">{scoreData.status}</strong> — Certified GHG Protocol Alignment
                </p>
              </div>

              <div className="hidden sm:flex flex-col items-center justify-center p-3 rounded-2xl bg-white/10 border border-white/10 text-center">
                <TrendingUp className="h-6 w-6 text-forest-300 mb-1" />
                <span className="text-[10px] text-slate-200 font-mono font-bold">+4.2 pts</span>
                <span className="text-[9px] text-slate-400">vs Prev Period</span>
              </div>
            </div>

            {/* Score Factor Breakdown Progress Bars */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Contributing Factor Matrix
              </h3>

              {scoreData.components && Object.entries(scoreData.components).map(([key, comp]) => (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{comp.label}</span>
                    <span className="font-mono font-bold text-slate-900">{comp.score} / {comp.max} pts</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-forest-500 rounded-full transition-all duration-500"
                      style={{ width: `${(comp.score / comp.max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Underlying Factors Table */}
            <div className="border border-slate-100 rounded-2xl overflow-hidden text-xs">
              <div className="bg-slate-50 px-4 py-2.5 font-bold text-slate-600 border-b border-slate-100">
                Audit Measurement Lineage
              </div>
              <div className="divide-y divide-slate-100">
                {scoreData.factorDetails?.map((factor, idx) => (
                  <div key={idx} className="px-4 py-2.5 flex items-center justify-between">
                    <span className="text-slate-700 font-medium">{factor.name}</span>
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-slate-900">{factor.value}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono">{factor.weight}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Recommendations */}
            <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-amber-900">How to reach 100/100 Score</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Resolve pending evidence attachments and verify unverified Q2 emissions.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  navigate('/action-center');
                }}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1 flex-shrink-0"
              >
                <span>Fix in Action Center</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
