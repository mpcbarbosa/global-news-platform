import app from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { testConnection } from './config/database';
import { connectRedis, testRedisConnection } from './config/redis';

async function bootstrap(): Promise<void> {
  logger.info('🚀 Starting Gobii News API...');

  // Test database connection
  const dbOk = await testConnection();
  if (!dbOk) {
    logger.error('Cannot start without database connection');
    process.exit(1);
  }

  // Connect Redis
  try {
    await connectRedis();
    await testRedisConnection();
  } catch (error) {
    logger.warn('Redis connection failed — running without cache', { error: (error as Error).message });
  }

  // Start server
  app.listen(env.PORT, () => {
    logger.info(`✅ Gobii News API running on port ${env.PORT}`);
    logger.info(`   Environment: ${env.NODE_ENV}`);
    logger.info(`   Health check: http://localhost:${env.PORT}/health`);
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received — shutting down gracefully');
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

bootstrap();
