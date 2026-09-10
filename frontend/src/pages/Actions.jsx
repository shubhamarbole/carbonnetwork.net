import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { PlaySquare, CheckCircle, Clock, AlertTriangle, ArrowUpRight, Trash2, Check, Filter, Plus } from 'lucide-react';

export default function Actions() {
  const { token, user } = useAuth();
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterModule, setFilterModule] = useState('All');

  // Form states
  const [category, setCategory] = useState('Energy');
  const [problem, setProblem] = useState('');
  const [actionItem, setActionItem] = useState('');
  const [owner, setOwner] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]);
  const [expectedBenefit, setExpectedBenefit] = useState('');

  const categories = ['Energy', 'GHG', 'Water', 'Biodiversity', 'Waste', 'Pollution'];
  const priorities = ['LOW', 'MEDIUM', 'HIGH'];

  const fetchActions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/environment/actions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setActions(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchActions();
  }, [token]);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/environment/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category,
          problem,
          action: actionItem,
          owner: owner || user.email,
          priority,
          startDate,
          dueDate,
          expectedBenefit,
          status: 'PLANNED'
        })
      });
      if (res.ok) {
        setProblem('');
        setActionItem('');
        setExpectedBenefit('');
        fetchActions();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to log action item');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`/api/environment/actions/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) fetchActions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this action item?')) return;
    try {
      const res = await fetch(`/api/environment/actions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchActions();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredActions = filterModule === 'All'
    ? actions
    : actions.filter(a => a.category?.toLowerCase() === filterModule.toLowerCase());

  return (
    <div className="pl-64 pr-8 py-8 min-h-screen bg-slate-50 text-[11px] text-slate-700 font-sans">
      <Navbar title="Environmental Actions Register" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        {/* Actions list */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-xs">Improvement Actions Schedule</h3>
                <p className="text-[10px] text-slate-400 mt-0.5">{filteredActions.length} actions listed</p>
              </div>
              <div className="flex items-center space-x-2">
                <select
                  value={filterModule}
                  onChange={(e) => setFilterModule(e.target.value)}
                  className="px-2.5 py-1 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none"
                >
                  <option value="All">All Modules</option>
                  <option value="Energy">Energy</option>
                  <option value="GHG">GHG</option>
                  <option value="Water">Water</option>
                  <option value="Biodiversity">Biodiversity</option>
                  <option value="Waste">Waste</option>
                  <option value="Pollution">Pollution</option>
                </select>
                <span className="text-[10px] bg-forest-50 text-forest-700 font-bold px-2.5 py-1 rounded-lg">
                  {actions.filter(a => a.status === 'COMPLETED').length}/{actions.length} Done
                </span>
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400">Loading action schedules...</div>
            ) : filteredActions.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <p className="font-bold text-sm text-slate-700">No Actions Found</p>
                <p className="text-xs text-slate-400 mt-1">Register an action to track remediation or conservation progress.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {filteredActions.map(a => (
                  <div key={a._id} className="p-5 hover:bg-slate-50 transition-colors flex justify-between gap-6">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          a.priority === 'HIGH' ? 'bg-red-50 text-red-700 border border-red-100' :
                          a.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {a.priority} Priority
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">{a.category}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-800">{a.action}</h4>
                      <p className="text-slate-500 text-[10px]"><span className="font-semibold text-slate-700">Target Issue:</span> {a.problem}</p>
                      {a.expectedBenefit && (
                        <p className="text-[10px] text-forest-600 font-semibold bg-forest-50 p-1.5 rounded-lg border border-forest-100 w-fit">
                          Benefit: {a.expectedBenefit}
                        </p>
                      )}
                      <div className="flex space-x-4 pt-1 text-[9px] text-slate-400 font-bold">
                        <span>OWNER: {a.owner}</span>
                        <span>START: {a.startDate}</span>
                        <span>DUE: {a.dueDate}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end justify-between shrink-0 space-y-2">
                      <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border ${
                        a.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        a.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {a.status}
                      </span>

                      <div className="flex items-center space-x-1.5">
                        {a.status !== 'COMPLETED' && (
                          <button
                            onClick={() => handleUpdateStatus(a._id, 'COMPLETED')}
                            className="text-[9px] font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-md transition"
                            title="Mark Done"
                          >
                            <Check className="h-3 w-3 inline mr-1" />
                            <span>Complete</span>
                          </button>
                        )}
                        {a.status === 'PLANNED' && (
                          <button
                            onClick={() => handleUpdateStatus(a._id, 'IN_PROGRESS')}
                            className="text-[9px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 px-2 py-1 rounded-md transition"
                          >
                            Start
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(a._id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition"
                          title="Delete Action"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Input Form */}
        <div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-6">
            <h3 className="text-xs font-bold text-slate-900 mb-4 flex items-center space-x-1.5">
              <PlaySquare className="h-4 w-4 text-forest-600" />
              <span>Register Mitigation Action</span>
            </h3>

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Category Module</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-forest-500"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c} Management</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Problem Statement</label>
                <input
                  type="text"
                  required
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  placeholder="e.g. Excessive water withdrawals from groundwater"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-forest-500"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Action Description</label>
                <textarea
                  required
                  value={actionItem}
                  onChange={(e) => setActionItem(e.target.value)}
                  placeholder="What specific tasks are planned to address the problem..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-forest-500 h-20"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Expected Benefit</label>
                <input
                  type="text"
                  value={expectedBenefit}
                  onChange={(e) => setExpectedBenefit(e.target.value)}
                  placeholder="e.g. Reduces groundwater dependence by 15%"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-forest-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                  >
                    {priorities.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Assignee</label>
                  <input
                    type="text"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    placeholder="User email"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-2.5 rounded-xl transition shadow flex items-center justify-center space-x-1.5 text-xs"
              >
                <span>Save Action Item</span>
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
