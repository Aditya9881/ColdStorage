'use client';

import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import styles from './wms.module.css';

export default function WMSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.wmsLayout}>
      <Sidebar role="wms" />
      <div className={styles.mainArea}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    </div>
  );
}

