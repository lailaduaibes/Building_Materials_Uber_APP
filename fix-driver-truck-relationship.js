const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixDriverTruckRelationship() {
  console.log('🔧 Fixing driver-truck relationship for nanduaibes@gmail.com...\n');

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

    console.log(`✅ User: ${user.name || user.email} (ID: ${user.id})`);

    // Get current driver profile
    const { data: driverProfile } = await supabase
      .from('driver_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!driverProfile) {
      console.log('❌ Driver profile not found');
      return;
    }

    console.log(`📋 Current driver profile:`);
    console.log(`   Driver ID: ${driverProfile.id}`);
    console.log(`   Current Truck ID: ${driverProfile.current_truck_id || 'NULL ❌'}`);
    console.log(`   License Plate: ${driverProfile.license_plate}`);

    // Find truck assigned to this driver
    const { data: assignedTruck } = await supabase
      .from('trucks')
      .select('*')
      .eq('current_driver_id', user.id)
      .single();

    if (!assignedTruck) {
      console.log('❌ No truck found assigned to this driver');
      return;
    }

    console.log(`\n🚛 Found assigned truck:`);
    console.log(`   Truck ID: ${assignedTruck.id}`);
    console.log(`   License Plate: ${assignedTruck.license_plate}`);
    console.log(`   Current Driver ID: ${assignedTruck.current_driver_id}`);

    // Update driver profile with truck ID
    console.log(`\n🔧 Updating driver profile with truck ID...`);
    const { data: updateResult, error: updateError } = await supabase
      .from('driver_profiles')
      .update({ current_truck_id: assignedTruck.id })
      .eq('user_id', user.id)
      .select();

    if (updateError) {
      console.log('❌ Failed to update driver profile:', updateError.message);
      console.log('Error details:', updateError);
    } else {
      console.log('✅ Driver profile updated successfully!');
      console.log('Updated profile:', updateResult[0]);
    }

    // Verify the fix
    console.log(`\n🎯 Verification after fix:`);
    const { data: updatedProfile } = await supabase
      .from('driver_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    const { data: verifyTruck } = await supabase
      .from('trucks')
      .select('*')
      .eq('current_driver_id', user.id)
      .single();

    console.log(`✅ Driver Profile - Current Truck ID: ${updatedProfile.current_truck_id || 'NULL'}`);
    console.log(`✅ Truck - Current Driver ID: ${verifyTruck.current_driver_id || 'NULL'}`);
    
    if (updatedProfile.current_truck_id === verifyTruck.id && verifyTruck.current_driver_id === user.id) {
      console.log(`\n🎉 SUCCESS: Driver-Truck relationship is now properly synchronized!`);
      console.log(`   Driver ${user.email} ↔ Truck ${verifyTruck.license_plate}`);
    } else {
      console.log(`\n❌ ISSUE: Relationship still not properly synchronized`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixDriverTruckRelationship();
