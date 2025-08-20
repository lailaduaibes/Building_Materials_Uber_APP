const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pjbbtmuhlpscmrbgsyzb.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8');

async function checkDriverTruckTypes() {
  try {
    const driverId = '7a9ce2f0-db9d-46a7-aef3-c01635d90592';
    
    const { data: driver, error } = await supabase
      .from('driver_profiles')
      .select('first_name, last_name, preferred_truck_types')
      .eq('user_id', driverId)
      .single();
    
    if (error) {
      console.error('Error getting driver:', error);
      return;
    }
    
    console.log('🚛 Driver Vehicle Control Information');
    console.log('=====================================');
    console.log('Driver:', driver.first_name, driver.last_name);
    console.log('Database Field: preferred_truck_types');
    console.log('Current Value:', JSON.stringify(driver.preferred_truck_types, null, 2));
    console.log('');
    
    const { data: allTruckTypes, error: typesError } = await supabase
      .from('truck_types')
      .select('name, description')
      .order('name');
      
    if (!typesError) {
      console.log('🚚 Available Truck Types in Database:');
      console.log('=====================================');
      allTruckTypes.forEach((type, i) => {
        const isDriverType = driver.preferred_truck_types?.includes(type.name);
        console.log(`${i + 1}. ${type.name} ${isDriverType ? '✅ (Driver can drive)' : '❌ (Driver cannot drive)'}`);
        console.log(`   Description: ${type.description}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}
checkDriverTruckTypes();
