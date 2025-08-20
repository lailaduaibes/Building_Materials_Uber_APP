const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkAdminSystem() {
  console.log('🔍 Checking for admin users and roles...');
  
  try {
    // Check for admin users
    const { data: adminUsers, error: adminError } = await supabase
      .from('users')
      .select('id, email, role, user_type, first_name, last_name')
      .or('role.eq.admin,user_type.eq.admin')
      .order('created_at', { ascending: false });
    
    if (adminError) {
      console.error('❌ Error checking admin users:', adminError);
    } else {
      console.log(`Found ${adminUsers.length} admin users:`);
      adminUsers.forEach(user => {
        console.log(`  👑 ${user.id.substring(0,8)}: ${user.email} | ${user.role || user.user_type} | ${user.first_name} ${user.last_name}`);
      });
    }
    
    // Check unique roles/user_types
    const { data: allUsers } = await supabase
      .from('users')
      .select('role, user_type');
    
    const roles = [...new Set(allUsers.map(u => u.role).filter(Boolean))];
    const userTypes = [...new Set(allUsers.map(u => u.user_type).filter(Boolean))];
    
    console.log('');
    console.log('Available roles:', roles.join(', '));
    console.log('Available user_types:', userTypes.join(', '));
    
    // Create a sample admin user if none exists
    if (adminUsers.length === 0) {
      console.log('');
      console.log('⚠️ No admin users found. Would you like to create one?');
      console.log('💡 You can create an admin user to manage driver registrations');
    }
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

checkAdminSystem();
