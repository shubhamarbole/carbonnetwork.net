import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { 
  Bell, CheckCircle2, AlertTriangle, AlertOctagon, Info, 
  Check, RefreshCw, ArrowUpRight, Inbox
} from 'lucide-react';

export default function Notifications() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, alerts

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [token]);

  const handleMarkAsRead = async (id) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
      }
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'alerts') return n.type === 'WARNING' || n.type === 'CRITICAL' || n.type === 'ALERT';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getTypeIcon = (type) => {
    switch (type) {
      case 'SUCCESS':
        return <div className="p-2 rounded-xl bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-5 w-5" /></div>;
      case 'WARNING':
        return <div className="p-2 rounded-xl bg-amber-100 text-amber-600"><AlertTriangle className="h-5 w-5" /></div>;
      case 'CRITICAL':
      case 'ALERT':
        return <div className="p-2 rounded-xl bg-red-100 text-red-600"><AlertOctagon className="h-5 w-5" /></div>;
      default:
        return <div className="p-2 rounded-xl bg-blue-100 text-blue-600"><Info className="h-5 w-5" /></div>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar title="Notification Center" />

      <main className="flex-1 p-8 max-w-5xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2.5">
              <Bell className="h-7 w-7 text-emerald-600" />
              Notifications & Alerts
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Real-time updates on approvals, verification events, statutory limit warnings, and document reviews.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={fetchNotifications}
              className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 shadow-sm transition"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center space-x-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3.5 py-2 rounded-xl shadow-sm transition"
              >
                <Check className="h-4 w-4 text-emerald-600" />
                <span>Mark All Read</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-3 text-sm font-medium">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filter === 'all' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filter === 'unread' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('alerts')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filter === 'alerts' ? 'bg-emerald-600 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            System & Critical Alerts
          </button>
        </div>

        {/* Notification List */}
        {loading ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500">
            <RefreshCw className="h-8 w-8 mx-auto animate-spin text-emerald-600 mb-3" />
            <p className="font-semibold">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white p-16 rounded-2xl border border-dashed border-slate-300 text-center">
            <Inbox className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-700">Inbox Zero</h3>
            <p className="text-sm text-slate-500 mt-1">You have no {filter === 'unread' ? 'unread' : ''} notifications at this time.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map(notif => (
              <div
                key={notif._id}
                className={`bg-white rounded-2xl p-5 border transition flex items-start justify-between gap-4 shadow-sm ${
                  notif.isRead ? 'border-slate-200 opacity-80' : 'border-emerald-300 bg-emerald-50/20 shadow-md'
                }`}
              >
                <div className="flex items-start space-x-4">
                  {getTypeIcon(notif.type)}
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-bold text-slate-800">{notif.title}</h4>
                      {!notif.isRead && (
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{notif.message}</p>
                    <span className="text-[11px] text-slate-400 mt-2 block">
                      {new Date(notif.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 flex-shrink-0">
                  {notif.link && (
                    <Link
                      to={notif.link}
                      className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition flex items-center gap-1"
                    >
                      <span>View</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                  )}
                  {!notif.isRead && (
                    <button
                      onClick={() => handleMarkAsRead(notif._id)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition"
                      title="Mark as Read"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
