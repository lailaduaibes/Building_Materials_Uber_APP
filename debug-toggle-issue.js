// Debug script to test driver availability update
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

async function debugToggleIssue() {
  console.log('🔍 Debugging driver availability toggle issue...\n');

  // Test with anon client (like the app uses)
  const anonClient = createClient(supabaseUrl, supabaseKey);
  
  // Test with service role client 
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1. First, let's see what drivers exist
    console.log('1️⃣ Checking existing drivers...');
    const { data: drivers, error: driversError } = await serviceClient
      .from('driver_profiles')
      .select('id, first_name, last_name, user_id, status, is_available, last_seen')
      .limit(5);

    if (driversError) {
      console.error('❌ Error fetching drivers:', driversError);
      return;
    }

    console.log('✅ Found drivers:');
    drivers.forEach(driver => {
      console.log(`   - ${driver.first_name} ${driver.last_name} (ID: ${driver.id})`);
      console.log(`     Status: ${driver.status}, Available: ${driver.is_available}`);
      console.log(`     User ID: ${driver.user_id}, Last seen: ${driver.last_seen}\n`);
    });

    if (drivers.length === 0) {
      console.log('❌ No drivers found in database!');
      return;
    }

    // 2. Test updating the first driver with service role
    const testDriver = drivers[0];
    console.log(`2️⃣ Testing availability update for driver: ${testDriver.first_name} ${testDriver.last_name}`);
    
    const { error: updateError } = await serviceClient
      .from('driver_profiles')
      .update({ 
        is_available: true,
        last_seen: new Date().toISOString(),
        status: 'online'
      })
      .eq('id', testDriver.id);

    if (updateError) {
      console.error('❌ Service role update failed:', updateError);
    } else {
      console.log('✅ Service role update successful!');
    }

    // 3. Test with anon client (this might fail due to RLS)
    console.log('3️⃣ Testing with anon client (simulating app behavior)...');
    
    const { error: anonUpdateError } = await anonClient
      .from('driver_profiles')
      .update({ 
        is_available: false,
        last_seen: new Date().toISOString(),
        status: 'offline'
      })
      .eq('id', testDriver.id);

    if (anonUpdateError) {
      console.error('❌ Anon client update failed:', anonUpdateError);
      console.log('   This is likely the cause of the toggle issue!');
    } else {
      console.log('✅ Anon client update successful!');
    }

    // 4. Check RLS policies
    console.log('4️⃣ Checking RLS policies on driver_profiles...');
    const { data: policies, error: policiesError } = await serviceClient
      .rpc('get_policies', { table_name: 'driver_profiles' })
      .select();

    if (policiesError) {
      console.log('⚠️ Could not fetch RLS policies (function might not exist)');
    } else {
      console.log('RLS Policies:', policies);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugToggleIssue();
