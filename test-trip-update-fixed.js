const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

(async () => {
  try {
    console.log('Testing trip update with proper null handling...');
    
    // Get a specific trip ID to test with
    const { data: trips, error: fetchError } = await supabase
      .from('trip_requests')
      .select('id, assigned_driver_id')
      .eq('status', 'pending')
      .is('assigned_driver_id', null)
      .limit(1);
    
    if (fetchError) {
      console.error('Error fetching trip:', fetchError);
      return;
    }
    
    if (!trips || trips.length === 0) {
      console.log('No pending unassigned trips found');
      return;
    }
    
    const tripId = trips[0].id;
    console.log('Testing with trip ID:', tripId);
    
    // Try the update
    const { data: updateResult, error: updateError } = await supabase
      .from('trip_requests')
      .update({ 
        assigned_driver_id: '7a9ce2f0-db9d-46a7-aef3-c01635d90592',
        status: 'accepted'
      })
      .eq('id', tripId)
      .select();
    
    if (updateError) {
      console.error('❌ Update error:', updateError);
    } else {
      console.log('✅ Update successful:', updateResult);
    }
    
  } catch (err) {
    console.error('❌ Script error:', err);
  }
})();
