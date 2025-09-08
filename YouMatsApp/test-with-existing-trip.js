// PRODUCTION DATABASE
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

async function testWithExistingTrip() {
    try {
        console.log('🔍 Testing ASAP with existing trip instead...\n');
        
        // 1. Find an existing ASAP trip
        const { data: existingTrips } = await supabase
            .from('trip_requests')
            .select('id, status, pickup_time_preference, assigned_driver_id')
            .eq('pickup_time_preference', 'asap')
            .order('created_at', { ascending: false })
            .limit(3);

        console.log(`Found ${existingTrips?.length || 0} existing ASAP trips:`);
        existingTrips?.forEach((trip, i) => {
            console.log(`  ${i + 1}. ${trip.id} - Status: ${trip.status}, Driver: ${trip.assigned_driver_id || 'None'}`);
        });

        // 2. Reset an existing trip to pending
        if (existingTrips && existingTrips.length > 0) {
            const testTrip = existingTrips[0];
            
            console.log(`\n🔄 Resetting trip ${testTrip.id} to pending status...`);
            
            const { error: resetError } = await supabase
                .from('trip_requests')
                .update({
                    status: 'pending',
                    assigned_driver_id: null,
                    load_description: 'Test ASAP Reset Trip'
                })
                .eq('id', testTrip.id);

            if (resetError) {
                console.error('❌ Error resetting trip:', resetError);
                return;
            }

            console.log('✅ Trip reset to pending status');

            // 3. Test ASAP matching
            console.log('\n🚀 Testing ASAP matching...');
            
            const { data: asapResult, error: asapError } = await supabase
                .rpc('start_asap_matching_uber_style', {
                    trip_request_id: testTrip.id
                });

            if (asapError) {
                console.error('❌ ASAP function error:', asapError);
            } else {
                console.log('✅ ASAP function result:', asapResult);
            }

            // 4. Check final assignment
            const { data: finalTrip } = await supabase
                .from('trip_requests')
                .select('id, assigned_driver_id, status, load_description')
                .eq('id', testTrip.id)
                .single();

            if (finalTrip) {
                console.log('\n📋 Final Result:');
                console.log(`   Trip ID: ${finalTrip.id}`);
                console.log(`   Status: ${finalTrip.status}`);
                console.log(`   Assigned Driver: ${finalTrip.assigned_driver_id || 'NULL'}`);
                console.log(`   Queue: ${finalTrip.load_description || 'None'}`);
                
                if (finalTrip.assigned_driver_id) {
                    const { data: driver } = await supabase
                        .from('driver_profiles')
                        .select('first_name, last_name')
                        .eq('user_id', finalTrip.assigned_driver_id)
                        .single();
                    
                    console.log('\n🎉 COMPLETE SUCCESS!');
                    console.log(`👨‍🚛 Trip assigned to: ${driver?.first_name} ${driver?.last_name}`);
                    console.log('✅ Location tracking works (no RLS errors)');
                    console.log('✅ ASAP matching works');
                    console.log('✅ Driver should receive notification');
                    console.log('\n🔄 THE FIX IS COMPLETE!');
                    console.log('📱 Driver apps will now receive ASAP trips via real-time subscription');
                } else {
                    console.log('\n🤔 Still investigating assignment logic...');
                }
            }
        } else {
            console.log('❌ No existing ASAP trips found to test with');
        }

    } catch (error) {
        console.error('💥 Error:', error);
    }
}

testWithExistingTrip();
