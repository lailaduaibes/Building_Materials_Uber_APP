/**
 * 🔍 SIMPLE DATABASE CONNECTIVITY TEST
 * Just check if we can read basic data - NO EDITS
 */

async function testDatabaseConnectivity() {
  console.log('🔍 Testing Database Connectivity...\n');

  // Import statements (using require for Node.js compatibility)
  const { createClient } = require('@supabase/supabase-js');

  const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

  try {
    // Test 1: Anon client (what React Native app uses)
    console.log('📱 1. TESTING ANON CLIENT (React Native app access):');
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);

    const { data: anonTest, error: anonError } = await anonClient
      .from('trip_requests')
      .select('id, status, pickup_time_preference')
      .limit(1);

    if (anonError) {
      console.log('❌ ANON CLIENT ERROR:', anonError.message);
    } else {
      console.log('✅ ANON CLIENT SUCCESS - Can read trip_requests');
      console.log(`   Found ${anonTest?.length || 0} records`);
    }

    // Test 2: Service role client (for admin operations)
    console.log('\n🔧 2. TESTING SERVICE ROLE CLIENT (Admin access):');
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: serviceTest, error: serviceError } = await serviceClient
      .from('trip_requests')
      .select('id, status, pickup_time_preference, assigned_driver_id')
      .limit(1);

    if (serviceError) {
      console.log('❌ SERVICE CLIENT ERROR:', serviceError.message);
    } else {
      console.log('✅ SERVICE CLIENT SUCCESS - Can read trip_requests');
      console.log(`   Found ${serviceTest?.length || 0} records`);
    }

    // Test 3: Check database functions
    console.log('\n⚙️ 3. TESTING DATABASE FUNCTIONS:');
    
    const { data: functionsTest, error: functionsError } = await serviceClient.rpc('execute_sql', {
      query: `
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_name IN ('start_asap_matching', 'accept_trip_request', 'decline_trip_request')
        ORDER BY routine_name;
      `
    });

    if (functionsError) {
      console.log('❌ FUNCTIONS TEST ERROR:', functionsError.message);
    } else {
      console.log('✅ FUNCTIONS TEST SUCCESS');
      console.log('   Available functions:', functionsTest?.map(f => f.routine_name).join(', ') || 'None');
    }

    // Test 4: Check recent ASAP trips
    console.log('\n🚨 4. CHECKING RECENT ASAP TRIPS:');
    
    const { data: asapTrips, error: asapError } = await serviceClient
      .from('trip_requests')
      .select('id, status, pickup_time_preference, assigned_driver_id, created_at')
      .eq('pickup_time_preference', 'asap')
      .order('created_at', { ascending: false })
      .limit(3);

    if (asapError) {
      console.log('❌ ASAP TRIPS ERROR:', asapError.message);
    } else {
      console.log('✅ ASAP TRIPS SUCCESS');
      console.log(`   Found ${asapTrips?.length || 0} recent ASAP trips:`);
      asapTrips?.forEach(trip => {
        console.log(`   - ${trip.id.substring(0, 8)}... | Status: ${trip.status} | Driver: ${trip.assigned_driver_id || 'NONE'}`);
      });
    }

    // Test 5: Check drivers
    console.log('\n👥 5. CHECKING DRIVERS:');
    
    const { data: drivers, error: driversError } = await serviceClient
      .from('driver_profiles')
      .select('user_id, first_name, last_name, is_approved, approval_status')
      .eq('is_approved', true)
      .limit(3);

    if (driversError) {
      console.log('❌ DRIVERS ERROR:', driversError.message);
    } else {
      console.log('✅ DRIVERS SUCCESS');
      console.log(`   Found ${drivers?.length || 0} approved drivers:`);
      drivers?.forEach(driver => {
        console.log(`   - ${driver.first_name} ${driver.last_name} (${driver.approval_status})`);
      });
    }

    console.log('\n🎯 === CONNECTIVITY TEST COMPLETE ===');
    console.log('If all tests show ✅, then the database connection is working fine.');
    console.log('If any show ❌, that indicates where the problem is.');

  } catch (error) {
    console.error('💥 CONNECTIVITY TEST FAILED:', error);
  }
}

// Run the test
testDatabaseConnectivity();
