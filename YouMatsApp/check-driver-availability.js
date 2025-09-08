/**
 * 🔍 DRIVER AVAILABILITY DIAGNOSTIC
 * Check why start_asap_matching finds "No available drivers"
 */

async function checkDriverAvailability() {
  console.log('🔍 Checking Driver Availability Criteria...\n');

  const { createClient } = require('@supabase/supabase-js');

  const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get the pending trip coordinates
    const { data: trip } = await supabase
      .from('trip_requests')
      .select('id, pickup_latitude, pickup_longitude')
      .eq('pickup_time_preference', 'asap')
      .eq('status', 'no_drivers_available')
      .limit(1)
      .single();

    if (!trip) {
      console.log('❌ No test trip found');
      return;
    }

    console.log(`📍 Test trip coordinates: ${trip.pickup_latitude}, ${trip.pickup_longitude}\n`);

    // Check 1: All drivers in system
    console.log('👥 1. ALL DRIVERS IN SYSTEM:');
    const { data: allDrivers } = await supabase
      .from('driver_profiles')
      .select('user_id, first_name, last_name, is_approved, approval_status')
      .eq('is_approved', true);

    console.log(`   Found ${allDrivers?.length || 0} approved drivers`);

    // Check 2: Drivers with locations
    console.log('\n📍 2. DRIVERS WITH LOCATIONS:');
    const { data: driversWithLocations } = await supabase
      .from('driver_profiles')
      .select(`
        user_id, 
        first_name, 
        last_name,
        driver_locations (
          latitude,
          longitude,
          updated_at
        )
      `)
      .eq('is_approved', true)
      .not('driver_locations', 'is', null);

    console.log(`   Found ${driversWithLocations?.length || 0} drivers with locations:`);
    driversWithLocations?.forEach(driver => {
      const location = driver.driver_locations?.[0];
      const minutesOld = location ? Math.round((new Date() - new Date(location.updated_at)) / 60000) : 'N/A';
      console.log(`   - ${driver.first_name} ${driver.last_name}: ${location?.latitude || 'N/A'}, ${location?.longitude || 'N/A'} (${minutesOld} min old)`);
    });

    // Check 3: Try the proximity function that ASAP matching likely uses
    console.log('\n🔍 3. TESTING PROXIMITY FUNCTION:');
    
    try {
      const { data: nearbyDrivers, error: proximityError } = await supabase.rpc('find_nearby_available_drivers', {
        pickup_lat: trip.pickup_latitude,
        pickup_lng: trip.pickup_longitude,
        max_distance_km: 50, // Very generous distance
        max_age_minutes: 1440 // 24 hours - very generous time
      });

      if (proximityError) {
        console.log('❌ Proximity function error:', proximityError.message);
      } else {
        console.log(`✅ Proximity function found ${nearbyDrivers?.length || 0} nearby drivers:`);
        nearbyDrivers?.forEach(driver => {
          console.log(`   - ${driver.driver_name}: ${driver.distance_km}km away (updated ${driver.last_updated})`);
        });
      }
    } catch (err) {
      console.log('❌ Proximity function not found or error:', err.message);
    }

    // Check 4: Driver availability flags
    console.log('\n⭐ 4. DRIVER AVAILABILITY FLAGS:');
    const { data: availabilityCheck } = await supabase
      .from('driver_profiles')
      .select('user_id, first_name, is_available, status, working_status')
      .eq('is_approved', true);

    console.log('Driver availability status:');
    availabilityCheck?.forEach(driver => {
      console.log(`   - ${driver.first_name}: available=${driver.is_available || 'N/A'}, status=${driver.status || 'N/A'}, working=${driver.working_status || 'N/A'}`);
    });

    // Check 5: Check if drivers have vehicles assigned
    console.log('\n🚗 5. DRIVER VEHICLE ASSIGNMENTS:');
    const { data: vehicleCheck } = await supabase
      .from('driver_profiles')
      .select(`
        user_id,
        first_name,
        driver_trucks (
          truck_id,
          status,
          trucks (
            id,
            model,
            truck_type_id
          )
        )
      `)
      .eq('is_approved', true);

    console.log('Driver vehicle assignments:');
    vehicleCheck?.forEach(driver => {
      const trucks = driver.driver_trucks || [];
      if (trucks.length === 0) {
        console.log(`   - ${driver.first_name}: ❌ NO VEHICLE ASSIGNED`);
      } else {
        trucks.forEach(assignment => {
          console.log(`   - ${driver.first_name}: ✅ ${assignment.trucks?.model || 'Unknown'} (status: ${assignment.status})`);
        });
      }
    });

    console.log('\n🎯 === AVAILABILITY DIAGNOSTIC COMPLETE ===');
    console.log('\nLikely issues:');
    console.log('1. Check if drivers have recent location updates');
    console.log('2. Check if drivers have is_available = true');
    console.log('3. Check if drivers have vehicles assigned');
    console.log('4. Check if proximity function criteria are too strict');

  } catch (error) {
    console.error('💥 Availability check failed:', error);
  }
}

// Run the test
checkDriverAvailability();
