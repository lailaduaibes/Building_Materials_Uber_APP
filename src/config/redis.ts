import Redis from 'ioredis';
import { logger } from '../utils/logger';

let redis: Redis | null = null;
let isRedisAvailable = false;

export const connectRedis = async (): Promise<void> => {
  try {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectionName: 'buildmate-api',
      // Production settings for B2B scalability
      family: 4,
      keepAlive: 30000,
      connectTimeout: 5000,
      commandTimeout: 5000,
    });

    redis.on('connect', () => {
      isRedisAvailable = true;
      logger.info('✅ Redis connection established');
    });

    redis.on('error', (err) => {
      isRedisAvailable = false;
      logger.warn('⚠️ Redis connection error (continuing without Redis):', err.message);
    });

    redis.on('ready', () => {
      isRedisAvailable = true;
      logger.info('✅ Redis is ready to receive commands');
    });

    redis.on('close', () => {
      isRedisAvailable = false;
      logger.warn('⚠️ Redis connection closed (continuing without Redis)');
    });

    redis.on('reconnecting', () => {
      logger.info('🔄 Attempting to reconnect to Redis...');
    });

    // Test the connection with timeout
    const connectPromise = redis.ping();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Redis connection timeout')), 3000)
    );

    await Promise.race([connectPromise, timeoutPromise]);
    isRedisAvailable = true;
    logger.info('🔌 Redis connection test successful');
  } catch (error) {
    isRedisAvailable = false;
    redis = null;
    logger.warn('⚠️ Redis not available, continuing without Redis features');
    logger.info('💡 To enable caching, sessions, and rate limiting: install Redis server');
  }
};

export const getRedis = (): Redis | null => {
  return redis;
};

export const isRedisConnected = (): boolean => {
  return isRedisAvailable && redis !== null;
};

export const closeRedis = async (): Promise<void> => {
  if (redis) {
    await redis.quit();
    redis = null;
    isRedisAvailable = false;
    logger.info('🔌 Redis connection closed');
  }
};

// Redis utility functions for B2B operations
export const redisUtils = {
  // Cache management
  async setCache(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    const client = getRedis();
    if (!client || !isRedisConnected()) return;
    try {
      await client.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      logger.warn('Redis setCache failed, continuing without cache:', error);
    }
  },

  async getCache(key: string): Promise<any> {
    const client = getRedis();
    if (!client || !isRedisConnected()) return null;
    try {
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.warn('Redis getCache failed:', error);
      return null;
    }
  },

  async deleteCache(key: string): Promise<void> {
    const client = getRedis();
    if (!client || !isRedisConnected()) return;
    try {
      await client.del(key);
    } catch (error) {
      logger.warn('Redis deleteCache failed:', error);
    }
  },

  // Session management for B2B users
  async setSession(sessionId: string, userData: any, ttlSeconds: number = 86400): Promise<void> {
    const client = getRedis();
    if (!client || !isRedisConnected()) return;
    try {
      await client.setex(`session:${sessionId}`, ttlSeconds, JSON.stringify(userData));
    } catch (error) {
      logger.warn('Redis setSession failed:', error);
    }
  },

  async getSession(sessionId: string): Promise<any> {
    const client = getRedis();
    if (!client || !isRedisConnected()) return null;
    try {
      const value = await client.get(`session:${sessionId}`);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.warn('Redis getSession failed:', error);
      return null;
    }
  },

  async deleteSession(sessionId: string): Promise<void> {
    const client = getRedis();
    if (!client || !isRedisConnected()) return;
    try {
      await client.del(`session:${sessionId}`);
    } catch (error) {
      logger.warn('Redis deleteSession failed:', error);
    }
  },

  // Rate limiting for API endpoints
  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const client = getRedis();
    if (!client || !isRedisConnected()) {
      // If Redis is not available, allow all requests (no rate limiting)
      return { allowed: true, remaining: limit - 1, resetTime: Date.now() + windowSeconds * 1000 };
    }
    
    try {
      const current = await client.incr(key);
      
      if (current === 1) {
        await client.expire(key, windowSeconds);
      }
      
      const ttl = await client.ttl(key);
      const resetTime = Date.now() + (ttl * 1000);
      
      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
        resetTime
      };
    } catch (error) {
      logger.warn('Redis checkRateLimit failed, allowing request:', error);
      return { allowed: true, remaining: limit - 1, resetTime: Date.now() + windowSeconds * 1000 };
    }
  },

  // Real-time location tracking cache
  async setDriverLocation(driverId: string, location: any): Promise<void> {
    const client = getRedis();
    if (!client || !isRedisConnected()) return;
    try {
      await client.setex(`driver:location:${driverId}`, 300, JSON.stringify({
        ...location,
        timestamp: Date.now()
      }));
    } catch (error) {
      logger.warn('Redis setDriverLocation failed:', error);
    }
  },

  async getDriverLocation(driverId: string): Promise<any> {
    const client = getRedis();
    if (!client || !isRedisConnected()) return null;
    try {
      const value = await client.get(`driver:location:${driverId}`);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.warn('Redis getDriverLocation failed:', error);
      return null;
    }
  },

  // Order status updates with real-time notifications
  async setOrderStatus(orderId: string, status: string): Promise<void> {
    const client = getRedis();
    if (!client || !isRedisConnected()) return;
    try {
      await client.setex(`order:status:${orderId}`, 3600, status);
      // Publish to subscribers for real-time updates
      await client.publish(`order:${orderId}`, JSON.stringify({ orderId, status, timestamp: Date.now() }));
    } catch (error) {
      logger.warn('Redis setOrderStatus failed:', error);
    }
  },

  async getOrderStatus(orderId: string): Promise<string | null> {
    const client = getRedis();
    if (!client || !isRedisConnected()) return null;
    try {
      return await client.get(`order:status:${orderId}`);
    } catch (error) {
      logger.warn('Redis getOrderStatus failed:', error);
      return null;
    }
  },

  // Pub/Sub for real-time notifications
  async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
    const client = getRedis();
    if (!client || !isRedisConnected()) return;
    try {
      await client.subscribe(channel);
      client.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          callback(message);
        }
      });
    } catch (error) {
      logger.warn('Redis subscribe failed:', error);
    }
  },

  async publish(channel: string, message: any): Promise<void> {
    const client = getRedis();
    if (!client || !isRedisConnected()) return;
    try {
      await client.publish(channel, JSON.stringify(message));
    } catch (error) {
      logger.warn('Redis publish failed:', error);
    }
  }
};
