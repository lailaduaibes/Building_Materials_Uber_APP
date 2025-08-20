const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTripStatusUpdate() {
  try {
    console.log('🔍 Checking trip status updates...\n');

    // First, get current trips and their status
    console.log('1. Current trips in database:');
    const { data: currentTrips, error: fetchError } = await supabase
      .from('trip_requests')
      .select('id, status, pickup_started_at, picked_up_at, delivered_at, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (fetchError) {
      console.error('Error fetching trips:', fetchError);
      return;
    }

    currentTrips.forEach(trip => {
      console.log(`  Trip ${trip.id.substring(0, 8)}: ${trip.status}`);
      console.log(`    Started: ${trip.pickup_started_at || 'Not started'}`);
      console.log(`    Picked up: ${trip.picked_up_at || 'Not picked up'}`);
      console.log(`    Delivered: ${trip.delivered_at || 'Not delivered'}`);
      console.log('');
    });

    // Find or create a test trip
    let testTrip = currentTrips.find(trip => trip.status === 'matched');
    
    if (!testTrip) {
      console.log('2. Creating a test trip...');
      const { data: newTrip, error: createError } = await supabase
        .from('trip_requests')
        .insert([{
          customer_id: 'test-customer-' + Date.now(),
          driver_id: 'd7bc3e15-4c6e-4f3f-8a1b-9c5d7e8f9a0b',
          pickup_location: {
            address: 'Test Pickup Location',
            latitude: 24.7136,
            longitude: 46.6753
          },
          delivery_location: {
            address: 'Test Delivery Location',
            latitude: 24.7236,
            longitude: 46.6853
          },
          materials: [{ name: 'Test Material', quantity: 1 }],
          status: 'matched',
          estimated_price: 100.0
        }])
        .select()
        .single();

      if (createError) {
        console.error('Error creating test trip:', createError);
        return;
      }
      
      testTrip = newTrip;
      console.log(`✅ Created test trip: ${testTrip.id}`);
    }

    console.log(`\n3. Testing "Start Trip" update on trip: ${testTrip.id.substring(0, 8)}`);
    console.log(`   Current status: ${testTrip.status}`);

    // Simulate the "Start Trip" button click
    const now = new Date().toISOString();
    const { data: updatedTrip, error: updateError } = await supabase
      .from('trip_requests')
      .update({
        status: 'in_transit',
        pickup_started_at: now
      })
      .eq('id', testTrip.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating trip status:', updateError);
      return;
    }

    console.log('✅ Trip updated successfully!');
    console.log(`   New status: ${updatedTrip.status}`);
    console.log(`   Pickup started at: ${updatedTrip.pickup_started_at}`);

    // Verify the change persists
    console.log('\n4. Verifying the change persists...');
    const { data: verifyTrip, error: verifyError } = await supabase
      .from('trip_requests')
      .select('id, status, pickup_started_at')
      .eq('id', testTrip.id)
      .single();

    if (verifyError) {
      console.error('❌ Error verifying trip:', verifyError);
      return;
    }

    console.log('✅ Verification successful!');
    console.log(`   Status from database: ${verifyTrip.status}`);
    console.log(`   Should be: in_transit`);
    console.log(`   Match: ${verifyTrip.status === 'in_transit' ? '✅ YES' : '❌ NO'}`);

    if (verifyTrip.status === 'in_transit') {
      console.log('\n🎉 SUCCESS: "Start Trip" correctly updates status to "in_transit"');
    } else {
      console.log('\n❌ PROBLEM: Status is not being set to "in_transit"');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkTripStatusUpdate();
