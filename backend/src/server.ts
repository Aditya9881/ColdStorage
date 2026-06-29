import app from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { logger } from './config/logger';
import { startTemperatureSimulator, stopTemperatureSimulator } from './modules/temperature/temperature-simulator';
import { startAlertEngine, stopAlertEngine } from './modules/notifications/alert-engine';

async function startServer(): Promise<void> {
  // Connect to database
  await connectDatabase();

  // Start HTTP server
  const server = app.listen(env.PORT, () => {
    logger.info(`ColdStorage API server running`, {
      port: env.PORT,
      environment: env.NODE_ENV,
      apiPrefix: env.API_PREFIX,
    });
    logger.info(`Health check: http://localhost:${env.PORT}/health`);
    logger.info(`API base: http://localhost:${env.PORT}${env.API_PREFIX}`);

    // Start background services in dev mode
    startTemperatureSimulator();
    startAlertEngine();
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    server.close(async () => {
      stopTemperatureSimulator();
      stopAlertEngine();
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
}

startServer().catch((error) => {
  logger.error('Failed to start server', { error: String(error) });
  process.exit(1);
});
