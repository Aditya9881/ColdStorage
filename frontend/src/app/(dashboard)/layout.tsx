'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { PageLoading } from '@/components/ui/PageLoading';
import { useAuthStore } from '@/stores/auth-store';
import styles from './dashboard.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuthStore();

  // WMS routes have their own layout with sidebar,
  // so we only render the admin sidebar for non-WMS routes
  const isWmsRoute = pathname.startsWith('/wms');
  const isAdminRoute = pathname.startsWith('/admin');

  useEffect(() => {
    if (loading) return;

    // Not logged in → redirect to home
    if (!isAuthenticated || !user) {
      router.replace('/');
      return;
    }

    const role = user.role;

    // Owners/Staff trying to access admin routes → redirect to WMS
    if (isAdminRoute && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      router.replace('/wms');
      return;
    }

    // Farmers get their own dashboard
    if (role === 'FARMER') {
      router.replace('/farmer');
      return;
    }

    // Buyers shouldn't access web dashboard at all
    if (role === 'BUYER') {
      router.replace('/');
      return;
    }
  }, [loading, isAuthenticated, user, isAdminRoute, pathname, router]);

  // Show loading skeleton while checking auth
  if (loading || !isAuthenticated || !user) {
    return (
      <div className={styles.dashboardLayout}>
        <div className={styles.mainArea}>
          <PageLoading />
        </div>
      </div>
    );
  }

  if (isWmsRoute) {
    // WMS layout handles its own sidebar
    return <ErrorBoundary>{children}</ErrorBoundary>;
  }

  return (
    <div className={styles.dashboardLayout}>
      <Sidebar role="admin" />
      <div className={styles.mainArea}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    </div>
  );
}
