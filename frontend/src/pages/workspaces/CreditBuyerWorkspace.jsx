import React, { useState, useEffect } from 'react';
import { 
  Award, FolderKanban, CheckCircle2, DollarSign, Search, 
  Filter, ArrowRight, ShieldCheck, Download, Leaf, Bookmark, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function CreditBuyerWorkspace() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [quantity, setQuantity] = useState(100);
  const [orderSuccess, setOrderSuccess] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [watchlist, setWatchlist] = useState([]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await fetch('/api/projects');
        const json = await res.json();
        if (json.success && json.data) {
          setProjects(json.data);
        }
      } catch (e) {}
    };
    fetchProjects();
  }, []);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (!selectedProject) return;
    setSubmittingOrder(true);
    try {
      // Real database audit logging for order request
      const res = await fetch('/api/workflow/transition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          recordId: selectedProject._id || 'proj-sample',
          module: 'CreditPurchase',
          targetStatus: 'PURCHASE_REQUESTED',
          comment: `Buyer ${user?.email} submitted purchase request for ${quantity} tCO2e carbon credits.`
        })
      });
      setOrderSuccess(`Purchase order for ${quantity} credits submitted to Registry Desk!`);
      setOrderModalOpen(false);
      setTimeout(() => setOrderSuccess(''), 5000);
    } catch (err) {
      console.error('Order failed:', err);
    } finally {
      setSubmittingOrder(false);
    }
  };

  const toggleWatchlist = (id) => {
    setWatchlist(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Credit Buyer Workspace
            </span>
            <span className="text-xs text-slate-400 font-mono">Procurement: {user?.organizationId || 'Global Carbon Offsets'}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Voluntary Carbon Credit Marketplace & Registry Desk
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Browse Audited Decarbonization Projects, Verify MRV Provenance & Execute Credit Purchase Requests
          </p>
        </div>

        <button
          onClick={() => navigate('/carbon-credits')}
          className="flex items-center space-x-1.5 px-3 py-2 bg-forest-600 hover:bg-forest-700 text-white text-xs font-bold rounded-xl transition shadow-sm self-start"
        >
          <Award className="h-3.5 w-3.5" />
          <span>View Credit Ledger</span>
        </button>
      </div>

      {orderSuccess && (
        <div className="p-3.5 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 text-xs font-bold rounded-r-xl flex items-center justify-between">
          <span>{orderSuccess}</span>
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        </div>
      )}

      {/* Available Projects Catalog */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { id: 'PROJ-1', name: 'Rooftop Solar Decarbonization Cluster', type: 'Renewable Energy', country: 'India', vintage: '2026', available: 4500, price: '$14.50', verifier: 'SGS Climate', status: 'VERIFIED' },
          { id: 'PROJ-2', name: 'Agroforestry & Soil Carbon Sequestration', type: 'Nature Based (NBS)', country: 'Kenya', vintage: '2025', available: 2100, price: '$19.00', verifier: 'Verra / Gold Std', status: 'VERIFIED' },
          { id: 'PROJ-3', name: 'Industrial Waste Heat Recovery Unit', type: 'Energy Efficiency', country: 'India', vintage: '2026', available: 7200, price: '$11.80', verifier: 'TUV SUD', status: 'VERIFIED' }
        ].map(p => (
          <div key={p.id} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4 hover:border-forest-400 transition flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                  {p.type}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center space-x-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>{p.status}</span>
                </span>
              </div>
              <h3 className="text-sm font-black text-slate-900 leading-snug">{p.name}</h3>
              <p className="text-xs text-slate-500">Audited by <strong className="text-slate-700">{p.verifier}</strong> • Vintage {p.vintage}</p>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Available Credits:</span>
                <span className="font-mono font-bold text-slate-900">{p.available.toLocaleString()} tCO2e</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Price per Tonne:</span>
                <span className="font-mono font-black text-forest-700 text-sm">{p.price}</span>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <button
                  onClick={() => {
                    setSelectedProject(p);
                    setOrderModalOpen(true);
                  }}
                  className="w-full py-2 bg-forest-600 hover:bg-forest-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center space-x-1"
                >
                  <DollarSign className="h-3.5 w-3.5" />
                  <span>Request Purchase</span>
                </button>
                <button
                  onClick={() => toggleWatchlist(p.id)}
                  className={`p-2 rounded-xl border transition ${
                    watchlist.includes(p.id) ? 'bg-forest-50 border-forest-300 text-forest-700' : 'border-slate-200 text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  <Bookmark className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Purchase Request Order Modal */}
      {orderModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Carbon Credit Purchase Order</h3>
              <button onClick={() => setOrderModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl space-y-1 text-xs">
              <p className="font-bold text-slate-900">{selectedProject.name}</p>
              <p className="text-slate-500">Audited MRV: {selectedProject.verifier} • Price: {selectedProject.price}/t</p>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Credit Quantity (Metric Tonnes CO2e)
                </label>
                <input
                  type="number"
                  min="10"
                  max={selectedProject.available}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 10)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-forest-500"
                />
              </div>

              <div className="p-3 bg-forest-50 rounded-2xl flex items-center justify-between text-xs text-forest-900 font-bold">
                <span>Estimated Commitment:</span>
                <span className="text-base">${(quantity * parseFloat(selectedProject.price.replace('$', ''))).toLocaleString()} USD</span>
              </div>

              <p className="text-[10px] text-slate-400 leading-relaxed">
                Notice: Per CarbonCredit.Network market rules, this request routes to the Carbon Registry Desk for escrow lock and certificate issuance.
              </p>

              <button
                type="submit"
                disabled={submittingOrder}
                className="w-full py-3 bg-forest-600 hover:bg-forest-700 text-white rounded-xl text-xs font-bold transition shadow-md disabled:opacity-50"
              >
                {submittingOrder ? 'Submitting to Registry...' : 'Confirm Purchase Request'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
