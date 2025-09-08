const { createClient } = require('@supabase/supabase-js');

// PRODUCTION DATABASE (used by your apps)
const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

async function checkProductionFunctions() {
  console.log('🔍 Checking ASAP functions in PRODUCTION database...');
  console.log('📍 Production URL: https://pjbbtmuhlpscmrbgsyzb.supabase.co');
  
  try {
    // Check if functions exist
    const { data, error } = await supabase.rpc('execute_sql', { 
      query: `
        SELECT routine_name, routine_type 
        FROM information_schema.routines 
        WHERE routine_name IN (
          'start_asap_matching_uber_style',
          'start_asap_matching', 
          'decline_trip_request',
          'cleanup_expired_trip_requests',
          'trigger_asap_matching'
        )
        ORDER BY routine_name;
      `
    });
    
    if (error) {
      console.error('❌ Error checking functions:', error);
      return;
    }
    
    console.log('📋 Functions found in PRODUCTION database:');
    if (data && data.length > 0) {
      data.forEach(func => {
        console.log(`✅ ${func.routine_name} (${func.routine_type})`);
      });
    } else {
      console.log('❌ NO FUNCTIONS FOUND in production database!');
    }
    
    // Test the main function
    console.log('\n🧪 Testing start_asap_matching_uber_style...');
    const { data: testResult, error: testError } = await supabase.rpc('start_asap_matching_uber_style', {
      trip_request_id: 'e280b170-307a-44e2-b980-002b4a9504a3'
    });
    
    if (testError) {
      console.error('❌ Function test failed:', testError.message);
      console.log('🚨 This confirms the function does NOT exist in production!');
    } else {
      console.log('✅ Function test succeeded!');
      console.log('📊 Result:', testResult);
      
      // Check if trip was updated
      const { data: tripData } = await supabase
        .from('trip_requests')
        .select('assigned_driver_id, load_description')
        .eq('id', 'e280b170-307a-44e2-b980-002b4a9504a3')
        .single();
      
      if (tripData?.assigned_driver_id) {
        console.log('🎉 SUCCESS! Trip assigned to driver:', tripData.assigned_driver_id);
      } else {
        console.log('⚠️ Function exists but trip not assigned - checking why...');
      }
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkProductionFunctions();
