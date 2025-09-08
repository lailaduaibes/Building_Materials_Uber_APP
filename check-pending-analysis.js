const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPendingTrips() {
    try {
        console.log('=== PENDING TRIPS ANALYSIS ===\n');

        // 1. Count of pending trips
        console.log('1. Total pending trips:');
        const { data: pendingCount, error: countError } = await supabase
            .from('trip_requests')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending');

        if (countError) {
            console.error('Error getting pending count:', countError);
        } else {
            console.log(`   Pending trips: ${pendingCount || 0}\n`);
        }

        // 2. Detailed pending trips analysis
        console.log('2. Detailed pending trips:');
        const { data: pendingTrips, error: detailError } = await supabase
            .from('trip_requests')
            .select(`
                id,
                status,
                created_at,
                updated_at,
                assigned_driver_id,
                considering_driver_id,
                acceptance_deadline,
                pickup_address,
                delivery_address,
                material_type,
                quoted_price
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(20);

        if (detailError) {
            console.error('Error getting pending details:', detailError);
        } else {
            if (pendingTrips && pendingTrips.length > 0) {
                pendingTrips.forEach((trip, index) => {
                    const createdAt = new Date(trip.created_at);
                    const now = new Date();
                    const hoursSinceCreated = (now - createdAt) / (1000 * 60 * 60);
                    
                    const deadlineStatus = trip.acceptance_deadline && new Date(trip.acceptance_deadline) < now ? 'EXPIRED' : 'NOT_EXPIRED';
                    
                    console.log(`   ${index + 1}. ID: ${trip.id.substring(0, 8)}...`);
                    console.log(`      Status: ${trip.status}`);
                    console.log(`      Created: ${createdAt.toISOString()}`);
                    console.log(`      Hours since created: ${hoursSinceCreated.toFixed(2)}`);
                    console.log(`      Assigned driver: ${trip.assigned_driver_id || 'None'}`);
                    console.log(`      Considering driver: ${trip.considering_driver_id || 'None'}`);
                    console.log(`      Acceptance deadline: ${trip.acceptance_deadline || 'None'}`);
                    console.log(`      Deadline status: ${deadlineStatus}`);
                    console.log(`      Pickup: ${trip.pickup_address?.substring(0, 50)}...`);
                    console.log(`      Material: ${trip.material_type}`);
                    console.log(`      Price: $${trip.quoted_price}\n`);
                });
            } else {
                console.log('   No pending trips found\n');
            }
        }

        // 3. Status distribution
        console.log('3. Trip status distribution:');
        const { data: statusCounts, error: statusError } = await supabase
            .from('trip_requests')
            .select('status')
            .order('status');

        if (statusError) {
            console.error('Error getting status distribution:', statusError);
        } else {
            const statusMap = {};
            statusCounts?.forEach(trip => {
                statusMap[trip.status] = (statusMap[trip.status] || 0) + 1;
            });
            
            Object.entries(statusMap).forEach(([status, count]) => {
                console.log(`   ${status}: ${count}`);
            });
            console.log();
        }

        // 4. Old pending trips (should have expired)
        console.log('4. Trips that should have expired (pending > 1 hour):');
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        
        const { data: oldPendingTrips, error: oldError } = await supabase
            .from('trip_requests')
            .select(`
                id,
                status,
                created_at,
                acceptance_deadline,
                assigned_driver_id,
                considering_driver_id
            `)
            .eq('status', 'pending')
            .lt('created_at', oneHourAgo)
            .order('created_at');

        if (oldError) {
            console.error('Error getting old pending trips:', oldError);
        } else {
            if (oldPendingTrips && oldPendingTrips.length > 0) {
                console.log(`   Found ${oldPendingTrips.length} trips older than 1 hour:`);
                oldPendingTrips.forEach((trip, index) => {
                    const createdAt = new Date(trip.created_at);
                    const now = new Date();
                    const hoursSinceCreated = (now - createdAt) / (1000 * 60 * 60);
                    
                    console.log(`   ${index + 1}. ID: ${trip.id.substring(0, 8)}... - ${hoursSinceCreated.toFixed(2)} hours old`);
                    console.log(`      Created: ${createdAt.toISOString()}`);
                    console.log(`      Deadline: ${trip.acceptance_deadline || 'None'}`);
                    console.log(`      Assigned: ${trip.assigned_driver_id || 'None'}`);
                    console.log(`      Considering: ${trip.considering_driver_id || 'None'}`);
                });
            } else {
                console.log('   No old pending trips found (good!)\n');
            }
        }

    } catch (error) {
        console.error('💥 Error in analysis:', error);
    }
}

checkPendingTrips();
