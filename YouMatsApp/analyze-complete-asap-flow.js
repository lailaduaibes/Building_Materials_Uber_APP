/**
 * 🔍 COMPLETE ASAP FLOW ANALYSIS
 * Let's trace the entire process from customer trip creation to driver notification
 */

async function analyzeCompleteASAPFlow() {
  console.log('🔍 === COMPLETE ASAP FLOW ANALYSIS === 🔍\n');

  const { createClient } = require('@supabase/supabase-js');

  const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('📋 1. ANALYZING ALL FUNCTIONS IN THE DATABASE:');
    console.log('=' .repeat(60));

    // Get all functions that might be involved in ASAP flow
    const { data: allFunctions, error: funcError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .in('routine_name', [
        'start_asap_matching',
        'start_asap_matching_uber_style', 
        'find_nearby_available_drivers',
        'accept_trip_request',
        'decline_trip_request',
        'trigger_asap_matching',
        'handle_asap_timeout',
        'cleanup_expired_trip_requests'
      ]);

    console.log('Functions that exist in database:');
    if (allFunctions && allFunctions.length > 0) {
      allFunctions.forEach(func => {
        console.log(`   ✅ ${func.routine_name} (${func.routine_type})`);
      });
    } else {
      console.log('   ❌ No ASAP functions found');
    }

    console.log('\n📋 2. ANALYZING DATABASE TRIGGERS:');
    console.log('=' .repeat(60));

    // Check triggers on trip_requests table
    const { data: triggers, error: triggerError } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name, event_manipulation, action_timing')
      .eq('event_object_table', 'trip_requests');

    console.log('Triggers on trip_requests table:');
    if (triggers && triggers.length > 0) {
      triggers.forEach(trigger => {
        console.log(`   ✅ ${trigger.trigger_name} (${trigger.event_manipulation} ${trigger.action_timing})`);
      });
    } else {
      console.log('   ❌ No triggers found');
    }

    console.log('\n📋 3. ANALYZING CURRENT DATABASE STATE:');
    console.log('=' .repeat(60));

    // Check users table structure and data
    console.log('\n👥 Users table analysis:');
    const { data: userSample, error: userError } = await supabase
      .from('users')
      .select('id, user_type, current_latitude, current_longitude, last_location_update')
      .eq('user_type', 'driver')
      .limit(3);

    if (userSample && userSample.length > 0) {
      console.log('Sample driver users:');
      userSample.forEach(user => {
        console.log(`   - ${user.id}: lat=${user.current_latitude || 'NULL'}, lng=${user.current_longitude || 'NULL'}, updated=${user.last_location_update || 'NULL'}`);
      });
    } else {
      console.log('   ❌ No driver users found');
    }

    // Check driver_profiles table
    console.log('\n🚗 Driver profiles analysis:');
    const { data: driverSample, error: driverError } = await supabase
      .from('driver_profiles')
      .select('user_id, first_name, is_available, is_approved, status')
      .eq('is_approved', true)
      .limit(3);

    if (driverSample && driverSample.length > 0) {
      console.log('Sample approved drivers:');
      driverSample.forEach(driver => {
        console.log(`   - ${driver.first_name}: available=${driver.is_available || 'NULL'}, status=${driver.status || 'NULL'}`);
      });
    } else {
      console.log('   ❌ No approved drivers found');
    }

    console.log('\n📋 4. SIMULATING THE COMPLETE ASAP FLOW:');
    console.log('=' .repeat(60));

    // Step 1: Create a test ASAP trip (like customer would)
    console.log('\n🛒 STEP 1: Creating test ASAP trip...');
    const { data: newTrip, error: createError } = await supabase
      .from('trip_requests')
      .insert({
        customer_id: 'test-customer-flow-analysis',
        load_description: 'FLOW ANALYSIS TEST - Complete Process Check',
        pickup_latitude: 32.390000,
        pickup_longitude: 35.323000,
        delivery_latitude: 32.400000,
        delivery_longitude: 35.330000,
        pickup_time_preference: 'asap',
        status: 'pending',
        required_truck_type_id: 1
      })
      .select()
      .single();

    if (createError) {
      console.log('❌ Failed to create test trip:', createError.message);
      return;
    }

    console.log(`✅ Created test trip: ${newTrip.id}`);
    
    // Step 2: Check if trigger fired automatically
    console.log('\n⚡ STEP 2: Checking if database trigger fired...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

    const { data: tripAfterInsert } = await supabase
      .from('trip_requests')
      .select('id, status, assigned_driver_id, matching_started_at')
      .eq('id', newTrip.id)
      .single();

    console.log('Trip status after insert:');
    console.log(`   Status: ${tripAfterInsert.status}`);
    console.log(`   Assigned Driver: ${tripAfterInsert.assigned_driver_id || 'NONE'}`);
    console.log(`   Matching Started: ${tripAfterInsert.matching_started_at || 'NONE'}`);

    if (tripAfterInsert.assigned_driver_id) {
      console.log('✅ Trigger worked! Driver was assigned automatically.');
    } else {
      console.log('❌ Trigger did not assign driver. Trying manual function call...');

      // Step 3: Manually call start_asap_matching
      console.log('\n🚀 STEP 3: Manually calling start_asap_matching...');
      
      const { data: manualResult, error: manualError } = await supabase.rpc('start_asap_matching', {
        trip_request_id: newTrip.id
      });

      if (manualError) {
        console.log('❌ Manual call failed:', manualError.message);
      } else {
        console.log('✅ Manual call result:', manualResult);
      }

      // Check trip status after manual call
      const { data: tripAfterManual } = await supabase
        .from('trip_requests')
        .select('id, status, assigned_driver_id')
        .eq('id', newTrip.id)
        .single();

      console.log('Trip status after manual call:');
      console.log(`   Status: ${tripAfterManual.status}`);
      console.log(`   Assigned Driver: ${tripAfterManual.assigned_driver_id || 'NONE'}`);
    }

    console.log('\n📋 5. ANALYZING THE REACT NATIVE FILTER:');
    console.log('=' .repeat(60));

    // Check what React Native would see with the current filter
    const sampleDriverId = driverSample?.[0]?.user_id;
    
    if (sampleDriverId) {
      console.log(`\n📱 Testing React Native filter for driver: ${sampleDriverId}`);
      
      const { data: reactNativeQuery, error: rnError } = await supabase
        .from('trip_requests')
        .select('id, status, pickup_time_preference, assigned_driver_id')
        .eq('pickup_time_preference', 'asap')
        .eq('assigned_driver_id', sampleDriverId);

      console.log(`React Native query result for this driver: ${reactNativeQuery?.length || 0} trips`);
      
      // Also check what happens without the assigned_driver_id filter (what causes multiple notifications)
      const { data: allASAPTrips, error: allError } = await supabase
        .from('trip_requests')
        .select('id, status, pickup_time_preference, assigned_driver_id')
        .eq('pickup_time_preference', 'asap')
        .eq('status', 'pending');

      console.log(`\n🚨 ALL pending ASAP trips (what ALL drivers see): ${allASAPTrips?.length || 0} trips`);
      allASAPTrips?.forEach(trip => {
        console.log(`   - ${trip.id.substring(0, 8)}...: Driver=${trip.assigned_driver_id || 'NONE ⚠️'}`);
      });
    }

    console.log('\n🎯 === FLOW ANALYSIS SUMMARY ===');
    console.log('Now we can see exactly where the process breaks down!');

  } catch (error) {
    console.error('💥 Flow analysis failed:', error);
  }
}

// Run the complete analysis
analyzeCompleteASAPFlow();
