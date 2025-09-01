const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixTruckAssignment() {
  console.log('🔧 Fixing truck assignment for driver nanduaibes@gmail.com...\n');

  try {
    // Get user info
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'nanduaibes@gmail.com')
      .single();

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log(`✅ User found: ${user.name} (ID: ${user.id})`);

    // Get driver profile
    const { data: driver } = await supabase
      .from('driver_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!driver) {
      console.log('❌ Driver profile not found');
      return;
    }

    console.log(`✅ Driver profile found with license plate: ${driver.license_plate}`);

    // Check trucks table structure
    console.log('\n🔍 Checking trucks table structure...');
    const { data: trucksInfo, error: trucksError } = await supabase
      .from('trucks')
      .select('*')
      .limit(1);

    if (trucksError) {
      console.log('❌ Error checking trucks table:', trucksError.message);
    } else {
      console.log('✅ Trucks table accessible');
      if (trucksInfo.length > 0) {
        console.log('📋 Trucks table columns:', Object.keys(trucksInfo[0]));
      }
    }

    // Find truck with matching license plate
    const { data: existingTruck } = await supabase
      .from('trucks')
      .select('*')
      .eq('license_plate', driver.license_plate)
      .single();

    if (existingTruck) {
      console.log('\n🚛 Found existing truck:', existingTruck);
      
      // Try to update the truck assignment
      console.log('\n🔧 Attempting to assign driver to existing truck...');
      const { data: updateResult, error: updateError } = await supabase
        .from('trucks')
        .update({ current_driver_id: user.id })
        .eq('id', existingTruck.id)
        .select();

      if (updateError) {
        console.log('❌ Failed to update truck assignment:', updateError.message);
        console.log('Error details:', updateError);
        
        // Check if the user ID exists in users table
        console.log('\n🔍 Verifying user ID exists in users table...');
        const { data: userCheck } = await supabase
          .from('users')
          .select('id, email, role')
          .eq('id', user.id);
        
        console.log('User verification result:', userCheck);
        
      } else {
        console.log('✅ Truck successfully assigned to driver!');
        console.log('Update result:', updateResult);
      }
    } else {
      console.log('\n🏗️ No existing truck found, creating new truck...');
      
      // Create new truck for this driver
      const newTruck = {
        license_plate: driver.license_plate,
        make: driver.vehicle_model || 'BMW',
        model: driver.vehicle_model || 'BMW',
        year: driver.vehicle_year || 2020,
        max_payload_kg: driver.max_payload || 10,
        max_volume_m3: driver.max_volume || 22,
        status: 'available',
        current_driver_id: user.id
      };

      const { data: newTruckResult, error: createError } = await supabase
        .from('trucks')
        .insert(newTruck)
        .select();

      if (createError) {
        console.log('❌ Failed to create new truck:', createError.message);
        console.log('Error details:', createError);
      } else {
        console.log('✅ New truck created successfully!');
        console.log('New truck:', newTruckResult[0]);
      }
    }

    // Final verification
    console.log('\n🎯 Final verification...');
    const { data: finalTruck } = await supabase
      .from('trucks')
      .select('*')
      .eq('current_driver_id', user.id);

    if (finalTruck && finalTruck.length > 0) {
      console.log('✅ Driver now has truck assigned:', finalTruck[0]);
    } else {
      console.log('❌ Driver still has no truck assigned');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixTruckAssignment();
