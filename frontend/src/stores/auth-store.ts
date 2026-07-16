'use client';

import { create } from 'zustand';
import { api } from '@/lib/api-client';
import type { User } from '@/types/models';

// ──────────────────────────────────────────────
// Auth Store — Zustand (Cookie-based)
// ──────────────────────────────────────────────
// Tokens are now in httpOnly cookies (set by the backend).
// Auth state is determined by calling /users/me — if the cookie
// is valid, we get user data back; if not, we're logged out.

interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;

  /** Hydrate user from cookie-based session on app mount */
  hydrate: () => Promise<void>;

  /** Login with phone + password */
  login: (phone: string, password: string) => Promise<User>;

  /** Logout and clear cookies */
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
      // Try to fetch profile — if cookie is valid, we get user data
      const res = await api.get<{ success: boolean; data: User }>('/users/me');
      if (res.success && res.data) {
        set({ user: res.data, isAuthenticated: true });
      }
    } catch {
      // No valid session — user is not authenticated
    } finally {
      set({ loading: false });
    }
  },

  login: async (phone: string, password: string) => {
    const res = await api.login(phone, password);
    if (res.success && res.data) {
      // Tokens are set as httpOnly cookies by the backend
      // We just need to store the user in state
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
