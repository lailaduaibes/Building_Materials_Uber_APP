// Simple Supabase connection test
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testSupabaseConnection() {
  try {
    console.log('🔄 Testing Supabase connection...');
    
    // Replace these with your actual values from Supabase dashboard
    const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key-here';
    
    console.log('📡 Supabase URL:', supabaseUrl);
    console.log('🔑 Using anon key:', supabaseKey.substring(0, 20) + '...');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test with a simple query
    console.log('🔍 Testing database query...');
    const { data, error, count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Database query failed:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connection successful!');
    console.log('📊 Users table count:', count);
    
    return true;
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

testSupabaseConnection()
  .then(success => {
    console.log('\n' + (success ? '🎉 All tests passed!' : '💥 Tests failed!'));
    process.exit(success ? 0 : 1);
  });
