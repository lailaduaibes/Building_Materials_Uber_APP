import { logger } from '../utils/logger';

// Mock Redis interface
class MockRedis {
  private store: Map<string, string> = new Map();

  async ping(): Promise<string> {
    return 'PONG';
  }

  async get(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }

  async set(key: string, value: string, ...args: any[]): Promise<string> {
    this.store.set(key, value);
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const existed = this.store.has(key);
    this.store.delete(key);
    return existed ? 1 : 0;
  }

  async quit(): Promise<void> {
    this.store.clear();
    logger.info('Mock Redis disconnected');
  }

  on(event: string, callback: () => void): void {
    // Mock event handlers
    if (event === 'connect') {
      setTimeout(callback, 10);
    }
    if (event === 'ready') {
      setTimeout(callback, 20);
    }
  }
}

let mockRedis: MockRedis;

export const connectRedis = async (): Promise<void> => {
  try {
    mockRedis = new MockRedis();
    
    // Simulate connection events
    setTimeout(() => {
      logger.info('Mock Redis connection established');
    }, 10);
    
    setTimeout(() => {
      logger.info('Mock Redis is ready to receive commands');
    }, 20);
    
    // Test the connection
    const response = await mockRedis.ping();
    logger.info('Mock Redis connection test successful:', response);
  } catch (error) {
    logger.error('Unable to connect to Mock Redis:', error);
    throw error;
  }
};

export const getRedis = (): MockRedis => {
  if (!mockRedis) {
    throw new Error('Redis not connected. Call connectRedis first.');
  }
  return mockRedis;
};

export const closeRedis = async (): Promise<void> => {
  if (mockRedis) {
    await mockRedis.quit();
    logger.info('Mock Redis connection closed');
  }
};
