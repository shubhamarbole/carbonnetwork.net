import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { useFacilities } from '../context/FacilityContext';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BarChart3, TrendingUp, Sparkles, Trophy } from 'lucide-react';

export default function Analytics() {
  const { token } = useAuth();
  const { facilities } = useFacilities();
  const [timeframe, setTimeframe] = useState('Monthly');
  const [loading, setLoading] = useState(false);

  // Hardcoded rich analytics matching our seeded dataset for graph representation
  const emissionsTrend = [
    { name: 'Jan', Scope1: 85, Scope2: 95, Scope3: 150 },
    { name: 'Feb', Scope1: 90, Scope2: 110, Scope3: 165 },
    { name: 'Mar', Scope1: 303, Scope2: 229, Scope3: 67 },
    { name: 'Apr', Scope1: 120, Scope2: 426, Scope3: 38 },
    { name: 'May', Scope1: 180, Scope2: 320, Scope3: 832 },
    { name: 'Jun', Scope1: 140, Scope2: 280, Scope3: 200 }
  ];

  const facilityEmissionsData = [
    { name: 'Pune Facility', Carbon: 1612, Waste: 218, Water: 18700 },
    { name: 'Bangalore Facility', Carbon: 293, Waste: 20, Water: 6000 },
    { name: 'Delhi Facility', Carbon: 123, Waste: 74, Water: 3200 },
    { name: 'Mumbai Facility', Carbon: 128, Waste: 0, Water: 0 }
  ];

  const rankings = [
    { rank: 1, name: 'Mumbai Facility', score: 85, location: 'Mumbai, India', carbon: '128 tCO2e' },
    { rank: 2, name: 'Bangalore Facility', score: 80, location: 'Bangalore, India', carbon: '293 tCO2e' },
    { rank: 3, name: 'Delhi Facility', score: 75, location: 'Delhi, India', carbon: '123 tCO2e' },
    { rank: 4, name: 'Pune Facility', score: 68, location: 'Pune, India', carbon: '1,612 tCO2e' }
  ];

  return (
    <div className="flex-1 min-h-screen bg-slate-50 pl-64 pb-12">
      <Navbar title="Environmental Analytics & Comparisons" />

      <main className="max-w-7xl mx-auto px-8 pt-8 space-y-8">
        
        {/* Filter Toolbar */}
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-forest-500" />
            <span className="text-sm font-bold text-slate-800">Analytical Dashboard</span>
          </div>

          <div className="flex bg-slate-100 rounded-lg p-1">
            {['Daily', 'Monthly', 'Quarterly', 'Yearly'].map(period => (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  timeframe === period ? 'bg-white text-forest-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Trend Chart */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800">Carbon Footprint Trend (tCO₂e)</h3>
              <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold">YoY Comparison</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={emissionsTrend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="Scope1" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="Scope2" stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="Scope3" stroke="#8b5cf6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Facility Comparison Bar Chart */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-800">Facility Breakdown Comparison</h3>
            
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={facilityEmissionsData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Carbon" fill="#38bdf8" name="Carbon (tCO2e)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Water" fill="#60a5fa" name="Water (m3)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Waste" fill="#94a3b8" name="Waste (t)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Facility Rankings */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-2 mb-4">
            <Trophy className="h-5 w-5 text-amber-500 animate-bounce" />
            <h3 className="text-sm font-bold text-slate-800">Facility Performance Ranking</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase">
                  <th className="py-2.5">Rank</th>
                  <th>Facility</th>
                  <th>Location</th>
                  <th>Consolidated Carbon Footprint</th>
                  <th>Compliance Score</th>
                  <th className="text-right">Performance Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rankings.map(f => (
                  <tr key={f.rank} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 font-bold text-slate-500">#{f.rank}</td>
                    <td className="font-bold text-slate-800">{f.name}</td>
                    <td className="text-slate-500">{f.location}</td>
                    <td className="text-slate-600 font-medium">{f.carbon}</td>
                    <td className="font-semibold text-slate-700">{f.score}%</td>
                    <td className="text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        f.score >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        f.score >= 70 ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                        'bg-rose-50 text-rose-700 border border-rose-100'
                      }`}>
                        {f.score >= 80 ? 'Grade A' : f.score >= 70 ? 'Grade B' : 'Grade C'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}
