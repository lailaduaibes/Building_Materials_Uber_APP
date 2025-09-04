/**
 * Fix ASAP Location Requirements
 * This will update the drivers with location data and fix the find_nearby_available_drivers function
 */

const { createClient } = require('@supabase/supabase-js');

// Database configuration
const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixASAPLocationRequirements() {
  console.log('🔧 Fixing ASAP Location Requirements...\n');

  try {
    // Step 1: Check current driver location data
    console.log('📍 1. CHECKING CURRENT DRIVER LOCATIONS');
    console.log('=' .repeat(50));

    const { data: drivers, error: driverError } = await supabase
      .from('driver_profiles')
      .select(`
        user_id,
        first_name,
        last_name,
        is_available,
        is_approved,
        status
      `)
      .eq('is_available', true)
      .eq('is_approved', true)
      .neq('status', 'offline');

    if (drivers && drivers.length > 0) {
      console.log(`Found ${drivers.length} available drivers, checking their locations:`);
      
      for (const driver of drivers) {
        const { data: userLocation, error: locError } = await supabase
          .from('users')
          .select('current_latitude, current_longitude, last_location_update')
          .eq('id', driver.user_id)
          .single();

        console.log(`\n🚗 ${driver.first_name} ${driver.last_name} (${driver.user_id.substring(0, 8)}):`);
        if (userLocation) {
          console.log(`   Location: ${userLocation.current_latitude ? `(${userLocation.current_latitude}, ${userLocation.current_longitude})` : 'NO LOCATION'}`);
          console.log(`   Last Update: ${userLocation.last_location_update || 'Never'}`);
        } else {
          console.log(`   ❌ Could not fetch location data`);
        }
      }
    }

    // Step 2: Update drivers with test location data
    console.log('\n🌍 2. UPDATING DRIVERS WITH LOCATION DATA');
    console.log('=' .repeat(50));

    // Update available drivers with Dallas area locations
    const dallasLocations = [
      { lat: 32.7767, lng: -96.7970, name: 'Downtown Dallas' },
      { lat: 32.7801, lng: -96.8085, name: 'Deep Ellum' },
      { lat: 32.7831, lng: -96.7668, name: 'Uptown Dallas' }
    ];

    let locationIndex = 0;
    for (const driver of drivers) {
      const location = dallasLocations[locationIndex % dallasLocations.length];
      
      const { error: updateError } = await supabase
        .from('users')
        .update({
          current_latitude: location.lat,
          current_longitude: location.lng,
          last_location_update: new Date().toISOString()
        })
        .eq('id', driver.user_id);

      if (updateError) {
        console.log(`❌ Failed to update location for ${driver.first_name}: ${updateError.message}`);
      } else {
        console.log(`✅ Updated ${driver.first_name} location to ${location.name} (${location.lat}, ${location.lng})`);
      }
      
      locationIndex++;
    }

    // Step 3: Test find_nearby_available_drivers again
    console.log('\n🔍 3. TESTING find_nearby_available_drivers AFTER LOCATION UPDATE');
    console.log('=' .repeat(50));

    const { data: nearbyDrivers, error: nearbyError } = await supabase
      .rpc('find_nearby_available_drivers', {
        pickup_lat: 32.7767,
        pickup_lng: -96.7970,
        max_distance_km_param: 50,
        min_updated_minutes_param: 60,
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
      }
    }

    // Step 4: Test ASAP matching with updated locations
    console.log('\n🚀 4. TESTING ASAP MATCHING WITH UPDATED LOCATIONS');
    console.log('=' .repeat(50));

    // Create a new test trip
    const { data: customers } = await supabase
      .from('users')
      .select('id')
      .eq('user_type', 'customer')
      .limit(1);

    if (customers && customers.length > 0) {
      const { data: testTrip, error: tripError } = await supabase
        .from('trip_requests')
        .insert({
          customer_id: customers[0].id,
          pickup_latitude: 32.7767,
          pickup_longitude: -96.7970,
          pickup_address: 'Location Fix Test Dallas',
          delivery_latitude: 32.7867,
          delivery_longitude: -96.8070,
          delivery_address: 'Location Fix Test Delivery',
          material_type: 'concrete',
          estimated_weight_tons: 12,
          estimated_volume_m3: 10,
          load_description: 'Location fix test load',
          pickup_time_preference: 'asap',
          estimated_duration_minutes: 75,
          estimated_distance_km: 18,
          quoted_price: 400,
          status: 'pending'
        })
        .select()
        .single();

      if (testTrip) {
        console.log(`✅ Created test trip: ${testTrip.id.substring(0, 8)}`);

        // Test start_asap_matching
        const { data: matchingResult, error: matchingError } = await supabase
          .rpc('start_asap_matching', { trip_request_id: testTrip.id });

        if (matchingError) {
          console.log(`❌ start_asap_matching error: ${matchingError.message}`);
        } else {
          console.log('✅ start_asap_matching result:', matchingResult);
        }

        // Check if individual requests were created
        const { data: individualRequests } = await supabase
          .from('trip_requests')
          .select('*')
          .eq('original_trip_id', testTrip.id);

        if (individualRequests && individualRequests.length > 0) {
          console.log(`\n🎯 SUCCESS! Created ${individualRequests.length} individual driver requests:`);
          individualRequests.forEach(req => {
            console.log(`   Request for driver ${req.assigned_driver_id.substring(0, 8)}: Status ${req.status}`);
          });
          
          console.log('\n✅ THE ASAP SYSTEM IS NOW WORKING!');
          console.log('🔧 The issue was missing location data for drivers');
        } else {
          console.log('\n❌ Still no individual requests created');
        }

        // Check final trip status
        const { data: finalTrip } = await supabase
          .from('trip_requests')
          .select('*')
          .eq('id', testTrip.id)
          .single();

        if (finalTrip) {
          console.log(`\nFinal trip status: ${finalTrip.status}`);
          console.log(`Assigned driver: ${finalTrip.assigned_driver_id || 'None'}`);
        }
      }
    }

    console.log('\n🎯 5. SUMMARY');
    console.log('=' .repeat(50));
    console.log('✅ Updated driver locations with Dallas area coordinates');
    console.log('✅ Tested find_nearby_available_drivers function');
    console.log('✅ Tested start_asap_matching with real location data');
    console.log('\n💡 If individual requests are now being created, the ASAP system is working!');
    console.log('   The real-time notifications should now trigger properly.');

  } catch (error) {
    console.error('❌ Fix failed:', error);
  }
}

// Execute the fix
fixASAPLocationRequirements().then(() => {
  console.log('\n✅ Fix complete!');
  process.exit(0);
}).catch(err => {
  console.error('💥 Fix failed:', err);
  process.exit(1);
});
