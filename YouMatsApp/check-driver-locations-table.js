// PRODUCTION DATABASE
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

async function checkDriverLocationsTable() {
    try {
        console.log('🔍 Checking driver_locations table (the CORRECT professional table)...\n');
        
        // Check if driver_locations table exists and has data
        const { data: locations, error } = await supabase
            .from('driver_locations')
            .select('*')
            .order('updated_at', { ascending: false })
            .limit(10);

        if (error) {
            console.log('❌ Error accessing driver_locations table:', error);
            console.log('This table might not exist yet or has different name.\n');
        } else {
            console.log(`✅ Found ${locations.length} location records in driver_locations table`);
            
            if (locations.length === 0) {
                console.log('📍 No location data found - drivers may not be actively tracking location');
                console.log('   This could mean:');
                console.log('   1. No drivers are currently online and tracking');
                console.log('   2. Location tracking needs to be started manually');
                console.log('   3. Permissions may not be granted');
            } else {
                console.log('\n📍 Recent driver locations:');
                locations.forEach((loc, index) => {
                    const minutesAgo = loc.updated_at ? 
                        ((new Date() - new Date(loc.updated_at)) / (1000 * 60)).toFixed(1) : 'N/A';
                    
                    console.log(`${index + 1}. Driver ID: ${loc.driver_id}`);
                    console.log(`   Lat: ${loc.latitude}, Lng: ${loc.longitude}`);
                    console.log(`   Accuracy: ${loc.accuracy}m, Speed: ${loc.speed}m/s`);
                    console.log(`   Updated: ${loc.updated_at} (${minutesAgo} min ago)`);
                    console.log('');
                });
            }
        }

        // Now check if approved drivers match any location records
        const { data: approvedDrivers } = await supabase
            .from('driver_profiles')
            .select('id, user_id, first_name, last_name, approval_status, status, is_available')
            .eq('approval_status', 'approved');

        console.log(`\n📊 COMPARISON:`);
        console.log(`   Approved drivers: ${approvedDrivers?.length || 0}`);
        console.log(`   Drivers with location data: ${locations?.length || 0}`);

        if (approvedDrivers && locations) {
            // Check which approved drivers have location data
            const driversWithLocation = approvedDrivers.filter(driver => 
                locations.some(loc => loc.driver_id === driver.id)
            );
            
            console.log(`   Approved drivers WITH location data: ${driversWithLocation.length}`);
            
            if (driversWithLocation.length === 0) {
                console.log('\n⚠️  ISSUE IDENTIFIED:');
                console.log('   - You have approved drivers but none are sharing location');
                console.log('   - ASAP functions will find 0 drivers because no location data exists');
                console.log('   - Drivers need to be online and have location tracking active');
            } else {
                console.log('\n✅ GOOD: Some approved drivers have location data');
                console.log('   - ASAP functions should work for these drivers');
                console.log('   - Need to check if ASAP function is using correct table');
            }
        }

    } catch (error) {
        console.error('💥 Error:', error);
    }
}

checkDriverLocationsTable();
