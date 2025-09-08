const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

async function checkASAPTripsData() {
  try {
    console.log('=== CHECKING ASAP TRIPS DATA ===\n');

    // 1. Check what pickup_time_preference values exist
    console.log('1. All pickup_time_preference values in database:');
    const { data: allPrefs, error: prefError } = await supabase
      .from('trip_requests')
      .select('pickup_time_preference')
      .order('pickup_time_preference');

    if (prefError) {
      console.error('Error:', prefError);
    } else {
      const prefCounts = {};
      allPrefs?.forEach(trip => {
        const pref = trip.pickup_time_preference || 'NULL';
        prefCounts[pref] = (prefCounts[pref] || 0) + 1;
      });
      
      Object.entries(prefCounts).forEach(([pref, count]) => {
        console.log(`   ${pref}: ${count} trips`);
      });
      console.log();
    }

    // 2. Check matched trips specifically
    console.log('2. Matched trips and their pickup preferences:');
    const { data: matchedTrips, error: matchedError } = await supabase
      .from('trip_requests')
      .select(`
        id,
        status,
        pickup_time_preference,
        scheduled_pickup_time,
        created_at,
        assigned_driver_id,
        considering_driver_id,
        material_type
      `)
      .eq('status', 'matched')
      .order('created_at', { ascending: false })
      .limit(10);

    if (matchedError) {
      console.error('Error:', matchedError);
    } else {
      console.log(`   Found ${matchedTrips?.length || 0} matched trips:`);
      matchedTrips?.forEach((trip, index) => {
        const hoursOld = ((new Date() - new Date(trip.created_at)) / (1000 * 60 * 60)).toFixed(1);
        console.log(`   ${index + 1}. ${trip.id.substring(0, 8)}... (${hoursOld}h old)`);
        console.log(`      Status: ${trip.status}`);
        console.log(`      Pickup preference: ${trip.pickup_time_preference || 'NULL'}`);
        console.log(`      Scheduled time: ${trip.scheduled_pickup_time || 'NULL'}`);
        console.log(`      Assigned to: ${trip.assigned_driver_id?.substring(0, 8) || 'None'}...`);
        console.log(`      Considering: ${trip.considering_driver_id?.substring(0, 8) || 'None'}...`);
        console.log(`      Material: ${trip.material_type}`);
        console.log();
      });
    }

    // 3. Check if there are trips that should be ASAP but aren't marked as such
    console.log('3. Trips that might be ASAP but not marked correctly:');
    const { data: suspectTrips, error: suspectError } = await supabase
      .from('trip_requests')
      .select(`
        id,
        status,
        pickup_time_preference,
        scheduled_pickup_time,
        considering_driver_id,
        acceptance_deadline,
        created_at
      `)
      .eq('status', 'matched')
      .is('scheduled_pickup_time', null)  // No scheduled time = likely ASAP
      .neq('pickup_time_preference', 'asap')  // But not marked as ASAP
      .limit(5);

    if (suspectError) {
      console.error('Error:', suspectError);
    } else {
      if (suspectTrips && suspectTrips.length > 0) {
        console.log(`   Found ${suspectTrips.length} trips that might be mismarked ASAP trips:`);
        suspectTrips.forEach((trip, index) => {
          console.log(`   ${index + 1}. ${trip.id.substring(0, 8)}...`);
          console.log(`      Preference: ${trip.pickup_time_preference || 'NULL'} (should be 'asap'?)`);
          console.log(`      Has consideration: ${trip.considering_driver_id ? 'Yes' : 'No'}`);
          console.log(`      Has deadline: ${trip.acceptance_deadline ? 'Yes' : 'No'}`);
        });
      } else {
        console.log('   No suspicious trips found');
      }
      console.log();
    }

    // 4. Show current filter logic test
    console.log('4. Testing current getAvailableTrips filter:');
    const testDriverId = '04d796a5-8a76-4cff-b84d-40b2b39bd254'; // From your earlier data
    
    const { data: filteredTrips, error: filterError } = await supabase
      .from('trip_requests')
      .select('id, status, pickup_time_preference, assigned_driver_id')
      .eq('assigned_driver_id', testDriverId)
      .in('status', ['matched', 'accepted', 'picked_up', 'in_transit'])
      .neq('pickup_time_preference', 'asap');

    if (filterError) {
      console.error('Error:', filterError);
    } else {
      console.log(`   Driver ${testDriverId.substring(0, 8)}... would see ${filteredTrips?.length || 0} trips in Available Trips`);
      
      // Also check what they would see if we DIDN'T filter ASAP
      const { data: unfilteredTrips, error: unfilteredError } = await supabase
        .from('trip_requests')
        .select('id, status, pickup_time_preference, assigned_driver_id')
        .eq('assigned_driver_id', testDriverId)
        .in('status', ['matched', 'accepted', 'picked_up', 'in_transit']);

      if (!unfilteredError) {
        console.log(`   Without ASAP filter, they would see ${unfilteredTrips?.length || 0} trips`);
        console.log(`   Difference: ${(unfilteredTrips?.length || 0) - (filteredTrips?.length || 0)} ASAP trips filtered out`);
      }
    }

  } catch (error) {
    console.error('💥 Error:', error);
  }
}

checkASAPTripsData();
