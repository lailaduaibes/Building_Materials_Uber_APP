// Check recent truck records using service role client
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const serviceSupabase = createClient(supabaseUrl, serviceRoleKey);

async function checkRecentTrucks() {
  try {
    console.log('🚛 Checking recent truck records...\n');
    
    // Check recent trucks with truck type info
    const { data: trucks, error: trucksError } = await serviceSupabase
      .from('trucks')
      .select(`
        id,
        license_plate,
        make,
        model,
        year,
        max_payload,
        max_volume,
        current_driver_id,
        is_available,
        truck_type_id,
        created_at,
        truck_types (
          name,
          description
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (trucksError) {
      console.error('❌ Error fetching trucks:', trucksError);
      return;
    }

    if (!trucks || trucks.length === 0) {
      console.log('📭 No trucks found in database');
      return;
    }

    console.log(`📊 Found ${trucks.length} truck records:\n`);
    
    trucks.forEach((truck, index) => {
      const truckType = truck.truck_types || {};
      
      console.log(`${index + 1}. Truck ID: ${truck.id}`);
      console.log(`   License Plate: ${truck.license_plate}`);
      console.log(`   Vehicle: ${truck.make} ${truck.model} (${truck.year})`);
      console.log(`   Capacity: ${truck.max_payload}t payload, ${truck.max_volume}m³ volume`);
      console.log(`   Type: ${truckType.name || 'Unknown'}`);
      console.log(`   Driver ID: ${truck.current_driver_id || 'No driver assigned'}`);
      console.log(`   Available: ${truck.is_available ? 'Yes' : 'No'}`);
      console.log(`   Created: ${new Date(truck.created_at).toLocaleString()}`);
      console.log('   ---');
    });

    // Also check driver profiles with truck info
    console.log('\n🚛 Checking driver profiles with vehicle info...\n');
    
    const { data: drivers, error: driversError } = await serviceSupabase
      .from('driver_profiles')
      .select(`
        id,
        user_id,
        first_name,
        last_name,
        vehicle_model,
        vehicle_plate,
        vehicle_year,
        vehicle_max_payload,
        vehicle_max_volume,
        preferred_truck_types,
        approval_status,
        is_approved,
        current_truck_id,
        truck_added_to_fleet,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (driversError) {
      console.error('❌ Error fetching drivers:', driversError);
      return;
    }

    drivers.forEach((driver, index) => {
      console.log(`${index + 1}. Driver: ${driver.first_name} ${driver.last_name}`);
      console.log(`   Status: ${driver.approval_status} (Approved: ${driver.is_approved})`);
      console.log(`   Vehicle: ${driver.vehicle_model} (${driver.vehicle_plate})`);
      console.log(`   Truck Types: ${driver.preferred_truck_types}`);
      console.log(`   Current Truck ID: ${driver.current_truck_id || 'None'}`);
      console.log(`   Truck Added to Fleet: ${driver.truck_added_to_fleet || false}`);
      console.log(`   Registered: ${new Date(driver.created_at).toLocaleString()}`);
      console.log('   ---');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkRecentTrucks();
