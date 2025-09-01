// Fix bidirectional truck-driver relationships
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const serviceSupabase = createClient(supabaseUrl, serviceRoleKey);

async function fixBidirectionalRelationships() {
  try {
    console.log('🔧 Fixing bidirectional truck-driver relationships...\n');
    
    // Get all trucks with assigned drivers
    const { data: trucks, error: trucksError } = await serviceSupabase
      .from('trucks')
      .select('id, license_plate, current_driver_id')
      .not('current_driver_id', 'is', null);

    if (trucksError) {
      console.error('❌ Error fetching trucks:', trucksError);
      return;
    }

    console.log(`🚛 Found ${trucks.length} trucks with assigned drivers\n`);

    for (const truck of trucks) {
      console.log(`Processing truck ${truck.license_plate} (${truck.id})`);
      console.log(`Driver ID: ${truck.current_driver_id}`);

      // Check if driver has this truck set as current_truck_id
      const { data: driver, error: driverError } = await serviceSupabase
        .from('driver_profiles')
        .select('id, current_truck_id, first_name, last_name')
        .eq('user_id', truck.current_driver_id)
        .single();

      if (driverError) {
        console.log(`⚠️  Driver not found for truck ${truck.license_plate}`);
        continue;
      }

      if (driver.current_truck_id === truck.id) {
        console.log(`✅ Relationship already correct for ${driver.first_name} ${driver.last_name}`);
      } else {
        console.log(`🔄 Updating driver ${driver.first_name} ${driver.last_name} current_truck_id`);
        
        // Update driver's current_truck_id
        const { error: updateError } = await serviceSupabase
          .from('driver_profiles')
          .update({ current_truck_id: truck.id })
          .eq('user_id', truck.current_driver_id);

        if (updateError) {
          console.error(`❌ Failed to update driver: ${updateError.message}`);
        } else {
          console.log(`✅ Updated ${driver.first_name} ${driver.last_name} → truck ${truck.license_plate}`);
        }
      }
      console.log('---');
    }

    console.log('\n🎉 Bidirectional relationship sync completed!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixBidirectionalRelationships();
