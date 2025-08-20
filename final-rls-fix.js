const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

(async () => {
  try {
    console.log('🔧 Testing trip acceptance with current driver status...');
    
    const driverProfileId = 'a362e5f7-bb76-4563-abf3-c6d1dbf43c14';
    
    // Get current driver status
    const { data: driverData, error: driverError } = await supabase
      .from('driver_profiles')
      .select('status')
      .eq('id', driverProfileId)
      .single();
    
    if (driverError) {
      console.error('❌ Driver fetch error:', driverError);
      return;
    }
    
    console.log('✅ Current driver status:', driverData.status);
    
    // Get a pending trip to test
    const { data: pendingTrips, error: tripsError } = await supabase
      .from('trip_requests')
      .select('id, assigned_driver_id')
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
    
    // Test trip acceptance with service role (should work)
    console.log('\n🔄 Testing trip acceptance with service role...');
    const { data: updateResult, error: updateError } = await supabase
      .from('trip_requests')
      .update({ 
        assigned_driver_id: driverProfileId
      })
      .eq('id', tripId)
      .select();
    
    if (updateError) {
      console.error('❌ Service role update error:', updateError);
    } else {
      console.log('✅ Service role update successful!');
      console.log('Trip assigned to driver:', updateResult[0]?.assigned_driver_id);
      
      console.log('\n🎉 SOLUTION FOUND!');
      console.log('The RLS policy needs to be updated to remove the status check or change it to "offline"');
      console.log('\nRUN THIS SQL IN SUPABASE:');
      console.log(`
DROP POLICY IF EXISTS "Drivers can accept pending trips" ON trip_requests;

CREATE POLICY "Drivers can accept pending trips" ON trip_requests
FOR UPDATE
USING (
  status = 'pending' 
  AND assigned_driver_id IS NULL 
  AND EXISTS (
    SELECT 1 FROM driver_profiles 
    WHERE driver_profiles.user_id = auth.uid()
  )
)
WITH CHECK (
  status = 'pending'
  AND EXISTS (
    SELECT 1 FROM driver_profiles 
    WHERE driver_profiles.user_id = auth.uid() 
    AND driver_profiles.id = trip_requests.assigned_driver_id
  )
);
      `);
    }
    
  } catch (err) {
    console.error('❌ Script error:', err);
  }
})();
