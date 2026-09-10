import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Leaf, LogOut, X, ChevronDown, CheckCircle2, Shield, Layers, Bell, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getNavigationForRole, workspacesList } from '../config/navigationConfig';

export default function Sidebar({ isOpen = false, onClose }) {
  const { logout, user, roles } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);

  const currentRole = user?.role || (roles && roles[0]) || 'MSME';
  const menuItems = getNavigationForRole(currentRole);

  const currentWorkspaceMeta = workspacesList.find(w => w.role === currentRole) || {
    name: `${currentRole} Workspace`,
    badge: 'Active'
  };

  // Restrict workspace switching per Section 21
  const isSuperAdmin = currentRole === 'SUPER_ADMIN';
  const userRoles = roles && roles.length > 0 ? roles : (user?.role ? [user.role] : ['MSME']);
  const allowedWorkspaces = isSuperAdmin 
    ? workspacesList 
    : workspacesList.filter(ws => userRoles.includes(ws.role));
  const canSwitchWorkspace = allowedWorkspaces.length > 1;

  const handleSwitchWorkspace = (path) => {
    setWorkspaceDropdownOpen(false);
    onClose?.();
    navigate(path);
  };

  const currentFullPath = location.pathname + (location.search || '');

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`w-[275px] max-w-[85vw] bg-slate-900 text-slate-300 flex flex-col h-screen fixed left-0 top-0 border-r border-slate-800 z-50 transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Brand logo & Mobile Close */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 flex-shrink-0 bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-forest-500/20 rounded-lg border border-forest-500/30">
              <Leaf className="h-6 w-6 text-forest-400" />
            </div>
            <div>
              <div className="flex items-center space-x-1">
                <span className="font-bold text-white tracking-tight text-base">Carbon</span>
                <span className="font-bold text-forest-400 text-base">Credit</span>
              </div>
              <span className="text-[10px] tracking-wider text-slate-400 font-mono block -mt-0.5">NETWORK</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation menu"
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Workspace Switcher Selector (Locked for standard users, switchable only if authorized) */}
        <div className="px-3 pt-3 pb-1 border-b border-slate-800/80 flex-shrink-0">
          <div className="relative">
            {canSwitchWorkspace ? (
              <button
                type="button"
                onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
                className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition text-left"
              >
                <div className="truncate pr-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-forest-400 inline-block animate-pulse"></span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Workspace</span>
                  </div>
                  <p className="text-xs font-bold text-white truncate mt-0.5">{currentWorkspaceMeta.name}</p>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-400 flex-shrink-0 transition-transform ${workspaceDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            ) : (
              <div className="w-full flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <div className="truncate pr-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-500 inline-block"></span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Assigned Workspace</span>
                  </div>
                  <p className="text-xs font-bold text-slate-200 truncate mt-0.5">{currentWorkspaceMeta.name}</p>
                </div>
                <div title="Role Locked per Security Policy" className="flex items-center space-x-1 text-slate-500">
                  <Lock className="h-3.5 w-3.5" />
                </div>
              </div>
            )}

            {/* Dropdown for Switching Allowed Workspaces */}
            {canSwitchWorkspace && workspaceDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 max-h-72 overflow-y-auto">
                <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Switch Authorized Workspace
                </div>
                {allowedWorkspaces.map(ws => (
                  <button
                    key={ws.role}
                    type="button"
                    onClick={() => handleSwitchWorkspace(ws.path)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition ${
                      currentRole === ws.role 
                        ? 'bg-forest-600/30 text-forest-300 font-bold' 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <ws.icon className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                      <span className="truncate">{ws.name}</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono ml-2">
                      {ws.badge}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Nav List for Active Workspace */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2.5 mb-1.5">
            {currentWorkspaceMeta.name} Menu
          </div>
          {menuItems.map((item) => {
            const isActive = item.path.includes('?')
              ? currentFullPath === item.path
              : location.pathname === item.path && (!location.search || location.search === '');
            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={() => onClose?.()}
                className={`flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-forest-600 text-white shadow-md shadow-forest-950/40 font-bold'
                    : 'hover:bg-slate-800 hover:text-slate-100 text-slate-300'
                }`}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Session & Logout Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 flex flex-col space-y-2 flex-shrink-0">
          <div className="flex items-center space-x-2.5 px-1">
            <div className="h-8 w-8 rounded-xl bg-forest-600/30 border border-forest-500/40 text-forest-300 flex items-center justify-center font-bold text-xs">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
            </div>
            <div className="truncate flex-1">
              <p className="text-xs font-bold text-white truncate">{user?.name || 'Authorized User'}</p>
              <div className="flex items-center space-x-1">
                <span className="text-[10px] text-forest-400 font-mono truncate">{currentRole}</span>
                <span className="text-[9px] text-slate-500">•</span>
                <span className="text-[9px] text-slate-400 truncate">{user?.organizationId || 'Tenant'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center space-x-2 bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white py-2 rounded-xl text-xs font-bold transition border border-slate-700/50"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
