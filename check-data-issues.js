const { createClient } = require('@supabase/supabase-js');

const serviceSupabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

async function checkDataIssues() {
  console.log('🔍 Checking for data validation issues...');
  
  // Check Laila's data specifically
  const { data: lailaProfiles, error } = await serviceSupabase
    .from('driver_profiles')
    .select('*')
    .ilike('first_name', '%Laila%');
    
  if (error) {
    console.error('❌ Error fetching Laila profiles:', error);
    return;
  }
  
  console.log(`\n📊 Found ${lailaProfiles.length} profiles for Laila:`);
  
  lailaProfiles.forEach(profile => {
    console.log(`\n- Profile ID: ${profile.id}`);
    console.log(`  User ID: ${profile.user_id}`);
    console.log(`  Name: ${profile.first_name} ${profile.last_name}`);
    console.log(`  Vehicle Plate: ${profile.vehicle_plate || 'NULL'}`);
    console.log(`  Vehicle Model: ${profile.vehicle_model || 'NULL'}`);
    console.log(`  Max Payload: ${profile.vehicle_max_payload || 'NULL'}`);
    console.log(`  Max Volume: ${profile.vehicle_max_volume || 'NULL'}`);
    
    // Validation checks
    const issues = [];
    if (!profile.vehicle_plate) issues.push('vehicle_plate IS NULL');
    if (!profile.vehicle_model) issues.push('vehicle_model IS NULL');
    if (!profile.vehicle_max_payload) issues.push('vehicle_max_payload IS NULL');
    if (!profile.vehicle_max_volume) issues.push('vehicle_max_volume IS NULL');
    
    if (profile.vehicle_model) {
      const makePart = profile.vehicle_model.split(' ')[0];
      if (!makePart || makePart === '') issues.push('make will be empty');
    }
    
    console.log(`  Issues: ${issues.length > 0 ? issues.join(', ') : 'DATA_LOOKS_GOOD'}`);
  });
  
  // Check recent failed registrations
  console.log('\n🔍 Checking recent user registrations without profiles...');
  
  const { data: recentUsers } = await serviceSupabase
    .from('users')
    .select('id, email, role, created_at')
    .eq('role', 'driver')
    .order('created_at', { ascending: false })
    .limit(5);
    
  for (const user of recentUsers) {
    const { data: profile } = await serviceSupabase
      .from('driver_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();
      
    if (!profile) {
      console.log(`❌ User ${user.id} (${user.email}) has NO driver profile - registration failed!`);
    } else {
      console.log(`✅ User ${user.id} (${user.email}) has profile ${profile.id}`);
    }
  }
}

checkDataIssues().catch(console.error);
