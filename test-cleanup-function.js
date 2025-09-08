const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

async function testCleanupFunction() {
  console.log('🔍 Testing cleanup function that DriverService is calling...\n');
  
  // Test the function that DriverService is trying to call
  console.log('1. Testing cleanup_expired_trip_requests function:');
  try {
    const { data, error } = await supabase.rpc('cleanup_expired_trip_requests');
    if (error) {
      console.log('❌ Function does not exist or has error:', error.message);
      console.log('   Code:', error.code);
    } else {
      console.log('✅ Function exists and returned:', data);
    }
  } catch (err) {
    console.log('❌ Function call failed:', err.message);
  }
  
  console.log('\n2. Let\'s check what RPC functions exist:');
  
  // Try some common function names
  const functionsToTest = [
    'get_next_asap_trip_for_driver',
    'accept_asap_trip_simple', 
    'decline_asap_trip_simple',
    'cleanup_expired_requests',
    'expire_old_trips',
    'get_available_trips_for_driver'
  ];
  
  for (const funcName of functionsToTest) {
    try {
      const { data, error } = await supabase.rpc(funcName, {});
      if (error && error.code === '42883') {
        console.log(`❌ ${funcName}: Does not exist`);
      } else if (error) {
        console.log(`⚠️ ${funcName}: Exists but has error - ${error.message}`);
      } else {
        console.log(`✅ ${funcName}: Exists and works`);
      }
    } catch (err) {
      console.log(`❌ ${funcName}: Error - ${err.message}`);
    }
  }
  
  console.log('\n3. Testing manual cleanup SQL:');
  try {
    // Test direct SQL cleanup
    const { data: beforeCount } = await supabase
      .from('trip_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'matched')
      .lt('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()); // 2 hours ago
    
    console.log(`Found ${beforeCount || 0} matched trips older than 2 hours`);
    
    if (beforeCount && beforeCount > 0) {
      console.log('🛠️ These trips should be expired. The cleanup function is not working.');
    }
    
  } catch (err) {
    console.log('❌ Error checking old trips:', err.message);
  }
}

testCleanupFunction();
