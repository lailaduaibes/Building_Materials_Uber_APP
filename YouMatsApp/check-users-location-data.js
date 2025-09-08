const { createClient } = require('@supabase/supabase-js');

// PRODUCTION DATABASE
const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

async function checkUsersLocationData() {
    try {
        console.log('🔍 Checking location data in users table for approved drivers...\n');
        
        // Get approved drivers and their user location data
        const { data: driversWithLocation, error } = await supabase
            .from('driver_profiles')
            .select(`
                user_id,
                first_name,
                last_name,
                approval_status,
                is_available,
                status,
                users!inner(
                    id,
                    current_latitude,
                    current_longitude,
                    last_location_update,
                    phone,
                    email
                )
            `)
            .eq('approval_status', 'approved');

        if (error) {
            console.error('❌ Error fetching drivers:', error);
            return;
        }

        console.log(`📊 Found ${driversWithLocation.length} approved drivers\n`);

        driversWithLocation.forEach((driver, index) => {
            const user = driver.users;
            const hasLocation = user.current_latitude && user.current_longitude;
            
            console.log(`${index + 1}. Driver: ${driver.first_name} ${driver.last_name}`);
            console.log(`   User ID: ${driver.user_id}`);
            console.log(`   Status: ${driver.status} | Available: ${driver.is_available}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Phone: ${user.phone}`);
            console.log(`   📍 Location Data:`);
            
            if (hasLocation) {
                console.log(`      ✅ Latitude: ${user.current_latitude}`);
                console.log(`      ✅ Longitude: ${user.current_longitude}`);
                console.log(`      ✅ Last Updated: ${user.last_location_update}`);
                
                // Check if location is recent (within last 5 minutes)
                if (user.last_location_update) {
                    const lastUpdate = new Date(user.last_location_update);
                    const now = new Date();
                    const minutesAgo = (now - lastUpdate) / (1000 * 60);
                    console.log(`      ⏰ Updated ${minutesAgo.toFixed(1)} minutes ago`);
                    
                    if (minutesAgo <= 5) {
                        console.log(`      🟢 RECENT LOCATION - DRIVER WOULD BE FOUND`);
                    } else {
                        console.log(`      🟡 OLD LOCATION - MAY NOT BE FOUND (depends on function timeout)`);
                    }
                } else {
                    console.log(`      🔴 NO TIMESTAMP - DRIVER WOULD NOT BE FOUND`);
                }
            } else {
                console.log(`      ❌ NO LOCATION DATA - DRIVER WOULD NOT BE FOUND`);
            }
            console.log('');
        });

        // Count drivers with recent location data
        const driversWithRecentLocation = driversWithLocation.filter(driver => {
            const user = driver.users;
            if (!user.current_latitude || !user.current_longitude || !user.last_location_update) {
                return false;
            }
            
            const lastUpdate = new Date(user.last_location_update);
            const now = new Date();
            const minutesAgo = (now - lastUpdate) / (1000 * 60);
            return minutesAgo <= 5; // Recent within 5 minutes
        });

        console.log(`\n📈 SUMMARY:`);
        console.log(`   Total approved drivers: ${driversWithLocation.length}`);
        console.log(`   Drivers with recent location (≤5 min): ${driversWithRecentLocation.length}`);
        console.log(`   Drivers without location data: ${driversWithLocation.length - driversWithRecentLocation.length}`);
        
        if (driversWithRecentLocation.length === 0) {
            console.log(`\n⚠️  NO DRIVERS HAVE RECENT LOCATION DATA`);
            console.log(`   This explains why find_nearby_available_drivers returns 0 results!`);
            console.log(`   Location data needs to be stored in users table for ASAP matching to work.`);
        } else {
            console.log(`\n✅ ${driversWithRecentLocation.length} drivers have recent location data and would be found by the function.`);
        }

    } catch (error) {
        console.error('💥 Error:', error);
    }
}

checkUsersLocationData();
