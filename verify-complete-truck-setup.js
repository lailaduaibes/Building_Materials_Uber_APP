const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTruckAssignment() {
  console.log('🔍 Verifying truck assignment for driver nanduaibes@gmail.com...\n');

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

    console.log(`✅ User: ${user.name} (ID: ${user.id})`);

    // Get driver profile
    const { data: driver } = await supabase
      .from('driver_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    console.log(`✅ Driver Profile: Approved=${driver.approved}, Available=${driver.available}`);
    console.log(`   License Plate: ${driver.license_plate}`);
    console.log(`   Vehicle: ${driver.vehicle_model} ${driver.vehicle_year}`);
    console.log(`   Capacity: ${driver.max_payload}kg, ${driver.max_volume}m³`);

    // Check trucks table
    console.log('\n🚛 Checking trucks table...');
    const { data: assignedTrucks } = await supabase
      .from('trucks')
      .select('*')
      .eq('current_driver_id', user.id);

    if (assignedTrucks && assignedTrucks.length > 0) {
      assignedTrucks.forEach((truck, index) => {
        console.log(`✅ Truck ${index + 1}:`);
        console.log(`   ID: ${truck.id}`);
        console.log(`   License Plate: ${truck.license_plate}`);
        console.log(`   Make/Model: ${truck.make} ${truck.model}`);
        console.log(`   Year: ${truck.year}`);
        console.log(`   Status: ${truck.status}`);
        console.log(`   Max Payload: ${truck.max_payload_kg}kg`);
        console.log(`   Max Volume: ${truck.max_volume_m3}m³`);
        console.log(`   Assigned Driver: ${truck.current_driver_id}`);
      });
    } else {
      console.log('❌ No trucks assigned to this driver');
    }

    // Check truck_types table
    console.log('\n🏷️ Checking truck_types table...');
    const { data: truckTypes } = await supabase
      .from('truck_types')
      .select('*');

    if (truckTypes && truckTypes.length > 0) {
      console.log(`✅ Found ${truckTypes.length} truck types:`);
      truckTypes.forEach((type, index) => {
        console.log(`   ${index + 1}. ${type.name}`);
        console.log(`      Max Payload: ${type.max_payload_kg}kg`);
        console.log(`      Max Volume: ${type.max_volume_m3}m³`);
        if (type.equipment_types) {
          console.log(`      Equipment: ${type.equipment_types.join(', ')}`);
        }
      });
    } else {
      console.log('⚠️ No truck types found');
    }

    // Check if driver's truck matches any truck type
    if (assignedTrucks && assignedTrucks.length > 0 && truckTypes && truckTypes.length > 0) {
      console.log('\n🔍 Checking truck type compatibility...');
      const driverTruck = assignedTrucks[0];
      
      const compatibleTypes = truckTypes.filter(type => 
        driverTruck.max_payload_kg <= type.max_payload_kg &&
        driverTruck.max_volume_m3 <= type.max_volume_m3
      );

      if (compatibleTypes.length > 0) {
        console.log(`✅ Driver's truck is compatible with ${compatibleTypes.length} truck types:`);
        compatibleTypes.forEach(type => {
          console.log(`   - ${type.name} (${type.max_payload_kg}kg, ${type.max_volume_m3}m³)`);
        });
      } else {
        console.log('⚠️ Driver\'s truck doesn\'t match any existing truck types');
      }
    }

    // Check for any orders that could be assigned
    console.log('\n📦 Checking for available orders...');
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'pending')
      .limit(5);

    if (orders && orders.length > 0) {
      console.log(`✅ Found ${orders.length} pending orders that could be assigned`);
      orders.forEach((order, index) => {
        console.log(`   Order ${index + 1}: ${order.id} - Status: ${order.status}`);
      });
    } else {
      console.log('⚠️ No pending orders found');
    }

    // Summary
    console.log('\n🎯 TRUCK FUNCTIONALITY SUMMARY:');
    console.log('=====================================');
    console.log(`✅ Driver Status: ${driver.approved ? 'Approved' : 'Pending'} & ${driver.available ? 'Available' : 'Unavailable'}`);
    console.log(`✅ Truck Assignment: ${assignedTrucks && assignedTrucks.length > 0 ? 'SUCCESS' : 'FAILED'}`);
    console.log(`✅ Truck Types Setup: ${truckTypes && truckTypes.length > 0 ? 'CONFIGURED' : 'MISSING'}`);
    console.log(`✅ Ready for Orders: ${assignedTrucks && assignedTrucks.length > 0 && driver.approved && driver.available ? 'YES' : 'NO'}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyTruckAssignment();
