const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

async function analyzeSystemFlow() {
  try {
    console.log('=== COMPREHENSIVE SYSTEM ANALYSIS ===\n');

    // 1. Check sample of each trip type
    console.log('1. ASAP vs SCHEDULED TRIP ANALYSIS:');
    
    const { data: asapTrips, error: asapError } = await supabase
      .from('trip_requests')
      .select('id, status, pickup_time_preference, scheduled_pickup_time, created_at, assigned_driver_id')
      .eq('pickup_time_preference', 'asap')
      .order('created_at', { ascending: false })
      .limit(5);

    if (asapTrips) {
      console.log(`\\n   ASAP TRIPS (${asapTrips.length} samples):`);
      asapTrips.forEach((trip, i) => {
        console.log(`   ${i+1}. ID: ${trip.id.substring(0, 8)}... Status: ${trip.status} Created: ${trip.created_at} Assigned: ${trip.assigned_driver_id ? 'YES' : 'NO'}`);
      });
    }

    const { data: scheduledTrips, error: scheduledError } = await supabase
      .from('trip_requests')
      .select('id, status, pickup_time_preference, scheduled_pickup_time, created_at, assigned_driver_id')
      .eq('pickup_time_preference', 'scheduled')
      .order('created_at', { ascending: false })
      .limit(5);

    if (scheduledTrips) {
      console.log(`\\n   SCHEDULED TRIPS (${scheduledTrips.length} samples):`);
      scheduledTrips.forEach((trip, i) => {
        console.log(`   ${i+1}. ID: ${trip.id.substring(0, 8)}... Status: ${trip.status} Scheduled: ${trip.scheduled_pickup_time} Assigned: ${trip.assigned_driver_id ? 'YES' : 'NO'}`);
      });
    }

    // 2. Check status transitions for recent trips
    console.log('\\n2. RECENT TRIP STATUS ANALYSIS:');
    
    const { data: recentTrips, error: recentError } = await supabase
      .from('trip_requests')
      .select('id, status, pickup_time_preference, created_at, assigned_driver_id, considering_driver_id, acceptance_deadline')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentTrips) {
      console.log('   Recent trips (last 10):');
      recentTrips.forEach((trip, i) => {
        const age = ((new Date() - new Date(trip.created_at)) / (1000 * 60 * 60)).toFixed(1);
        console.log(`   ${i+1}. ${trip.pickup_time_preference?.toUpperCase()} - ${trip.status} (${age}h old) - Assigned: ${trip.assigned_driver_id ? 'YES' : 'NO'} - Considering: ${trip.considering_driver_id ? 'YES' : 'NO'}`);
      });
    }

    // 3. Check what functions exist for trip management
    console.log('\\n3. AVAILABLE RPC FUNCTIONS:');
    
    try {
      const { data: testCleanup, error: cleanupError } = await supabase.rpc('cleanup_expired_trip_requests');
      console.log('   ✅ cleanup_expired_trip_requests() - WORKS');
    } catch (e) {
      console.log('   ❌ cleanup_expired_trip_requests() - NOT FOUND');
    }

    try {
      const { data: testASAP, error: asapFuncError } = await supabase.rpc('get_next_asap_trip_for_driver', { driver_id: 'test' });
      console.log('   ✅ get_next_asap_trip_for_driver() - WORKS');
    } catch (e) {
      console.log('   ❌ get_next_asap_trip_for_driver() - NOT FOUND');
    }

    try {
      const { data: testAccept, error: acceptError } = await supabase.rpc('accept_asap_trip_simple', { trip_id: 'test', driver_id: 'test' });
      console.log('   ✅ accept_asap_trip_simple() - WORKS');
    } catch (e) {
      console.log('   ❌ accept_asap_trip_simple() - NOT FOUND');
    }

    try {
      const { data: testDecline, error: declineError } = await supabase.rpc('decline_asap_trip_simple', { trip_id: 'test', driver_id: 'test' });
      console.log('   ✅ decline_asap_trip_simple() - WORKS');
    } catch (e) {
      console.log('   ❌ decline_asap_trip_simple() - NOT FOUND');
    }

    // 4. Analyze trip flow patterns
    console.log('\\n4. TRIP FLOW PATTERNS:');
    
    const { data: flowAnalysis, error: flowError } = await supabase
      .from('trip_requests')
      .select('pickup_time_preference, status')
      .order('created_at', { ascending: false })
      .limit(100);

    if (flowAnalysis) {
      const patterns = {};
      flowAnalysis.forEach(trip => {
        const key = `${trip.pickup_time_preference}-${trip.status}`;
        patterns[key] = (patterns[key] || 0) + 1;
      });

      console.log('   Pattern analysis (last 100 trips):');
      Object.entries(patterns)
        .sort((a, b) => b[1] - a[1])
        .forEach(([pattern, count]) => {
          console.log(`   ${pattern}: ${count} trips`);
        });
    }

    // 5. Check if trips get stuck in matched status
    console.log('\\n5. STUCK TRIP ANALYSIS:');
    
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: stuckTrips, error: stuckError } = await supabase
      .from('trip_requests')
      .select('id, status, pickup_time_preference, created_at, assigned_driver_id')
      .eq('status', 'matched')
      .lt('created_at', oneHourAgo);

    if (stuckTrips) {
      console.log(`   Found ${stuckTrips.length} trips stuck in 'matched' status > 1 hour:`);
      stuckTrips.slice(0, 5).forEach((trip, i) => {
        const age = ((new Date() - new Date(trip.created_at)) / (1000 * 60 * 60)).toFixed(1);
        console.log(`   ${i+1}. ${trip.pickup_time_preference?.toUpperCase()} trip - ${age}h old - Driver: ${trip.assigned_driver_id?.substring(0, 8)}...`);
      });
    }

  } catch (error) {
    console.error('💥 Analysis error:', error);
  }
}

analyzeSystemFlow();
