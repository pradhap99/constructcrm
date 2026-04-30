'use client';
import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
}

interface AuthStore {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  hydrate: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('civiliq_token');
    const userStr = localStorage.getItem('civiliq_user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ token, user, isAuthenticated: true });
      } catch {}
    }
  },

  setAuth: (token, user) => {
    localStorage.setItem('civiliq_token', token);
    localStorage.setItem('civiliq_user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('civiliq_token');
    localStorage.removeItem('civiliq_user');
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
