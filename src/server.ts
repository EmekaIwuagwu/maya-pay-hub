// src/server.ts

import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { connectDatabase } from './config/database';
import { connectRedis } from './config/redis';
import { verifyBlockchainConnection } from './config/blockchain';

/**
 * Start server
 */
async function startServer() {
  try {
    logger.info('🚀 Starting Maya Payment Backend...');

    // Connect to database
    logger.info('📊 Connecting to database...');
    await connectDatabase();

    // Connect to Redis
    logger.info('🔴 Connecting to Redis...');
    await connectRedis();

    // Verify blockchain connection
    logger.info('⛓️  Verifying blockchain connection...');
    await verifyBlockchainConnection();

    // Start Express server
    const port = config.port;
    app.listen(port, () => {
      logger.info(`✅ Server running on port ${port}`);
      logger.info(`📡 Environment: ${config.env}`);
      logger.info(`🌐 API URL: ${config.apiUrl}`);
      logger.info(`🎨 Frontend URL: ${config.frontendUrl}`);
      logger.info('');
      logger.info('🎉 Maya Payment Backend is ready!');
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

// Handle SIGINT
process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();
