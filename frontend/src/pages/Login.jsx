import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Leaf, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('superadmin@esg.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Incorrect email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 p-8 space-y-6">
        {/* Branding header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="p-3 bg-forest-50 rounded-2xl">
            <Leaf className="h-10 w-10 text-forest-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Environmental ESG Platform</h2>
          <p className="text-sm text-slate-500 font-medium">Enterprise Sustainability Analytics Portal</p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-lg font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent text-sm transition"
              placeholder="e.g. auditor@organization.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Secret Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent text-sm transition pr-10"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-forest-600 hover:bg-forest-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-forest-900/10 transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Authenticating Session...' : 'Authenticate Credentials'}
          </button>
        </form>

        {/* 1-Click Role Quick Switcher for All 15 Workspaces */}
        <div className="pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              15 Role Workspaces Quick Login
            </p>
            <span className="text-[10px] text-forest-600 font-semibold bg-forest-50 px-2 py-0.5 rounded-full">
              Click to populate
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 max-h-56 overflow-y-auto pr-1 text-[10px]">
            {[
              { label: '1. Super Admin', email: 'superadmin@esg.com', role: 'SUPER_ADMIN', badge: 'Gov' },
              { label: '2. Platform Admin', email: 'platformadmin@esg.com', role: 'PLATFORM_ADMIN', badge: 'Ops' },
              { label: '3. MSME', email: 'msme@esg.com', role: 'MSME', badge: 'Prod' },
              { label: '4. Enterprise', email: 'enterprise@esg.com', role: 'ENTERPRISE', badge: 'Corp' },
              { label: '5. Investor', email: 'investor@esg.com', role: 'INVESTOR', badge: 'Fin' },
              { label: '6. Credit Buyer', email: 'buyer@esg.com', role: 'CREDIT_BUYER', badge: 'Mkt' },
              { label: '7. Verifier', email: 'verifier@esg.com', role: 'VERIFIER', badge: 'MRV' },
              { label: '8. Auditor', email: 'auditor@acme.com', role: 'AUDITOR', badge: 'Assur' },
              { label: '9. Regulator', email: 'regulator@esg.com', role: 'REGULATOR', badge: 'Law' },
              { label: '10. Registry', email: 'registry@esg.com', role: 'REGISTRY', badge: 'Reg' },
              { label: '11. Advisor', email: 'advisor@esg.com', role: 'ADVISOR', badge: 'Adv' },
              { label: '12. Association', email: 'association@esg.com', role: 'ASSOCIATION', badge: 'Peer' },
              { label: '13. Tech Provider', email: 'techprovider@esg.com', role: 'TECHNOLOGY_PROVIDER', badge: 'IoT' },
              { label: '14. Insurer', email: 'insurer@esg.com', role: 'INSURER', badge: 'Risk' },
              { label: '15. Researcher', email: 'researcher@esg.com', role: 'RESEARCHER', badge: 'Data' }
            ].map(acct => (
              <button
                key={acct.email}
                type="button"
                onClick={() => {
                  setEmail(acct.email);
                  setPassword('password123');
                }}
                className={`p-2 rounded-lg border text-left flex flex-col justify-between transition ${
                  email === acct.email 
                    ? 'bg-forest-50 border-forest-500 text-forest-900 font-bold shadow-sm' 
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold truncate text-[10px]">{acct.label}</span>
                  <span className="text-[8px] px-1 py-0.2 bg-slate-200 text-slate-700 rounded font-mono">{acct.badge}</span>
                </div>
                <span className="text-[8px] text-slate-400 font-mono mt-0.5 truncate">{acct.email}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="text-center pt-1">
          <p className="text-[10px] text-slate-400 font-medium">
            Password for all accounts: <span className="font-mono text-slate-600 font-bold">password123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
