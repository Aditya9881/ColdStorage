/**
 * Sentry Error Monitoring — Backend
 *
 * Express error-monitoring middleware and utilities.
 * Captures unhandled errors and attaches request context.
 *
 * If SENTRY_DSN env is not set, this is a no-op (safe to wire in always).
 *
 * Usage in app.ts:
 *   import { sentryRequestHandler, sentryErrorHandler, captureException } from './config/sentry';
 *   app.use(sentryRequestHandler);       // Before routes
 *   app.use(sentryErrorHandler);         // After routes, before error handler
 */

import { Request, Response, NextFunction } from 'express';

const SENTRY_DSN = process.env.SENTRY_DSN || '';
let isEnabled = false;

// ── Initialization ────────────────────────────────────

if (SENTRY_DSN) {
  isEnabled = true;
  console.info(`[Sentry] Backend monitoring enabled (env: ${process.env.NODE_ENV})`);

  // Capture unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    captureException(error, { source: 'unhandledRejection' });
  });

  // Capture uncaught exceptions (log + exit)
  process.on('uncaughtException', (error: Error) => {
    captureException(error, { source: 'uncaughtException' });
    console.error('[Sentry] Uncaught exception — shutting down:', error);
    process.exit(1);
  });
} else {
  console.info('[Sentry] No DSN configured — backend error monitoring disabled');
}

// ── Middleware ────────────────────────────────────────

/**
 * Request handler middleware — attaches request context for error reports.
 * Place this BEFORE your routes.
 */
export function sentryRequestHandler(req: Request, _res: Response, next: NextFunction): void {
  // Attach request start time for latency tracking
  (req as any)._sentryStartTime = Date.now();
  next();
}

/**
 * Error handler middleware — captures errors that bubble up from routes.
 * Place this AFTER your routes but BEFORE your custom error handler.
 */
export function sentryErrorHandler(err: Error, req: Request, _res: Response, next: NextFunction): void {
  if (isEnabled) {
    const latencyMs = (req as any)._sentryStartTime
      ? Date.now() - (req as any)._sentryStartTime
      : undefined;

    captureException(err, {
      method: req.method,
      url: req.originalUrl,
      statusCode: (err as any).statusCode || 500,
      latencyMs,
      userId: (req as any).user?.userId,
      userRole: (req as any).user?.role,
      ip: req.ip,
    });
  }

  // Always pass to the next error handler
  next(err);
}

// ── Utilities ────────────────────────────────────────

/**
 * Capture an exception with optional context.
 * No-op if SENTRY_DSN is not configured.
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  if (!isEnabled) return;

  // When @sentry/node is installed, replace this with:
  //   Sentry.captureException(error, { extra: context });
  //
  // For now, structured JSON logging for production log aggregation
  const report = {
    level: 'error',
    message: error.message,
    stack: error.stack?.split('\n').slice(0, 10).join('\n'),
    code: (error as any).code,
    ...context,
    timestamp: new Date().toISOString(),
  };

  console.error(JSON.stringify(report));
}

/**
 * Set user context for subsequent error reports in this request.
 */
export function setUser(req: Request, user: { id: string; role?: string }): void {
  (req as any)._sentryUser = user;
}
