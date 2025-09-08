const { createClient } = require('@supabase/supabase-js');

// PRODUCTION DATABASE
const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

async function thoroughDriverCheck() {
  console.log('🔍 THOROUGH DRIVER CHECK - Finding the real issue...');
  
  try {
    // Check 1: Raw driver_profiles count
    console.log('\n1️⃣ Checking driver_profiles table...');
    const { count: profileCount, error: countError } = await supabase
      .from('driver_profiles')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error counting driver_profiles:', countError);
    } else {
      console.log('📊 Total driver_profiles records:', profileCount);
    }
    
    // Check 2: Get all driver profiles with details
    const { data: allDrivers, error: allError } = await supabase
      .from('driver_profiles')
      .select('user_id, driver_name, approval_status, phone_number')
      .limit(10);
    
    if (allError) {
      console.error('❌ Error fetching drivers:', allError);
    } else {
      console.log('📋 Driver profiles found:', allDrivers?.length || 0);
      if (allDrivers && allDrivers.length > 0) {
        allDrivers.forEach((driver, index) => {
          console.log(`  ${index + 1}. ${driver.driver_name} - ${driver.approval_status} (${driver.user_id})`);
        });
      }
    }
    
    // Check 3: Specifically check for approved drivers
    console.log('\n2️⃣ Checking APPROVED drivers...');
    const { data: approvedDrivers, error: approvedError } = await supabase
      .from('driver_profiles')
      .select('user_id, driver_name, approval_status')
      .eq('approval_status', 'approved');
    
    if (approvedError) {
      console.error('❌ Error fetching approved drivers:', approvedError);
    } else {
      console.log('✅ Approved drivers found:', approvedDrivers?.length || 0);
      if (approvedDrivers && approvedDrivers.length > 0) {
        approvedDrivers.forEach((driver, index) => {
          console.log(`  ${index + 1}. ${driver.driver_name} (${driver.user_id})`);
        });
      }
    }
    
    // Check 4: Check driver_locations for approved drivers
    console.log('\n3️⃣ Checking locations for approved drivers...');
    const { data: locationsData, error: locError } = await supabase
      .from('driver_locations')
      .select('driver_id, latitude, longitude, updated_at')
      .order('updated_at', { ascending: false });
    
    if (locError) {
      console.error('❌ Error fetching locations:', locError);
    } else {
      console.log('📍 Driver locations found:', locationsData?.length || 0);
      if (locationsData && locationsData.length > 0) {
        locationsData.forEach((location, index) => {
          const hoursAgo = Math.round((new Date() - new Date(location.updated_at)) / (1000 * 60 * 60));
          console.log(`  ${index + 1}. Driver ${location.driver_id}: ${location.latitude}, ${location.longitude} (${hoursAgo}h ago)`);
        });
      }
    }
    
    // Check 5: Test if ANY drivers would be found with very lenient criteria
    console.log('\n4️⃣ Testing find_nearby_available_drivers with VERY lenient criteria...');
    const { data: veryLenient, error: lenientError } = await supabase.rpc('find_nearby_available_drivers', {
      pickup_lat: 32.38882,
      pickup_lng: 35.32197,
      max_distance_km_param: 10000, // 10,000 km (should include everyone)
      min_updated_minutes_param: 525600, // 1 year
      required_truck_type_id_param: null
    });
    
    if (lenientError) {
      console.error('❌ Very lenient search failed:', lenientError.message);
    } else {
      console.log('🌍 Drivers found with very lenient search:', veryLenient?.length || 0);
      if (veryLenient && veryLenient.length > 0) {
        veryLenient.forEach((driver, index) => {
          console.log(`  ${index + 1}. Driver ${driver.driver_id} - ${driver.distance_km}km away (Rating: ${driver.rating || 'N/A'})`);
        });
      }
    }
    
    // Check 6: Manual join to see what's happening
    console.log('\n5️⃣ Manual JOIN to see approved drivers with locations...');
    const { data: manualJoin, error: joinError } = await supabase
      .from('driver_profiles')
      .select(`
        user_id,
        driver_name,
        approval_status,
        driver_locations!inner(
          latitude,
          longitude,
          updated_at
        )
      `)
      .eq('approval_status', 'approved');
    
    if (joinError) {
      console.error('❌ Manual join failed:', joinError);
    } else {
      console.log('🔗 Approved drivers WITH locations:', manualJoin?.length || 0);
      if (manualJoin && manualJoin.length > 0) {
        manualJoin.forEach((driver, index) => {
          const location = driver.driver_locations;
          const hoursAgo = Math.round((new Date() - new Date(location.updated_at)) / (1000 * 60 * 60));
          console.log(`  ${index + 1}. ${driver.driver_name}: ${location.latitude}, ${location.longitude} (${hoursAgo}h ago)`);
        });
      }
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

thoroughDriverCheck();
