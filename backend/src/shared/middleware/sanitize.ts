/**
 * Input Sanitization — ColdStorage Backend
 *
 * Strips HTML tags and dangerous patterns from user-submitted strings.
 * Prevents stored XSS when admin dashboards render user data.
 */

// Strip HTML tags, script blocks, and event handlers
const HTML_TAG_RE = /<\/?[^>]+(>|$)/g;
const SCRIPT_RE = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
const EVENT_HANDLER_RE = /\bon\w+\s*=/gi;
const JAVASCRIPT_URI_RE = /javascript\s*:/gi;

/**
 * Sanitize a single string value.
 * Strips HTML tags, script blocks, JS URIs, and event handlers.
 * Preserves the text content.
 */
export function sanitizeString(value: string): string {
  return value
    .replace(SCRIPT_RE, '')
    .replace(HTML_TAG_RE, '')
    .replace(EVENT_HANDLER_RE, '')
    .replace(JAVASCRIPT_URI_RE, '')
    .trim();
}

/**
 * Recursively sanitize all string values in an object.
 * Preserves object structure, only transforms string leaves.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Don't sanitize password fields — they may legitimately contain special chars
      if (key.toLowerCase().includes('password')) {
        result[key] = value;
      } else {
        result[key] = sanitizeString(value);
      }
    } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'string'
          ? sanitizeString(item)
          : item && typeof item === 'object'
            ? sanitizeObject(item as Record<string, unknown>)
            : item
      );
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * Express middleware that sanitizes req.body strings.
 * Apply before validation middleware.
 */
import { Request, Response, NextFunction } from 'express';

export function sanitizeInput(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  next();
}
