const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pjbbtmuhlpscmrbgsyzb.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8');

async function checkTruckTypesTable() {
  try {
    console.log('🚛 Checking truck_types table...');
    const { data: truckTypes, error } = await supabase
      .from('truck_types')
      .select('*');
    
    if (error) {
      console.error('Error:', error);
    } else {
      console.log('Available truck types:');
      truckTypes.forEach((truck, i) => {
        console.log(`${i + 1}. ${truck.name} (ID: ${truck.id.substring(0, 8)})`);
        console.log(`   - Capacity: ${truck.capacity_tons} tons`);
        console.log(`   - Description: ${truck.description}`);
        console.log('');
      });
      
      // Now check a specific trip requirement
      console.log('🔍 Checking specific trip requirement...');
      const { data: trips, error: tripError } = await supabase
        .from('trip_requests')
        .select('id, material_type, required_truck_type_id, estimated_weight_tons')
        .limit(1);
        
      if (trips && trips.length > 0) {
        const trip = trips[0];
        const requiredTruckType = truckTypes.find(t => t.id === trip.required_truck_type_id);
        
        console.log('Sample trip requirements:');
        console.log('- Material:', trip.material_type);
        console.log('- Weight:', trip.estimated_weight_tons, 'tons');
        console.log('- Required truck type:', requiredTruckType ? requiredTruckType.name : 'Unknown');
        
        // Check if driver's preferred types match
        const { data: drivers, error: driverError } = await supabase
          .from('driver_profiles')
          .select('preferred_truck_types, specializations')
          .limit(1);
          
        if (drivers && drivers.length > 0) {
          const driver = drivers[0];
          const canAcceptTrip = driver.preferred_truck_types.includes(requiredTruckType?.name);
          console.log('\nDriver compatibility:');
          console.log('- Driver preferred types:', driver.preferred_truck_types);
          console.log('- Can accept this trip:', canAcceptTrip ? '✅ YES' : '❌ NO');
        }
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}
checkTruckTypesTable();
