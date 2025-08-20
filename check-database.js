const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkDatabase() {
  console.log('🔍 SUPABASE DATABASE OVERVIEW');
  console.log('==============================\n');
  
  try {
    // Check trip_requests table
    console.log('🚛 TRIP_REQUESTS TABLE:');
    const { data: trips, error: tripsError } = await supabase
      .from('trip_requests')
      .select('id, status, material_type, pickup_address, delivery_address, customer_id, assigned_driver_id, created_at, final_price, estimated_distance_km')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (tripsError) {
      console.error('❌ Error fetching trips:', tripsError);
    } else {
      console.log(`Found ${trips.length} recent trips:`);
      trips.forEach(trip => {
        console.log(`  📦 ${trip.id.substring(0,8)}: ${trip.status} | ${trip.material_type || 'N/A'} | $${trip.final_price || 0}`);
        console.log(`     Customer: ${trip.customer_id?.substring(0,8) || 'N/A'} | Driver: ${trip.assigned_driver_id?.substring(0,8) || 'None'}`);
        console.log(`     Distance: ${trip.estimated_distance_km || 'N/A'} km | Created: ${new Date(trip.created_at).toLocaleDateString()}`);
        console.log('');
      });
    }
    
    // Check users table
    console.log('👥 USERS TABLE:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, user_type, created_at')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
    } else {
      console.log(`Found ${users.length} recent users:`);
      users.forEach(user => {
        console.log(`  👤 ${user.id.substring(0,8)}: ${user.email} | ${user.user_type} | ${user.first_name || ''} ${user.last_name || ''}`);
        console.log(`     Joined: ${new Date(user.created_at).toLocaleDateString()}`);
      });
    }
    console.log('');
    
    // Check driver_profiles table
    console.log('🚗 DRIVER_PROFILES TABLE:');
    const { data: drivers, error: driversError } = await supabase
      .from('driver_profiles')
      .select('user_id, first_name, last_name, phone, vehicle_model, vehicle_plate, status, is_available, rating, total_trips, total_earnings')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (driversError) {
      console.error('❌ Error fetching drivers:', driversError);
    } else {
      console.log(`Found ${drivers.length} drivers:`);
      drivers.forEach(driver => {
        const fullName = `${driver.first_name || ''} ${driver.last_name || ''}`.trim();
        console.log(`  🚛 ${driver.user_id.substring(0,8)}: ${fullName} | ${driver.vehicle_model || 'No vehicle'} | Status: ${driver.status}`);
        console.log(`     Phone: ${driver.phone || 'N/A'} | Available: ${driver.is_available} | Rating: ${driver.rating || 'N/A'}`);
        console.log(`     Trips: ${driver.total_trips || 0} | Earnings: $${driver.total_earnings || 0}`);
      });
    }
    console.log('');
    
    // Check materials table
    console.log('🧱 MATERIALS TABLE:');
    const { data: materials, error: materialsError } = await supabase
      .from('materials')
      .select('id, name, category, price_per_unit, description, unit')
      .order('name')
      .limit(5);
    
    if (materialsError) {
      console.error('❌ Error fetching materials:', materialsError);
    } else {
      console.log(`Found ${materials.length} materials:`);
      if (materials.length === 0) {
        console.log('  ⚠️ Materials table is empty - needs to be populated');
      } else {
        materials.forEach(material => {
          console.log(`  🧱 ${material.name}: $${material.price_per_unit}/${material.unit || 'unit'} | ${material.category}`);
          console.log(`     ${material.description || 'No description'}`);
        });
      }
    }
    console.log('');
    
    // Summary stats
    console.log('📊 DATABASE SUMMARY:');
    const { count: tripCount } = await supabase
      .from('trip_requests')
      .select('*', { count: 'exact', head: true });
    
    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    const { count: driverCount } = await supabase
      .from('driver_profiles')
      .select('*', { count: 'exact', head: true });
    
    console.log(`Total Trips: ${tripCount || 0}`);
    console.log(`Total Users: ${userCount || 0}`);
    console.log(`Total Drivers: ${driverCount || 0}`);
    
  } catch (error) {
    console.error('💥 Error checking database:', error);
  }
}

checkDatabase();
