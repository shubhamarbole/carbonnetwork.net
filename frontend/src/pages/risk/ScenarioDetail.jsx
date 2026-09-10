import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Target, ArrowLeft, RefreshCw, Play, ShieldAlert, CheckCircle2, AlertTriangle,
  Clock, BookOpen, Sparkles, BarChart3, Info
} from 'lucide-react';

export default function ScenarioDetail() {
  const { id } = useParams();
  const [scenario, setScenario] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);

  const token = localStorage.getItem('token') || '';

  const showToast = (msg, isError = false) => {
    setToastMsg({ text: msg, isError });
    setTimeout(() => setToastMsg(null), 4500);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [scenRes, resRes] = await Promise.all([
        fetch(`/api/scenarios/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/scenarios/${id}/results`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (scenRes.ok) {
        const sData = await scenRes.json();
        setScenario(sData.data);
      }
      if (resRes.ok) {
        const rData = await resRes.json();
        setResults(rData.data || []);
      }
    } catch (err) {
      showToast('Error loading scenario: ' + err.message, true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleRun = async () => {
    try {
      setRunning(true);
      const res = await fetch(`/api/scenarios/${id}/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Simulation completed successfully!');
        fetchData();
      } else {
        showToast(data.message || 'Run failed', true);
      }
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-xl mx-auto text-center py-12">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Scenario not found</h2>
          <Link to="/scenario-manager" className="text-indigo-600 font-medium text-sm hover:underline">
            Return to Scenario Registry
          </Link>
        </div>
      </div>
    );
  }

  const latestResult = results[0] || null;

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      {/* Toast */}
      {toastMsg && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-xl text-white font-medium flex items-center space-x-2 ${
          toastMsg.isError ? 'bg-rose-600' : 'bg-emerald-600'
        }`}>
          {toastMsg.isError ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Back Link */}
      <div>
        <Link to="/scenario-manager" className="inline-flex items-center text-xs font-semibold text-slate-500 hover:text-slate-900 transition mb-2">
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Scenarios
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
              {scenario.scenarioType}
            </span>
            <span className="text-xs text-slate-400 font-mono">ID: {scenario.scenarioId}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{scenario.name}</h1>
          <p className="text-sm text-slate-500 max-w-2xl mt-1">{scenario.description || 'No description provided.'}</p>
        </div>
        <div>
          <button
            onClick={handleRun}
            disabled={running}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition shadow-md shadow-indigo-600/20"
          >
            {running ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            Run Simulation
          </button>
        </div>
      </div>

      {/* Simulation Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-center space-x-3">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <p className="text-xs text-amber-800">
          <strong>Zero Mutation Guarantee:</strong> This scenario only evaluates cloned in-memory models. Authoritative production risks remain 100% unaltered.
        </p>
      </div>

      {/* Parameters Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">Perturbation Parameters</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(scenario.parameters || {}).map(([key, val]) => (
            <div key={key} className="p-3 bg-slate-50 rounded-lg">
              <div className="text-xs text-slate-400 mb-0.5">{key}</div>
              <div className="text-sm font-bold text-slate-800 font-mono">{String(val)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Latest Result */}
      {latestResult && (
        <div className="bg-white rounded-xl border border-indigo-200 p-6 shadow-sm space-y-6">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Latest Simulation Output</h3>
              <p className="text-xs text-slate-400 font-mono">Simulated at {new Date(latestResult.createdAt).toLocaleString()}</p>
            </div>
            <span className={`px-2.5 py-1 rounded text-xs font-bold ${
              latestResult.scoreDelta > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
            }`}>
              Delta: {latestResult.scoreDelta > 0 ? '+' : ''}{latestResult.scoreDelta} pts
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs font-semibold text-slate-400 mb-1">Baseline Avg</div>
              <div className="text-xl font-bold text-slate-800">{latestResult.baselineAverageScore}</div>
            </div>
            <div className="p-4 rounded-lg bg-indigo-50/50 border border-indigo-200">
              <div className="text-xs font-semibold text-indigo-500 mb-1">Projected Avg</div>
              <div className="text-xl font-bold text-indigo-700">{latestResult.projectedAverageScore}</div>
            </div>
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs font-semibold text-slate-400 mb-1">Critical Transition</div>
              <div className="text-xl font-bold text-rose-600">
                {latestResult.baselineCriticalCount} → {latestResult.projectedCriticalCount}
              </div>
            </div>
          </div>

          {latestResult.aiExplanation && (
            <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-700 space-y-2">
              <div className="font-bold text-indigo-700 flex items-center">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" /> AI Evaluation
              </div>
              <p>{latestResult.aiExplanation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
