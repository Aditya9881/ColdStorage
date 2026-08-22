'use client';

import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorBoundary
      fallback={
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          padding: 'var(--space-8)',
        }}>
          <div style={{ textAlign: 'center', maxWidth: 420 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'rgba(244, 63, 94, 0.08)',
              color: 'var(--color-danger-400)',
              marginBottom: 'var(--space-5)',
            }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              marginBottom: 'var(--space-2)',
            }}>
              Something went wrong
            </h2>
            <p style={{
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-tertiary)',
              lineHeight: 1.6,
              marginBottom: 'var(--space-6)',
            }}>
              {error.message || 'An unexpected error occurred. Please try again.'}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
              <button
                onClick={reset}
                style={{
                  padding: 'var(--space-2) var(--space-5)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 500,
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  cursor: 'pointer',
                  background: 'var(--color-primary-500)',
                  color: 'white',
                }}
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      }
    >
      <></>
    </ErrorBoundary>
  );
}
