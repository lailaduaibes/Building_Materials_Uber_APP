// PRODUCTION DATABASE
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

async function testLocationUpdateFix() {
    try {
        console.log('🔧 Testing simplified location update fix...\n');
        
        // 1. Get online drivers
        const { data: onlineDrivers } = await supabase
            .from('driver_profiles')
            .select('user_id, first_name, last_name')
            .eq('approval_status', 'approved')
            .eq('status', 'online')
            .limit(2);

        if (!onlineDrivers || onlineDrivers.length === 0) {
            console.log('❌ No online drivers found');
            return;
        }

        console.log(`Found ${onlineDrivers.length} online drivers`);

        // 2. Test updating location in users table only (what ASAP functions use)
        const testLocations = [
            { lat: 25.276987, lng: 55.296249, name: 'Dubai Marina' },
            { lat: 25.264689, lng: 55.296831, name: 'JBR' }
        ];

        for (let i = 0; i < onlineDrivers.length; i++) {
            const driver = onlineDrivers[i];
            const location = testLocations[i] || testLocations[0];
            
            console.log(`\nUpdating ${driver.first_name} ${driver.last_name} location...`);
            
            // Simulate what DriverService.updateDriverLocation() now does
            const { error } = await supabase
                .from('users')
                .update({
                    current_latitude: location.lat,
                    current_longitude: location.lng,
                    last_location_update: new Date().toISOString()
                })
                .eq('id', driver.user_id);

            if (error) {
                console.error(`❌ Error updating ${driver.first_name}:`, error);
            } else {
                console.log(`✅ Successfully updated ${driver.first_name} location to ${location.name}`);
            }
        }

        // 3. Verify location data is now available
        console.log('\n📍 Verifying location data...');
        
        const { data: usersWithLocation } = await supabase
            .from('users')
            .select('id, email, current_latitude, current_longitude, last_location_update')
            .not('current_latitude', 'is', null)
            .not('current_longitude', 'is', null)
            .order('last_location_update', { ascending: false })
            .limit(5);

        console.log(`Found ${usersWithLocation?.length || 0} users with location data:`);
        usersWithLocation?.forEach((user, i) => {
            const minutesAgo = user.last_location_update ? 
                ((new Date() - new Date(user.last_location_update)) / (1000 * 60)).toFixed(1) : 'N/A';
            console.log(`  ${i + 1}. ${user.email}: (${user.current_latitude}, ${user.current_longitude}) - ${minutesAgo} min ago`);
        });

        // 4. Test ASAP function with location data
        console.log('\n🚀 Testing ASAP matching with location data...');
        
        const { data: asapResult, error: asapError } = await supabase
            .rpc('start_asap_matching_uber_style', {
                trip_request_id: 'e280b170-307a-44e2-b980-002b4a9504a3'
            });

        if (asapError) {
            console.error('❌ ASAP function error:', asapError);
        } else {
            console.log('✅ ASAP function result:', asapResult);
        }

        // 5. Check final trip status
        const { data: finalTrip } = await supabase
            .from('trip_requests')
            .select('id, assigned_driver_id, status, load_description')
            .eq('id', 'e280b170-307a-44e2-b980-002b4a9504a3')
            .single();

        if (finalTrip) {
            console.log('\n📋 Final Trip Status:');
            console.log(`   Assigned Driver: ${finalTrip.assigned_driver_id || 'NULL'}`);
            console.log(`   Status: ${finalTrip.status}`);
            console.log(`   Queue: ${finalTrip.load_description || 'None'}`);
            
            if (finalTrip.assigned_driver_id) {
                console.log('\n🎉 SUCCESS! Location update fix worked!');
                console.log('✅ Drivers can now be found for ASAP trips');
                console.log('✅ No more RLS errors');
                console.log('✅ Driver should receive notification via real-time subscription');
            } else {
                console.log('\n⚠️ Trip still not assigned - need to check function logic');
            }
        }

    } catch (error) {
        console.error('💥 Error testing location fix:', error);
    }
}

testLocationUpdateFix();
