import React, { useState, useEffect } from 'react';
import { 
  BarChart3, AlertTriangle, CheckCircle2, RefreshCw, Filter, 
  ArrowUpRight, ShieldAlert, Sparkles, FileText, Check, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DataQualityCenter() {
  const { token } = useAuth();
  const [anomalies, setAnomalies] = useState([]);
  const [score, setScore] = useState(88);
  const [totalScanned, setTotalScanned] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchQualityData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/data-quality', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success && json.data) {
        setAnomalies(json.data.anomalies || []);
        setScore(json.data.dataIntegrityScore || 88);
        setTotalScanned(json.data.recordsScanned || 0);
      }
    } catch (err) {
      console.error('Failed to load Data Quality data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQualityData();
  }, [token]);

  const handleResolveAnomaly = async (anomalyId, resolutionAction) => {
    setResolvingId(anomalyId);
    try {
      const res = await fetch('/api/data-quality/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          anomalyId,
          resolutionAction,
          justification: `Audited and verified ${resolutionAction.toLowerCase()} by user.`
        })
      });
      const json = await res.json();
      if (json.success) {
        setSuccessMsg(`Issue resolved: ${anomalyId}`);
        setAnomalies(prev => prev.filter(a => a.id !== anomalyId));
        setScore(prev => Math.min(100, prev + 3));
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err) {
      console.error('Resolution failed:', err);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl border border-blue-500/20">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Data Quality Engine</h1>
              <p className="text-xs text-slate-500 font-medium">
                Automated ESG Anomaly Detection, Spike Analysis & Field Verification
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchQualityData}
          disabled={loading}
          className="flex items-center space-x-2 px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition shadow-sm self-start"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Re-scan Database</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs font-bold rounded-r-xl flex items-center justify-between">
          <span>{successMsg}</span>
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Data Integrity Score</p>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-3xl font-black text-slate-900">{score}</span>
              <span className="text-sm font-bold text-slate-400">/ 100</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-bold mt-1">Audit-Grade Validation Active</p>
          </div>
          <div className="h-16 w-16 rounded-full border-4 border-forest-500 flex items-center justify-center font-black text-forest-700 text-lg">
            {score}%
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Scanned Records</p>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900">{totalScanned}</span>
            <span className="text-xs text-slate-400 font-medium">measurements</span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">Energy, Water, Waste, GHG, Pollution</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-amber-100 bg-amber-50/20 shadow-sm">
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">Detected Discrepancies</p>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-amber-600">{anomalies.length}</span>
            <span className="text-xs text-amber-500 font-medium">flagged</span>
          </div>
          <p className="text-[11px] text-amber-700 font-medium mt-1">Spikes, negative values, missing bills</p>
        </div>
      </div>

      {/* Anomalies List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Automated Discrepancy Queue
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            Showing {anomalies.length} active anomalies
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-forest-500" />
            <p className="text-xs font-semibold">Running statistical variance engine...</p>
          </div>
        ) : anomalies.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">100% Verified Data Quality</p>
            <p className="text-xs text-slate-500 mt-1">All meter readings and emissions comply with standard ranges.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {anomalies.map(item => (
              <div key={item.id} className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 hover:bg-slate-50/60 transition">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center space-x-2 flex-wrap">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      item.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                      item.severity === 'HIGH' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {item.issueType.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {item.module}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Date: {item.detectedAt}</span>
                  </div>

                  <p className="text-xs font-semibold text-slate-800">{item.message}</p>
                  
                  <div className="flex items-center space-x-4 text-xs font-mono pt-1">
                    <span className="text-red-600 font-bold">Detected: {item.detectedValue}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600 font-medium">Expected: {item.expectedRange}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  <button
                    onClick={() => handleResolveAnomaly(item.id, 'CORRECTED')}
                    disabled={resolvingId === item.id}
                    className="px-3 py-1.5 bg-forest-600 hover:bg-forest-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                  >
                    [Correct]
                  </button>
                  <button
                    onClick={() => handleResolveAnomaly(item.id, 'RESOLVED')}
                    disabled={resolvingId === item.id}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                  >
                    [Resolve]
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
