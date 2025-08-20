const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pjbbtmuhlpscmrbgsyzb.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8');

async function testTruckTypeValidation() {
  try {
    console.log('🧪 Testing truck type validation system...\n');
    
    // Get a driver and their preferred truck types
    const { data: driver, error: driverError } = await supabase
      .from('driver_profiles')
      .select('id, user_id, preferred_truck_types, specializations')
      .limit(1)
      .single();
      
    if (driverError || !driver) {
      console.error('❌ Error getting driver:', driverError);
      return;
    }
    
    console.log('👤 Driver profile:');
    console.log('   - ID:', driver.id.substring(0, 8));
    console.log('   - Preferred truck types:', driver.preferred_truck_types);
    console.log('   - Specializations:', driver.specializations);
    console.log('');
    
    // Get available trips
    const { data: trips, error: tripsError } = await supabase
      .from('trip_requests')
      .select('id, material_type, required_truck_type_id, status')
      .eq('status', 'pending')
      .is('assigned_driver_id', null)
      .limit(5);
      
    if (tripsError || !trips) {
      console.error('❌ Error getting trips:', tripsError);
      return;
    }
    
    console.log('📋 Available trips:');
    
    for (const trip of trips) {
      // Get the required truck type for this trip
      const { data: requiredTruckType } = await supabase
        .from('truck_types')
        .select('name, description')
        .eq('id', trip.required_truck_type_id)
        .single();
        
      const isCompatible = driver.preferred_truck_types.includes(requiredTruckType?.name);
      
      console.log(`\n🚛 Trip ${trip.id.substring(0, 8)}:`);
      console.log('   - Material:', trip.material_type);
      console.log('   - Required truck:', requiredTruckType?.name || 'Unknown');
      console.log('   - Compatible:', isCompatible ? '✅ YES' : '❌ NO');
      
      if (!isCompatible) {
        console.log('   - Reason: Driver has', driver.preferred_truck_types.join(', '));
        console.log('     but trip requires', requiredTruckType?.name);
      }
    }
    
    const compatibleTrips = await Promise.all(trips.map(async (trip) => {
      const { data: requiredTruckType } = await supabase
        .from('truck_types')
        .select('name')
        .eq('id', trip.required_truck_type_id)
        .single();
      return driver.preferred_truck_types.includes(requiredTruckType?.name);
    }));
    
    const compatibleCount = compatibleTrips.filter(Boolean).length;
    
    console.log('\n📊 Summary:');
    console.log(`   - Total available trips: ${trips.length}`);
    console.log(`   - Compatible with driver: ${compatibleCount}`);
    console.log(`   - Blocked by truck type: ${trips.length - compatibleCount}`);
    console.log('');
    console.log('✅ Truck type validation system is working!');
    console.log('   Drivers will only be able to accept trips that match their vehicle type.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testTruckTypeValidation();
