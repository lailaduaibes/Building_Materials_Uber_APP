const { createClient } = require('@supabase/supabase-js');

// Use service role key for admin operations
const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

(async () => {
  console.log('🔍 Checking admin user authentication...');
  
  // Check current user status
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, email, role, user_type')
    .eq('email', 'lailadaibes1412@gmail.com');
  
  if (userError) {
    console.error('Error checking user:', userError);
    return;
  }
  
  if (userData.length === 0) {
    console.log('❌ User not found in database');
    return;
  }
  
  console.log('✅ User found:', userData[0]);
  
  // Check auth users
  console.log('\n🔐 Creating test credentials...');
  
  // Create a new admin password: "admin123"
  const { data: authData, error: authError } = await supabase.auth.admin.updateUserById(
    userData[0].id,
    { password: 'admin123' }
  );
  
  if (authError) {
    console.error('❌ Error updating password:', authError);
    console.log('\n💡 Try using your original mobile app password');
    console.log('   Email: lailadaibes1412@gmail.com');
    console.log('   Password: [same as mobile app]');
  } else {
    console.log('✅ Password updated successfully!');
    console.log('\n🎯 Admin Login Credentials:');
    console.log('   Email: lailadaibes1412@gmail.com');
    console.log('   Password: admin123');
    console.log('\n🌐 Admin Dashboard: http://localhost:3000/login');
  }
})();
