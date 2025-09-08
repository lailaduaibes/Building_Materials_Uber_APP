const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function simpleTripAnalysis() {
    try {
        console.log('=== SIMPLE TRIP ANALYSIS ===\n');

        // 1. Direct count query
        console.log('1. Direct count of all trips by status:');
        const { data: allTrips, error: allError } = await supabase
            .from('trip_requests')
            .select('status');

        if (allError) {
            console.error('Error:', allError);
            return;
        }

        // Count manually
        const statusCounts = {};
        allTrips.forEach(trip => {
            statusCounts[trip.status] = (statusCounts[trip.status] || 0) + 1;
        });

        Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
            console.log(`   ${status}: ${count}`);
        });

        const totalTrips = allTrips.length;
        console.log(`   TOTAL: ${totalTrips}\n`);

        // 2. Show what might be visible on map
        const visibleStatuses = ['pending', 'matched', 'accepted', 'picked_up', 'in_transit'];
        const visibleTrips = allTrips.filter(trip => visibleStatuses.includes(trip.status));
        console.log(`🗺️ Trips potentially visible on map: ${visibleTrips.length}\n`);

        // 3. Check pending trips in detail
        console.log('2. Pending trips analysis:');
        const { data: pendingTrips, error: pendingError } = await supabase
            .from('trip_requests')
            .select(`
                id,
                status,
                created_at,
                acceptance_deadline,
                considering_driver_id,
                assigned_driver_id,
                material_type,
                quoted_price
            `)
            .eq('status', 'pending');

        if (pendingError) {
            console.error('Error getting pending:', pendingError);
        } else {
            console.log(`   Found ${pendingTrips?.length || 0} pending trips`);
            
            pendingTrips?.forEach((trip, index) => {
                const now = new Date();
                const deadline = trip.acceptance_deadline ? new Date(trip.acceptance_deadline) : null;
                const expired = deadline && deadline < now;
                
                console.log(`   ${index + 1}. ID: ${trip.id.substring(0, 8)}...`);
                console.log(`      Material: ${trip.material_type}`);
                console.log(`      Price: $${trip.quoted_price}`);
                console.log(`      Deadline: ${deadline?.toISOString() || 'None'}`);
                console.log(`      Expired: ${expired ? 'YES ❌' : 'NO ✅'}`);
                console.log(`      Considering: ${trip.considering_driver_id || 'None'}`);
                console.log();
            });
        }

        // 4. Check matched trips (these show on driver map)
        console.log('3. Matched trips (show as available to drivers):');
        const { data: matchedTrips, error: matchedError } = await supabase
            .from('trip_requests')
            .select(`
                id,
                status,
                created_at,
                assigned_driver_id,
                material_type,
                quoted_price
            `)
            .eq('status', 'matched')
            .order('created_at', { ascending: false })
            .limit(10);

        if (matchedError) {
            console.error('Error getting matched:', matchedError);
        } else {
            console.log(`   Found ${matchedTrips?.length || 0} matched trips`);
            
            matchedTrips?.forEach((trip, index) => {
                const createdAt = new Date(trip.created_at);
                const hoursOld = ((new Date() - createdAt) / (1000 * 60 * 60)).toFixed(1);
                
                console.log(`   ${index + 1}. ${trip.id.substring(0, 8)}... (${hoursOld}h old)`);
                console.log(`      Material: ${trip.material_type} - $${trip.quoted_price}`);
                console.log(`      Assigned: ${trip.assigned_driver_id || 'None'}`);
            });
        }

    } catch (error) {
        console.error('💥 Error:', error);
    }
}

simpleTripAnalysis();
