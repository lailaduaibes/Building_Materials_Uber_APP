const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabaseSchema() {
  try {
    console.log('🔍 Checking database schema and current trips...\n');

    // First, get the table schema to see available columns
    console.log('1. Checking trip_requests table columns...');
    const { data: trips, error: fetchError } = await supabase
      .from('trip_requests')
      .select('*')
      .limit(1);

    if (fetchError) {
      console.error('Error fetching trips:', fetchError);
      return;
    }

    if (trips.length > 0) {
      console.log('Available columns:', Object.keys(trips[0]));
    }

    // Get current trips with basic info
    console.log('\n2. Current trips in database:');
    const { data: currentTrips, error: fetchError2 } = await supabase
      .from('trip_requests')
      .select('id, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (fetchError2) {
      console.error('Error fetching trips:', fetchError2);
      return;
    }

    currentTrips.forEach(trip => {
      console.log(`  Trip ${trip.id.substring(0, 8)}: ${trip.status}`);
    });

    // Test updating a trip to in_transit
    const testTrip = currentTrips[0];
    if (testTrip) {
      console.log(`\n3. Testing status update on trip: ${testTrip.id.substring(0, 8)}`);
      console.log(`   Current status: ${testTrip.status}`);

      const { data: updatedTrip, error: updateError } = await supabase
        .from('trip_requests')
        .update({
          status: 'in_transit'
        })
        .eq('id', testTrip.id)
        .select('id, status')
        .single();

      if (updateError) {
        console.error('❌ Error updating trip status:', updateError);
        return;
      }

      console.log('✅ Trip updated successfully!');
      console.log(`   New status: ${updatedTrip.status}`);
      
      if (updatedTrip.status === 'in_transit') {
        console.log('\n🎉 SUCCESS: Status correctly updated to "in_transit"');
      } else {
        console.log('\n❌ PROBLEM: Status is not "in_transit"');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkDatabaseSchema();
