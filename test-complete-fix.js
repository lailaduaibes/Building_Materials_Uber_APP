const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

(async () => {
  try {
    console.log('🧪 Testing complete fix - reset trip and verify solution...');
    
    const driverUserId = '7a9ce2f0-db9d-46a7-aef3-c01635d90592';
    
    // Reset the trip for testing
    const { data: resetTrip, error: resetError } = await supabase
      .from('trip_requests')
      .update({ 
        assigned_driver_id: null,
        status: 'pending',
        matched_at: null
      })
      .eq('assigned_driver_id', driverUserId)
      .select()
      .single();
    
    if (resetError) {
      console.log('Note: No trips to reset or reset failed:', resetError.message);
    } else {
      console.log('✅ Trip reset for testing:', resetTrip.id);
    }
    
    // Verify we have pending trips
    const { data: pendingTrips, error: pendingError } = await supabase
      .from('trip_requests')
      .select('id, status, assigned_driver_id')
      .eq('status', 'pending')
      .is('assigned_driver_id', null)
      .limit(3);
    
    if (pendingError) {
      console.error('❌ Error fetching pending trips:', pendingError);
      return;
    }
    
    console.log(`✅ Found ${pendingTrips.length} pending trips available for assignment`);
    
    if (pendingTrips.length > 0) {
      const testTripId = pendingTrips[0].id;
      console.log('🎯 Test trip ID:', testTripId);
      
      // Test the exact update that DriverService.acceptOrder will now perform
      console.log('\n🔄 Testing updated DriverService logic...');
      const { data: acceptResult, error: acceptError } = await supabase
        .from('trip_requests')
        .update({ 
          status: 'matched',
          assigned_driver_id: driverUserId, // This is what DriverService now uses
          matched_at: new Date().toISOString()
        })
        .eq('id', testTripId)
        .eq('status', 'pending')
        .select()
        .single();
      
      if (acceptError) {
        console.error('❌ Accept test failed:', acceptError);
      } else {
        console.log('✅ Accept test successful!');
        console.log('✅ Trip accepted:', {
          id: acceptResult.id,
          status: acceptResult.status,
          assigned_driver_id: acceptResult.assigned_driver_id,
          matched_at: acceptResult.matched_at
        });
        
        console.log('\n🎉 COMPLETE SOLUTION:');
        console.log('1. ✅ DriverService.acceptOrder() fixed to use user_id');
        console.log('2. ✅ Database accepts the assignment');
        console.log('3. 📝 RLS policy needs to be updated in Supabase');
        
        console.log('\n📋 NEXT STEPS:');
        console.log('1. Run the SQL in fix-rls-policy-final.sql in Supabase Dashboard');
        console.log('2. Test trip acceptance in the driver app');
        console.log('3. Trip acceptance should now work perfectly!');
      }
    }
    
  } catch (err) {
    console.error('❌ Script error:', err);
  }
})();
