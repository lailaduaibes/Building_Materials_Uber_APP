const { createClient } = require('@supabase/supabase-js');

const serviceSupabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

async function runLailaSQLChecks() {
  console.log('🔍 Running Laila\'s SQL validation checks...');
  
  // Check 1: LAILA_DATA_CHECK
  console.log('\n📊 LAILA_DATA_CHECK:');
  const { data: check1, error: error1 } = await serviceSupabase
    .rpc('exec_sql', { 
      sql: `
        SELECT 
            'LAILA_DATA_CHECK' as info,
            first_name,
            vehicle_plate,
            vehicle_model,
            SPLIT_PART(vehicle_model, ' ', 1) as make_part,
            SUBSTRING(vehicle_model FROM POSITION(' ' IN vehicle_model) + 1) as model_part,
            vehicle_max_payload,
            vehicle_max_volume,
            CASE 
                WHEN vehicle_plate IS NULL THEN 'vehicle_plate IS NULL'
                WHEN vehicle_model IS NULL THEN 'vehicle_model IS NULL'
                WHEN SPLIT_PART(vehicle_model, ' ', 1) = '' THEN 'make will be empty'
                WHEN vehicle_max_payload IS NULL THEN 'vehicle_max_payload IS NULL'
                WHEN vehicle_max_volume IS NULL THEN 'vehicle_max_volume IS NULL'
                ELSE 'DATA_LOOKS_GOOD'
            END as validation_issue
        FROM driver_profiles
        WHERE first_name ILIKE '%Laila%';
      `
    });
  
  if (error1) {
    console.error('❌ Error in check 1, trying direct query...');
    // Direct query approach
    const { data: directCheck1, error: directError1 } = await serviceSupabase
      .from('driver_profiles')
      .select('first_name, vehicle_plate, vehicle_model, vehicle_max_payload, vehicle_max_volume')
      .ilike('first_name', '%Laila%');
      
    if (directError1) {
      console.error('❌ Direct query also failed:', directError1);
    } else {
      console.log('✅ Direct query results:', directCheck1);
      // Manual validation
      directCheck1.forEach(profile => {
        console.log(`\n🔍 Profile: ${profile.first_name}`);
        console.log(`  Vehicle Plate: ${profile.vehicle_plate || 'NULL'}`);
        console.log(`  Vehicle Model: ${profile.vehicle_model || 'NULL'}`);
        console.log(`  Max Payload: ${profile.vehicle_max_payload || 'NULL'}`);
        console.log(`  Max Volume: ${profile.vehicle_max_volume || 'NULL'}`);
        
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
    }
  } else {
    console.log('✅ RPC Results:', check1);
  }

  // Check recent failed registrations
  console.log('\n🔍 Checking recent registrations...');
  const { data: recentUsers } = await serviceSupabase
    .from('users')
    .select('id, email, first_name, last_name, role, created_at')
    .eq('role', 'driver')
    .order('created_at', { ascending: false })
    .limit(5);
    
  for (const user of recentUsers) {
    const { data: profile } = await serviceSupabase
      .from('driver_profiles')
      .select('id, approval_status')
      .eq('user_id', user.id)
      .single();
      
    if (!profile) {
      console.log(`❌ ${user.first_name} ${user.last_name} (${user.email}) - NO PROFILE!`);
    } else {
      console.log(`✅ ${user.first_name} ${user.last_name} (${user.email}) - Profile: ${profile.id.substring(0,8)}, Status: ${profile.approval_status}`);
    }
  }
}

runLailaSQLChecks().catch(console.error);
