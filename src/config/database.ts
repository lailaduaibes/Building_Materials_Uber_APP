import postgres from 'postgres';
import { logger } from '../utils/logger';

let sql: any;

export const connectDB = async (): Promise<void> => {
  try {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    // Create postgres connection using Supabase format
    sql = postgres(connectionString, {
      ssl: 'require', // Supabase requires SSL
      max: 20,
      idle_timeout: 30,
      connect_timeout: 10,
    });
    
    // Test the connection
    const result = await sql`SELECT NOW() as now, version() as version`;
    logger.info('Database connection established successfully');
    logger.info('PostgreSQL version:', result[0].version.split(' ')[0] + ' ' + result[0].version.split(' ')[1]);
    logger.info('Server time:', result[0].now);
    
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
    throw error;
  }
};

export const getDB = () => {
  if (!sql) {
    throw new Error('Database not connected. Call connectDB first.');
  }
  return sql;
};

export const closeDB = async (): Promise<void> => {
  if (sql) {
    await sql.end();
    logger.info('Database connection closed');
  }
};
