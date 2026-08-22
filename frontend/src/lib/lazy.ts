'use client';

import React, { Suspense } from 'react';

/**
 * PageLoading fallback for lazy-loaded page components.
 * Uses the existing skeleton-style loading from the design system.
 */
function LazyFallback() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '300px',
      color: 'var(--color-text-muted)',
      fontSize: 'var(--text-sm)',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-3)',
      }}>
        <div style={{
          width: 32,
          height: 32,
          border: '3px solid var(--color-border-primary)',
          borderTopColor: 'var(--color-accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        Loading…
      </div>
    </div>
  );
}

/**
 * Wrap a dynamically imported component in a Suspense boundary.
 *
 * Usage:
 *   const HeavyChart = lazyPage(() => import('@/components/charts/RevenueChart'));
 *   // Then in JSX: <HeavyChart data={data} />
 */
export function lazyPage<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
) {
  const LazyComponent = React.lazy(importFn);

  return function WrappedLazy(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={<LazyFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}
