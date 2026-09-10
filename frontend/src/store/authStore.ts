import { create } from 'zustand';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (token: string, user: UserProfile) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Read initial cache
  const cachedToken = localStorage.getItem('esg_super_admin_token') || localStorage.getItem('token');
  if (cachedToken && !localStorage.getItem('token')) {
    localStorage.setItem('token', cachedToken);
  }
  const cachedUserRaw = localStorage.getItem('esg_super_admin_user');
  let cachedUser: UserProfile | null = null;
  
  if (cachedUserRaw) {
    try {
      cachedUser = JSON.parse(cachedUserRaw);
    } catch {
      localStorage.removeItem('esg_super_admin_user');
    }
  }

  return {
    token: cachedToken,
    user: cachedUser,
    isAuthenticated: !!cachedToken,
    login: (token, user) => {
      localStorage.setItem('esg_super_admin_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('esg_super_admin_user', JSON.stringify(user));
      set({ token, user, isAuthenticated: true });
    },
    logout: () => {
      localStorage.removeItem('esg_super_admin_token');
      localStorage.removeItem('token');
      localStorage.removeItem('esg_super_admin_user');
      set({ token: null, user: null, isAuthenticated: false });
    }
  };
});
