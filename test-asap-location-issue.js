/**
 * Test ASAP Location Issue
 * This will create a test trip and examine why start_asap_matching finds no drivers
 */

const { createClient } = require('@supabase/supabase-js');

// Database configuration
const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testASAPLocationIssue() {
  console.log('🔍 Testing ASAP Location Issue...\n');

  try {
    // 1. Check current available drivers with their location status
    console.log('👥 1. CHECKING AVAILABLE DRIVERS');
    console.log('=' .repeat(50));

    const { data: availableDrivers, error: driverError } = await supabase
      .from('driver_profiles')
      .select(`
        user_id,
        is_available,
        is_approved,
        status,
        users!inner(
          current_latitude,
          current_longitude,
          last_location_update
        )
      `)
      .eq('is_available', true)
      .eq('is_approved', true)
      .neq('status', 'offline');

    if (availableDrivers && availableDrivers.length > 0) {
      console.log(`Found ${availableDrivers.length} available drivers:`);
      availableDrivers.forEach(driver => {
        const user = driver.users;
        console.log(`\n🚗 Driver ${driver.user_id.substring(0, 8)}:`);
        console.log(`   Status: ${driver.status}`);
        console.log(`   Location: ${user.current_latitude ? `(${user.current_latitude}, ${user.current_longitude})` : 'NO LOCATION'}`);
        console.log(`   Last Update: ${user.last_location_update || 'Never'}`);
      });
    } else {
      console.log('❌ No available drivers found or query failed:', driverError);
    }

    // 2. Check driver_locations table
    console.log('\n📍 2. CHECKING DRIVER_LOCATIONS TABLE');
    console.log('=' .repeat(50));

    const { data: driverLocations, error: locError } = await supabase
      .from('driver_locations')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(5);

    if (driverLocations && driverLocations.length > 0) {
      console.log(`Found ${driverLocations.length} driver location records:`);
      driverLocations.forEach(loc => {
        console.log(`   Driver ${loc.driver_id.substring(0, 8)}: (${loc.latitude}, ${loc.longitude}) at ${loc.updated_at}`);
      });
    } else {
      console.log('❌ No driver location data found');
    }

    // 3. Test find_nearby_available_drivers function directly
    console.log('\n🔍 3. TESTING find_nearby_available_drivers FUNCTION');
    console.log('=' .repeat(50));

    // Use downtown coordinates (common pickup location)
    const testLat = 32.7767;
    const testLng = -96.7970;

    try {
      const { data: nearbyDrivers, error: nearbyError } = await supabase
        .rpc('find_nearby_available_drivers', {
          pickup_lat: testLat,
          pickup_lng: testLng,
          max_distance_km: 50,  // Increased from 10
          last_update_minutes: 60, // Increased from 5
          required_truck_type: null
        });

      if (nearbyError) {
        console.log(`❌ find_nearby_available_drivers error: ${nearbyError.message}`);
      } else {
        console.log(`✅ find_nearby_available_drivers returned ${nearbyDrivers ? nearbyDrivers.length : 0} drivers:`);
        if (nearbyDrivers && nearbyDrivers.length > 0) {
          nearbyDrivers.forEach(driver => {
            console.log(`   Driver ${driver.driver_id.substring(0, 8)}: Distance ${driver.distance_km}km`);
          });
        }
      }
    } catch (err) {
      console.log(`❌ find_nearby_available_drivers exception: ${err.message}`);
    }

    // 4. Create a test ASAP trip and see what happens
    console.log('\n🚛 4. CREATING TEST ASAP TRIP');
    console.log('=' .repeat(50));

    // First, get a customer ID
    const { data: customers, error: customerError } = await supabase
      .from('users')
      .select('id')
      .eq('user_type', 'customer')
      .limit(1);

    if (!customers || customers.length === 0) {
      console.log('❌ No customers found, cannot create test trip');
      return;
    }

    const customerId = customers[0].id;
    console.log(`Using customer: ${customerId.substring(0, 8)}`);

    // Create test trip
    const { data: tripData, error: tripError } = await supabase
      .from('trip_requests')
      .insert({
        customer_id: customerId,
        pickup_latitude: testLat,
        pickup_longitude: testLng,
        pickup_address: 'Test Downtown Dallas',
        delivery_latitude: testLat + 0.01,
        delivery_longitude: testLng + 0.01,
        delivery_address: 'Test Delivery Address',
        material_type: 'gravel',
        estimated_weight_tons: 10,
        estimated_volume_m3: 8,
        load_description: 'Test ASAP load',
        pickup_time_preference: 'asap',
        estimated_duration_minutes: 60,
        estimated_distance_km: 15,
        quoted_price: 250,
        status: 'pending'
      })
      .select()
      .single();

    if (tripError) {
      console.log('❌ Failed to create test trip:', tripError);
      return;
    }

    console.log(`✅ Created test trip: ${tripData.id.substring(0, 8)}`);

    // 5. Test start_asap_matching on our test trip
    console.log('\n🚀 5. TESTING start_asap_matching ON TEST TRIP');
    console.log('=' .repeat(50));

    const { data: matchingResult, error: matchingError } = await supabase
      .rpc('start_asap_matching', { trip_request_id: tripData.id });

    if (matchingError) {
      console.log(`❌ start_asap_matching error: ${matchingError.message}`);
    } else {
      console.log('✅ start_asap_matching result:', matchingResult);
    }

    // 6. Check if any individual requests were created
    console.log('\n📋 6. CHECKING FOR INDIVIDUAL REQUESTS');
    console.log('=' .repeat(50));

    const { data: individualRequests, error: individualError } = await supabase
      .from('trip_requests')
      .select('*')
      .eq('original_trip_id', tripData.id);

    if (individualRequests && individualRequests.length > 0) {
      console.log(`✅ Found ${individualRequests.length} individual driver requests:`);
      individualRequests.forEach(req => {
        console.log(`   Request ${req.id.substring(0, 8)} for driver ${req.assigned_driver_id.substring(0, 8)}`);
        console.log(`   Status: ${req.status}, Deadline: ${req.acceptance_deadline}`);
      });
    } else {
      console.log('❌ No individual driver requests created');
    }

    // 7. Check final status of our test trip
    const { data: finalTrip, error: finalError } = await supabase
      .from('trip_requests')
      .select('*')
      .eq('id', tripData.id)
      .single();

    console.log('\n📊 7. FINAL TRIP STATUS');
    console.log('=' .repeat(50));
    if (finalTrip) {
      console.log(`Trip ${finalTrip.id.substring(0, 8)}:`);
      console.log(`   Status: ${finalTrip.status}`);
      console.log(`   Assigned Driver: ${finalTrip.assigned_driver_id || 'None'}`);
      console.log(`   Matching Started: ${finalTrip.matching_started_at || 'No'}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Execute the test
testASAPLocationIssue().then(() => {
  console.log('\n✅ Test complete!');
  process.exit(0);
}).catch(err => {
  console.error('💥 Test failed:', err);
  process.exit(1);
});
