// PRODUCTION DATABASE
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

async function checkActiveLocationTracking() {
    try {
        console.log('🔍 Checking ACTUAL active location tracking in your system...\n');
        
        // Check which table has recent location updates
        console.log('1. Checking users table for location data:');
        const { data: usersWithLocation } = await supabase
            .from('users')
            .select('id, email, role, current_latitude, current_longitude, last_location_update')
            .not('current_latitude', 'is', null)
            .not('current_longitude', 'is', null)
            .order('last_location_update', { ascending: false })
            .limit(5);

        console.log(`   Found ${usersWithLocation?.length || 0} users with location data`);
        if (usersWithLocation?.length > 0) {
            usersWithLocation.forEach((user, i) => {
                const minutesAgo = user.last_location_update ? 
                    ((new Date() - new Date(user.last_location_update)) / (1000 * 60)).toFixed(1) : 'N/A';
                console.log(`   ${i + 1}. ${user.email} (${user.role}): ${minutesAgo} min ago`);
            });
        }

        console.log('\n2. Checking driver_locations table for location data:');
        const { data: driverLocations } = await supabase
            .from('driver_locations')
            .select('driver_id, latitude, longitude, updated_at')
            .order('updated_at', { ascending: false })
            .limit(5);

        console.log(`   Found ${driverLocations?.length || 0} driver location records`);
        if (driverLocations?.length > 0) {
            driverLocations.forEach((loc, i) => {
                const minutesAgo = loc.updated_at ? 
                    ((new Date() - new Date(loc.updated_at)) / (1000 * 60)).toFixed(1) : 'N/A';
                console.log(`   ${i + 1}. Driver ${loc.driver_id}: ${minutesAgo} min ago`);
            });
        }

        // Check online drivers
        console.log('\n3. Checking currently online/available drivers:');
        const { data: onlineDrivers } = await supabase
            .from('driver_profiles')
            .select('id, user_id, first_name, last_name, status, is_available, approval_status')
            .eq('approval_status', 'approved')
            .in('status', ['online', 'available']);

        console.log(`   Found ${onlineDrivers?.length || 0} online approved drivers`);
        onlineDrivers?.forEach((driver, i) => {
            console.log(`   ${i + 1}. ${driver.first_name} ${driver.last_name} - ${driver.status} (available: ${driver.is_available})`);
        });

        // ANALYSIS
        console.log('\n📊 ANALYSIS:');
        const hasRecentUsersLocation = usersWithLocation?.some(u => {
            const minutesAgo = u.last_location_update ? 
                ((new Date() - new Date(u.last_location_update)) / (1000 * 60)) : 999;
            return minutesAgo <= 10;
        });

        const hasRecentDriverLocation = driverLocations?.some(loc => {
            const minutesAgo = loc.updated_at ? 
                ((new Date() - new Date(loc.updated_at)) / (1000 * 60)) : 999;
            return minutesAgo <= 10;
        });

        if (hasRecentUsersLocation) {
            console.log('✅ DriverService.updateDriverLocation() IS being called (users table updated)');
        } else {
            console.log('❌ DriverService.updateDriverLocation() NOT being called (users table empty)');
        }

        if (hasRecentDriverLocation) {
            console.log('✅ Driver location tracking IS active (driver_locations updated)');
        } else {
            console.log('❌ Driver location tracking NOT active (driver_locations empty)');
        }

        if (onlineDrivers?.length > 0 && !hasRecentUsersLocation && !hasRecentDriverLocation) {
            console.log('\n⚠️  ISSUE FOUND:');
            console.log('   - Drivers are online but not sharing location');
            console.log('   - This explains why ASAP trips get assigned_driver_id = null');
            console.log('   - Location tracking needs to start when driver goes online');
            console.log('   - Currently it only starts during active trips in DriverNavigationScreen');
        }

        if (!hasRecentUsersLocation && !hasRecentDriverLocation) {
            console.log('\n💡 SOLUTION:');
            console.log('   1. Add location tracking to ModernDriverDashboard when driver goes online');
            console.log('   2. Call DriverService.updateDriverLocation() every few seconds');
            console.log('   3. This will populate the location data needed for ASAP matching');
        }

    } catch (error) {
        console.error('💥 Error:', error);
    }
}

checkActiveLocationTracking();
