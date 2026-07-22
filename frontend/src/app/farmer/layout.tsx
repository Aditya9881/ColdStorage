'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

export default function FarmerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated || !user) {
      router.replace('/');
      return;
    }

    if (user.role !== 'FARMER') {
      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
        router.replace('/admin');
      } else if (user.role === 'OWNER' || user.role === 'STAFF') {
        router.replace('/wms');
      } else {
        router.replace('/');
      }
    }
  }, [loading, isAuthenticated, user, router]);

  if (loading || !isAuthenticated || !user || user.role !== 'FARMER') {
    return null;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7F4' }}>
      {children}
    </div>
  );
}
