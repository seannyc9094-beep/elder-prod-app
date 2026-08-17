import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import API from '../utils/api';
const TOKEN_KEY = 'auth_token';

async function getStoredToken(): Promise<string | null> {
  if (Platform.OS === 'web') return localStorage.getItem(TOKEN_KEY);
  return SecureStore.getItemAsync(TOKEN_KEY);
}

async function storeToken(value: string | null) {
  if (Platform.OS === 'web') {
    if (value) localStorage.setItem(TOKEN_KEY, value);
    else localStorage.removeItem(TOKEN_KEY);
  } else if (value) {
    await SecureStore.setItemAsync(TOKEN_KEY, value);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

async function apiPost(path: string, body: unknown) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data?.detail;
    throw new Error(typeof detail === 'string' ? detail : 'Something went wrong. Please try again.');
  }
  return data;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const saved = await getStoredToken();
      if (saved) {
        const res = await fetch(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${saved}` },
        });
        if (res.ok) {
          setUser(await res.json());
          setToken(saved);
        } else {
          await storeToken(null);
        }
      }
    } catch (e) {
      console.error('Error restoring session:', e);
    } finally {
      setLoading(false);
    }
  };

  const applyAuth = async (data: { access_token: string; user: AuthUser }) => {
    await storeToken(data.access_token);
    setToken(data.access_token);
    setUser(data.user);
  };

  const login = async (email: string, password: string) => {
    const data = await apiPost('/auth/login', { email: email.trim(), password });
    await applyAuth(data);
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await apiPost('/auth/register', { name: name.trim(), email: email.trim(), password });
    await applyAuth(data);
  };

  const logout = async () => {
    await storeToken(null);
    setToken(null);
    setUser(null);
  };

  const forgotPassword = async (email: string) => {
    await apiPost('/auth/forgot-password', { email: email.trim() });
  };

  const resetPassword = async (email: string, code: string, newPassword: string) => {
    await apiPost('/auth/reset-password', { email: email.trim(), code: code.trim(), new_password: newPassword });
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, forgotPassword, resetPassword }}>
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
