const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

(async () => {
  try {
    console.log('Creating RLS policy for drivers to accept trips...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
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
      console.error('❌ Error creating policy:', error);
    } else {
      console.log('✅ Successfully created RLS policy for driver trip acceptance');
    }
  } catch (err) {
    console.error('❌ Script error:', err);
  }
})();
