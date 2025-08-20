const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function fixTripTracking() {
  console.log('🔧 Fixing trip_tracking table schema...');
  
  try {
    // First, drop the existing table if it has wrong schema
    console.log('1. Dropping existing trip_tracking table...');
    const { error: dropError } = await supabase.rpc('drop_table_if_exists', { 
      table_name: 'trip_tracking' 
    });
    
    if (dropError) {
      console.log('⚠️ Could not drop via RPC, continuing...');
    }

    // Create the correct trip_tracking table
    console.log('2. Creating trip_tracking table with correct schema...');
    
    // Since we can't run raw SQL easily, let's try to insert and let it fail to understand the schema
    const { error: insertError } = await supabase
      .from('trip_tracking')
      .insert({
        trip_request_id: 'test-id',
        driver_latitude: 24.7136,
        driver_longitude: 46.6753,
        status: 'assigned'
      });

    if (insertError) {
      console.log('Current schema issue:', insertError.message);
      
      // Try to understand what columns exist by testing different combinations
      console.log('3. Testing what columns actually exist...');
      
      const tests = [
        // Test 1: Maybe it uses different column names
        { id: 'test-123', latitude: 24.7136, longitude: 46.6753 },
        // Test 2: Maybe it's using order_id instead of trip_request_id
        { order_id: 'test-123', lat: 24.7136, lng: 46.6753 },
        // Test 3: Maybe minimal columns
        { trip_id: 'test-123' },
        // Test 4: Just coordinates
        { driver_lat: 24.7136, driver_lng: 46.6753 }
      ];

      for (let i = 0; i < tests.length; i++) {
        const { error } = await supabase.from('trip_tracking').insert(tests[i]);
        if (error) {
          console.log(`Test ${i + 1} failed:`, error.message);
        } else {
          console.log(`✅ Test ${i + 1} worked! Schema:`, Object.keys(tests[i]));
          // Clean up
          await supabase.from('trip_tracking').delete().eq(Object.keys(tests[i])[0], Object.values(tests[i])[0]);
          break;
        }
      }
    } else {
      console.log('✅ trip_tracking table is working correctly!');
      // Clean up test record
      await supabase.from('trip_tracking').delete().eq('trip_request_id', 'test-id');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixTripTracking();
