import { Pool } from 'pg';
import { logger } from '../utils/logger';

let pool: Pool;

export const connectDB = async (): Promise<void> => {
  try {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'delivery_app_dev',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Test the connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    logger.info('Database connection established successfully');
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    throw error;
  }
};

export const getDB = (): Pool => {
  if (!pool) {
    throw new Error('Database not connected. Call connectDB first.');
  }
  return pool;
};

export const closeDB = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    logger.info('Database connection closed');
  }
};
