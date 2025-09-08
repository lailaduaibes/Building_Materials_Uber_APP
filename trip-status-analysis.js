const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeTripStatusIssue() {
    try {
        console.log('=== TRIP STATUS ISSUE ANALYSIS ===\n');

        // 1. The expired pending trip
        console.log('🚨 CRITICAL ISSUE FOUND:');
        const { data: pendingTrips, error: pendingError } = await supabase
            .from('trip_requests')
            .select('*')
            .eq('status', 'pending');

        if (pendingTrips && pendingTrips.length > 0) {
            const trip = pendingTrips[0];
            const createdAt = new Date(trip.created_at);
            const deadline = new Date(trip.acceptance_deadline);
            const now = new Date();
            
            console.log(`Trip ID: ${trip.id}`);
            console.log(`Status: ${trip.status} ❌ (Should be expired!)`);
            console.log(`Created: ${createdAt.toISOString()}`);
            console.log(`Deadline: ${deadline.toISOString()}`);
            console.log(`Current time: ${now.toISOString()}`);
            console.log(`Deadline passed: ${deadline < now ? 'YES' : 'NO'}`);
            console.log(`Minutes past deadline: ${((now - deadline) / (1000 * 60)).toFixed(2)}`);
            console.log(`Considering driver: ${trip.considering_driver_id}`);
            console.log(`Assigned driver: ${trip.assigned_driver_id || 'None'}`);
            console.log();
            
            console.log('🔧 This trip should have been automatically expired!');
            console.log('The acceptance_deadline has passed but status is still "pending".\n');
        }

        // 2. Count of visible trip statuses
        console.log('📊 Current trip distribution:');
        const statuses = ['pending', 'matched', 'accepted', 'picked_up', 'in_transit', 'delivered', 'expired', 'cancelled', 'no_drivers_available'];
        
        for (const status of statuses) {
            const { data: count, error } = await supabase
                .from('trip_requests')
                .select('id', { count: 'exact', head: true })
                .eq('status', status);
                
            if (!error) {
                console.log(`   ${status}: ${count || 0}`);
            }
        }
        console.log();

        // 3. Check what's visible on map (non-final statuses)
        console.log('🗺️ Trips potentially visible on map:');
        const visibleStatuses = ['pending', 'matched', 'accepted', 'picked_up', 'in_transit'];
        let totalVisible = 0;
        
        for (const status of visibleStatuses) {
            const { data: count, error } = await supabase
                .from('trip_requests')
                .select('id', { count: 'exact', head: true })
                .eq('status', status);
                
            if (!error && count > 0) {
                console.log(`   ${status}: ${count}`);
                totalVisible += count;
            }
        }
        console.log(`   TOTAL VISIBLE: ${totalVisible}\n`);

        // 4. Check for cleanup function existence
        console.log('🔍 Checking for automatic cleanup system:');
        
        // Check if there's a cleanup function
        const { data: functions, error: funcError } = await supabase
            .rpc('get_function_list')
            .catch(() => null);
            
        // Check if there are any cron jobs or triggers
        console.log('Looking for automatic expiration mechanisms...\n');

        // 5. Suggest immediate fix
        console.log('💡 IMMEDIATE ACTIONS NEEDED:');
        console.log('1. Manual fix: Update the expired pending trip');
        console.log('2. Implement automatic cleanup system');
        console.log('3. Check why expiration logic is not working\n');

        // 6. Manual fix command
        console.log('🛠️ SQL to manually fix the expired trip:');
        console.log(`UPDATE trip_requests SET status = 'expired' WHERE id = '${pendingTrips[0]?.id}' AND acceptance_deadline < NOW();`);
        console.log();

        // 7. Check recent matched trips that might appear on map
        console.log('📍 Recent "matched" trips (might show as available on map):');
        const { data: recentMatched, error: matchedError } = await supabase
            .from('trip_requests')
            .select(`
                id,
                status,
                created_at,
                assigned_driver_id,
                considering_driver_id,
                material_type,
                quoted_price
            `)
            .eq('status', 'matched')
            .order('created_at', { ascending: false })
            .limit(5);

        if (recentMatched && recentMatched.length > 0) {
            recentMatched.forEach((trip, index) => {
                const createdAt = new Date(trip.created_at);
                const hoursOld = ((new Date() - createdAt) / (1000 * 60 * 60)).toFixed(1);
                console.log(`   ${index + 1}. ${trip.id.substring(0, 8)}... (${hoursOld}h old) - ${trip.material_type} - $${trip.quoted_price}`);
            });
        }

    } catch (error) {
        console.error('💥 Error in analysis:', error);
    }
}

analyzeTripStatusIssue();
