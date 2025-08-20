const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDriverProfiles() {
  console.log('🔍 Debugging driver_profiles table...');
  
  // 1. Check if driver_profiles table exists and its structure
  try {
    const { data, error } = await supabase
      .from('driver_profiles')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error querying driver_profiles:', error);
    } else {
      console.log('✅ driver_profiles table found');
      if (data && data[0]) {
        console.log('📋 Available columns:', Object.keys(data[0]));
        console.log('📄 Sample data:', data[0]);
      } else {
        console.log('📭 No data in driver_profiles table');
      }
    }
  } catch (err) {
    console.error('❌ Exception accessing driver_profiles:', err);
  }

  // 2. Check the users table for the driver user
  console.log('\n🔍 Checking users table for driver...');
  const driverUserId = '7a9ce2f0-db9d-46a7-aef3-c01635d90592';
  
  try {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', driverUserId)
      .single();
    
    if (userError) {
      console.error('❌ Error fetching user data:', userError);
    } else {
      console.log('✅ User found:', userData);
    }
  } catch (err) {
    console.error('❌ Exception fetching user:', err);
  }

  // 3. Try to test status update on driver_profiles
  console.log('\n🔧 Testing status update on driver_profiles...');
  
  try {
    const { data: testData, error: testError } = await supabase
      .from('driver_profiles')
      .update({
        status: 'online',
        is_available: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', driverUserId);
    
    if (testError) {
      console.error('❌ Status update failed:', testError);
    } else {
      console.log('✅ Status update successful:', testData);
    }
  } catch (err) {
    console.error('❌ Exception during status update:', err);
  }

  // 4. Check if we can query by id instead
  console.log('\n🔍 Testing query by different fields...');
  
  try {
    const { data: byIdData, error: byIdError } = await supabase
      .from('driver_profiles')
      .select('*')
      .eq('id', 'driver_' + driverUserId);
    
    if (byIdError) {
      console.error('❌ Query by concatenated id failed:', byIdError);
    } else {
      console.log('✅ Query by concatenated id result:', byIdData);
    }
  } catch (err) {
    console.error('❌ Exception querying by concatenated id:', err);
  }
}

debugDriverProfiles().catch(console.error);
