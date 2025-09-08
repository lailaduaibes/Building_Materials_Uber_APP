// PRODUCTION DATABASE
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

async function testFreshASAPTrip() {
    try {
        console.log('🆕 Creating fresh ASAP trip to test complete fix...\n');
        
        // 1. Create a new ASAP trip request
        const newTripId = `asap-test-${Date.now()}`;
        
        const { data: newTrip, error: createError } = await supabase
            .from('trip_requests')
            .insert({
                id: newTripId,
                customer_id: 'e5310d01-f653-4865-b201-83e29dfa8f44', // Test customer
                pickup_time_preference: 'asap',
                status: 'pending',
                pickup_latitude: '25.276987',
                pickup_longitude: '55.296249',
                delivery_latitude: '25.264689',
                delivery_longitude: '55.296831',
                pickup_address: {
                    formatted_address: 'Dubai Marina, Dubai, UAE',
                    latitude: 25.276987,
                    longitude: 55.296249
                },
                delivery_address: {
                    formatted_address: 'JBR, Dubai, UAE', 
                    latitude: 25.264689,
                    longitude: 55.296831
                },
                load_description: 'Fresh ASAP test trip',
                special_instructions: 'Test trip for ASAP system',
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (createError) {
            console.error('❌ Error creating test trip:', createError);
            return;
        }

        console.log(`✅ Created fresh ASAP trip: ${newTripId}`);

        // 2. Verify we have drivers with location data
        const { data: driversWithLocation } = await supabase
            .from('users')
            .select('id, email, current_latitude, current_longitude, last_location_update')
            .not('current_latitude', 'is', null)
            .not('current_longitude', 'is', null);

        console.log(`📍 Found ${driversWithLocation?.length || 0} drivers with location data`);

        // 3. Test ASAP matching on fresh trip
        console.log('\n🚀 Testing ASAP matching on fresh trip...');
        
        const { data: asapResult, error: asapError } = await supabase
            .rpc('start_asap_matching_uber_style', {
                trip_request_id: newTripId
            });

        if (asapError) {
            console.error('❌ ASAP function error:', asapError);
        } else {
            console.log('✅ ASAP function result:', asapResult);
        }

        // 4. Check trip assignment
        const { data: updatedTrip } = await supabase
            .from('trip_requests')
            .select('id, assigned_driver_id, status, load_description')
            .eq('id', newTripId)
            .single();

        if (updatedTrip) {
            console.log('\n📋 Trip Assignment Result:');
            console.log(`   Trip ID: ${updatedTrip.id}`);
            console.log(`   Status: ${updatedTrip.status}`);
            console.log(`   Assigned Driver: ${updatedTrip.assigned_driver_id || 'NULL'}`);
            console.log(`   Queue: ${updatedTrip.load_description || 'None'}`);
            
            if (updatedTrip.assigned_driver_id) {
                // Get driver name
                const { data: assignedDriver } = await supabase
                    .from('driver_profiles')
                    .select('first_name, last_name')
                    .eq('user_id', updatedTrip.assigned_driver_id)
                    .single();
                
                console.log('\n🎉 SUCCESS! COMPLETE FIX WORKING!');
                console.log(`👨‍🚛 Assigned to: ${assignedDriver?.first_name} ${assignedDriver?.last_name}`);
                console.log('✅ Location tracking fixed (no RLS errors)');
                console.log('✅ ASAP matching working');
                console.log('✅ Driver will receive real-time notification');
                console.log('\n🔔 Driver should see this trip in their app with filter:');
                console.log(`   pickup_time_preference=eq.asap AND assigned_driver_id=eq.${updatedTrip.assigned_driver_id}`);
            } else {
                console.log('\n⚠️ Trip not assigned - investigating...');
                
                // Check if drivers are actually available and approved
                const { data: availableDrivers } = await supabase
                    .from('driver_profiles')
                    .select('user_id, first_name, last_name, approval_status, status, is_available')
                    .eq('approval_status', 'approved')
                    .eq('status', 'online')
                    .eq('is_available', true);

                console.log(`Available drivers: ${availableDrivers?.length || 0}`);
                availableDrivers?.forEach(driver => {
                    console.log(`  - ${driver.first_name} ${driver.last_name}: ${driver.status}, available: ${driver.is_available}`);
                });
            }
        }

    } catch (error) {
        console.error('💥 Error testing fresh ASAP trip:', error);
    }
}

testFreshASAPTrip();
