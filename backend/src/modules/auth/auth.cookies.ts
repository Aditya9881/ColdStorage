/**
 * Auth Cookie Utilities — ColdStorage Backend
 *
 * Centralizes httpOnly cookie configuration for auth tokens.
 * Tokens are set as Secure, HttpOnly, SameSite=Strict cookies.
 */
import { Response, CookieOptions } from 'express';
import { isProd } from '../../config/env';

// Cookie names
export const ACCESS_TOKEN_COOKIE = 'accessToken';
export const REFRESH_TOKEN_COOKIE = 'refreshToken';

/**
 * Parse JWT expiry string (e.g. '15m', '7d', '1h') to milliseconds for cookie maxAge.
 */
function expiryToMs(expiry: string): number {
  const match = expiry.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 900_000; // fallback 15min
  const [, num, unit] = match;
  const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return parseInt(num) * (multipliers[unit] || 60_000);
}

/**
 * Base cookie options for auth tokens.
 */
function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax', // lax in dev for cross-origin localhost
    path: '/',
  };
}

/**
 * Set access + refresh tokens as httpOnly cookies on the response.
 */
export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  accessExpiry: string = '15m',
  refreshExpiry: string = '7d'
): void {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
    ...baseCookieOptions(),
    maxAge: expiryToMs(accessExpiry),
  });

  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
    ...baseCookieOptions(),
    maxAge: expiryToMs(refreshExpiry),
  });
}

/**
 * Clear auth cookies (on logout).
 */
export function clearAuthCookies(res: Response): void {
  const opts: CookieOptions = {
    ...baseCookieOptions(),
    maxAge: 0,
  };
  res.clearCookie(ACCESS_TOKEN_COOKIE, opts);
  res.clearCookie(REFRESH_TOKEN_COOKIE, opts);
}
