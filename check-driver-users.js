const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

(async () => {
  try {
    console.log('Checking driver profiles and users...');
    
    // Check driver profiles
    const { data: drivers, error: driverError } = await supabase
      .from('driver_profiles')
      .select('*');
    
    if (driverError) {
      console.error('❌ Driver profiles error:', driverError);
    } else {
      console.log('✅ Driver profiles found:', drivers.length);
      drivers.forEach(driver => {
        console.log(`- Driver ID: ${driver.id}, User ID: ${driver.user_id}, Status: ${driver.status}, Name: ${driver.first_name} ${driver.last_name}`);
      });
    }
    
    // Check users table
    const { data: users, error: userError } = await supabase
      .from('auth.users')
      .select('id, email')
      .limit(10);
    
    if (userError) {
      console.log('Could not check auth.users (expected)');
      
      // Try profiles table instead
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*');
      
      if (profileError) {
        console.log('Could not check profiles table');
      } else {
        console.log('✅ Profiles found:', profiles.length);
        profiles.forEach(profile => {
          console.log(`- Profile ID: ${profile.id}, Email: ${profile.email || 'No email'}`);
        });
      }
    } else {
      console.log('✅ Users found:', users.length);
      users.forEach(user => {
        console.log(`- User ID: ${user.id}, Email: ${user.email}`);
      });
    }
    
  } catch (err) {
    console.error('❌ Script error:', err);
  }
})();
