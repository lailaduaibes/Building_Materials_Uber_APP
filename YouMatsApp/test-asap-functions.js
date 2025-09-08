/**
 * 🔍 ASAP FUNCTION DIAGNOSTIC
 * Test the start_asap_matching_uber_style function to see why trips aren't getting assigned
 */

async function testASAPFunctions() {
  console.log('🔍 Testing ASAP Matching Functions...\n');

  const { createClient } = require('@supabase/supabase-js');

  const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Test 1: Check if start_asap_matching_uber_style function exists
    console.log('📋 1. CHECKING ASAP FUNCTIONS EXISTENCE:');
    
    const { data: functions, error: funcError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .like('routine_name', '%asap%');

    if (funcError) {
      console.log('❌ Error checking functions:', funcError.message);
    } else {
      console.log('Available ASAP functions:');
      functions?.forEach(func => {
        console.log(`   - ${func.routine_name} (${func.routine_type})`);
      });
    }

    // Test 2: Get the pending ASAP trip that has no driver assigned
    console.log('\n🚨 2. FINDING PENDING ASAP TRIP:');
    
    const { data: pendingTrip, error: tripError } = await supabase
      .from('trip_requests')
      .select('id, status, pickup_time_preference, assigned_driver_id, created_at')
      .eq('pickup_time_preference', 'asap')
      .eq('status', 'pending')
      .is('assigned_driver_id', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (tripError) {
      console.log('❌ Error finding pending trip:', tripError.message);
      return;
    }

    if (!pendingTrip || pendingTrip.length === 0) {
      console.log('✅ No pending ASAP trips found (good sign)');
      console.log('Let me create a test trip to diagnose...');
      
      // Create a test trip
      const { data: newTrip, error: createError } = await supabase
        .from('trip_requests')
        .insert({
          customer_id: 'test-customer-id',
          load_description: 'DIAGNOSTIC TEST - ASAP Function Test',
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
        console.log('❌ Error creating test trip:', createError.message);
        return;
      }

      console.log('✅ Created test trip:', newTrip.id);
      var testTripId = newTrip.id;
      
    } else {
      var testTripId = pendingTrip[0].id;
      console.log('✅ Found pending trip:', testTripId);
    }

    // Test 3: Try to call start_asap_matching_uber_style directly
    console.log('\n🚀 3. TESTING start_asap_matching_uber_style:');
    
    try {
      const { data: uberResult, error: uberError } = await supabase.rpc('start_asap_matching_uber_style', {
        trip_request_id: testTripId
      });

      if (uberError) {
        console.log('❌ start_asap_matching_uber_style ERROR:', uberError.message);
      } else {
        console.log('✅ start_asap_matching_uber_style SUCCESS:', uberResult);
      }
    } catch (uberError) {
      console.log('❌ start_asap_matching_uber_style EXCEPTION:', uberError.message);
    }

    // Test 4: Try to call start_asap_matching (the main function)
    console.log('\n🔧 4. TESTING start_asap_matching (main function):');
    
    try {
      const { data: mainResult, error: mainError } = await supabase.rpc('start_asap_matching', {
        trip_request_id: testTripId
      });

      if (mainError) {
        console.log('❌ start_asap_matching ERROR:', mainError.message);
      } else {
        console.log('✅ start_asap_matching SUCCESS:', mainResult);
      }
    } catch (mainError) {
      console.log('❌ start_asap_matching EXCEPTION:', mainError.message);
    }

    // Test 5: Check if the trip got assigned after calling the functions
    console.log('\n📋 5. CHECKING TRIP ASSIGNMENT RESULT:');
    
    const { data: updatedTrip, error: checkError } = await supabase
      .from('trip_requests')
      .select('id, status, assigned_driver_id')
      .eq('id', testTripId)
      .single();

    if (checkError) {
      console.log('❌ Error checking updated trip:', checkError.message);
    } else {
      console.log('Trip after ASAP matching:');
      console.log(`   - ID: ${updatedTrip.id}`);
      console.log(`   - Status: ${updatedTrip.status}`);
      console.log(`   - Driver: ${updatedTrip.assigned_driver_id || 'STILL NONE ❌'}`);
      
      if (updatedTrip.assigned_driver_id) {
        console.log('✅ SUCCESS: Trip now has assigned driver!');
      } else {
        console.log('❌ PROBLEM: Trip still has no assigned driver!');
      }
    }

    // Test 6: Check asap_driver_queue table
    console.log('\n📝 6. CHECKING ASAP DRIVER QUEUE:');
    
    const { data: queueEntries, error: queueError } = await supabase
      .from('asap_driver_queue')
      .select('*')
      .eq('trip_request_id', testTripId)
      .order('created_at', { ascending: false });

    if (queueError) {
      console.log('❌ Error checking queue:', queueError.message);
    } else {
      console.log(`Found ${queueEntries?.length || 0} queue entries for this trip:`);
      queueEntries?.forEach(entry => {
        console.log(`   - Driver: ${entry.driver_id} | Status: ${entry.status} | Created: ${entry.created_at}`);
      });
    }

    console.log('\n🎯 === ASAP FUNCTION DIAGNOSTIC COMPLETE ===');

  } catch (error) {
    console.error('💥 ASAP function test failed:', error);
  }
}

// Run the test
testASAPFunctions();
