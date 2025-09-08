const { createClient } = require('@supabase/supabase-js');

// PRODUCTION DATABASE (used by your apps)
const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

async function testProductionFunctions() {
  console.log('🔍 Testing ASAP functions directly in PRODUCTION database...');
  console.log('📍 Production URL: https://pjbbtmuhlpscmrbgsyzb.supabase.co');
  
  try {
    // Test 1: Check if start_asap_matching_uber_style exists
    console.log('\n🧪 Testing start_asap_matching_uber_style...');
    const { data: test1, error: error1 } = await supabase.rpc('start_asap_matching_uber_style', {
      trip_request_id: 'e280b170-307a-44e2-b980-002b4a9504a3'
    });
    
    if (error1) {
      console.error('❌ start_asap_matching_uber_style MISSING:', error1.message);
    } else {
      console.log('✅ start_asap_matching_uber_style EXISTS');
      console.log('📊 Result:', test1);
    }
    
    // Test 2: Check if start_asap_matching exists
    console.log('\n🧪 Testing start_asap_matching...');
    const { data: test2, error: error2 } = await supabase.rpc('start_asap_matching', {
      trip_request_id: 'e280b170-307a-44e2-b980-002b4a9504a3'
    });
    
    if (error2) {
      console.error('❌ start_asap_matching MISSING:', error2.message);
    } else {
      console.log('✅ start_asap_matching EXISTS');
      console.log('📊 Result:', test2);
    }
    
    // Test 3: Check if decline_trip_request exists
    console.log('\n🧪 Testing decline_trip_request...');
    const { data: test3, error: error3 } = await supabase.rpc('decline_trip_request', {
      request_id: 'e280b170-307a-44e2-b980-002b4a9504a3',
      declining_driver_id: '00000000-0000-0000-0000-000000000000'
    });
    
    if (error3) {
      console.error('❌ decline_trip_request MISSING:', error3.message);
    } else {
      console.log('✅ decline_trip_request EXISTS');
    }
    
    // Test 4: Check if cleanup_expired_trip_requests exists
    console.log('\n🧪 Testing cleanup_expired_trip_requests...');
    const { data: test4, error: error4 } = await supabase.rpc('cleanup_expired_trip_requests');
    
    if (error4) {
      console.error('❌ cleanup_expired_trip_requests MISSING:', error4.message);
    } else {
      console.log('✅ cleanup_expired_trip_requests EXISTS');
      console.log('📊 Result:', test4);
    }
    
    // Check trip status after tests
    console.log('\n🔍 Checking current trip status...');
    const { data: tripData, error: tripError } = await supabase
      .from('trip_requests')
      .select('id, status, assigned_driver_id, load_description, acceptance_deadline')
      .eq('id', 'e280b170-307a-44e2-b980-002b4a9504a3')
      .single();
    
    if (tripError) {
      console.error('❌ Cannot check trip:', tripError);
    } else {
      console.log('📋 Current trip status:');
      console.log('  Status:', tripData.status);
      console.log('  Assigned Driver:', tripData.assigned_driver_id || 'NULL');
      console.log('  Has Queue:', tripData.load_description?.includes('[QUEUE:') ? 'YES' : 'NO');
      console.log('  Deadline:', tripData.acceptance_deadline || 'NULL');
      
      if (tripData.assigned_driver_id) {
        console.log('🎉 Trip HAS assigned_driver_id - drivers should see it!');
      } else {
        console.log('❌ Trip has NO assigned_driver_id - this is the problem!');
      }
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

testProductionFunctions();
