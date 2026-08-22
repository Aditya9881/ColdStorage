'use client';

import React from 'react';
import { Header } from './Header';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/ui/Breadcrumbs';
import styles from './PageLayout.module.css';

interface PageLayoutProps {
  /** Page title shown in the header */
  title: string;
  /** Page subtitle shown in the header */
  subtitle?: string;
  /** Action buttons shown in the header (right side) */
  actions?: React.ReactNode;
  /** Breadcrumb navigation items */
  breadcrumbs?: BreadcrumbItem[];
  /** Page content */
  children: React.ReactNode;
  /** Additional class for the content area */
  className?: string;
  /** Content max width constraint. Defaults to the design system max. */
  maxWidth?: boolean;
}

/**
 * PageLayout — Standardized page structure for all dashboard pages.
 *
 * Provides:
 * - Header with title, subtitle, and actions
 * - Optional breadcrumbs
 * - Scrollable content area with consistent padding
 *
 * Usage:
 *   <PageLayout
 *     title="Inventory"
 *     subtitle="Manage stored lots"
 *     breadcrumbs={[
 *       { label: 'WMS', href: '/wms' },
 *       { label: 'Inventory' },
 *     ]}
 *     actions={<Button>New Intake</Button>}
 *   >
 *     {content}
 *   </PageLayout>
 */
export function PageLayout({
  title,
  subtitle,
  actions,
  breadcrumbs,
  children,
  className = '',
  maxWidth = true,
}: PageLayoutProps) {
  return (
    <>
      <Header title={title} subtitle={subtitle} actions={actions} />
      <main className={`${styles.content} ${maxWidth ? styles.maxWidth : ''} ${className}`}>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumbs items={breadcrumbs} />
        )}
        {children}
      </main>
    </>
  );
}
