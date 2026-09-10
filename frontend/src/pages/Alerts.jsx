import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Bell, Check, HelpCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function Alerts() {
  const { token } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/alerts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [token]);

  const handleMarkAsRead = async (id) => {
    try {
      const res = await fetch(`/api/alerts/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  const unreadAlerts = alerts.filter(a => a.status === 'Unread');
  const readAlerts = alerts.filter(a => a.status === 'Read');

  const getAlertIcon = (severity) => {
    switch (severity) {
      case 'Critical':
        return <div className="p-2 bg-red-100 rounded-lg text-red-600 animate-pulse"><AlertTriangle className="h-5 w-5" /></div>;
      case 'Warning':
        return <div className="p-2 bg-amber-100 rounded-lg text-amber-600"><AlertTriangle className="h-5 w-5" /></div>;
      case 'Improvement':
      default:
        return <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><ShieldCheck className="h-5 w-5" /></div>;
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-slate-50 pl-64 pb-12">
      <Navbar title="Real-time Environmental Alerts" />

      <main className="max-w-4xl mx-auto px-8 pt-8 space-y-8">
        
        {/* Unread Alerts block */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
              <Bell className="h-4.5 w-4.5 text-forest-500" />
              <span>Pending Action Alerts ({unreadAlerts.length})</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Critical Limit Checks</span>
          </div>

          <div className="space-y-3">
            {unreadAlerts.map(alert => (
              <div 
                key={alert._id} 
                className={`border rounded-xl p-4 flex items-start justify-between gap-4 transition hover:shadow-sm ${
                  alert.severity === 'Critical' ? 'bg-red-50/50 border-red-200' :
                  alert.severity === 'Warning' ? 'bg-amber-50/50 border-amber-200' :
                  'bg-emerald-50/50 border-emerald-200'
                }`}
              >
                <div className="flex items-start space-x-3.5">
                  {getAlertIcon(alert.severity)}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-800">{alert.title}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{alert.date}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{alert.message}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleMarkAsRead(alert._id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-forest-600 hover:bg-forest-50 transition border border-transparent hover:border-slate-200/50 flex items-center space-x-1 shrink-0"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-bold">Dismiss</span>
                </button>
              </div>
            ))}
            {unreadAlerts.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs font-medium">
                No new warning or critical alarms. Environmental parameters within target bands.
              </div>
            )}
          </div>
        </div>

        {/* Read History block */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800">Alert History Log</h3>
          
          <div className="space-y-3">
            {readAlerts.map(alert => (
              <div key={alert._id} className="border border-slate-100 rounded-xl p-4 bg-slate-50 flex items-start space-x-3.5 opacity-60">
                {getAlertIcon(alert.severity)}
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-700">{alert.title}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{alert.date}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{alert.message}</p>
                </div>
              </div>
            ))}
            {readAlerts.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs font-medium">
                No past alert logs found.
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
