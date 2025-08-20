const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

(async () => {
  console.log('🔍 Checking existing admin users...');
  
  const { data: admins, error } = await supabase
    .from('users')
    .select('id, email, role, user_type, first_name, last_name, created_at')
    .or('role.eq.admin,user_type.eq.admin');
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Found', admins.length, 'admin users:');
  admins.forEach(admin => {
    console.log('  👑', admin.email, '|', admin.role || admin.user_type, '|', admin.first_name, admin.last_name);
  });
  
  if (admins.length === 0) {
    console.log('');
    console.log('💡 No admin users found. Options:');
    console.log('   1. Convert an existing user to admin');
    console.log('   2. Create a new admin user account');
    console.log('');
    
    // Show existing users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role, user_type, first_name, last_name')
      .limit(5);
      
    if (!usersError && users.length > 0) {
      console.log('📋 Existing users that could be made admin:');
      users.forEach(user => {
        console.log('  👤', user.email, '|', user.role || user.user_type, '|', user.first_name, user.last_name);
      });
    }
  }
})();
