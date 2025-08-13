import dotenv from 'dotenv';
import app from './app';
import { connectDB } from './config/database-mock';
import { connectRedis } from './config/redis-mock';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Connect to PostgreSQL
    await connectDB();
    logger.info('✅ Connected to PostgreSQL database');

    // Connect to Redis
    await connectRedis();
    logger.info('✅ Connected to Redis');

    // Start the server
    app.listen(PORT, () => {
      logger.info(`🚀 Server is running on port ${PORT}`);
      logger.info(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
      logger.info(`🩺 Health check available at http://localhost:${PORT}/health`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('UNHANDLED PROMISE REJECTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('👋 SIGTERM RECEIVED. Shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('👋 SIGINT RECEIVED. Shutting down gracefully');
  process.exit(0);
});

startServer();
