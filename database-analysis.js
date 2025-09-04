/**
 * Comprehensive Database Analysis for ASAP Trip System
 * This script will analyze what functions exist, what's being called, and the actual data flow
 */

const { createClient } = require('@supabase/supabase-js');

// Database configuration
const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeDatabaseState() {
  console.log('🔍 Starting Comprehensive Database Analysis...\n');

  try {
    console.log('📊 1. ANALYZING RECENT ASAP TRIPS');
    console.log('=' .repeat(50));

    // Check recent ASAP trips and their patterns
    const { data: recentTrips, error: tripsError } = await supabase
      .from('trip_requests')
      .select('*')
      .eq('pickup_time_preference', 'asap')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentTrips) {
      console.log(`Found ${recentTrips.length} recent ASAP trips:`);
      recentTrips.forEach(trip => {
        console.log(`\n🚛 Trip ${trip.id.substring(0, 8)}:`);
        console.log(`   Status: ${trip.status}`);
        console.log(`   Assigned Driver: ${trip.assigned_driver_id ? trip.assigned_driver_id.substring(0, 8) : 'None'}`);
        console.log(`   Original Trip: ${trip.original_trip_id ? trip.original_trip_id.substring(0, 8) : 'Main Trip'}`);
        console.log(`   Created: ${trip.created_at}`);
        console.log(`   Acceptance Deadline: ${trip.acceptance_deadline || 'None'}`);
        console.log(`   Matching Started: ${trip.matching_started_at || 'None'}`);
      });
    } else {
      console.log('❌ Could not fetch recent trips:', tripsError);
    }

    console.log('\n🗂️ 2. ANALYZING ASAP QUEUE TABLE');
    console.log('=' .repeat(50));

    // Check asap_driver_queue table
    try {
      const { data: queueData, error: queueError } = await supabase
        .from('asap_driver_queue')
        .select('*')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (queueData) {
        console.log(`Found ${queueData.length} recent queue entries:`);
        queueData.forEach(entry => {
          console.log(`\n📋 Queue Entry ${entry.id.substring(0, 8)}:`);
          console.log(`   Trip: ${entry.trip_request_id.substring(0, 8)}`);
          console.log(`   Driver: ${entry.driver_id.substring(0, 8)}`);
          console.log(`   Position: ${entry.queue_position}`);
          console.log(`   Status: ${entry.status}`);
          console.log(`   Notified: ${entry.notified_at || 'No'}`);
          console.log(`   Responded: ${entry.responded_at || 'No'}`);
        });
      } else {
        console.log('❌ Could not fetch queue data:', queueError);
      }
    } catch (queueErr) {
      console.log('⚠️ asap_driver_queue table access failed:', queueErr.message);
    }

    console.log('\n🚗 3. ANALYZING DRIVER LOCATION DATA');
    console.log('=' .repeat(50));

    // Check driver location data from both tables
    try {
      const { data: driverLocations, error: locError } = await supabase
        .from('driver_locations')
        .select('driver_id, latitude, longitude, updated_at')
        .gte('updated_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order('updated_at', { ascending: false })
        .limit(5);

      if (driverLocations && driverLocations.length > 0) {
        console.log(`Found ${driverLocations.length} recent driver location updates in driver_locations:`);
        driverLocations.forEach(loc => {
          console.log(`   Driver ${loc.driver_id.substring(0, 8)}: (${loc.latitude}, ${loc.longitude}) at ${loc.updated_at}`);
        });
      } else {
        console.log('❌ No recent data in driver_locations table');
      }
    } catch (locErr) {
      console.log('⚠️ driver_locations table access failed:', locErr.message);
    }

    // Check users table for driver locations
    try {
      const { data: userLocations, error: userLocError } = await supabase
        .from('users')
        .select('id, current_latitude, current_longitude, last_location_update')
        .not('current_latitude', 'is', null)
        .gte('last_location_update', new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .order('last_location_update', { ascending: false })
        .limit(5);

      if (userLocations && userLocations.length > 0) {
        console.log(`\nFound ${userLocations.length} users with recent location updates in users table:`);
        userLocations.forEach(user => {
          console.log(`   User ${user.id.substring(0, 8)}: (${user.current_latitude}, ${user.current_longitude}) at ${user.last_location_update}`);
        });
      } else {
        console.log('❌ No recent location data in users table');
      }
    } catch (userLocErr) {
      console.log('⚠️ users table location access failed:', userLocErr.message);
    }

    console.log('\n👥 4. ANALYZING DRIVER PROFILES');
    console.log('=' .repeat(50));

    try {
      const { data: driverProfiles, error: driverError } = await supabase
        .from('driver_profiles')
        .select('user_id, is_available, is_approved, status')
        .eq('is_available', true)
        .eq('is_approved', true)
        .neq('status', 'offline')
        .limit(5);

      if (driverProfiles && driverProfiles.length > 0) {
        console.log(`Found ${driverProfiles.length} available approved drivers:`);
        driverProfiles.forEach(driver => {
          console.log(`   Driver ${driver.user_id.substring(0, 8)}: Available=${driver.is_available}, Approved=${driver.is_approved}, Status=${driver.status}`);
        });
      } else {
        console.log('❌ No available approved drivers found');
      }
    } catch (driverErr) {
      console.log('⚠️ driver_profiles access failed:', driverErr.message);
    }

    console.log('\n🔍 5. TESTING FUNCTION CALLS');
    console.log('=' .repeat(50));

    // Test key functions with a fake ID to see if they exist
    const testTripId = '00000000-0000-0000-0000-000000000000';

    console.log('Testing start_asap_matching function...');
    try {
      const { data: testResult, error: testError } = await supabase
        .rpc('start_asap_matching', { trip_request_id: testTripId });
      
      if (testError) {
        console.log(`❌ start_asap_matching error: ${testError.message}`);
      } else {
        console.log(`✅ start_asap_matching callable, returned:`, testResult);
      }
    } catch (err) {
      console.log(`❌ start_asap_matching exception:`, err.message);
    }

    console.log('\nTesting start_asap_matching_sequential function...');
    try {
      const { data: seqResult, error: seqError } = await supabase
        .rpc('start_asap_matching_sequential', { trip_request_id: testTripId });
      
      if (seqError) {
        console.log(`❌ start_asap_matching_sequential error: ${seqError.message}`);
      } else {
        console.log(`✅ start_asap_matching_sequential callable, returned:`, seqResult);
      }
    } catch (err) {
      console.log(`❌ start_asap_matching_sequential exception:`, err.message);
    }

    console.log('\nTesting accept_trip_request function...');
    try {
      const { data: acceptResult, error: acceptError } = await supabase
        .rpc('accept_trip_request', { 
          request_id: testTripId, 
          accepting_driver_id: testTripId 
        });
      
      if (acceptError) {
        console.log(`❌ accept_trip_request error: ${acceptError.message}`);
      } else {
        console.log(`✅ accept_trip_request callable, returned:`, acceptResult);
      }
    } catch (err) {
      console.log(`❌ accept_trip_request exception:`, err.message);
    }

    console.log('\n📈 6. SUMMARY & ANALYSIS');
    console.log('=' .repeat(50));

    // Analyze the data and provide insights
    const hasIndividualRequests = recentTrips?.some(trip => trip.original_trip_id !== null);
    const hasMainTripsOnly = recentTrips?.every(trip => trip.original_trip_id === null);
    const hasMatchingStartedField = recentTrips?.some(trip => trip.matching_started_at !== null);
    const hasAcceptanceDeadlines = recentTrips?.some(trip => trip.acceptance_deadline !== null);

    console.log('\n🎯 Current System Analysis:');
    console.log(`   Recent ASAP Trips: ${recentTrips?.length || 0}`);
    console.log(`   Individual Request System: ${hasIndividualRequests ? '✅ ACTIVE (has original_trip_id)' : '❌ NOT USED'}`);
    console.log(`   Main Trips Only: ${hasMainTripsOnly ? '✅ YES (no sub-requests)' : '❌ NO'}`);
    console.log(`   Has Matching Started Field: ${hasMatchingStartedField ? '✅ YES' : '❌ NO'}`);
    console.log(`   Has Acceptance Deadlines: ${hasAcceptanceDeadlines ? '✅ YES' : '❌ NO'}`);

    console.log('\n🔧 Recommendations:');
    if (recentTrips && recentTrips.length === 0) {
      console.log('   📝 NO RECENT ASAP TRIPS - Create a test trip to analyze the flow');
    } else if (hasMainTripsOnly && !hasIndividualRequests) {
      console.log('   📋 USING DIRECT ASSIGNMENT SYSTEM - No individual requests created');
    } else if (hasIndividualRequests) {
      console.log('   🔄 USING INDIVIDUAL REQUEST SYSTEM - Sub-requests are being created');
    }

    console.log('\n💡 Next Actions:');
    console.log('   1. Create a test ASAP trip and monitor what happens');
    console.log('   2. Check console logs in customer and driver apps');
    console.log('   3. Monitor which functions are actually being called');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

// Execute the analysis
console.log('🚀 Starting database analysis...');
analyzeDatabaseState().then(() => {
  console.log('\n✅ Analysis complete!');
  process.exit(0);
}).catch(err => {
  console.error('💥 Analysis failed:', err);
  process.exit(1);
});
