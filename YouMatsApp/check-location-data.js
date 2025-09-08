// PRODUCTION DATABASE
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

async function checkLocationData() {
    try {
        console.log('🔍 Checking for ANY location data in users table...\n');
        
        // Check for users with location data
        const { data: usersWithLocation, error } = await supabase
            .from('users')
            .select('id, email, role, current_latitude, current_longitude, last_location_update')
            .not('current_latitude', 'is', null)
            .not('current_longitude', 'is', null);

        if (error) {
            console.error('❌ Error:', error);
            return;
        }

        console.log(`Found ${usersWithLocation.length} users with location data:`);
        usersWithLocation.forEach((user, index) => {
            console.log(`${index + 1}. ${user.email} (${user.role})`);
            console.log(`   Lat: ${user.current_latitude}, Lng: ${user.current_longitude}`);
            console.log(`   Updated: ${user.last_location_update}`);
            console.log('');
        });

        if (usersWithLocation.length === 0) {
            console.log('❌ NO USERS HAVE LOCATION DATA STORED');
            console.log('\nThis confirms the issue:');
            console.log('1. DriverService gets GPS location in real-time');
            console.log('2. But location is NOT stored in database');
            console.log('3. ASAP functions expect stored location data');
            console.log('4. Result: No drivers found, assigned_driver_id stays null');
            
            console.log('\n💡 SOLUTION OPTIONS:');
            console.log('A. Modify DriverService to store location in database regularly');
            console.log('B. Create simplified ASAP function that assigns without location filtering');
            console.log('C. Use a different approach for ASAP assignments');
        }

        // Also check total users vs drivers
        const { data: allUsers } = await supabase
            .from('users')
            .select('id, role')
            .eq('role', 'driver');

        const { data: approvedDrivers } = await supabase
            .from('driver_profiles')
            .select('user_id')
            .eq('approval_status', 'approved');

        console.log(`\n📊 SUMMARY:`);
        console.log(`   Total driver users: ${allUsers?.length || 0}`);
        console.log(`   Approved driver profiles: ${approvedDrivers?.length || 0}`);
        console.log(`   Drivers with location data: ${usersWithLocation.filter(u => u.role === 'driver').length}`);

    } catch (error) {
        console.error('💥 Error:', error);
    }
}

checkLocationData();
