'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User { email: string; role: string }
interface AuthCtx {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export function AuthProvider({ children }: { children: ReactNode }) {
  const router  = useRouter();
  const [user, setUser]       = useState<User | null>(null);
  const [token, setToken]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('pfis_token');
    const savedUser  = localStorage.getItem('pfis_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error('Geçersiz e-posta veya şifre');
    const data = await res.json();
    localStorage.setItem('pfis_token', data.access_token);
    localStorage.setItem('pfis_user', JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    router.push('/admin');
  };

  const logout = () => {
    localStorage.removeItem('pfis_token');
    localStorage.removeItem('pfis_user');
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  return <Ctx.Provider value={{ user, token, login, logout, loading }}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
