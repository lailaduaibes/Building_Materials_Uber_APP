const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDetailedTripStatus() {
    try {
        console.log('=== DETAILED TRIP STATUS ANALYSIS ===\n');

        // 1. Check the single pending trip
        console.log('1. Details of the pending trip:');
        const { data: pendingTrips, error: pendingError } = await supabase
            .from('trip_requests')
            .select(`
                id,
                status,
                created_at,
                assigned_driver_id,
                considering_driver_id,
                acceptance_deadline,
                pickup_address,
                delivery_address,
                material_type,
                quoted_price,
                customer_id
            `)
            .eq('status', 'pending');

        if (pendingError) {
            console.error('Error getting pending trip:', pendingError);
        } else {
            if (pendingTrips && pendingTrips.length > 0) {
                pendingTrips.forEach((trip, index) => {
                    const createdAt = new Date(trip.created_at);
                    const now = new Date();
                    const hoursSinceCreated = (now - createdAt) / (1000 * 60 * 60);
                    
                    console.log(`   Pending Trip ${index + 1}:`);
                    console.log(`      ID: ${trip.id}`);
                    console.log(`      Status: ${trip.status}`);
                    console.log(`      Created: ${createdAt.toISOString()}`);
                    console.log(`      Hours since created: ${hoursSinceCreated.toFixed(2)}`);
                    console.log(`      Assigned driver: ${trip.assigned_driver_id || 'None'}`);
                    console.log(`      Considering driver: ${trip.considering_driver_id || 'None'}`);
                    console.log(`      Acceptance deadline: ${trip.acceptance_deadline || 'None'}`);
                    console.log(`      Customer ID: ${trip.customer_id}`);
                    console.log(`      Pickup: ${trip.pickup_address}`);
                    console.log(`      Delivery: ${trip.delivery_address}`);
                    console.log(`      Material: ${trip.material_type}`);
                    console.log(`      Price: $${trip.quoted_price}\n`);
                });
            } else {
                console.log('   No pending trips found\n');
            }
        }

        // 2. Check trips that are 'matched' (might be showing as pending on map)
        console.log('2. Trips with "matched" status (might appear as pending on map):');
        const { data: matchedTrips, error: matchedError } = await supabase
            .from('trip_requests')
            .select(`
                id,
                status,
                created_at,
                assigned_driver_id,
                considering_driver_id,
                acceptance_deadline,
                pickup_address,
                material_type,
                quoted_price
            `)
            .eq('status', 'matched')
            .order('created_at', { ascending: false })
            .limit(10);

        if (matchedError) {
            console.error('Error getting matched trips:', matchedError);
        } else {
            if (matchedTrips && matchedTrips.length > 0) {
                console.log(`   Found ${matchedTrips.length} matched trips:`);
                matchedTrips.forEach((trip, index) => {
                    const createdAt = new Date(trip.created_at);
                    const now = new Date();
                    const hoursSinceCreated = (now - createdAt) / (1000 * 60 * 60);
                    
                    console.log(`   ${index + 1}. ID: ${trip.id.substring(0, 8)}... - ${hoursSinceCreated.toFixed(2)} hours old`);
                    console.log(`      Status: ${trip.status}`);
                    console.log(`      Assigned: ${trip.assigned_driver_id || 'None'}`);
                    console.log(`      Considering: ${trip.considering_driver_id || 'None'}`);
                    console.log(`      Material: ${trip.material_type}`);
                    console.log(`      Pickup: ${trip.pickup_address?.substring(0, 50)}...`);
                });
                console.log();
            } else {
                console.log('   No matched trips found\n');
            }
        }

        // 3. Check for expired trips
        console.log('3. Recently expired trips (might explain what you saw on map):');
        const { data: expiredTrips, error: expiredError } = await supabase
            .from('trip_requests')
            .select(`
                id,
                status,
                created_at,
                assigned_driver_id,
                considering_driver_id,
                acceptance_deadline,
                pickup_address,
                material_type
            `)
            .eq('status', 'expired')
            .order('created_at', { ascending: false })
            .limit(10);

        if (expiredError) {
            console.error('Error getting expired trips:', expiredError);
        } else {
            if (expiredTrips && expiredTrips.length > 0) {
                console.log(`   Found ${expiredTrips.length} recently expired trips:`);
                expiredTrips.forEach((trip, index) => {
                    const createdAt = new Date(trip.created_at);
                    const now = new Date();
                    const hoursSinceCreated = (now - createdAt) / (1000 * 60 * 60);
                    
                    console.log(`   ${index + 1}. ID: ${trip.id.substring(0, 8)}... - ${hoursSinceCreated.toFixed(2)} hours old`);
                    console.log(`      Status: ${trip.status}`);
                    console.log(`      Material: ${trip.material_type}`);
                    console.log(`      Pickup: ${trip.pickup_address?.substring(0, 50)}...`);
                });
                console.log();
            }
        }

        // 4. Check all visible trip statuses on map
        console.log('4. All trip statuses that might be visible on map:');
        const visibleStatuses = ['pending', 'matched', 'accepted', 'picked_up', 'in_transit'];
        
        for (const status of visibleStatuses) {
            const { data: trips, error } = await supabase
                .from('trip_requests')
                .select('id', { count: 'exact', head: true })
                .eq('status', status);
                
            if (!error) {
                console.log(`   ${status}: ${trips || 0} trips`);
            }
        }

    } catch (error) {
        console.error('💥 Error in detailed analysis:', error);
    }
}

checkDetailedTripStatus();
