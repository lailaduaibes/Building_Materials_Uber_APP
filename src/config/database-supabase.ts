import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

let supabase: SupabaseClient;

export const connectDB = async (): Promise<void> => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required');
    }

    // Create Supabase client
    supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test the connection by querying a simple table
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      throw new Error(`Supabase connection test failed: ${error.message}`);
    }
    
    logger.info('Database connection established successfully via Supabase client');
    logger.info('Connected to:', supabaseUrl);
    
  } catch (error) {
    logger.error('Unable to connect to Supabase:', error);
    throw error;
  }
};

export const getDB = (): SupabaseClient => {
  if (!supabase) {
    throw new Error('Database not connected. Call connectDB first.');
  }
  return supabase;
};

export const closeDB = async (): Promise<void> => {
  // Supabase client doesn't need explicit closing
  logger.info('Database connection closed');
};
