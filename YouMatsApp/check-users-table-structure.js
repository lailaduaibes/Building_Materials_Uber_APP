// PRODUCTION DATABASE
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

async function checkUsersTable() {
    try {
        console.log('🔍 Checking users table structure and data...\n');
        
        // First check if users table exists and what columns it has
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('*')
            .limit(3);

        if (usersError) {
            console.log('❌ Error accessing users table:', usersError);
            console.log('This might mean the users table doesn\'t exist or has different structure.\n');
        } else {
            console.log('✅ Users table exists!');
            console.log('Sample users data:');
            users.forEach((user, index) => {
                console.log(`${index + 1}. User:`, Object.keys(user));
                console.log('   Data:', user);
                console.log('');
            });
        }

        // Check driver_profiles structure
        console.log('🔍 Checking driver_profiles table structure...\n');
        const { data: drivers, error: driversError } = await supabase
            .from('driver_profiles')
            .select('*')
            .eq('approval_status', 'approved')
            .limit(2);

        if (driversError) {
            console.log('❌ Error accessing driver_profiles:', driversError);
        } else {
            console.log('✅ Driver_profiles table exists!');
            if (drivers.length > 0) {
                console.log('Sample driver columns:', Object.keys(drivers[0]));
                console.log('Sample driver data:', drivers[0]);
            }
        }

        // Check if there's an auth.users table (Supabase default)
        console.log('\n🔍 Checking if this is using Supabase auth.users...\n');
        
        try {
            // Try to access auth.users 
            const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
            
            if (authError) {
                console.log('❌ Cannot access auth.users:', authError.message);
            } else {
                console.log('✅ Found auth.users with', authUsers.users.length, 'users');
                
                // Check if any auth users have metadata
                const userWithMeta = authUsers.users.find(u => u.user_metadata && Object.keys(u.user_metadata).length > 0);
                if (userWithMeta) {
                    console.log('Sample auth user metadata:', userWithMeta.user_metadata);
                }
            }
        } catch (authErr) {
            console.log('❌ Error accessing auth system:', authErr.message);
        }

    } catch (error) {
        console.error('💥 Error:', error);
    }
}

checkUsersTable();
