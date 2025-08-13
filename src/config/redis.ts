import Redis from 'ioredis';
import { logger } from '../utils/logger';

let redis: Redis;

export const connectRedis = async (): Promise<void> => {
  try {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      enableReadyCheck: false,
      maxRetriesPerRequest: null,
    });

    redis.on('connect', () => {
      logger.info('Redis connection established');
    });

    redis.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });

    redis.on('ready', () => {
      logger.info('Redis is ready to receive commands');
    });

    // Test the connection
    await redis.ping();
    logger.info('Redis connection test successful');
  } catch (error) {
    logger.error('Unable to connect to Redis:', error);
    throw error;
  }
};

export const getRedis = (): Redis => {
  if (!redis) {
    throw new Error('Redis not connected. Call connectRedis first.');
  }
  return redis;
};

export const closeRedis = async (): Promise<void> => {
  if (redis) {
    await redis.quit();
    logger.info('Redis connection closed');
  }
};
