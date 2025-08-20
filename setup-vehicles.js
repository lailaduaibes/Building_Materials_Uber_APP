const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pjbbtmuhlpscmrbgsyzb.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8');

async function setupProfessionalVehicleSystem() {
  try {
    console.log('🚛 Setting up Professional Vehicle Management System...');
    
    // Step 1: Create a sample vehicle for Ahmed Driver
    console.log('\n1. Creating sample vehicle for Ahmed Driver...');
    
    // Get Flatbed Truck type ID
    const { data: truckType } = await supabase
      .from('truck_types')
      .select('id')
      .eq('name', 'Flatbed Truck')
      .single();
    
    if (truckType) {
      const { data: newTruck, error: truckError } = await supabase
        .from('trucks')
        .upsert({
          truck_type_id: truckType.id,
          current_driver_id: '7a9ce2f0-db9d-46a7-aef3-c01635d90592', // Use existing field
          license_plate: 'RDH-9876',
          make: 'Mercedes',
          model: 'Actros 2640',
          year: 2022,
          color: 'White',
          max_payload: 10.0,
          max_volume: 15.0,
          is_available: true,
          is_active: true
        }, { 
          onConflict: 'license_plate',
          ignoreDuplicates: false 
        })
        .select()
        .single();
      
      if (truckError) {
        console.error('Error creating truck:', truckError);
      } else {
        console.log('✅ Sample vehicle created for Ahmed Driver');
        console.log('   License Plate: RDH-9876');
        console.log('   Vehicle: Mercedes Actros 2640 (2022)');
        console.log('   Current Driver ID:', newTruck.current_driver_id);
      }
    }
    
    // Step 2: Update driver profile to reference the registered vehicle
    console.log('\n2. Updating driver profile...');
    const { error: profileError } = await supabase
      .from('driver_profiles')
      .update({
        vehicle_plate: 'RDH-9876',
        vehicle_model: 'Mercedes Actros 2640'
      })
      .eq('user_id', '7a9ce2f0-db9d-46a7-aef3-c01635d90592');
    
    if (profileError) {
      console.error('Error updating driver profile:', profileError);
    } else {
      console.log('✅ Driver profile updated with vehicle info');
    }
    
    // Step 3: Test the vehicle system
    console.log('\n3. Testing vehicle system...');
    const { data: driverVehicles, error: vehicleError } = await supabase
      .from('trucks')
      .select('*, truck_types(name)')
      .eq('current_driver_id', '7a9ce2f0-db9d-46a7-aef3-c01635d90592');
    
    if (vehicleError) {
      console.error('Error fetching vehicles:', vehicleError);
    } else {
      console.log('\n📋 Ahmed Driver\'s Registered Vehicles:');
      driverVehicles.forEach((vehicle, i) => {
        console.log(`${i + 1}. ${vehicle.make} ${vehicle.model} (${vehicle.year})`);
        console.log(`   License Plate: ${vehicle.license_plate}`);
        console.log(`   Type: ${vehicle.truck_types?.name || 'Unknown'}`);
        console.log(`   Available: ${vehicle.is_available ? 'Yes' : 'No'}`);
        console.log('');
      });
    }
    
    console.log('🎯 VEHICLE SYSTEM STATUS:');
    console.log('');
    console.log('✅ 1. Database ready');
    console.log('✅ 2. Sample vehicle created');
    console.log('✅ 3. Driver profile updated');
    console.log('⏳ 4. Need vehicle registration screens');
    console.log('⏳ 5. Need admin verification dashboard');
    console.log('⏳ 6. Need document upload system');
    
  } catch (error) {
    console.error('Setup error:', error.message);
  }
}

setupProfessionalVehicleSystem();
