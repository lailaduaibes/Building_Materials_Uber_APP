const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pjbbtmuhlpscmrbgsyzb.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8');

async function checkTruckTypes() {
  try {
    console.log('🚛 Checking trip request structure...');
    const { data: trips, error } = await supabase
      .from('trip_requests')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error:', error);
    } else if (trips.length > 0) {
      console.log('Trip request fields with truck/vehicle/type:');
      Object.keys(trips[0]).forEach(key => {
        if (key.includes('truck') || key.includes('vehicle') || key.includes('type') || key.includes('capacity') || key.includes('weight')) {
          console.log('- ' + key + ':', trips[0][key]);
        }
      });
      
      console.log('\n👤 Checking driver profile structure...');
      const { data: drivers, error: driverError } = await supabase
        .from('driver_profiles')
        .select('*')
        .limit(1);
        
      if (drivers && drivers.length > 0) {
        console.log('Driver profile fields with truck/vehicle/type:');
        Object.keys(drivers[0]).forEach(key => {
          if (key.includes('truck') || key.includes('vehicle') || key.includes('type') || key.includes('preferred') || key.includes('capacity')) {
            console.log('- ' + key + ':', drivers[0][key]);
          }
        });
      }
      
      console.log('\n🔍 Sample trip data:');
      console.log('Material type:', trips[0].material_type);
      console.log('Equipment required:', trips[0].equipment_required);
      
      console.log('\n🔍 Sample driver data:');
      if (drivers && drivers.length > 0) {
        console.log('Preferred truck types:', drivers[0].preferred_truck_types);
        console.log('Specializations:', drivers[0].specializations);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}
checkTruckTypes();
