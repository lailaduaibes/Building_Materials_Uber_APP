const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

async function deployFixAndTest() {
  try {
    console.log('🔧 Deploying the fixed cleanup function...');
    
    // Read the fixed function
    const fixedFunction = fs.readFileSync('fix-cleanup-function.sql', 'utf8');
    
    // Deploy the fixed function (you'll need to run this in PostgreSQL)
    console.log('📋 Copy and run this SQL in your database:');
    console.log('=' .repeat(80));
    console.log(fixedFunction);
    console.log('=' .repeat(80));
    
    console.log('\n🧪 Testing the current function before fix...');
    
    // Test current function
    const { data: beforeCleanup, error: beforeError } = await supabase.rpc('cleanup_expired_trip_requests');
    
    if (beforeError) {
      console.error('❌ Error calling cleanup function:', beforeError);
    } else {
      console.log('📊 Current cleanup result:', beforeCleanup);
    }
    
    // Check current matched trips
    const { data: matchedTrips, error: matchedError } = await supabase
      .from('trip_requests')
      .select('id, status, created_at, assigned_driver_id')
      .eq('status', 'matched')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (matchedError) {
      console.error('❌ Error getting matched trips:', matchedError);
    } else {
      console.log(`\n📋 Current matched trips: ${matchedTrips?.length || 0}`);
      
      if (matchedTrips && matchedTrips.length > 0) {
        console.log('   Sample matched trips:');
        matchedTrips.slice(0, 5).forEach((trip, index) => {
          const hoursOld = ((new Date() - new Date(trip.created_at)) / (1000 * 60 * 60)).toFixed(1);
          console.log(`   ${index + 1}. ${trip.id.substring(0, 8)}... - ${hoursOld}h old`);
        });
      }
    }
    
    console.log('\n🎯 SOLUTION:');
    console.log('1. Run the SQL above to update the cleanup function');
    console.log('2. The function will now clean up old "matched" trips');
    console.log('3. This should solve your map showing too many trips');
    
  } catch (error) {
    console.error('💥 Error:', error);
  }
}

deployFixAndTest();
