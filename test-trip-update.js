const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

(async () => {
  try {
    console.log('Checking current trip_requests data and trying INSERT...');
    
    // Check current data
    const { data: trips, error: tripError } = await supabase
      .from('trip_requests')
      .select('*')
      .limit(3);
    
    if (tripError) {
      console.error('Error fetching trips:', tripError);
    } else {
      console.log('Current trips sample:', JSON.stringify(trips, null, 2));
    }
    
    // Try a simple update to see the exact error
    console.log('\nTrying a test update...');
    const { data: updateResult, error: updateError } = await supabase
      .from('trip_requests')
      .update({ assigned_driver_id: '7a9ce2f0-db9d-46a7-aef3-c01635d90592' })
      .eq('status', 'pending')
      .is('assigned_driver_id', null)
      .limit(1);
    
    if (updateError) {
      console.error('❌ Update error:', updateError);
    } else {
      console.log('✅ Update successful:', updateResult);
    }
    
  } catch (err) {
    console.error('❌ Script error:', err);
  }
})();
