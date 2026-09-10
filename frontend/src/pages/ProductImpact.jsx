import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Plus, Package, Award, Sparkles } from 'lucide-react';

export default function ProductImpact() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState('');
  const [sustainableMaterial, setSustainableMaterial] = useState('');
  const [recyclableMaterial, setRecyclableMaterial] = useState('');
  const [productCO2e, setProductCO2e] = useState('');
  const [energyConsumption, setEnergyConsumption] = useState('');
  const [packagingReduction, setPackagingReduction] = useState('');
  const [lcaDetails, setLcaDetails] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [token]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          sustainableMaterialPct: parseFloat(sustainableMaterial) || 0,
          recyclableMaterialPct: parseFloat(recyclableMaterial) || 0,
          productCO2e: parseFloat(productCO2e) || 0,
          energyConsumption: parseFloat(energyConsumption) || 0,
          packagingReductionPct: parseFloat(packagingReduction) || 0,
          lcaDetails
        })
      });
      if (res.ok) {
        setName('');
        setSustainableMaterial('');
        setRecyclableMaterial('');
        setProductCO2e('');
        setEnergyConsumption('');
        setPackagingReduction('');
        setLcaDetails('');
        fetchProducts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Aggregations
  const totalProducts = products.length;
  let sumCO2 = 0;
  let sumSustMaterial = 0;
  let sumRecycMaterial = 0;
  let sumPkgRed = 0;

  products.forEach(p => {
    sumCO2 += p.productCO2e;
    sumSustMaterial += p.sustainableMaterialPct;
    sumRecycMaterial += p.recyclableMaterialPct;
    sumPkgRed += p.packagingReductionPct;
  });

  const avgCO2 = totalProducts > 0 ? sumCO2 / totalProducts : 0;
  const avgSustMat = totalProducts > 0 ? sumSustMaterial / totalProducts : 0;
  const avgRecycMat = totalProducts > 0 ? sumRecycMaterial / totalProducts : 0;
  const avgPkgRed = totalProducts > 0 ? sumPkgRed / totalProducts : 0;

  return (
    <div className="flex-1 min-h-screen bg-slate-50 pl-64 pb-12">
      <Navbar title="Product Lifecycle Environmental Footprints" />

      <main className="max-w-7xl mx-auto px-8 pt-8 space-y-8">
        
        {/* KPI Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
            <p className="text-xs font-semibold text-slate-400 uppercase">Products Assessed</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{totalProducts} Products</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
            <p className="text-xs font-semibold text-slate-400 uppercase">Avg Carbon Weight</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{avgCO2.toFixed(1)} kg</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
            <p className="text-xs font-semibold text-slate-400 uppercase">Sustainable Content</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{avgSustMat.toFixed(0)}% Avg</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
            <p className="text-xs font-semibold text-slate-400 uppercase">Recyclable rate</p>
            <p className="text-2xl font-black text-forest-600 mt-1">{avgRecycMat.toFixed(0)}% Avg</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
            <p className="text-xs font-semibold text-slate-400 uppercase">Packaging reduction</p>
            <p className="text-2xl font-black text-sky-600 mt-1">{avgPkgRed.toFixed(0)}% Avg</p>
          </div>
        </div>

        {/* Input and directory list */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Submission Form */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm h-fit">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Add Product LCA Entry</h3>
            
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EcoSeries Heavy Shaft"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-forest-500 mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Sustainable Material %</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 45"
                    value={sustainableMaterial}
                    onChange={(e) => setSustainableMaterial(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-forest-500 mt-1"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Recyclable Material %</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 95"
                    value={recyclableMaterial}
                    onChange={(e) => setRecyclableMaterial(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-forest-500 mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">CO₂e (kg)</label>
                  <input
                    type="number"
                    required
                    placeholder="340"
                    value={productCO2e}
                    onChange={(e) => setProductCO2e(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-forest-500 mt-1"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Energy (kWh)</label>
                  <input
                    type="number"
                    required
                    placeholder="12"
                    value={energyConsumption}
                    onChange={(e) => setEnergyConsumption(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-forest-500 mt-1"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Pkg Red %</label>
                  <input
                    type="number"
                    required
                    placeholder="15"
                    value={packagingReduction}
                    onChange={(e) => setPackagingReduction(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-forest-500 mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase">LCA Audit Details & Standard</label>
                <textarea
                  required
                  placeholder="e.g. ISO 14044 certified assessment compiled by third-party in Nov 2025"
                  value={lcaDetails}
                  onChange={(e) => setLcaDetails(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-forest-500 mt-1 h-20"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-2 rounded-xl text-xs shadow-sm hover:shadow transition"
              >
                Log Product Impact
              </button>
            </form>
          </div>

          {/* Directory Grid/Table */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Product Lifecycle Catalog</h3>
            
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {products.map((p) => (
                <div key={p._id} className="border border-slate-100 rounded-xl p-4 bg-slate-50 space-y-3.5 hover:shadow-sm transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Package className="h-4.5 w-4.5 text-forest-500" />
                      <h4 className="text-sm font-bold text-slate-800">{p.name}</h4>
                    </div>
                    <span className="text-[10px] font-bold bg-forest-50 text-forest-700 border border-forest-100 px-2 py-0.5 rounded-full uppercase">LCA Mapped</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-xs border-y border-slate-200/50 py-2.5 text-slate-600 font-medium">
                    <div>
                      <p className="text-[9px] uppercase text-slate-400 font-bold">Carbon Weight</p>
                      <p className="text-slate-800 font-extrabold">{p.productCO2e} kg CO₂e</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase text-slate-400 font-bold">Sust. Materials</p>
                      <p className="text-emerald-600 font-extrabold">{p.sustainableMaterialPct}%</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase text-slate-400 font-bold">Recyclability</p>
                      <p className="text-forest-600 font-extrabold">{p.recyclableMaterialPct}%</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase text-slate-400 font-bold">Packaging Reduction</p>
                      <p className="text-sky-600 font-extrabold">{p.packagingReductionPct}%</p>
                    </div>
                  </div>

                  <div className="text-xs space-y-1.5 bg-white p-2.5 rounded-lg border border-slate-150 text-slate-500">
                    <p className="flex items-start space-x-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-forest-400 mt-0.5 flex-shrink-0" />
                      <span>{p.lcaDetails}</span>
                    </p>
                  </div>
                </div>
              ))}
              {products.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs font-medium">
                  No product life-cycle entries recorded.
                </div>
              )}
            </div>
          </div>

        </div>

      </main>
    </div>
  );
}
