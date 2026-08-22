'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('[Admin Error]', error);
  }, [error]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      padding: 'var(--space-8)',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 440 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'rgba(244, 63, 94, 0.08)',
          color: 'var(--color-danger-400)',
          marginBottom: 'var(--space-5)',
        }}>
          <AlertTriangle size={36} />
        </div>
        <h2 style={{
          fontSize: 'var(--text-xl)',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-2)',
        }}>
          Admin Error
        </h2>
        <p style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-tertiary)',
          lineHeight: 1.6,
          marginBottom: 'var(--space-6)',
        }}>
          {error.message || 'An error occurred in the admin panel. Please try again.'}
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
          <button
            onClick={() => router.push('/admin')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-2) var(--space-4)',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-primary)',
              cursor: 'pointer',
              background: 'var(--color-bg-secondary)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <Home size={16} /> Admin Home
          </button>
          <button
            onClick={reset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              padding: 'var(--space-2) var(--space-4)',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              borderRadius: 'var(--radius-md)',
              border: 'none',
              cursor: 'pointer',
              background: 'var(--color-primary-500)',
              color: 'white',
            }}
          >
            <RefreshCw size={16} /> Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
