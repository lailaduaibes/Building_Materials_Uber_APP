import dotenv from 'dotenv';
import app from './app';
import { connectDB } from './config/database-supabase';
import { connectRedis } from './config/redis';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Connect to PostgreSQL
    await connectDB();
    logger.info('✅ Connected to PostgreSQL database');

    // Connect to Redis (non-blocking - continues without Redis if unavailable)
    await connectRedis();

    // Start the server on all interfaces for tunnel access
    const server = app.listen(Number(PORT), '0.0.0.0', () => {
      logger.info(`🚀 Server is running on port ${PORT}`);
      logger.info(`📚 API Documentation available at http://localhost:${PORT}/api-docs`);
      logger.info(`🩺 Health check available at http://localhost:${PORT}/health`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Keep the process alive
    return server;

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('👋 SIGINT RECEIVED. Shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('👋 SIGTERM RECEIVED. Shutting down gracefully');
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});
