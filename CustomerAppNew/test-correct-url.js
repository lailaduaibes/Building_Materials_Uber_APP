// Test with correct Supabase URL that matches authentication
const { createClient } = require('@supabase/supabase-js');

// Using the CORRECT URL that matches authentication
const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCorrectDatabase() {
  console.log('🔍 Testing connection with CORRECT Supabase URL...');
  console.log('URL:', supabaseUrl);
  
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('trip_requests')
      .select('count(*)')
      .limit(1);
    
    if (error) {
      console.error('❌ Error connecting:', error.message);
      return;
    }
    
    console.log('✅ Connected successfully!');
    
    // Check for trip_requests table
    const { data: trips, error: tripsError } = await supabase
      .from('trip_requests')
      .select('*')
      .limit(5);
    
    if (tripsError) {
      console.error('❌ Error fetching trips:', tripsError.message);
      return;
    }
    
    console.log(`📊 Found ${trips?.length || 0} trip requests in the database`);
    
    if (trips && trips.length > 0) {
      console.log('🎯 Sample trip:');
      console.log('- ID:', trips[0].id);
      console.log('- User ID:', trips[0].user_id);
      console.log('- Status:', trips[0].status);
      console.log('- Created:', trips[0].created_at);
    }
    
    // Check users table
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .limit(3);
    
    if (!usersError && users) {
      console.log(`👥 Found ${users.length} users in the database`);
      if (users.length > 0) {
        console.log('Sample user:', users[0].email);
      }
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error.message);
  }
}

testCorrectDatabase();
