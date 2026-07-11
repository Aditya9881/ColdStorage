'use client';

import { create } from 'zustand';
import { api } from '@/lib/api-client';
import type { User } from '@/types/models';

// ──────────────────────────────────────────────
// Auth Store — Zustand
// ──────────────────────────────────────────────
// Replaces the React Context-based AuthProvider with a global store.
// Benefits:
//   - No Provider nesting required
//   - Accessible anywhere: `const user = useAuthStore(s => s.user)`
//   - Persist across re-renders without prop-drilling

interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;

  /** Hydrate user from stored token on app mount */
  hydrate: () => Promise<void>;

  /** Login with phone + password */
  login: (phone: string, password: string) => Promise<User>;

  /** Logout and clear tokens */
  logout: () => Promise<void>;

  /** Refresh user profile from API */
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  isAuthenticated: false,

  hydrate: async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) {
        set({ loading: false });
        return;
      }
      const res = await api.get<{ success: boolean; data: User }>('/users/me');
      if (res.success && res.data) {
        set({ user: res.data, isAuthenticated: true });
      }
    } catch {
      // Token expired or invalid
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    } finally {
      set({ loading: false });
    }
  },

  login: async (phone: string, password: string) => {
    const res = await api.login(phone, password);
    if (res.success && res.data) {
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      set({ user: res.data.user, isAuthenticated: true });
      return res.data.user;
    }
    throw new Error('Login failed');
  },

  logout: async () => {
    try {
      await api.logout();
    } catch {
      // Ignore — clear state regardless
    }
    set({ user: null, isAuthenticated: false });
  },

  refreshProfile: async () => {
    try {
      const res = await api.get<{ success: boolean; data: User }>('/users/me');
      if (res.success && res.data) {
        set({ user: res.data, isAuthenticated: true });
      }
    } catch {
      // Fail silently
    }
  },
}));
