// Test database connection using Supabase client directly
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function testSupabaseConnection() {
  try {
    // Create Supabase client using the URL and anon key
    const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key-here';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test connection by querying users table
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connection successful!');
    console.log('📊 Users table count:', data);
    return true;
    
  } catch (error) {
    console.error('❌ Connection test failed:', error);
    return false;
  }
}

// Run the test
testSupabaseConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test script error:', error);
    process.exit(1);
  });
