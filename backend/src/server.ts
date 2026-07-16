import app from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { logger } from './config/logger';
import { startTemperatureSimulator, stopTemperatureSimulator } from './modules/temperature/temperature-simulator';
import { startAlertEngine, stopAlertEngine } from './modules/notifications/alert-engine';
import { startMqttIngestion, stopMqttIngestion } from './modules/temperature/mqtt-ingestion';
import { connectRedis, disconnectRedis } from './config/redis';

async function startServer(): Promise<void> {
  // Connect to database
  await connectDatabase();

  // Connect to Redis (non-blocking — app works without it)
  const redisConnected = await connectRedis();
  if (!redisConnected) {
    logger.warn('Running without Redis — rate limiting and caching will use in-memory fallbacks');
  }

  // Start HTTP server
  const server = app.listen(env.PORT, async () => {
    logger.info(`ColdStorage API server running`, {
      port: env.PORT,
      environment: env.NODE_ENV,
      apiPrefix: env.API_PREFIX,
      redis: redisConnected ? 'connected' : 'degraded',
    });
    logger.info(`Health check: http://localhost:${env.PORT}/health`);
    logger.info(`API base: http://localhost:${env.PORT}${env.API_PREFIX}`);

    // ── Background Services ───────────────────────────────
    // MQTT ingestion: runs in all environments when MQTT_BROKER_URL is set.
    // Falls back to no-op in dev if broker is not configured.
    await startMqttIngestion();

    // Dev simulator: only runs if MQTT is NOT configured and we're in development.
    // Provides realistic fake sensor data for local testing without real hardware.
    if (env.NODE_ENV === 'development' && !process.env.MQTT_BROKER_URL) {
      startTemperatureSimulator();
    }

    // Alert engine: runs in all environments to catch temp/capacity/expiry alerts.
    startAlertEngine();

    // Session cleanup: prune expired refresh token sessions every hour
    const SESSION_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
    setInterval(async () => {
      try {
        const { prisma } = await import('./config/database');
        const { count } = await prisma.userSession.deleteMany({
          where: { expiresAt: { lt: new Date() } },
        });
        if (count > 0) {
          logger.info(`[SessionCleanup] Pruned ${count} expired sessions`);
        }
      } catch (err) {
        logger.error('[SessionCleanup] Failed to prune sessions', { error: String(err) });
      }
    }, SESSION_CLEANUP_INTERVAL);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    server.close(async () => {
      stopMqttIngestion();
      stopTemperatureSimulator();
      stopAlertEngine();
      await disconnectRedis();
      await disconnectDatabase();
      logger.info('Server shut down gracefully');
      process.exit(0);
    });

    // Force shutdown after 10s
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Unhandled rejections
  process.on('unhandledRejection', (reason: unknown) => {
    logger.error('Unhandled Rejection', { reason: String(reason) });
  });

  // Uncaught exceptions — log and initiate graceful shutdown
  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception — initiating shutdown', {
      message: error.message,
      stack: error.stack,
    });
    shutdown('uncaughtException');
  });
}

startServer().catch((error) => {
  logger.error('Failed to start server', { error: String(error) });
  process.exit(1);
});
