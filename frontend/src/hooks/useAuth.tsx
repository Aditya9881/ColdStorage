'use client';

import React, { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';

// ──────────────────────────────────────────────
// useAuth — Backward-compatible hook
// ──────────────────────────────────────────────
// This wraps the Zustand store so existing components that import
// `useAuth()` or `<AuthProvider>` continue to work unchanged.

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);

  return { user, loading, login, logout, isAuthenticated };
}

/**
 * AuthProvider — Hydrates the auth store on mount.
 * Kept as a thin wrapper for backward compat with the root layout.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return <>{children}</>;
}
