const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qclmpmdvpojgvhcswkml.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjbG1wbWR2cG9qZ3ZoY3N3a21sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIzNTczNDcsImV4cCI6MjA0NzkzMzM0N30.CkdZoT5T8S7Q1fozU7yGrIaORKjhQktAMdgL2W4_QdY';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testNavigationWorkflow() {
  try {
    console.log('🚀 Testing complete navigation workflow...\n');

    // Test 1: Check current trip requests
    console.log('1. Checking current trip requests...');
    const { data: trips, error: tripsError } = await supabase
      .from('trip_requests')
      .select('*')
      .not('status', 'eq', 'delivered')
      .order('created_at', { ascending: false })
      .limit(5);

    if (tripsError) {
      console.error('Error fetching trips:', tripsError);
      return;
    }

    console.log(`Found ${trips.length} active trips:`);
    trips.forEach(trip => {
      console.log(`  - Trip ${trip.id}: ${trip.status} (Driver: ${trip.driver_id})`);
    });

    // Find a trip to test with
    const testTrip = trips.find(trip => trip.driver_id && trip.status === 'matched');
    if (!testTrip) {
      console.log('\n❌ No matched trips found for testing. Creating a test trip...');
      
      // Create a test trip for testing
      const { data: newTrip, error: createError } = await supabase
        .from('trip_requests')
        .insert([{
          customer_id: 'test-customer-123',
          driver_id: 'd7bc3e15-4c6e-4f3f-8a1b-9c5d7e8f9a0b',
          pickup_location: {
            address: 'Test Pickup Address',
            latitude: 24.7136,
            longitude: 46.6753
          },
          delivery_location: {
            address: 'Test Delivery Address', 
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

      console.log(`✅ Created test trip: ${newTrip.id}`);
      testTrip = newTrip;
    }

    console.log(`\n2. Testing workflow with trip: ${testTrip.id}`);
    console.log(`   Current status: ${testTrip.status}`);

    // Test 2: Start trip (start_trip)
    console.log('\n3. Testing "Start Trip" action...');
    const { data: startResult, error: startError } = await supabase
      .from('trip_requests')
      .update({
        status: 'in_transit',
        pickup_started_at: new Date().toISOString()
      })
      .eq('id', testTrip.id)
      .select()
      .single();

    if (startError) {
      console.error('❌ Error starting trip:', startError);
    } else {
      console.log(`✅ Trip started successfully. Status: ${startResult.status}`);
    }

    // Test 3: Complete pickup (picked_up) 
    console.log('\n4. Testing "Pickup Complete" action...');
    const { data: pickupResult, error: pickupError } = await supabase
      .from('trip_requests')
      .update({
        status: 'in_transit',
        picked_up_at: new Date().toISOString()
      })
      .eq('id', testTrip.id)
      .select()
      .single();

    if (pickupError) {
      console.error('❌ Error completing pickup:', pickupError);
    } else {
      console.log(`✅ Pickup completed successfully. Status: ${pickupResult.status}`);
    }

    // Test 4: Complete delivery (delivered)
    console.log('\n5. Testing "Delivery Complete" action...');
    const { data: deliveryResult, error: deliveryError } = await supabase
      .from('trip_requests')
      .update({
        status: 'delivered',
        delivered_at: new Date().toISOString()
      })
      .eq('id', testTrip.id)
      .select()
      .single();

    if (deliveryError) {
      console.error('❌ Error completing delivery:', deliveryError);
    } else {
      console.log(`✅ Delivery completed successfully. Status: ${deliveryResult.status}`);
    }

    // Test 5: Verify final state
    console.log('\n6. Verifying final trip state...');
    const { data: finalTrip, error: finalError } = await supabase
      .from('trip_requests')
      .select('*')
      .eq('id', testTrip.id)
      .single();

    if (finalError) {
      console.error('❌ Error fetching final state:', finalError);
    } else {
      console.log('✅ Final trip state:');
      console.log(`   Status: ${finalTrip.status}`);
      console.log(`   Started: ${finalTrip.pickup_started_at || 'Not set'}`);
      console.log(`   Picked up: ${finalTrip.picked_up_at || 'Not set'}`);
      console.log(`   Delivered: ${finalTrip.delivered_at || 'Not set'}`);
    }

    console.log('\n🎉 Navigation workflow test completed!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testNavigationWorkflow();
