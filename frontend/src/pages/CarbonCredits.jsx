import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { 
  Award, ShieldCheck, Flame, RefreshCw, CheckCircle2, 
  FileCheck, Download, Plus, ArrowUpRight, Lock, History
} from 'lucide-react';

export default function CarbonCredits() {
  const { token } = useAuth();
  const [batches, setBatches] = useState([]);
  const [summary, setSummary] = useState({ totalIssued: 0, totalAvailable: 0, totalRetired: 0, batchCount: 0 });
  const [loading, setLoading] = useState(true);

  // Retirement modal
  const [showRetireModal, setShowRetireModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [retireQty, setRetireQty] = useState('');
  const [retireReason, setRetireReason] = useState('Scope 1 & 2 Annual Decarbonization');
  const [retireBeneficiary, setRetireBeneficiary] = useState('');
  const [latestCertificate, setLatestCertificate] = useState(null);

  const fetchCredits = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/credits', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setBatches(json.data || []);
        if (json.summary) setSummary(json.summary);
      }
    } catch (err) {
      console.error('Failed to load carbon credits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, [token]);

  const handleRetireSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBatch) return;

    try {
      const res = await fetch('/api/credits/retire', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          batchId: selectedBatch._id,
          quantity: parseFloat(retireQty),
          reason: retireReason,
          beneficiary: retireBeneficiary
        })
      });

      if (res.ok) {
        const json = await res.json();
        setLatestCertificate(json.certificate);
        setShowRetireModal(false);
        setRetireQty('');
        fetchCredits();
      }
    } catch (err) {
      console.error('Retirement failed:', err);
    }
  };

  // Compile all retirement events for ledger
  const retirementLedger = [];
  batches.forEach(b => {
    if (b.retirementHistory && Array.isArray(b.retirementHistory)) {
      b.retirementHistory.forEach(r => {
        retirementLedger.push({
          ...r,
          batchNumber: b.batchNumber,
          standard: b.standard
        });
      });
    }
  });
  retirementLedger.sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar title="Carbon Credits & Offsets Registry" />

      <main className="flex-1 p-8 max-w-7xl mx-auto w-full space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
              <Award className="h-7 w-7 text-emerald-600" />
              Carbon Credit Registry & Offsets
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Track verified emission reduction credits, minting provenance, and voluntary retirement certificates.
            </p>
          </div>

          <button
            onClick={fetchCredits}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 shadow-sm transition"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Portfolio KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Credits Minted</span>
            <p className="text-2xl font-black text-slate-800 mt-2">{summary.totalIssued.toLocaleString()} <span className="text-sm font-semibold text-slate-400">tCO₂e</span></p>
            <span className="text-xs text-slate-500 mt-1 block">Lifetime verified reductions</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Available for Retirement</span>
            <p className="text-2xl font-black text-emerald-600 mt-2">{summary.totalAvailable.toLocaleString()} <span className="text-sm font-semibold text-slate-400">tCO₂e</span></p>
            <span className="text-xs text-slate-500 mt-1 block">Active liquid portfolio</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600">Permanently Retired</span>
            <p className="text-2xl font-black text-purple-700 mt-2">{summary.totalRetired.toLocaleString()} <span className="text-sm font-semibold text-slate-400">tCO₂e</span></p>
            <span className="text-xs text-slate-500 mt-1 block">Offset claims realized</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Active Batches</span>
            <p className="text-2xl font-black text-blue-700 mt-2">{summary.batchCount}</p>
            <span className="text-xs text-slate-500 mt-1 block">Certified VCS & GS issuances</span>
          </div>
        </div>

        {/* Certificate Banner (if just retired) */}
        {latestCertificate && (
          <div className="bg-emerald-600 text-white p-6 rounded-2xl shadow-lg flex items-center justify-between animate-fadeIn">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <FileCheck className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Retirement Certificate Generated!</h3>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Certificate #{latestCertificate.certificateId} permanently retired {latestCertificate.quantity} tCO₂e for {latestCertificate.beneficiary}.
                </p>
              </div>
            </div>
            <button
              onClick={() => setLatestCertificate(null)}
              className="px-4 py-2 bg-white text-emerald-800 text-xs font-bold rounded-xl hover:bg-emerald-50 transition"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Credit Batches Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Verified Carbon Credit Batches
            </h3>
            <span className="text-xs text-slate-500 font-medium">Standard Registry Lineage</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <RefreshCw className="h-8 w-8 mx-auto animate-spin text-emerald-600 mb-3" />
              <p className="font-semibold">Loading credit batches...</p>
            </div>
          ) : batches.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Award className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700">No Carbon Credit Batches Yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Once a project passes third-party auditor verification in the Projects module, carbon credits are automatically minted into this registry.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Batch Identifier</th>
                    <th className="px-6 py-4">Standard</th>
                    <th className="px-6 py-4">Vintage</th>
                    <th className="px-6 py-4">Minted</th>
                    <th className="px-6 py-4">Available</th>
                    <th className="px-6 py-4">Retired</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batches.map(batch => (
                    <tr key={batch._id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-mono font-bold text-slate-800">
                        {batch.batchNumber}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {batch.standard}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700">
                        {batch.vintageYear}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {batch.creditsTotal}
                      </td>
                      <td className="px-6 py-4 font-black text-emerald-600">
                        {batch.creditsAvailable}
                      </td>
                      <td className="px-6 py-4 font-semibold text-purple-700">
                        {batch.creditsRetired}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                          batch.status === 'RETIRED'
                            ? 'bg-slate-100 text-slate-600'
                            : (batch.status === 'PARTIALLY_RETIRED' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-800')
                        }`}>
                          {batch.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {batch.creditsAvailable > 0 && (
                          <button
                            onClick={() => {
                              setSelectedBatch(batch);
                              setRetireQty(batch.creditsAvailable);
                              setShowRetireModal(true);
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition"
                          >
                            Retire Credits
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Immutable Retirement Ledger */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <History className="h-5 w-5 text-purple-600" />
              Permanent Retirement & Offset Ledger
            </h3>
            <span className="text-xs text-slate-500 font-medium">Audited Claims Registry</span>
          </div>

          {retirementLedger.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs italic">
              No credits have been retired yet. Retired credits permanently eliminate claims and generate official proof certificates.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Certificate ID</th>
                    <th className="px-6 py-4">Batch</th>
                    <th className="px-6 py-4">Quantity</th>
                    <th className="px-6 py-4">Beneficiary</th>
                    <th className="px-6 py-4">Reason</th>
                    <th className="px-6 py-4">Retirement Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {retirementLedger.map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-mono font-bold text-purple-700">
                        {r.certificateId}
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-600">
                        {r.batchNumber}
                      </td>
                      <td className="px-6 py-4 font-black text-slate-800">
                        {r.quantity} tCO₂e
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-700">
                        {r.beneficiary}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {r.reason}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {new Date(r.date).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* RETIRE CREDITS MODAL */}
      {showRetireModal && selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Retire Carbon Credits</h3>
            <p className="text-xs text-slate-500 mb-5">
              Permanently retire credits from batch <span className="font-mono font-bold text-slate-700">{selectedBatch.batchNumber}</span> to claim emission abatement.
            </p>

            <form onSubmit={handleRetireSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quantity to Retire (tCO₂e) *</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max={selectedBatch.creditsAvailable}
                  required
                  value={retireQty}
                  onChange={(e) => setRetireQty(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Maximum available: {selectedBatch.creditsAvailable} credits</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Beneficiary Entity *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eco Corp MSME Annual Report"
                  value={retireBeneficiary}
                  onChange={(e) => setRetireBeneficiary(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Retirement Purpose / Reason</label>
                <input
                  type="text"
                  value={retireReason}
                  onChange={(e) => setRetireReason(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                ⚠️ Once retired, these carbon credits are permanently removed from circulation and cannot be resold or reallocated.
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRetireModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-semibold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md transition"
                >
                  Confirm Permanent Retirement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
