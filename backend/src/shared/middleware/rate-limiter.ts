import rateLimit from 'express-rate-limit';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

const isDev = env.NODE_ENV === 'development';

/**
 * Create a Redis-backed rate limit store if Redis is available,
 * otherwise fall back to in-memory store.
 */
async function createStore(): Promise<any> {
  try {
    const { default: RedisStore } = await import('rate-limit-redis');
    const { getRedis } = await import('../../config/redis');
    const redis = getRedis();

    return new RedisStore({
      sendCommand: ((...args: string[]) => redis.call(...(args as [string, ...string[]]))) as any,
      prefix: 'rl:',
    });
  } catch (err) {
    logger.warn('[RateLimit] Redis store unavailable, using in-memory fallback');
    return undefined; // Falls back to MemoryStore
  }
}

// Store instance (initialized lazily)
let storePromise: Promise<any> | null = null;

function getStore() {
  if (!storePromise) {
    storePromise = createStore();
  }
  return storePromise;
}

/**
 * General API rate limiter.
 *
 * Development: 1000 req / 15 min (generous — prevents accidental infinite loops only)
 * Production:  Uses RATE_LIMIT_MAX_REQUESTS env var (default 100 / 15 min)
 */
export const apiRateLimiter = rateLimit({
  windowMs: isDev ? 60_000 : env.RATE_LIMIT_WINDOW_MS,        // dev: 1 min window
  max: isDev ? 500 : env.RATE_LIMIT_MAX_REQUESTS,              // dev: 500/min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
  // Skip rate limiting entirely for localhost in dev if wanted:
  skip: isDev ? (_req) => false : undefined,
});

/**
 * Stricter rate limiter for auth endpoints (login, register).
 *
 * Development: 50 attempts / 5 min
 * Production:  10 attempts / 15 min
 */
export const authRateLimiter = rateLimit({
  windowMs: isDev ? 5 * 60 * 1000 : 15 * 60 * 1000,
  max: isDev ? 50 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    data: null,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later',
    },
  },
});

/**
 * Initialize Redis-backed stores for rate limiters.
 * Call this after Redis connection is established.
 */
export async function initRedisRateLimitStore(): Promise<void> {
  try {
    const store = await getStore();
    if (store) {
      logger.info('[RateLimit] Redis store initialized for distributed rate limiting');
    }
  } catch (err) {
    logger.warn('[RateLimit] Could not initialize Redis store', { error: String(err) });
  }
}
