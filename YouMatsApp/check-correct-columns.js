const { createClient } = require('@supabase/supabase-js');

// PRODUCTION DATABASE
const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

async function checkCorrectColumns() {
  console.log('🔍 Finding the CORRECT column names...');
  
  try {
    // Get one driver record to see the actual columns
    console.log('\n📋 Getting sample driver_profiles record...');
    const { data: sampleDriver, error: sampleError } = await supabase
      .from('driver_profiles')
      .select('*')
      .limit(1)
      .single();
    
    if (sampleError) {
      console.error('❌ Error getting sample:', sampleError);
    } else {
      console.log('✅ Sample driver_profiles record:');
      console.log(sampleDriver);
      console.log('\\n📝 Available columns:', Object.keys(sampleDriver).join(', '));
    }
    
    // Get all drivers with correct columns
    console.log('\\n👥 Getting all drivers with correct columns...');
    const { data: allDrivers, error: allError } = await supabase
      .from('driver_profiles')
      .select('*');
    
    if (allError) {
      console.error('❌ Error getting all drivers:', allError);
    } else {
      console.log('📊 Total drivers found:', allDrivers?.length || 0);
      if (allDrivers && allDrivers.length > 0) {
        allDrivers.forEach((driver, index) => {
          // Use the actual column names we discover
          const name = driver.name || driver.full_name || driver.first_name || 'Unknown';
          const status = driver.approval_status || driver.status || 'Unknown';
          console.log(`  ${index + 1}. ${name} - Status: ${status} (ID: ${driver.user_id})`);
        });
      }
    }
    
    // Now test with correct approved drivers
    console.log('\\n🔍 Finding approved drivers...');
    const approvedDrivers = allDrivers?.filter(driver => 
      driver.approval_status === 'approved' || 
      driver.status === 'approved'
    ) || [];
    
    console.log('✅ Approved drivers:', approvedDrivers.length);
    approvedDrivers.forEach((driver, index) => {
      const name = driver.name || driver.full_name || driver.first_name || 'Unknown';
      console.log(`  ${index + 1}. ${name} (${driver.user_id})`);
    });
    
    // Check locations for these approved drivers
    console.log('\\n📍 Checking locations for approved drivers...');
    for (const driver of approvedDrivers) {
      const { data: locations } = await supabase
        .from('driver_locations')
        .select('latitude, longitude, updated_at')
        .eq('driver_id', driver.user_id)
        .order('updated_at', { ascending: false })
        .limit(1);
      
      if (locations && locations.length > 0) {
        const location = locations[0];
        const hoursAgo = Math.round((new Date() - new Date(location.updated_at)) / (1000 * 60 * 60));
        const name = driver.name || driver.full_name || driver.first_name || 'Unknown';
        console.log(`  ✅ ${name}: ${location.latitude}, ${location.longitude} (${hoursAgo}h ago)`);
      } else {
        const name = driver.name || driver.full_name || driver.first_name || 'Unknown';
        console.log(`  ❌ ${name}: NO LOCATION DATA`);
      }
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkCorrectColumns();
