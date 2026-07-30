'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';

export type Role = 'EMPLOYEE' | 'AGENT' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('quickdesk_user');
      return storedUser ? JSON.parse(storedUser) : null;
    }
    return null;
  });
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('quickdesk_token');
    }
    return null;
  });
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  const logout = React.useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('quickdesk_token');
    localStorage.removeItem('quickdesk_user');
    router.push('/login');
  }, [router]);

  useEffect(() => {
    if (token) {
      // Validate token with backend /auth/me
      api.get('/auth/me')
        .then((res) => {
          // Only update if necessary, or just rely on stable dependency
          setUser(res.data);
          localStorage.setItem('quickdesk_user', JSON.stringify(res.data));
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token, logout]);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('quickdesk_token', newToken);
    localStorage.setItem('quickdesk_user', JSON.stringify(newUser));

    if (newUser.role === 'AGENT' || newUser.role === 'ADMIN') {
      router.push('/agent/dashboard');
    } else {
      router.push('/employee/my-tickets');
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
