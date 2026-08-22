import Link from 'next/link';

export default function DashboardNotFound() {
  return (
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
          background: 'rgba(99, 102, 241, 0.08)',
          color: 'var(--color-primary-400)',
          marginBottom: 'var(--space-5)',
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </div>
        <h2 style={{
          fontSize: 'var(--text-xl)',
          fontWeight: 600,
          color: 'var(--color-text-primary)',
          marginBottom: 'var(--space-2)',
        }}>
          Page not found
        </h2>
        <p style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--color-text-tertiary)',
          lineHeight: 1.6,
          marginBottom: 'var(--space-6)',
        }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
          <Link
            href="/admin"
            style={{
              padding: 'var(--space-2) var(--space-5)',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              borderRadius: 'var(--radius-md)',
              border: 'none',
              cursor: 'pointer',
              background: 'var(--color-primary-500)',
              color: 'white',
              display: 'inline-block',
            }}
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
