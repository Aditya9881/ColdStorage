import { Request, Response, NextFunction } from 'express';
import { getRedis } from '../../config/redis';
import { logger } from '../../config/logger';

/**
 * Idempotency Middleware
 *
 * Prevents duplicate write operations caused by network retries,
 * double-taps, or offline queue replays.
 *
 * The client sends an `Idempotency-Key` header (a UUID).
 * - If the key is new: process the request, cache the response for 24h.
 * - If the key was seen before: return the cached response without re-processing.
 *
 * Usage:
 *   router.post('/orders', idempotent, controller.create);
 */
export async function idempotent(req: Request, res: Response, next: NextFunction): Promise<void> {
  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

  // If no key provided, proceed normally (backward compatible)
  if (!idempotencyKey) {
    next();
    return;
  }

  // Validate key format (UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(idempotencyKey)) {
    res.status(400).json({
      success: false,
      data: null,
      error: {
        code: 'INVALID_IDEMPOTENCY_KEY',
        message: 'Idempotency-Key must be a valid UUID',
      },
    });
    return;
  }

  const cacheKey = `idempotency:${idempotencyKey}`;

  try {
    const redis = getRedis();
    const cached = await redis.get(cacheKey);

    if (cached) {
      // Duplicate request — return cached response
      const cachedResponse = JSON.parse(cached);
      logger.debug('[Idempotency] Returning cached response', { key: idempotencyKey });
      res.status(cachedResponse.status).json(cachedResponse.body);
      return;
    }

    // Mark as in-progress (lock for 30 seconds to prevent race conditions)
    const lockKey = `${cacheKey}:lock`;
    const acquired = await redis.set(lockKey, '1', 'EX', 30, 'NX');

    if (!acquired) {
      // Another request with the same key is currently being processed
      res.status(409).json({
        success: false,
        data: null,
        error: {
          code: 'DUPLICATE_REQUEST',
          message: 'A request with this idempotency key is currently being processed',
        },
      });
      return;
    }

    // Intercept the response to cache it
    const originalJson = res.json.bind(res);
    res.json = function (body: any) {
      // Cache the response for 24 hours
      const responseToCache = JSON.stringify({
        status: res.statusCode,
        body,
      });

      redis.setex(cacheKey, 86400, responseToCache).catch((err) => {
        logger.error('[Idempotency] Failed to cache response', { error: String(err) });
      });

      // Release lock
      redis.del(lockKey).catch(() => {});

      return originalJson(body);
    };

    next();
  } catch (err) {
    // Redis unavailable — proceed without idempotency protection
    logger.warn('[Idempotency] Redis unavailable, skipping', { error: String(err) });
    next();
  }
}
