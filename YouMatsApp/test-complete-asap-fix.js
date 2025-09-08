// PRODUCTION DATABASE
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

async function testCompleteASAPFix() {
    try {
        console.log('🚀 TESTING COMPLETE ASAP FIX...\n');
        
        // 1. First add some test location data to simulate drivers being online
        console.log('1. Setting up test location data for online drivers...');
        
        const { data: onlineDrivers } = await supabase
            .from('driver_profiles')
            .select('user_id, first_name, last_name')
            .eq('approval_status', 'approved')
            .eq('status', 'online')
            .limit(3);

        if (!onlineDrivers || onlineDrivers.length === 0) {
            console.log('❌ No online drivers found. Need drivers to be online first.');
            return;
        }

        console.log(`Found ${onlineDrivers.length} online drivers. Adding location data...`);

        // Add location data for each online driver
        const locations = [
            { lat: 25.276987, lng: 55.296249, name: 'Dubai Marina' },
            { lat: 25.264689, lng: 55.296831, name: 'JBR' },
            { lat: 25.268462, lng: 55.302381, name: 'DIFC' }
        ];

        for (let i = 0; i < onlineDrivers.length; i++) {
            const driver = onlineDrivers[i];
            const location = locations[i] || locations[0];
            
            // Update users table
            await supabase
                .from('users')
                .update({
                    current_latitude: location.lat,
                    current_longitude: location.lng,
                    last_location_update: new Date().toISOString()
                })
                .eq('id', driver.user_id);

            // Update driver_locations table
            await supabase
                .from('driver_locations')
                .upsert({
                    driver_id: driver.user_id,
                    latitude: location.lat,
                    longitude: location.lng,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'driver_id' });

            console.log(`✅ Added location for ${driver.first_name}: ${location.name} (${location.lat}, ${location.lng})`);
        }

        // 2. Now test the ASAP function with our existing trip
        console.log('\n2. Testing ASAP matching with location data...');
        
        const { data: asapResult, error: asapError } = await supabase
            .rpc('start_asap_matching_uber_style', {
                trip_request_id: 'e280b170-307a-44e2-b980-002b4a9504a3'
            });

        if (asapError) {
            console.error('❌ ASAP function error:', asapError);
        } else {
            console.log('✅ ASAP function result:', asapResult);
        }

        // 3. Check if trip was assigned
        console.log('\n3. Checking trip assignment...');
        
        const { data: updatedTrip } = await supabase
            .from('trip_requests')
            .select('id, assigned_driver_id, status, load_description')
            .eq('id', 'e280b170-307a-44e2-b980-002b4a9504a3')
            .single();

        if (updatedTrip) {
            console.log('📋 Trip Status:');
            console.log(`   ID: ${updatedTrip.id}`);
            console.log(`   Status: ${updatedTrip.status}`);
            console.log(`   Assigned Driver: ${updatedTrip.assigned_driver_id || 'NULL'}`);
            console.log(`   Queue: ${updatedTrip.load_description || 'None'}`);
            
            if (updatedTrip.assigned_driver_id) {
                console.log('\n🎉 SUCCESS! Trip has been assigned to a driver!');
                console.log('✅ The location fix worked - drivers are now being found for ASAP trips');
                
                // Check which driver got assigned
                const { data: assignedDriver } = await supabase
                    .from('driver_profiles')
                    .select('first_name, last_name')
                    .eq('user_id', updatedTrip.assigned_driver_id)
                    .single();
                
                if (assignedDriver) {
                    console.log(`👨‍🚛 Assigned to: ${assignedDriver.first_name} ${assignedDriver.last_name}`);
                }
            } else {
                console.log('\n⚠️ Trip still not assigned. Need to investigate further...');
            }
        }

        // 4. Verify drivers can receive the notification
        console.log('\n4. Testing driver notification subscription...');
        console.log('Drivers should now see this trip in their real-time subscription:');
        console.log('Filter: pickup_time_preference=eq.asap AND assigned_driver_id=eq.{their_user_id}');
        
        if (updatedTrip?.assigned_driver_id) {
            console.log(`The assigned driver (${updatedTrip.assigned_driver_id}) should receive the notification!`);
        }

    } catch (error) {
        console.error('💥 Error testing ASAP fix:', error);
    }
}

testCompleteASAPFix();
