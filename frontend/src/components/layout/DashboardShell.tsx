'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import styles from './DashboardShell.module.css';

interface DashboardShellProps {
  children: React.ReactNode;
  /** Which sidebar navigation to show */
  role: 'admin' | 'wms';
}

/**
 * DashboardShell — Canonical layout wrapper for all dashboard pages.
 *
 * Provides:
 * - Sidebar navigation (configurable per role)
 * - Main content area with proper spacing
 * - Error boundary around content
 *
 * Usage:
 *   // In a layout.tsx file:
 *   export default function WMSLayout({ children }) {
 *     return <DashboardShell role="wms">{children}</DashboardShell>;
 *   }
 */
export function DashboardShell({ children, role }: DashboardShellProps) {
  return (
    <div className={styles.shell}>
      <Sidebar role={role} />
      <div className={styles.mainArea}>
        <ErrorBoundary>{children}</ErrorBoundary>
      </div>
    </div>
  );
}
