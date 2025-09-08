const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

async function manualCleanupOldMatched() {
  try {
    console.log('🧹 Manually cleaning up old matched ASAP trips...');
    
    // First, let's see how many we'll clean
    const { data: beforeCount, error: beforeError } = await supabase
      .from('trip_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'matched');
    
    console.log(`📊 Before cleanup: ${beforeCount || 0} matched trips`);
    
    // Manually expire old matched trips (older than 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    
    const { data: updateResult, error: updateError } = await supabase
      .from('trip_requests')
      .update({ status: 'expired' })
      .eq('status', 'matched')
      .lt('created_at', twoHoursAgo)
      .select('id');
    
    if (updateError) {
      console.error('❌ Update error:', updateError);
      return;
    }
    
    console.log(`🎉 Successfully expired ${updateResult?.length || 0} old matched trips!`);
    
    // Check counts after
    const { data: afterCount, error: afterError } = await supabase
      .from('trip_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'matched');
    
    console.log(`📊 After cleanup: ${afterCount || 0} matched trips remaining`);
    
    // Now check available trips
    const { data: availableCount, error: availableError } = await supabase
      .from('trip_requests')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'matched'])
      .neq('pickup_time_preference', 'asap');
    
    console.log(`📋 Available trips (non-ASAP): ${availableCount || 0}`);
    
    if ((beforeCount || 0) > (afterCount || 0)) {
      console.log('\n✨ SUCCESS! Old matched trips cleaned up!');
      console.log('Your Available Trips section should now work properly.');
      console.log('ASAP trips will only appear via push notifications.');
    } else {
      console.log('\n⚠️ No trips were cleaned up. They might be newer than 2 hours.');
    }
    
  } catch (err) {
    console.error('💥 Error:', err.message);
  }
}

manualCleanupOldMatched();
