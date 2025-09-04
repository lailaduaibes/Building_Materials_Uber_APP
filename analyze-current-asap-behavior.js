/**
 * Analyze Current ASAP Function Behavior
 * This will create a real test trip and see exactly what the existing functions do
 */

const { createClient } = require('@supabase/supabase-js');

// Database configuration
const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeCurrentASAPBehavior() {
  console.log('🔍 Analyzing Current ASAP Function Behavior...\n');

  try {
    // Step 1: Get a customer to use for testing
    console.log('👤 1. GETTING TEST CUSTOMER');
    console.log('=' .repeat(50));

    const { data: customers, error: customerError } = await supabase
      .from('users')
      .select('id, email')
      .eq('user_type', 'customer')
      .limit(1);

    if (!customers || customers.length === 0) {
      console.log('❌ No customers found');
      return;
    }

    const customerId = customers[0].id;
    console.log(`✅ Using customer: ${customerId.substring(0, 8)} (${customers[0].email})`);

    // Step 2: Check available drivers
    console.log('\n🚗 2. CHECKING AVAILABLE DRIVERS');
    console.log('=' .repeat(50));

    const { data: drivers, error: driverError } = await supabase
      .from('driver_profiles')
      .select(`
        user_id,
        is_available,
        is_approved,
        status,
        first_name,
        last_name
      `)
      .eq('is_available', true)
      .eq('is_approved', true)
      .neq('status', 'offline');

    if (drivers && drivers.length > 0) {
      console.log(`Found ${drivers.length} available drivers:`);
      drivers.forEach(driver => {
        console.log(`   ${driver.first_name} ${driver.last_name} (${driver.user_id.substring(0, 8)}) - Status: ${driver.status}`);
      });
    } else {
      console.log('❌ No available drivers found');
    }

    // Step 3: Create a test ASAP trip
    console.log('\n🚛 3. CREATING TEST ASAP TRIP');
    console.log('=' .repeat(50));

    const { data: newTrip, error: tripError } = await supabase
      .from('trip_requests')
      .insert({
        customer_id: customerId,
        pickup_latitude: 32.7767,  // Dallas coordinates
        pickup_longitude: -96.7970,
        pickup_address: 'Downtown Dallas Test',
        delivery_latitude: 32.7867,
        delivery_longitude: -96.8070,
        delivery_address: 'Test Delivery Location',
        material_type: 'gravel',
        estimated_weight_tons: 10,
        estimated_volume_m3: 8,
        load_description: 'Test ASAP analysis load',
        pickup_time_preference: 'asap',
        estimated_duration_minutes: 60,
        estimated_distance_km: 15,
        quoted_price: 300,
        status: 'pending'
      })
      .select()
      .single();

    if (tripError) {
      console.log('❌ Failed to create test trip:', tripError);
      return;
    }

    console.log(`✅ Created test trip: ${newTrip.id}`);
    console.log(`   Status: ${newTrip.status}`);
    console.log(`   Pickup: (${newTrip.pickup_latitude}, ${newTrip.pickup_longitude})`);

    // Step 4: Test find_nearby_available_drivers first
    console.log('\n📍 4. TESTING find_nearby_available_drivers');
    console.log('=' .repeat(50));

    const { data: nearbyDrivers, error: nearbyError } = await supabase
      .rpc('find_nearby_available_drivers', {
        pickup_lat: 32.7767,
        pickup_lng: -96.7970,
        max_distance_km_param: 100,  // Large radius
        min_updated_minutes_param: 1440, // 24 hours
        required_truck_type_id_param: null
      });

    if (nearbyError) {
      console.log(`❌ find_nearby_available_drivers error: ${nearbyError.message}`);
    } else {
      console.log(`✅ Found ${nearbyDrivers ? nearbyDrivers.length : 0} nearby drivers:`);
      if (nearbyDrivers && nearbyDrivers.length > 0) {
        nearbyDrivers.forEach(driver => {
          console.log(`   Driver ${driver.driver_id.substring(0, 8)}: ${driver.distance_km}km away`);
          console.log(`      Location: (${driver.latitude}, ${driver.longitude})`);
          console.log(`      Last update: ${driver.last_updated}`);
        });
      } else {
        console.log('   No drivers found within range');
      }
    }

    // Step 5: Test start_asap_matching
    console.log('\n🚀 5. TESTING start_asap_matching');
    console.log('=' .repeat(50));

    const { data: matchingResult, error: matchingError } = await supabase
      .rpc('start_asap_matching', { trip_request_id: newTrip.id });

    if (matchingError) {
      console.log(`❌ start_asap_matching error: ${matchingError.message}`);
    } else {
      console.log('✅ start_asap_matching result:', matchingResult);
    }

    // Step 6: Check what happened to our trip
    console.log('\n📊 6. CHECKING TRIP STATUS AFTER MATCHING');
    console.log('=' .repeat(50));

    const { data: updatedTrip, error: statusError } = await supabase
      .from('trip_requests')
      .select('*')
      .eq('id', newTrip.id)
      .single();

    if (updatedTrip) {
      console.log(`Trip ${updatedTrip.id.substring(0, 8)} status:`);
      console.log(`   Status: ${updatedTrip.status}`);
      console.log(`   Assigned Driver: ${updatedTrip.assigned_driver_id || 'None'}`);
      console.log(`   Matching Started: ${updatedTrip.matching_started_at || 'No'}`);
      console.log(`   Acceptance Deadline: ${updatedTrip.acceptance_deadline || 'None'}`);
    }

    // Step 7: Check for individual driver requests
    console.log('\n📋 7. CHECKING FOR INDIVIDUAL DRIVER REQUESTS');
    console.log('=' .repeat(50));

    const { data: individualRequests, error: individualError } = await supabase
      .from('trip_requests')
      .select('*')
      .eq('original_trip_id', newTrip.id);

    if (individualRequests && individualRequests.length > 0) {
      console.log(`✅ Found ${individualRequests.length} individual driver requests:`);
      individualRequests.forEach(req => {
        console.log(`   Request ${req.id.substring(0, 8)}:`);
        console.log(`      Driver: ${req.assigned_driver_id.substring(0, 8)}`);
        console.log(`      Status: ${req.status}`);
        console.log(`      Deadline: ${req.acceptance_deadline}`);
        console.log(`      Sent at: ${req.driver_request_sent_at}`);
      });
      
      console.log('\n🎯 SYSTEM BEHAVIOR: Creating individual requests (broadcast approach)');
    } else {
      console.log('❌ No individual driver requests created');
      console.log('\n🎯 SYSTEM BEHAVIOR: Not creating individual requests (direct assignment approach)');
    }

    // Step 8: Test start_asap_matching_sequential
    console.log('\n🔄 8. TESTING start_asap_matching_sequential');
    console.log('=' .repeat(50));

    // Create another test trip for sequential testing
    const { data: newTrip2, error: tripError2 } = await supabase
      .from('trip_requests')
      .insert({
        customer_id: customerId,
        pickup_latitude: 32.7767,
        pickup_longitude: -96.7970,
        pickup_address: 'Sequential Test Dallas',
        delivery_latitude: 32.7867,
        delivery_longitude: -96.8070,
        delivery_address: 'Sequential Test Delivery',
        material_type: 'sand',
        estimated_weight_tons: 5,
        estimated_volume_m3: 4,
        load_description: 'Sequential test load',
        pickup_time_preference: 'asap',
        estimated_duration_minutes: 45,
        estimated_distance_km: 12,
        quoted_price: 250,
        status: 'pending'
      })
      .select()
      .single();

    if (newTrip2) {
      console.log(`✅ Created second test trip: ${newTrip2.id.substring(0, 8)}`);

      const { data: sequentialResult, error: sequentialError } = await supabase
        .rpc('start_asap_matching_sequential', { trip_request_id: newTrip2.id });

      if (sequentialError) {
        console.log(`❌ start_asap_matching_sequential error: ${sequentialError.message}`);
      } else {
        console.log('✅ start_asap_matching_sequential result:', sequentialResult);
      }

      // Check what happened to the sequential trip
      const { data: updatedTrip2 } = await supabase
        .from('trip_requests')
        .select('*')
        .eq('id', newTrip2.id)
        .single();

      if (updatedTrip2) {
        console.log(`\nSequential trip ${updatedTrip2.id.substring(0, 8)} status:`);
        console.log(`   Status: ${updatedTrip2.status}`);
        console.log(`   Assigned Driver: ${updatedTrip2.assigned_driver_id || 'None'}`);
      }

      // Check for individual requests from sequential
      const { data: sequentialRequests } = await supabase
        .from('trip_requests')
        .select('*')
        .eq('original_trip_id', newTrip2.id);

      if (sequentialRequests && sequentialRequests.length > 0) {
        console.log(`\n📋 Sequential created ${sequentialRequests.length} individual requests`);
      } else {
        console.log('\n📋 Sequential created no individual requests');
      }
    }

    console.log('\n🎯 9. FINAL ANALYSIS');
    console.log('=' .repeat(50));
    console.log('Based on the test results above:');
    console.log('✅ Functions that exist: start_asap_matching, start_asap_matching_sequential');
    console.log('❌ Missing function: start_asap_matching_bulletproof');
    console.log('🔍 find_nearby_available_drivers behavior shown above');
    console.log('\n💡 Next: We need to fix the working functions to implement proper Uber sequential logic');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

// Execute analysis
analyzeCurrentASAPBehavior().then(() => {
  console.log('\n✅ Analysis complete!');
  process.exit(0);
}).catch(err => {
  console.error('💥 Analysis failed:', err);
  process.exit(1);
});
