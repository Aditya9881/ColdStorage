import Redis from 'ioredis';
import { env, isDev } from './env';
import { logger } from './logger';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let redis: Redis | null = null;
let redisGaveUp = false;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 1,
      retryStrategy(times) {
        // Give up quickly — stop log spam when Redis isn't running
        if (times > 3) {
          redisGaveUp = true;
          return null as unknown as number; // Stop retrying
        }
        return Math.min(times * 500, 3000);
      },
      lazyConnect: true,
      enableReadyCheck: true,
    });

    redis.on('connect', () => {
      logger.info('[Redis] Connected successfully');
      redisGaveUp = false;
    });

    redis.on('error', (err) => {
      if (!redisGaveUp) {
        logger.error('[Redis] Connection error', { error: String(err) });
      }
    });

    redis.on('close', () => {
      if (!redisGaveUp) {
        logger.warn('[Redis] Connection closed');
      }
    });
  }
  return redis;
}

/**
 * Connect Redis — call during server startup.
 * Fails gracefully: if Redis is unavailable, the app continues
 * with degraded functionality (in-memory fallbacks).
 */
export async function connectRedis(): Promise<boolean> {
  try {
    const client = getRedis();
    await client.connect();
    await client.ping();
    logger.info('[Redis] PING successful — cache layer active');
    return true;
  } catch (err) {
    logger.warn('[Redis] Failed to connect — running without cache', { error: String(err) });
    return false;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
    logger.info('[Redis] Disconnected');
  }
}

/**
 * Cache-aside helper: get from cache or compute and store.
 */
export async function cacheGet<T>(
  key: string,
  ttlSeconds: number,
  computeFn: () => Promise<T>,
): Promise<T> {
  try {
    const client = getRedis();
    const cached = await client.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }

    const result = await computeFn();
    await client.setex(key, ttlSeconds, JSON.stringify(result));
    return result;
  } catch {
    // Redis unavailable — fall through to compute
    return computeFn();
  }
}

/**
 * Invalidate a cache key or pattern.
 */
export async function cacheInvalidate(pattern: string): Promise<void> {
  try {
    const client = getRedis();
    if (pattern.includes('*')) {
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } else {
      await client.del(pattern);
    }
  } catch {
    // Redis unavailable — skip
  }
}
