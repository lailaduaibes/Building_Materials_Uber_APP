const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeAvailableTrips() {
    try {
        console.log('=== AVAILABLE TRIPS ANALYSIS ===\n');

        // 1. Check what pickup_time_preference values exist
        console.log('1. All pickup_time_preference values in database:');
        const { data: allPrefs, error: prefError } = await supabase
            .from('trip_requests')
            .select('pickup_time_preference')
            .not('pickup_time_preference', 'is', null);

        if (prefError) {
            console.error('Error getting preferences:', prefError);
        } else {
            const prefCounts = {};
            allPrefs?.forEach(trip => {
                const pref = trip.pickup_time_preference || 'NULL';
                prefCounts[pref] = (prefCounts[pref] || 0) + 1;
            });
            
            Object.entries(prefCounts).forEach(([pref, count]) => {
                console.log(`   ${pref}: ${count} trips`);
            });
        }
        console.log();

        // 2. Check trips that would appear in "Available Trips" (without driver filter)
        console.log('2. Trips that could appear in Available Trips section:');
        const { data: availableTrips, error: availableError } = await supabase
            .from('trip_requests')
            .select(`
                id,
                status,
                pickup_time_preference,
                assigned_driver_id,
                considering_driver_id,
                created_at,
                material_type,
                quoted_price
            `)
            .in('status', ['pending', 'matched'])
            .neq('pickup_time_preference', 'asap')  // This should exclude ASAP
            .order('created_at', { ascending: false })
            .limit(10);

        if (availableError) {
            console.error('Error getting available trips:', availableError);
        } else {
            console.log(`   Found ${availableTrips?.length || 0} non-ASAP trips:`);
            availableTrips?.forEach((trip, index) => {
                const hoursOld = ((new Date() - new Date(trip.created_at)) / (1000 * 60 * 60)).toFixed(1);
                console.log(`   ${index + 1}. ${trip.id.substring(0, 8)}... (${hoursOld}h old)`);
                console.log(`      Status: ${trip.status}`);
                console.log(`      Preference: ${trip.pickup_time_preference || 'NULL'}`);
                console.log(`      Material: ${trip.material_type}`);
                console.log(`      Assigned: ${trip.assigned_driver_id ? 'YES' : 'NO'}`);
                console.log();
            });
        }

        // 3. Check if there are trips with NULL pickup_time_preference
        console.log('3. Trips with NULL pickup_time_preference (these might be the problem):');
        const { data: nullPrefs, error: nullError } = await supabase
            .from('trip_requests')
            .select(`
                id,
                status,
                pickup_time_preference,
                created_at,
                material_type
            `)
            .in('status', ['pending', 'matched'])
            .is('pickup_time_preference', null)
            .limit(5);

        if (nullError) {
            console.error('Error getting NULL preferences:', nullError);
        } else {
            console.log(`   Found ${nullPrefs?.length || 0} trips with NULL preference:`);
            nullPrefs?.forEach((trip, index) => {
                const hoursOld = ((new Date() - new Date(trip.created_at)) / (1000 * 60 * 60)).toFixed(1);
                console.log(`   ${index + 1}. ${trip.id.substring(0, 8)}... (${hoursOld}h old) - ${trip.status}`);
            });
        }
        console.log();

        // 4. Check ASAP trips specifically
        console.log('4. ASAP trips (should NOT appear in Available Trips):');
        const { data: asapTrips, error: asapError } = await supabase
            .from('trip_requests')
            .select(`
                id,
                status,
                pickup_time_preference,
                created_at,
                material_type
            `)
            .in('status', ['pending', 'matched'])
            .eq('pickup_time_preference', 'asap')
            .limit(5);

        if (asapError) {
            console.error('Error getting ASAP trips:', asapError);
        } else {
            console.log(`   Found ${asapTrips?.length || 0} ASAP trips:`);
            asapTrips?.forEach((trip, index) => {
                const hoursOld = ((new Date() - new Date(trip.created_at)) / (1000 * 60 * 60)).toFixed(1);
                console.log(`   ${index + 1}. ${trip.id.substring(0, 8)}... (${hoursOld}h old) - ${trip.status}`);
            });
        }

    } catch (error) {
        console.error('💥 Error in analysis:', error);
    }
}

analyzeAvailableTrips();
