/**
 * Simple Trip Database Test
 */
console.log('🔄 Checking trip database...');

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ3MTA3NzAsImV4cCI6MjA1MDI4Njc3MH0.hxjZ7PJaWrVCdkjnDJNrOdFDfshJE-8BjGMBJQT2E5k'
);

async function checkTrips() {
  try {
    const { data, error, count } = await supabase
      .from('trip_requests')
      .select('*', { count: 'exact' })
      .limit(5);
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    console.log(`✅ Found ${count} total trips in database`);
    if (data && data.length > 0) {
      console.log('📋 Recent trips:');
      data.forEach((trip, i) => {
        console.log(`   ${i+1}. ${trip.material_type} - ${trip.status} - Customer: ${trip.customer_id}`);
      });
    } else {
      console.log('⚠️  No trips found');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkTrips();
