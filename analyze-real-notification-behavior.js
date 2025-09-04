/**
 * Analyze Real ASAP Notification Behavior
 * Since notifications ARE appearing, let's see exactly what's happening
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeRealNotificationBehavior() {
  console.log('🔍 Analyzing Real ASAP Notification Behavior...\n');

  try {
    // 1. Check recent successful ASAP trips that had notifications
    console.log('📱 1. CHECKING RECENT ASAP TRIPS WITH NOTIFICATIONS');
    console.log('=' .repeat(60));

    const { data: recentTrips, error: tripsError } = await supabase
      .from('trip_requests')
      .select('*')
      .eq('pickup_time_preference', 'asap')
      .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // Last 2 hours
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentTrips && recentTrips.length > 0) {
      console.log(`Found ${recentTrips.length} recent ASAP trips:`);
      
      for (const trip of recentTrips) {
        console.log(`\n🚛 Trip ${trip.id.substring(0, 8)}:`);
        console.log(`   Status: ${trip.status}`);
        console.log(`   Assigned Driver: ${trip.assigned_driver_id ? trip.assigned_driver_id.substring(0, 8) : 'None'}`);
        console.log(`   Original Trip: ${trip.original_trip_id ? trip.original_trip_id.substring(0, 8) : 'Main Trip'}`);
        console.log(`   Created: ${trip.created_at}`);
        console.log(`   Matching Started: ${trip.matching_started_at || 'None'}`);
        console.log(`   Acceptance Deadline: ${trip.acceptance_deadline || 'None'}`);

        // Check if this is a main trip with individual requests
        if (!trip.original_trip_id) {
          console.log(`   \n   🔍 Checking individual requests for this main trip...`);
          
          const { data: individualRequests, error: individualError } = await supabase
            .from('trip_requests')
            .select('*')
            .eq('original_trip_id', trip.id)
            .order('created_at', { ascending: true });

          if (individualRequests && individualRequests.length > 0) {
            console.log(`   ✅ Found ${individualRequests.length} individual driver requests:`);
            individualRequests.forEach((req, index) => {
              console.log(`      ${index + 1}. Driver ${req.assigned_driver_id.substring(0, 8)}: ${req.status}`);
              console.log(`         Deadline: ${req.acceptance_deadline}`);
              console.log(`         Sent: ${req.driver_request_sent_at}`);
            });
            
            console.log(`   \n   🎯 BEHAVIOR: BROADCAST SYSTEM - All ${individualRequests.length} drivers got notifications simultaneously!`);
          } else {
            console.log(`   ❌ No individual requests found (direct assignment system)`);
            console.log(`   🎯 BEHAVIOR: DIRECT ASSIGNMENT SYSTEM`);
          }
        } else {
          console.log(`   📋 This is an individual request for main trip ${trip.original_trip_id.substring(0, 8)}`);
        }
      }
    } else {
      console.log('❌ No recent ASAP trips found');
    }

    // 2. Check which system is actually being used
    console.log('\n\n🔍 2. ANALYZING CURRENT SYSTEM BEHAVIOR');
    console.log('=' .repeat(60));

    const hasIndividualRequests = recentTrips?.some(trip => trip.original_trip_id !== null);
    const hasMainTripsWithChildren = recentTrips && await Promise.all(
      recentTrips
        .filter(trip => !trip.original_trip_id)
        .map(async (trip) => {
          const { data: children } = await supabase
            .from('trip_requests')
            .select('id')
            .eq('original_trip_id', trip.id);
          return children && children.length > 0;
        })
    ).then(results => results.some(hasChildren => hasChildren));

    if (hasIndividualRequests || hasMainTripsWithChildren) {
      console.log('🎯 CURRENT SYSTEM: BROADCAST/INDIVIDUAL REQUEST SYSTEM');
      console.log('   ✅ Creates individual requests for multiple drivers');
      console.log('   ❌ All drivers get notifications simultaneously');
      console.log('   ❌ Not following Uber\'s sequential pattern');
      
      console.log('\n💡 SOLUTION NEEDED:');
      console.log('   🔧 Convert to TRUE UBER SYSTEM:');
      console.log('   1. ONE trip request (no individual copies)');
      console.log('   2. Offer to Driver #1 first');
      console.log('   3. If declined/timeout → offer to Driver #2');
      console.log('   4. Continue sequentially until accepted or expired');
      
    } else {
      console.log('🎯 CURRENT SYSTEM: DIRECT ASSIGNMENT SYSTEM');
      console.log('   📋 No individual requests created');
      console.log('   ❓ Need to investigate how notifications are sent');
    }

    // 3. Check real-time subscription setup
    console.log('\n\n📡 3. ANALYZING REAL-TIME SUBSCRIPTION LOGIC');
    console.log('=' .repeat(60));
    
    console.log('Current DriverService.ts subscription filter:');
    console.log('   pickup_time_preference=eq.asap AND assigned_driver_id=eq.${driverId}');
    console.log('');
    
    if (hasIndividualRequests || hasMainTripsWithChildren) {
      console.log('✅ This filter WORKS with individual request system because:');
      console.log('   - Individual requests have assigned_driver_id set to specific driver');
      console.log('   - Each driver gets their own trip request record');
      console.log('   - Real-time subscription triggers when their specific request is inserted');
      console.log('');
      console.log('❌ PROBLEM: Multiple drivers get notifications simultaneously');
      console.log('   instead of sequential Uber-style notifications');
    } else {
      console.log('❌ This filter DOESN\'T WORK with direct assignment because:');
      console.log('   - Main trip has assigned_driver_id = NULL initially');
      console.log('   - No individual requests are created');
      console.log('   - Real-time subscription never triggers');
    }

    // 4. Show the fix needed
    console.log('\n\n🛠️ 4. THE FIX NEEDED');
    console.log('=' .repeat(60));
    
    if (hasIndividualRequests || hasMainTripsWithChildren) {
      console.log('CURRENT: Broadcast System (All drivers notified simultaneously)');
      console.log('  Customer creates trip → start_asap_matching creates 5 individual requests');
      console.log('  → All 5 drivers get notifications at once → Race condition');
      console.log('');
      console.log('NEEDED: Sequential Uber System');
      console.log('  Customer creates trip → Offer to Driver #1 → Wait for response');
      console.log('  → If declined, offer to Driver #2 → Continue sequentially');
      console.log('');
      console.log('🔧 IMPLEMENTATION:');
      console.log('  1. Modify start_asap_matching to only assign to ONE driver at a time');
      console.log('  2. Add timeout mechanism (15 seconds)');
      console.log('  3. Add decline handler that moves to next driver');
      console.log('  4. Keep track of which drivers have been tried');
    }

    console.log('\n✅ Analysis complete! We now understand the exact behavior.');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

// Execute analysis
analyzeRealNotificationBehavior().then(() => {
  console.log('\n🎯 Ready to implement sequential Uber system!');
  process.exit(0);
}).catch(err => {
  console.error('💥 Analysis failed:', err);
  process.exit(1);
});
