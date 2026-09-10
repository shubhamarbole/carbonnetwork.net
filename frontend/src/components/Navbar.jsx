import React, { useEffect, useState, useRef } from 'react';
import { useFacilities } from '../context/FacilityContext';
import { useAuth } from '../context/AuthContext';
import { Bell, Sparkles, Building2, Check, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar({ title }) {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { facilities, selectedFacilityId, setSelectedFacilityId } = useFacilities();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications?limit=5', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.data || []);
        setUnreadCount(json.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to load notifications count", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 10000);
    return () => clearInterval(timer);
  }, [token]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">{title || 'Environmental ESG'}</h1>
      </div>

      {/* Facility Filter & Utilities */}
      <div className="flex items-center space-x-5">
        {/* Facility Selector */}
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
          <Building2 className="h-4 w-4 text-slate-500" />
          <select
            value={selectedFacilityId}
            onChange={(e) => setSelectedFacilityId(e.target.value)}
            className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="all">All Facilities</option>
            {facilities.map(fac => (
              <option key={fac._id} value={fac._id}>
                {fac.name}
              </option>
            ))}
          </select>
        </div>

        {/* AI Assistant Quick Link */}
        <Link
          to="/ai-assistant"
          className="flex items-center space-x-1.5 text-sm bg-gradient-to-r from-emerald-600 to-forest-500 hover:from-emerald-700 hover:to-forest-600 text-white font-semibold py-1.5 px-3 rounded-lg shadow-sm hover:shadow transition"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>ESG AI</span>
        </Link>

        {/* Notifications Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="relative p-2 rounded-xl hover:bg-slate-100 transition text-slate-600 flex items-center justify-center"
            title="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 py-3 z-50 animate-fadeIn">
              <div className="px-4 pb-2.5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-sm text-slate-800">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <Link
                  to="/notifications"
                  onClick={() => setDropdownOpen(false)}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  View All
                </Link>
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    No new notifications
                  </div>
                ) : (
                  notifications.map(n => {
                    const notifId = n.notification_id || n._id;
                    const isRead = Boolean(n.isRead || n.read);
                    return (
                      <div
                        key={notifId}
                        onClick={() => {
                          if (!isRead) handleMarkAsRead(notifId, { stopPropagation: () => {} });
                          setDropdownOpen(false);
                          if (n.resourceType === 'Alert' || n.type?.includes('ALERT')) {
                            navigate('/alerts');
                          } else if (n.resourceType === 'WorkflowInstance' && n.resourceId) {
                            navigate(`/workflow-manager/instances/${n.resourceId}`);
                          } else if (n.resourceType === 'Risk' && n.resourceId) {
                            navigate(`/risk-manager/risks/${n.resourceId}`);
                          } else {
                            navigate('/notifications');
                          }
                        }}
                        className={`p-3 hover:bg-slate-50 transition flex items-start justify-between gap-3 text-xs cursor-pointer ${
                          !isRead ? 'bg-emerald-50/25' : ''
                        }`}
                      >
                        <div className="flex-1">
                          <span className="font-bold text-slate-800 block">{n.title}</span>
                          <p className="text-slate-500 line-clamp-2 mt-0.5">{n.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>

                        {!isRead && (
                          <button
                            onClick={(e) => handleMarkAsRead(notifId, e)}
                            className="p-1 text-slate-400 hover:text-emerald-600 rounded"
                            title="Mark as read"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-2 px-4 border-t border-slate-100 text-center">
                <Link
                  to="/notifications"
                  onClick={() => setDropdownOpen(false)}
                  className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center justify-center gap-1 py-1"
                >
                  <span>Open Notification Center</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
