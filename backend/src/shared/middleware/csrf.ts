/**
 * CSRF Protection Middleware
 *
 * Protects cookie-based authentication against Cross-Site Request Forgery.
 *
 * Strategy:
 *   1. GET /api/v1/auth/csrf-token → returns a signed CSRF token in the response body.
 *      The frontend stores this token in memory (NOT in a cookie).
 *   2. For every mutating request (POST/PUT/PATCH/DELETE) that uses cookie-based auth
 *      (i.e. no Authorization header), the frontend must send the token in
 *      the `X-CSRF-Token` header.
 *   3. This middleware validates the token before allowing the request through.
 *
 * Why this works:
 *   - Cookies are sent automatically by the browser on every request.
 *   - But a malicious site cannot read the CSRF token from our API response
 *     (blocked by CORS) or set custom headers on cross-origin requests.
 *   - Mobile apps use Bearer tokens (not cookies), so CSRF is not needed for them.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { env } from '../../config/env';

// Use JWT_ACCESS_SECRET as HMAC key (already strong + rotatable)
const HMAC_KEY = env.JWT_ACCESS_SECRET;
const TOKEN_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

/**
 * Generate a signed CSRF token.
 * Format: <random_hex>.<timestamp>.<signature>
 */
export function generateCsrfToken(): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now().toString(36);
  const payload = `${nonce}.${timestamp}`;
  const signature = crypto
    .createHmac('sha256', HMAC_KEY)
    .update(payload)
    .digest('hex')
    .slice(0, 32); // truncate for shorter tokens
  return `${payload}.${signature}`;
}

/**
 * Validate a CSRF token.
 * Checks signature integrity and token freshness.
 */
function isValidCsrfToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [nonce, timestamp, signature] = parts;
  const payload = `${nonce}.${timestamp}`;

  // Verify signature
  const expected = crypto
    .createHmac('sha256', HMAC_KEY)
    .update(payload)
    .digest('hex')
    .slice(0, 32);

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return false;
  }

  // Verify freshness
  const tokenTime = parseInt(timestamp, 36);
  if (isNaN(tokenTime) || Date.now() - tokenTime > TOKEN_TTL_MS) {
    return false;
  }

  return true;
}

/**
 * CSRF protection middleware.
 *
 * Applies only to mutating requests that rely on cookie-based auth
 * (i.e. requests without an Authorization header).
 *
 * Safe methods (GET, HEAD, OPTIONS) are always allowed through.
 * Requests with Bearer tokens are always allowed through (mobile/API clients).
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Safe methods — no state change, no CSRF risk
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    next();
    return;
  }

  // If request uses Bearer auth, CSRF is not needed (not cookie-based)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  // Check for CSRF token in header
  const csrfToken = req.headers['x-csrf-token'] as string;
  if (!csrfToken) {
    res.status(403).json({
      success: false,
      data: null,
      error: {
        code: 'CSRF_TOKEN_MISSING',
        message: 'CSRF token is required for this request',
      },
    });
    return;
  }

  if (!isValidCsrfToken(csrfToken)) {
    res.status(403).json({
      success: false,
      data: null,
      error: {
        code: 'CSRF_TOKEN_INVALID',
        message: 'CSRF token is invalid or expired',
      },
    });
    return;
  }

  next();
}
