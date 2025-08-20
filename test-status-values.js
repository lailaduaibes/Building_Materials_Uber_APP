const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

(async () => {
  try {
    console.log('🔍 Testing different status values for driver_profiles...');
    
    const driverProfileId = 'a362e5f7-bb76-4563-abf3-c6d1dbf43c14';
    
    // Try different status values to see which ones are valid
    const statusValues = ['available', 'offline', 'online', 'busy', 'active', 'inactive'];
    
    for (const status of statusValues) {
      console.log(`\n📝 Testing status: "${status}"`);
      
      const { data, error } = await supabase
        .from('driver_profiles')
        .update({ status: status })
        .eq('id', driverProfileId)
        .select('status');
      
      if (error) {
        console.log(`❌ "${status}" - Invalid:`, error.message);
      } else {
        console.log(`✅ "${status}" - Valid! Current status:`, data[0]?.status);
        
        // If this status works, let's test the trip acceptance
        if (status === 'available' || status === 'online' || status === 'active') {
          console.log('🔄 Testing trip acceptance with this status...');
          
          const { data: pendingTrips, error: tripsError } = await supabase
            .from('trip_requests')
            .select('id')
            .eq('status', 'pending')
            .is('assigned_driver_id', null)
            .limit(1);
          
          if (!tripsError && pendingTrips && pendingTrips.length > 0) {
            const tripId = pendingTrips[0].id;
            
            const { data: updateResult, error: updateError } = await supabase
              .from('trip_requests')
              .update({ 
                assigned_driver_id: driverProfileId
              })
              .eq('id', tripId)
              .select();
            
            if (updateError) {
              console.log(`❌ Trip acceptance test failed for "${status}":`, updateError.message);
            } else {
              console.log(`✅ Trip acceptance test successful for "${status}"!`);
              
              // Reset the trip
              await supabase
                .from('trip_requests')
                .update({ assigned_driver_id: null })
                .eq('id', tripId);
            }
          }
        }
        
        break; // Found a working status, use it
      }
    }
    
  } catch (err) {
    console.error('❌ Script error:', err);
  }
})();
