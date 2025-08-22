const { createClient } = require('@supabase/supabase-js');

const serviceSupabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

async function debugProfileLookup() {
  console.log('🔍 Debugging profile lookup issues...');
  
  // Check recent driver profiles
  console.log('\n📊 Recent driver profiles:');
  const { data: profiles, error: profilesError } = await serviceSupabase
    .from('driver_profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (profilesError) {
    console.error('❌ Error fetching profiles:', profilesError);
  } else {
    console.log(`Found ${profiles.length} recent profiles:`);
    profiles.forEach(profile => {
      console.log(`- ID: ${profile.id}, User ID: ${profile.user_id}, Name: ${profile.first_name} ${profile.last_name}, Status: ${profile.approval_status}, Created: ${profile.created_at}`);
    });
  }
  
  // Check recent auth users
  console.log('\n👤 Recent auth users:');
  const { data: users, error: usersError } = await serviceSupabase
    .from('auth.users')
    .select('id, email, email_confirmed_at, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (usersError) {
    console.error('❌ Error fetching auth users:', usersError);
  } else {
    console.log(`Found ${users.length} recent users:`);
    users.forEach(user => {
      console.log(`- ID: ${user.id}, Email: ${user.email}, Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}, Created: ${user.created_at}`);
    });
  }
  
  // Test specific user lookup
  const testUserId = 'c2ecde68-f995-425d-b59c-25bd931bb76c'; // From the logs
  console.log(`\n🔍 Testing lookup for user ${testUserId}:`);
  
  const { data: testProfile, error: testError } = await serviceSupabase
    .from('driver_profiles')
    .select('id')
    .eq('user_id', testUserId)
    .single();
    
  if (testError) {
    console.error('❌ Profile lookup error:', testError);
    
    // Try without .single()
    const { data: testProfiles, error: testError2 } = await serviceSupabase
      .from('driver_profiles')
      .select('id')
      .eq('user_id', testUserId);
      
    if (testError2) {
      console.error('❌ Multiple lookup error:', testError2);
    } else {
      console.log(`Found ${testProfiles.length} profiles for this user:`, testProfiles);
    }
  } else {
    console.log('✅ Profile found:', testProfile);
  }
  
  // Check custom users table
  console.log('\n📋 Recent custom users:');
  const { data: customUsers, error: customUsersError } = await serviceSupabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (customUsersError) {
    console.error('❌ Error fetching custom users:', customUsersError);
  } else {
    console.log(`Found ${customUsers.length} recent custom users:`);
    customUsers.forEach(user => {
      console.log(`- ID: ${user.id}, Email: ${user.email}, Role: ${user.role}, Created: ${user.created_at}`);
    });
  }
}

debugProfileLookup().catch(console.error);
