const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://gleeodxunhiqltxywhrg.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZWVvZHh1bmhpcWx0eHl3aHJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDQ1MDYwOCwiZXhwIjoyMDUwMDI2NjA4fQ.X4Wr3hBPd_OWwcqPaD1LV7o31z55PZGBBXjGKBw3VHE'
);

async function testASAPFunction() {
  console.log('🧪 Testing start_asap_matching_uber_style function manually...');
  
  try {
    // Test the function on the existing trip
    console.log('Calling function for trip: e280b170-307a-44e2-b980-002b4a9504a3');
    
    const { data, error } = await supabase.rpc('start_asap_matching_uber_style', {
      trip_request_id: 'e280b170-307a-44e2-b980-002b4a9504a3'
    });
    
    if (error) {
      console.error('❌ Function call failed:', error);
      return;
    }
    
    console.log('✅ Function call succeeded!');
    console.log('📊 Result:', data);
    
    // Now check if the trip was updated
    console.log('\n🔍 Checking trip after function call...');
    const { data: tripData, error: tripError } = await supabase
      .from('trip_requests')
      .select('id, status, assigned_driver_id, load_description, acceptance_deadline')
      .eq('id', 'e280b170-307a-44e2-b980-002b4a9504a3')
      .single();
    
    if (tripError) {
      console.error('❌ Cannot check trip update:', tripError);
    } else {
      console.log('📋 Trip after function call:');
      console.log('  Status:', tripData.status);
      console.log('  Assigned Driver:', tripData.assigned_driver_id || 'NULL');
      console.log('  Has Queue:', tripData.load_description?.includes('[QUEUE:') ? 'YES' : 'NO');
      console.log('  Deadline:', tripData.acceptance_deadline || 'NULL');
      
      if (tripData.assigned_driver_id) {
        console.log('🎉 SUCCESS! Trip now has assigned_driver_id:', tripData.assigned_driver_id);
      } else {
        console.log('❌ PROBLEM: Trip still has no assigned_driver_id - function did not work');
      }
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

testASAPFunction();
