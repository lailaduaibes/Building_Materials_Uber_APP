const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

(async () => {
  try {
    console.log('Resetting trip assignment for testing...');
    
    // Reset the trip we just assigned
    const { data: resetResult, error: resetError } = await supabase
      .from('trip_requests')
      .update({ 
        assigned_driver_id: null
      })
      .eq('id', '49ad313a-8919-444e-a384-fb15a44b30f9')
      .select();
    
    if (resetError) {
      console.error('❌ Reset error:', resetError);
    } else {
      console.log('✅ Trip reset successful:', resetResult[0]?.id, 'assigned_driver_id:', resetResult[0]?.assigned_driver_id);
    }
    
    // Now let's also check what policies exist
    console.log('\nChecking existing RLS policies...');
    const { data: policies, error: policyError } = await supabase
      .from('information_schema.table_privileges')
      .select('*')
      .eq('table_name', 'trip_requests');
    
    if (policyError) {
      console.log('Could not check policies via information_schema');
    } else {
      console.log('Table privileges:', policies);
    }
    
  } catch (err) {
    console.error('❌ Script error:', err);
  }
})();
