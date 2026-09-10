import React, { createContext, useState, useEffect, useContext } from 'react';
import { useAuthStore } from '../store/authStore';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { token, user, isAuthenticated, login: storeLogin, logout: storeLogout } = useAuthStore();
  const [loading, setLoading] = useState(true);

  // Derive roles/permissions for role checks and navigation
  const roles = user ? [user.role] : [];

  const getRolePermissions = (role) => {
    if (!role) return [];
    if (role === 'SUPER_ADMIN') return ['*'];
    if (role === 'PLATFORM_ADMIN') return ['*', 'risk.read', 'risk.create', 'risk.update', 'risk.delete', 'risk.status', 'risk.assign', 'verification.assign', 'verification.review', 'audit.read', 'dashboard.read'];
    if (role === 'MSME' || role === 'MSME_USER') {
      return ['dashboard.read', 'energy.read', 'energy.write', 'ghg.read', 'ghg.write', 'water.read', 'water.write', 'waste.read', 'waste.write', 'biodiversity.read', 'biodiversity.write', 'pollution.read', 'pollution.write', 'evidence.read', 'evidence.write', 'targets.read', 'targets.write', 'actions.read', 'actions.write', 'report.read', 'ai.read'];
    }
    if (role === 'ENTERPRISE' || role === 'ADMIN' || role === 'ORGANIZATION_ADMIN') {
      return ['dashboard.read', 'facility.manage', 'energy.read', 'energy.write', 'ghg.read', 'ghg.write', 'water.read', 'water.write', 'waste.read', 'waste.write', 'biodiversity.read', 'biodiversity.write', 'pollution.read', 'pollution.write', 'evidence.read', 'evidence.write', 'targets.read', 'targets.write', 'actions.read', 'actions.write', 'analytics.read', 'report.read', 'ai.read'];
    }
    if (role === 'INVESTOR') {
      return ['dashboard.read', 'portfolio.read', 'energy.read', 'ghg.read', 'water.read', 'waste.read', 'biodiversity.read', 'pollution.read', 'risk.read', 'targets.read', 'report.read', 'ai.read'];
    }
    if (role === 'CREDIT_BUYER') {
      return ['dashboard.read', 'projects.read', 'credits.read', 'verification.read', 'impact.read', 'watchlist.manage', 'purchase.request', 'report.read'];
    }
    if (role === 'VERIFIER') {
      return ['dashboard.read', 'verification.read', 'verification.review', 'verification.execute', 'evidence.read', 'evidence.verify', 'findings.create', 'report.read', 'report.generate'];
    }
    if (role === 'AUDITOR') {
      return ['dashboard.read', 'audit.manage', 'audit.execute', 'evidence.read', 'calculations.test', 'findings.manage', 'report.read', 'report.generate'];
    }
    if (role === 'REGULATOR') {
      return ['dashboard.read', 'organizations.read', 'alerts.read', 'compliance.read', 'pollution.read', 'ghg.read', 'water.read', 'evidence.read', 'inquiry.request', 'report.read'];
    }
    if (role === 'REGISTRY') {
      return ['dashboard.read', 'projects.manage', 'registrations.review', 'registrations.approve', 'credits.manage', 'verification.read', 'report.read'];
    }
    if (role === 'ADVISOR') {
      return ['dashboard.read', 'clients.read', 'gaps.analyze', 'recommendations.create', 'actionplans.create', 'targets.create', 'report.read', 'ai.read'];
    }
    if (role === 'ASSOCIATION') {
      return ['dashboard.read', 'members.read', 'benchmarks.read', 'trends.read', 'report.read', 'ai.read'];
    }
    if (role === 'TECHNOLOGY_PROVIDER') {
      return ['dashboard.read', 'devices.manage', 'meters.manage', 'streams.read', 'sync.execute', 'api.read', 'errors.manage', 'report.read'];
    }
    if (role === 'INSURER') {
      return ['dashboard.read', 'organizations.read', 'risk.assess', 'incidents.read', 'pollution.read', 'water.read', 'biodiversity.read', 'report.read', 'ai.read'];
    }
    if (role === 'RESEARCHER') {
      return ['dashboard.read', 'datasets.read', 'analytics.execute', 'charts.create', 'analysis.save', 'dataset.export', 'report.read', 'ai.read'];
    }
    if (role === 'PROJECT_MANAGER' || role === 'ESG_MANAGER' || role === 'ENVIRONMENTAL_MANAGER') {
      return ['risk.read', 'risk.create', 'risk.update', 'risk.status', 'risk.assign', 'dashboard.read', 'energy.read', 'ghg.read', 'water.read', 'waste.read', 'biodiversity.read', 'pollution.read', 'evidence.read', 'report.read'];
    }
    if (role === 'COMPLIANCE_MANAGER') {
      return ['risk.read', 'risk.create', 'risk.update', 'risk.status', 'risk.assign', 'dashboard.read', 'audit.read', 'evidence.read', 'report.read'];
    }
    if (role === 'VIEWER') {
      return ['risk.read', 'dashboard.read', 'energy.read', 'ghg.read', 'water.read', 'waste.read', 'report.read'];
    }
    return ['risk.read', 'dashboard.read'];
  };

  const permissions = user?.role === 'SUPER_ADMIN' ? ['*'] : getRolePermissions(user?.role);
  const activeOrganization = user ? { id: user.organizationId || 'system', name: 'Active Organization' } : null;
  const facilities = [];

  useEffect(() => {
    const verifySession = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/v1/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const body = await res.json();
          if (body.success && body.data?.user) {
            storeLogin(token, body.data.user);
          } else {
            storeLogout();
          }
        } else {
          storeLogout();
        }
      } catch (err) {
        console.error('Session verification failed:', err);
      } finally {
        setLoading(false);
      }
    };
    verifySession();
  }, [token]);

  const login = async (email, password) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.message || 'Authentication failed');
    }
    
    const { token: apiToken, user: apiUser } = body.data;
    storeLogin(apiToken, apiUser);
    return apiUser;
  };

  const logout = () => {
    storeLogout();
  };

  return (
    <AuthContext.Provider value={{
      token,
      user,
      roles,
      permissions,
      activeOrganization,
      facilities,
      loading,
      login,
      logout,
      isAuthenticated
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
