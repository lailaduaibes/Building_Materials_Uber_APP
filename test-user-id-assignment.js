const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

(async () => {
  try {
    console.log('🔍 Checking foreign key constraint for assigned_driver_id...');
    
    const driverUserId = '7a9ce2f0-db9d-46a7-aef3-c01635d90592';
    const driverProfileId = 'a362e5f7-bb76-4563-abf3-c6d1dbf43c14';
    
    console.log('Driver User ID:', driverUserId);
    console.log('Driver Profile ID:', driverProfileId);
    
    // Test with user_id instead of driver_profile id
    const { data: pendingTrips, error: tripsError } = await supabase
      .from('trip_requests')
      .select('id')
      .eq('status', 'pending')
      .is('assigned_driver_id', null)
      .limit(1);
    
    if (tripsError) {
      console.error('❌ Trips fetch error:', tripsError);
      return;
    }
    
    if (!pendingTrips || pendingTrips.length === 0) {
      console.log('❌ No pending trips found');
      return;
    }
    
    const tripId = pendingTrips[0].id;
    console.log('✅ Found pending trip:', tripId);
    
    // Test with user_id (should work if FK references users table)
    console.log('\n🔄 Testing with user_id instead of profile_id...');
    const { data: updateResult, error: updateError } = await supabase
      .from('trip_requests')
      .update({ 
        assigned_driver_id: driverUserId // Use user_id instead
      })
      .eq('id', tripId)
      .select();
    
    if (updateError) {
      console.error('❌ Update with user_id failed:', updateError);
    } else {
      console.log('✅ Update with user_id successful!');
      console.log('Trip assigned to user:', updateResult[0]?.assigned_driver_id);
      
      console.log('\n🎉 SOLUTION FOUND!');
      console.log('The DriverService should use user_id instead of driver_profile.id');
      console.log('\nThe acceptOrder method should be:');
      console.log(`
assigned_driver_id: this.currentDriver.user_id  // Not this.currentDriver.id
      `);
    }
    
  } catch (err) {
    console.error('❌ Script error:', err);
  }
})();
