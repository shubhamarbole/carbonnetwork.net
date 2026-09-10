import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, HelpCircle, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';

export default function Assessment() {
  const { token } = useAuth();
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('Quarterly');

  const fetchAssessment = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/environment/assessment?period=${period}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setAssessment(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessment();
  }, [token, period]);

  const getStatusBadge = (status) => {
    if (status === 'GOOD') {
      return <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-100 uppercase">GOOD COMPLIANCE</span>;
    } else if (status === 'PARTIAL') {
      return <span className="bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1 rounded-full border border-amber-100 uppercase">PARTIAL DATA</span>;
    } else if (status === 'HIGH_RISK') {
      return <span className="bg-red-50 text-red-700 text-xs font-bold px-3 py-1 rounded-full border border-red-100 uppercase">HIGH RISK</span>;
    } else {
      return <span className="bg-rose-50 text-rose-700 text-xs font-bold px-3 py-1 rounded-full border border-rose-100 uppercase">MISSING DATA</span>;
    }
  };

  const getExplanation = (category, status) => {
    const explanations = {
      Energy: {
        GOOD: 'Electricity meters registered and regular kWh read ledgers are active.',
        PARTIAL: 'Meters are registered but current reporting period consumption is estimated.',
        MISSING: 'No active meters or readings recorded in energy ledgers.'
      },
      GHG: {
        GOOD: 'Scope 1 & Scope 2 calculated data logged with dynamic grid factor resolutions.',
        MISSING: 'No greenhouse gas emissions logged or resolved.'
      },
      Water: {
        GOOD: 'Freshwater withdraw volumes and reuse cycles logged with quality tags.',
        MISSING: 'No active water consumption manifests registered.'
      },
      Biodiversity: {
        GOOD: 'Site area assessments and pollinator Initiatives active in critical zones.',
        MISSING: 'Protected proximity assessment records are absent.'
      },
      Waste: {
        GOOD: 'Hazardous manifests logged with licensed recovery vendor signatures.',
        MISSING: 'Waste manifest registers are empty.'
      },
      Pollution: {
        GOOD: 'Exhaust monitoring checks logged and compliance certifications uploaded.',
        MISSING: 'NOx/SOx stack monitoring checks missing.'
      }
    };
    return explanations[category]?.[status] || explanations[category]?.MISSING || 'Explanation pending.';
  };

  return (
    <div className="pl-64 pr-8 py-8 min-h-screen bg-slate-50">
      <Navbar title="E-ESG Compliance & Environmental Assessment" />

      <main className="max-w-5xl mx-auto pt-6 space-y-6">
        {/* Selector toolbar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
              <ShieldCheck className="h-5 w-5 text-forest-600" />
              <span>Environmental Audit Scorecard</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Assessing performance quality across all 6 key modules</p>
          </div>

          <div className="flex items-center space-x-4">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-forest-400"
            >
              <option value="Monthly">Monthly assessment</option>
              <option value="Quarterly">Quarterly assessment</option>
              <option value="Yearly">Yearly assessment</option>
            </select>
            <button
              onClick={fetchAssessment}
              className="p-2.5 hover:bg-slate-100 rounded-xl transition text-slate-500 border border-slate-200"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white p-12 text-center text-slate-400 border border-slate-200 rounded-2xl shadow-sm">
            Recalculating module audits...
          </div>
        ) : !assessment ? (
          <div className="bg-white p-12 text-center text-slate-400 border border-slate-200 rounded-2xl shadow-sm">
            No active assessment data compiled. Click refresh to query metrics.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Score matrix */}
            <div className="lg:col-span-2 space-y-4">
              {Object.entries(assessment.assessments || {}).map(([cat, stat]) => (
                <div key={cat} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start justify-between gap-6 hover:shadow transition duration-150">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{cat} Management</h4>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-xl">{getExplanation(cat, stat)}</p>
                  </div>
                  <div className="shrink-0">{getStatusBadge(stat)}</div>
                </div>
              ))}
            </div>

            {/* Assessment dial side panel */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit flex flex-col items-center justify-center text-center space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Consolidated Compliance Score</h3>
              
              <div className="relative w-36 h-36 flex items-center justify-center rounded-full bg-slate-50 border-4 border-slate-100 shadow-inner">
                <div className="flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-slate-800">{assessment.overallScore}%</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Completeness</span>
                </div>
              </div>

              <div className="text-xs text-slate-500 font-medium">
                Last Assessed: <span className="font-semibold text-slate-800">{assessment.assessmentDate}</span>
              </div>

              <div className="bg-forest-50 p-4 rounded-xl border border-forest-100 text-left text-xs text-forest-800 leading-relaxed">
                💡 <span className="font-bold">Explainable Score:</span> The index represents clean data coverage across all 6 environmental modules, rewarding active manifests, target configurations, and verified evidence logs.
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
