const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test the status mapping logic
function mapOrderStatusToTripStatus(orderStatus) {
  switch (orderStatus) {
    case 'matched':
    case 'accepted':
      return 'assigned';
    case 'in_transit':
      // For in_transit, we need to check if pickup is completed
      // For now, assume it's en_route_pickup (this should be enhanced)
      return 'en_route_pickup';
    case 'delivered':
      return 'delivered';
    default:
      console.log('Unknown order status:', orderStatus);
      return 'assigned';
  }
}

function mapTripStatusToOrderStatus(tripStatus) {
  switch (tripStatus) {
    case 'assigned':
      return 'matched';
    case 'en_route_pickup':
    case 'at_pickup':
    case 'loaded':
    case 'en_route_delivery':
      return 'in_transit';
    case 'delivered':
      return 'delivered';
    default:
      console.log('Unknown trip status:', tripStatus);
      return 'matched';
  }
}

async function testStatusMapping() {
  try {
    console.log('🧪 Testing Status Mapping Logic...\n');

    // Test 1: Status mappings
    console.log('1. Testing status mappings:');
    console.log('   matched → assigned:', mapOrderStatusToTripStatus('matched'));
    console.log('   accepted → assigned:', mapOrderStatusToTripStatus('accepted'));
    console.log('   in_transit → en_route_pickup:', mapOrderStatusToTripStatus('in_transit'));
    console.log('   delivered → delivered:', mapOrderStatusToTripStatus('delivered'));
    console.log('');

    console.log('   assigned → matched:', mapTripStatusToOrderStatus('assigned'));
    console.log('   en_route_pickup → in_transit:', mapTripStatusToOrderStatus('en_route_pickup'));
    console.log('   at_pickup → in_transit:', mapTripStatusToOrderStatus('at_pickup'));
    console.log('   loaded → in_transit:', mapTripStatusToOrderStatus('loaded'));
    console.log('   delivered → delivered:', mapTripStatusToOrderStatus('delivered'));
    console.log('');

    // Test 2: Check current trip in database
    console.log('2. Checking current trip status in database:');
    const { data: trips, error: fetchError } = await supabase
      .from('trip_requests')
      .select('id, status, pickup_started_at, pickup_completed_at, delivered_at')
      .order('created_at', { ascending: false })
      .limit(3);

    if (fetchError) {
      console.error('Error fetching trips:', fetchError);
      return;
    }

    trips.forEach(trip => {
      const mappedTripStatus = mapOrderStatusToTripStatus(trip.status);
      console.log(`   Trip ${trip.id.substring(0, 8)}:`);
      console.log(`     Database status: ${trip.status}`);
      console.log(`     Would map to UI: ${mappedTripStatus}`);
      console.log(`     Pickup started: ${trip.pickup_started_at ? 'Yes' : 'No'}`);
      console.log(`     Pickup completed: ${trip.pickup_completed_at ? 'Yes' : 'No'}`);
      console.log('');
    });

    // Test 3: Simulate the user flow
    console.log('3. Simulating user flow:');
    const testTrip = trips[0];
    
    console.log(`   Starting with trip ${testTrip.id.substring(0, 8)} (status: ${testTrip.status})`);
    
    // Simulate "Start Trip" click
    console.log('   User clicks "Start Trip" button...');
    const newOrderStatus = mapTripStatusToOrderStatus('en_route_pickup');
    console.log(`   Would update database to: ${newOrderStatus}`);
    
    // Update the database
    const { data: updatedTrip, error: updateError } = await supabase
      .from('trip_requests')
      .update({ 
        status: newOrderStatus,
        pickup_started_at: new Date().toISOString()
      })
      .eq('id', testTrip.id)
      .select()
      .single();

    if (updateError) {
      console.error('   Error updating trip:', updateError);
    } else {
      console.log(`   ✅ Database updated to: ${updatedTrip.status}`);
    }

    // Simulate returning to dashboard and reopening trip
    console.log('   User returns to dashboard and reopens trip...');
    const { data: reloadedTrip, error: reloadError } = await supabase
      .from('trip_requests')
      .select('id, status, pickup_started_at, pickup_completed_at')
      .eq('id', testTrip.id)
      .single();

    if (reloadError) {
      console.error('   Error reloading trip:', reloadError);
    } else {
      const reloadedTripStatus = mapOrderStatusToTripStatus(reloadedTrip.status);
      console.log(`   ✅ Reloaded from database: ${reloadedTrip.status}`);
      console.log(`   ✅ Would show UI status: ${reloadedTripStatus}`);
      
      if (reloadedTripStatus === 'en_route_pickup') {
        console.log('   ✅ SUCCESS: Would show "Arrived at Pickup" button');
      } else {
        console.log(`   ❌ PROBLEM: Would show wrong button for status ${reloadedTripStatus}`);
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testStatusMapping();
