import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ mustChangePwd?: boolean }>;
  logout: () => void;
  changePassword: (ancien: string, nouveau: string) => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isEmployee: boolean;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem('auth');
    if (stored) {
      try {
        const { user, token } = JSON.parse(stored);
        setUser(user);
        setToken(token);
      } catch {}
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, motDePasse: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, motDePasse }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Erreur de connexion');
    setUser(data.user);
    setToken(data.token);
    sessionStorage.setItem('auth', JSON.stringify({ user: data.user, token: data.token }));
    return { mustChangePwd: data.user.mustChangePwd };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    sessionStorage.removeItem('auth');
  }, []);

  const changePassword = useCallback(async (ancienMotDePasse: string, nouveauMotDePasse: string) => {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ ancienMotDePasse, nouveauMotDePasse }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    // Update user state
    if (user) {
      const updated = { ...user, mustChangePwd: false };
      setUser(updated);
      sessionStorage.setItem('auth', JSON.stringify({ user: updated, token }));
    }
  }, [token, user]);

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, logout, changePassword,
      isAdmin: user?.role === 'admin',
      isManager: user?.role === 'gestionnaire' || user?.role === 'admin',
      isEmployee: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
