'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import styles from './dashboard.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // WMS routes have their own layout with sidebar,
  // so we only render the admin sidebar for non-WMS routes
  const isWmsRoute = pathname.startsWith('/wms');

  if (isWmsRoute) {
    // WMS layout handles its own sidebar
    return <>{children}</>;
  }

  return (
    <div className={styles.dashboardLayout}>
      <Sidebar role="admin" />
      <div className={styles.mainArea}>
        {children}
      </div>
    </div>
  );
}
