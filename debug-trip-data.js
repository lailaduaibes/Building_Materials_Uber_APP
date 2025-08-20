const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pjbbtmuhlpscmrbgsyzb.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8');

async function debugTripData() {
  try {
    console.log('🔍 Debugging trip data and truck type compatibility...\n');
    
    // Get available trips (ones that would show up in the driver dashboard)
    const { data: trips, error: tripsError } = await supabase
      .from('trip_requests')
      .select('id, material_type, required_truck_type_id, status, assigned_driver_id')
      .eq('status', 'pending')
      .is('assigned_driver_id', null)
      .limit(3);
      
    if (tripsError || !trips) {
      console.error('❌ Error getting trips:', tripsError);
      return;
    }
    
    console.log(`📋 Found ${trips.length} available trips:\n`);
    
    for (const trip of trips) {
      console.log(`🚛 Trip ID: ${trip.id}`);
      console.log(`   - Material: ${trip.material_type}`);
      console.log(`   - Status: ${trip.status}`);
      console.log(`   - Required Truck Type ID: ${trip.required_truck_type_id || 'NULL'}`);
      
      if (trip.required_truck_type_id) {
        // Look up the truck type
        const { data: truckType, error: truckError } = await supabase
          .from('truck_types')
          .select('name, description')
          .eq('id', trip.required_truck_type_id)
          .single();
          
        if (truckError) {
          console.log(`   - Truck Type Lookup: ❌ ERROR - ${truckError.message}`);
        } else if (truckType) {
          console.log(`   - Required Truck Type: ${truckType.name}`);
          console.log(`   - Description: ${truckType.description}`);
        } else {
          console.log(`   - Truck Type Lookup: ❌ Not found`);
        }
      } else {
        console.log(`   - Required Truck Type: ⚠️ None specified`);
      }
      
      console.log('');
    }
    
    // Get driver truck types
    console.log('👤 Driver truck types:');
    const { data: driver, error: driverError } = await supabase
      .from('driver_profiles')
      .select('id, preferred_truck_types, specializations')
      .limit(1)
      .single();
      
    if (driverError || !driver) {
      console.log('❌ Error getting driver:', driverError);
    } else {
      console.log(`   - Driver ID: ${driver.id.substring(0, 8)}`);
      console.log(`   - Preferred Truck Types: ${driver.preferred_truck_types?.join(', ') || 'None'}`);
      console.log(`   - Specializations: ${driver.specializations?.join(', ') || 'None'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugTripData();
