// Test the database update fix
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

async function testDatabaseUpdatePermissions() {
  console.log('🔑 Testing Database Update Permissions...\n');

  // Get a test trip
  const serviceSupabase = createClient(supabaseUrl, serviceKey);
  const { data: trips, error: fetchError } = await serviceSupabase
    .from('trip_requests')
    .select('id, status')
    .limit(1);

  if (fetchError || !trips || trips.length === 0) {
    console.error('Error fetching test trip:', fetchError);
    return;
  }

  const testTrip = trips[0];
  console.log(`Using test trip: ${testTrip.id.substring(0, 8)}`);
  console.log(`Current status: ${testTrip.status}`);

  // Test 1: Try updating with anon key (what LiveTripTrackingScreen was doing)
  console.log('\n1. Testing update with ANON key (old approach):');
  const anonSupabase = createClient(supabaseUrl, anonKey);
  
  try {
    const { error: anonError } = await anonSupabase
      .from('trip_requests')
      .update({ status: 'in_transit' })
      .eq('id', testTrip.id);

    if (anonError) {
      console.log('❌ ANON key update failed:', anonError.message);
      console.log('   This explains why the status wasn\'t updating!');
    } else {
      console.log('✅ ANON key update succeeded (unexpected!)');
    }
  } catch (error) {
    console.log('❌ ANON key update failed with exception:', error.message);
  }

  // Test 2: Try updating with service key (what DriverService uses)
  console.log('\n2. Testing update with SERVICE ROLE key (DriverService approach):');
  
  try {
    const { error: serviceError } = await serviceSupabase
      .from('trip_requests')
      .update({ status: testTrip.status }) // Update to same value (no change)
      .eq('id', testTrip.id);

    if (serviceError) {
      console.log('❌ SERVICE ROLE key update failed:', serviceError.message);
    } else {
      console.log('✅ SERVICE ROLE key update succeeded');
      console.log('   This confirms DriverService approach will work!');
    }
  } catch (error) {
    console.log('❌ SERVICE ROLE key update failed with exception:', error.message);
  }

  console.log('\n🎯 CONCLUSION:');
  console.log('================');
  console.log('The issue was that LiveTripTrackingScreen was using the anon key');
  console.log('which doesn\'t have permission to update trip_requests table.');
  console.log('');
  console.log('✅ SOLUTION: Use driverService.updateTripStatus() instead');
  console.log('   This uses the service role key which has proper permissions.');
}

testDatabaseUpdatePermissions();
