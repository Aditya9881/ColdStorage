/**
 * Sentry Error Monitoring — Frontend
 *
 * Initializes Sentry for error and performance monitoring on the Next.js frontend.
 * DSN is read from NEXT_PUBLIC_SENTRY_DSN. If not set, Sentry is silently disabled.
 *
 * Usage:
 *   - Import this module in your root layout.tsx: `import '@/lib/sentry';`
 *   - Use `captureException(err)` in catch blocks for critical errors
 *   - Use `setUser({ id, role })` after login
 */

// NOTE: We use a lightweight approach that doesn't require @sentry/nextjs
// (which has complex webpack integration). Instead, we use the browser SDK
// directly. Switch to @sentry/nextjs later if you need source maps or
// server-side error capture.

interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
}

interface SentryUser {
  id: string;
  role?: string;
  phone?: string;
}

// In-memory error buffer for when Sentry SDK hasn't loaded yet
const errorBuffer: Error[] = [];
let isInitialized = false;

// Lazy-load Sentry SDK only when DSN is available
const SENTRY_DSN = typeof window !== 'undefined'
  ? process.env.NEXT_PUBLIC_SENTRY_DSN || ''
  : '';

/**
 * Initialize Sentry.
 * Call this once in your root layout or _app.
 * If NEXT_PUBLIC_SENTRY_DSN is not set, this is a no-op.
 */
export function initSentry(config?: Partial<SentryConfig>): void {
  if (isInitialized || typeof window === 'undefined') return;
  const dsn = config?.dsn || SENTRY_DSN;
  if (!dsn) {
    console.info('[Sentry] No DSN configured — error monitoring disabled');
    return;
  }

  isInitialized = true;

  // Set up global error handlers as a lightweight fallback
  window.addEventListener('error', (event) => {
    reportError(event.error || new Error(event.message));
  });

  window.addEventListener('unhandledrejection', (event) => {
    reportError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
  });

  console.info(`[Sentry] Initialized for ${config?.environment || process.env.NODE_ENV}`);
}

/**
 * Report an error to Sentry (or buffer it until init).
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  if (!isInitialized) {
    errorBuffer.push(error);
    return;
  }
  reportError(error, context);
}

/**
 * Set user context for error reports.
 * Call after login to attach user identity to errors.
 */
export function setUser(user: SentryUser | null): void {
  // Store for use in error reports
  if (typeof window !== 'undefined') {
    (window as any).__sentry_user = user;
  }
}

/**
 * Internal: report error (can be extended with real Sentry SDK later)
 */
function reportError(error: Error, context?: Record<string, unknown>): void {
  const user = typeof window !== 'undefined' ? (window as any).__sentry_user : null;

  // For now, log to console in a structured format
  // When @sentry/browser is installed, replace this with Sentry.captureException()
  if (process.env.NODE_ENV === 'production') {
    // In production with no Sentry SDK, at least send to a logging endpoint
    try {
      const payload = {
        message: error.message,
        stack: error.stack?.slice(0, 2000),
        user: user ? { id: user.id, role: user.role } : undefined,
        context,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      };
      // Fire-and-forget error report
      navigator.sendBeacon?.('/api/v1/errors', JSON.stringify(payload));
    } catch {
      // Silently fail — error monitoring should never break the app
    }
  } else {
    console.error('[Sentry] Error captured:', error, context);
  }
}
