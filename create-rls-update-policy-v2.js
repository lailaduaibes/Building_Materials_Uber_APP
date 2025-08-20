const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

(async () => {
  try {
    console.log('Creating RLS policy for drivers to accept trips...');
    
    // First check if the policy already exists
    const { data: existingPolicies, error: checkError } = await supabase
      .from('pg_policies')
      .select('policyname')
      .eq('tablename', 'trip_requests')
      .eq('policyname', 'Drivers can accept pending trips');
      
    if (checkError) {
      console.log('Note: Could not check existing policies (normal if pg_policies not accessible)');
    } else if (existingPolicies && existingPolicies.length > 0) {
      console.log('✅ Policy already exists');
      return;
    }
    
    // Try to create the policy using raw SQL
    const { data, error } = await supabase.rpc('sql', {
      query: `
        CREATE POLICY "Drivers can accept pending trips" ON trip_requests
        FOR UPDATE
        USING (
          status = 'pending' 
          AND assigned_driver_id IS NULL 
          AND EXISTS (
            SELECT 1 FROM driver_profiles 
            WHERE driver_profiles.user_id = auth.uid() 
            AND driver_profiles.status = 'available'
          )
        )
        WITH CHECK (
          status IN ('pending', 'accepted') 
          AND EXISTS (
            SELECT 1 FROM driver_profiles 
            WHERE driver_profiles.user_id = auth.uid() 
            AND driver_profiles.id = trip_requests.assigned_driver_id
          )
        );
      `
    });
    
    if (error) {
      console.error('❌ Error creating policy with rpc sql:', error);
      
      // Try alternative method
      console.log('Trying alternative approach...');
      const { error: altError } = await supabase
        .rpc('create_update_policy_for_drivers');
        
      if (altError) {
        console.error('❌ Alternative method failed:', altError);
        console.log('\n📝 Manual SQL needed:');
        console.log(`
CREATE POLICY "Drivers can accept pending trips" ON trip_requests
FOR UPDATE
USING (
  status = 'pending' 
  AND assigned_driver_id IS NULL 
  AND EXISTS (
    SELECT 1 FROM driver_profiles 
    WHERE driver_profiles.user_id = auth.uid() 
    AND driver_profiles.status = 'available'
  )
)
WITH CHECK (
  status IN ('pending', 'accepted') 
  AND EXISTS (
    SELECT 1 FROM driver_profiles 
    WHERE driver_profiles.user_id = auth.uid() 
    AND driver_profiles.id = trip_requests.assigned_driver_id
  )
);
        `);
      } else {
        console.log('✅ Successfully created RLS policy using alternative method');
      }
    } else {
      console.log('✅ Successfully created RLS policy for driver trip acceptance');
    }
  } catch (err) {
    console.error('❌ Script error:', err);
    console.log('\n📝 Please run this SQL manually in Supabase SQL Editor:');
    console.log(`
CREATE POLICY "Drivers can accept pending trips" ON trip_requests
FOR UPDATE
USING (
  status = 'pending' 
  AND assigned_driver_id IS NULL 
  AND EXISTS (
    SELECT 1 FROM driver_profiles 
    WHERE driver_profiles.user_id = auth.uid() 
    AND driver_profiles.status = 'available'
  )
)
WITH CHECK (
  status IN ('pending', 'accepted') 
  AND EXISTS (
    SELECT 1 FROM driver_profiles 
    WHERE driver_profiles.user_id = auth.uid() 
    AND driver_profiles.id = trip_requests.assigned_driver_id
  )
);
    `);
  }
})();
