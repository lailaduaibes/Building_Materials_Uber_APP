const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testAdminDashboardFix() {
  console.log('🧪 Testing admin dashboard fix for driver-truck relationship...\n');

  try {
    // Check current state of all approved drivers
    const { data: approvedDrivers } = await supabase
      .from('driver_profiles')
      .select(`
        id,
        first_name,
        last_name,
        user_id,
        current_truck_id,
        vehicle_plate,
        is_approved,
        truck_added_to_fleet
      `)
      .eq('is_approved', true)
      .eq('truck_added_to_fleet', true);

    console.log(`📊 Found ${approvedDrivers?.length || 0} approved drivers with trucks:`);
    
    let correctCount = 0;
    let needsFixCount = 0;

    for (const driver of approvedDrivers || []) {
      // Check if they have a truck assigned
      const { data: truck } = await supabase
        .from('trucks')
        .select('id, license_plate')
        .eq('current_driver_id', driver.user_id)
        .single();

      const hasCorrectRelationship = driver.current_truck_id === truck?.id;
      
      console.log(`👤 ${driver.first_name} ${driver.last_name}:`);
      console.log(`   current_truck_id: ${driver.current_truck_id || 'NULL'}`);
      console.log(`   actual_truck_id: ${truck?.id || 'NO_TRUCK'}`);
      console.log(`   relationship: ${hasCorrectRelationship ? '✅ CORRECT' : '❌ NEEDS_FIX'}`);
      
      if (hasCorrectRelationship) {
        correctCount++;
      } else {
        needsFixCount++;
      }
    }

    console.log('\n🎯 SUMMARY:');
    console.log(`✅ Drivers with correct relationships: ${correctCount}`);
    console.log(`❌ Drivers needing fix: ${needsFixCount}`);
    
    if (needsFixCount === 0) {
      console.log('\n🎉 ALL DRIVERS ARE PROPERLY SYNCHRONIZED!');
      console.log('The admin dashboard fix is working correctly.');
    } else {
      console.log('\n⚠️ Some drivers still need relationship fixes.');
      console.log('These may be older drivers who were approved before the fix.');
    }

    // Test the new approval flow by checking the most recently approved driver
    console.log('\n🔍 Checking most recent approval (should demonstrate the fix):');
    const { data: recentDriver } = await supabase
      .from('driver_profiles')
      .select(`
        first_name,
        last_name,
        current_truck_id,
        approved_at,
        trucks!inner(id, license_plate)
      `)
      .eq('is_approved', true)
      .order('approved_at', { ascending: false })
      .limit(1);

    if (recentDriver && recentDriver.length > 0) {
      const driver = recentDriver[0];
      const truck = driver.trucks;
      const isNewFixWorking = driver.current_truck_id === truck.id;
      
      console.log(`👤 ${driver.first_name} ${driver.last_name} (most recent):`);
      console.log(`   Approved: ${driver.approved_at}`);
      console.log(`   Truck relationship: ${isNewFixWorking ? '✅ WORKING' : '❌ NOT_WORKING'}`);
      
      if (isNewFixWorking) {
        console.log('\n🎉 SUCCESS: The admin dashboard fix is working for new approvals!');
      } else {
        console.log('\n⚠️ The admin dashboard fix may need more testing with a new driver approval.');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAdminDashboardFix();
