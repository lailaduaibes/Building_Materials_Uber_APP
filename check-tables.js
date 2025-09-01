const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

async function checkTables() {
  console.log('🔍 Checking available tables...\n');
  
  try {
    // Check available tables
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_schema_info');
      
    if (tablesError) {
      console.log('Using alternative method to check tables...');
      
      // Try to check driver_profiles table instead
      const { data: driverProfiles, error: profileError } = await supabase
        .from('driver_profiles')
        .select('*')
        .eq('email', 'nanduaibes@gmail.com')
        .single();
        
      if (profileError) {
        console.log('❌ Error checking driver_profiles:', profileError.message);
        
        // Try users table
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('*')
          .eq('email', 'nanduaibes@gmail.com');
          
        if (usersError) {
          console.log('❌ Error checking users:', usersError.message);
        } else {
          console.log('✅ Found in users table:', users);
        }
      } else {
        console.log('✅ Found driver profile:', driverProfiles);
      }
    }
    
    // Check what driver-related tables exist
    console.log('\n🔍 Checking common driver table variations...\n');
    
    const tablesToCheck = ['drivers', 'driver_profiles', 'users'];
    
    for (const tableName of tablesToCheck) {
      try {
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
          
        if (error) {
          console.log(`❌ ${tableName}: ${error.message}`);
        } else {
          console.log(`✅ ${tableName}: exists with ${count} records`);
          
          // If table exists, try to find our driver
          const { data: driverData, error: driverError } = await supabase
            .from(tableName)
            .select('*')
            .eq('email', 'nanduaibes@gmail.com')
            .limit(1);
            
          if (!driverError && driverData && driverData.length > 0) {
            console.log(`   📧 Found driver in ${tableName}:`, driverData[0]);
          }
        }
      } catch (err) {
        console.log(`❌ ${tableName}: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkTables();
