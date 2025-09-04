/**
 * Check Existing ASAP Functions
 * This will examine what ASAP matching functions currently exist and their implementation
 */

const { createClient } = require('@supabase/supabase-js');

// Database configuration
const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExistingASAPFunctions() {
  console.log('🔍 Checking Existing ASAP Functions...\n');

  try {
    // 1. List all functions related to ASAP/matching
    console.log('📋 1. LISTING ALL ASAP/MATCHING FUNCTIONS');
    console.log('=' .repeat(60));

    const { data: functions, error: funcError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type, routine_definition')
      .or('routine_name.like.%asap%,routine_name.like.%matching%,routine_name.like.%start_%,routine_name.like.%accept%,routine_name.like.%decline%')
      .eq('routine_schema', 'public')
      .order('routine_name');

    if (functions && functions.length > 0) {
      console.log(`Found ${functions.length} ASAP/matching related functions:`);
      functions.forEach(func => {
        console.log(`\n📝 ${func.routine_name} (${func.routine_type})`);
        if (func.routine_definition) {
          // Show first few lines of the function
          const lines = func.routine_definition.split('\n');
          const preview = lines.slice(0, 5).join('\n');
          console.log(`   Preview: ${preview.substring(0, 200)}...`);
        }
      });
    } else {
      console.log('❌ No functions found or query failed:', funcError);
    }

    // 2. Test each function to see what they do
    console.log('\n🧪 2. TESTING EXISTING FUNCTIONS');
    console.log('=' .repeat(60));

    const testTripId = '00000000-0000-0000-0000-000000000000';

    // Test start_asap_matching
    console.log('\n🚀 Testing start_asap_matching function...');
    try {
      const { data: result1, error: error1 } = await supabase
        .rpc('start_asap_matching', { trip_request_id: testTripId });
      
      if (error1) {
        console.log(`❌ Error: ${error1.message}`);
      } else {
        console.log(`✅ Function exists, returned:`, result1);
      }
    } catch (err) {
      console.log(`❌ Exception: ${err.message}`);
    }

    // Test start_asap_matching_sequential
    console.log('\n🔄 Testing start_asap_matching_sequential function...');
    try {
      const { data: result2, error: error2 } = await supabase
        .rpc('start_asap_matching_sequential', { trip_request_id: testTripId });
      
      if (error2) {
        console.log(`❌ Error: ${error2.message}`);
      } else {
        console.log(`✅ Function exists, returned:`, result2);
      }
    } catch (err) {
      console.log(`❌ Exception: ${err.message}`);
    }

    // Test start_asap_matching_bulletproof
    console.log('\n🛡️ Testing start_asap_matching_bulletproof function...');
    try {
      const { data: result3, error: error3 } = await supabase
        .rpc('start_asap_matching_bulletproof', { trip_request_id: testTripId });
      
      if (error3) {
        console.log(`❌ Error: ${error3.message}`);
      } else {
        console.log(`✅ Function exists, returned:`, result3);
      }
    } catch (err) {
      console.log(`❌ Exception: ${err.message}`);
    }

    // Test find_nearby_available_drivers
    console.log('\n📍 Testing find_nearby_available_drivers function...');
    try {
      const { data: result4, error: error4 } = await supabase
        .rpc('find_nearby_available_drivers', { 
          pickup_lat: 32.7767,
          pickup_lng: -96.7970,
          max_distance_km_param: 50,
          min_updated_minutes_param: 60,
          required_truck_type_id_param: null
        });
      
      if (error4) {
        console.log(`❌ Error: ${error4.message}`);
      } else {
        console.log(`✅ Function exists, returned ${result4 ? result4.length : 0} drivers:`, result4);
      }
    } catch (err) {
      console.log(`❌ Exception: ${err.message}`);
    }

    // Test accept_trip_request
    console.log('\n✅ Testing accept_trip_request function...');
    try {
      const { data: result5, error: error5 } = await supabase
        .rpc('accept_trip_request', { 
          request_id: testTripId,
          accepting_driver_id: testTripId
        });
      
      if (error5) {
        console.log(`❌ Error: ${error5.message}`);
      } else {
        console.log(`✅ Function exists, returned:`, result5);
      }
    } catch (err) {
      console.log(`❌ Exception: ${err.message}`);
    }

    // Test decline_trip_request
    console.log('\n❌ Testing decline_trip_request function...');
    try {
      const { data: result6, error: error6 } = await supabase
        .rpc('decline_trip_request', { 
          request_id: testTripId,
          declining_driver_id: testTripId
        });
      
      if (error6) {
        console.log(`❌ Error: ${error6.message}`);
      } else {
        console.log(`✅ Function exists, returned:`, result6);
      }
    } catch (err) {
      console.log(`❌ Exception: ${err.message}`);
    }

    // 3. Check what your current TripService is calling
    console.log('\n📱 3. CHECKING CURRENT APP INTEGRATION');
    console.log('=' .repeat(60));

    console.log('\n🔍 Based on previous analysis, your CustomerAppNew/TripService.ts is calling:');
    console.log('   start_asap_matching_sequential (line 454)');
    
    console.log('\n🔍 Your YouMatsApp/DriverService.ts real-time subscription filters by:');
    console.log('   pickup_time_preference=eq.asap AND assigned_driver_id=eq.${driverId}');

    console.log('\n🎯 ANALYSIS SUMMARY');
    console.log('=' .repeat(60));
    console.log('✅ Functions that exist and work will be listed above');
    console.log('❌ Functions that are missing or broken will show errors');
    console.log('🔧 We need to fix the working functions to implement proper Uber-style sequential matching');

  } catch (error) {
    console.error('❌ Function check failed:', error);
  }
}

// Execute the check
checkExistingASAPFunctions().then(() => {
  console.log('\n✅ Function check complete!');
  process.exit(0);
}).catch(err => {
  console.error('💥 Function check failed:', err);
  process.exit(1);
});
