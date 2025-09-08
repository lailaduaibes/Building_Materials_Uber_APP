const { createClient } = require('@supabase/supabase-js');

// PRODUCTION DATABASE
const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

async function debugDriverAvailability() {
  console.log('🔍 Debugging why no drivers are found...');
  
  try {
    // Get trip coordinates
    const { data: trip } = await supabase
      .from('trip_requests')
      .select('pickup_latitude, pickup_longitude, required_truck_type_id')
      .eq('id', 'e280b170-307a-44e2-b980-002b4a9504a3')
      .single();
    
    console.log('📍 Trip coordinates:', trip.pickup_latitude, trip.pickup_longitude);
    
    // Check if find_nearby_available_drivers function exists
    console.log('\n🧪 Testing find_nearby_available_drivers function...');
    const { data: nearbyDrivers, error: nearbyError } = await supabase.rpc('find_nearby_available_drivers', {
      pickup_lat: trip.pickup_latitude,
      pickup_lng: trip.pickup_longitude,
      max_distance_km_param: 100,
      min_updated_minutes_param: 1440, // 24 hours
      required_truck_type_id_param: trip.required_truck_type_id
    });
    
    if (nearbyError) {
      console.error('❌ find_nearby_available_drivers function ERROR:', nearbyError.message);
      console.log('🚨 This function might not exist or have wrong parameters!');
    } else {
      console.log('✅ find_nearby_available_drivers function works');
      console.log('📊 Nearby drivers found:', nearbyDrivers?.length || 0);
      
      if (nearbyDrivers && nearbyDrivers.length > 0) {
        console.log('🚗 Available drivers:');
        nearbyDrivers.forEach((driver, index) => {
          console.log(`  ${index + 1}. Driver ${driver.driver_id} - ${driver.distance_km}km away`);
        });
      } else {
        console.log('❌ NO DRIVERS FOUND - investigating why...');
      }
    }
    
    // Check driver_profiles table
    console.log('\n👥 Checking driver_profiles...');
    const { data: drivers } = await supabase
      .from('driver_profiles')
      .select('user_id, driver_name, approval_status')
      .limit(5);
    
    console.log('📊 Driver profiles found:', drivers?.length || 0);
    if (drivers && drivers.length > 0) {
      drivers.forEach(driver => {
        console.log(`  - ${driver.driver_name} (${driver.approval_status})`);
      });
    }
    
    // Check driver_locations table
    console.log('\n📍 Checking driver_locations...');
    const { data: locations } = await supabase
      .from('driver_locations')
      .select('driver_id, latitude, longitude, updated_at')
      .order('updated_at', { ascending: false })
      .limit(5);
    
    console.log('📊 Driver locations found:', locations?.length || 0);
    if (locations && locations.length > 0) {
      locations.forEach(location => {
        const hoursAgo = Math.round((new Date() - new Date(location.updated_at)) / (1000 * 60 * 60));
        console.log(`  - Driver ${location.driver_id}: ${location.latitude}, ${location.longitude} (${hoursAgo}h ago)`);
      });
    }
    
    // Manual driver availability check
    console.log('\n🔍 Manual driver availability check...');
    const { data: availableDrivers } = await supabase
      .from('driver_profiles')
      .select(`
        user_id,
        driver_name,
        approval_status,
        driver_locations(latitude, longitude, updated_at)
      `)
      .eq('approval_status', 'approved')
      .limit(10);
    
    console.log('📊 Approved drivers with locations:', availableDrivers?.length || 0);
    if (availableDrivers && availableDrivers.length > 0) {
      availableDrivers.forEach(driver => {
        const location = driver.driver_locations?.[0];
        if (location) {
          const hoursAgo = Math.round((new Date() - new Date(location.updated_at)) / (1000 * 60 * 60));
          console.log(`  ✅ ${driver.driver_name}: ${location.latitude}, ${location.longitude} (${hoursAgo}h ago)`);
        } else {
          console.log(`  ❌ ${driver.driver_name}: NO LOCATION DATA`);
        }
      });
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

debugDriverAvailability();
