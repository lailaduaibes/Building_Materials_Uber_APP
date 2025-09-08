const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// 🎯 CORRECT PRODUCTION DATABASE (used by your apps)
const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

async function deployASAPFunctionsToProduction() {
  console.log('🚀 CRITICAL FIX: Deploying ASAP functions to PRODUCTION database');
  console.log('📍 Production URL: https://pjbbtmuhlpscmrbgsyzb.supabase.co');
  
  try {
    // Load the comprehensive ASAP fix
    const sqlContent = fs.readFileSync('../COMPREHENSIVE_ASAP_FIX.sql', 'utf8');
    console.log('📖 Loaded ASAP functions SQL');
    
    console.log('🔧 Deploying functions to PRODUCTION database...');
    const { data, error } = await supabase.rpc('execute_sql', { 
      query: sqlContent 
    });
    
    if (error) {
      console.error('❌ Error deploying to production:', error);
      return;
    }
    
    console.log('✅ SUCCESS: ASAP functions deployed to PRODUCTION database!');
    console.log('🎉 Your apps should now work with the Uber-style ASAP system');
    
    // Test the function on production database
    console.log('\\n🧪 Testing ASAP function on production database...');
    const { data: testResult, error: testError } = await supabase.rpc('start_asap_matching_uber_style', {
      trip_request_id: 'e280b170-307a-44e2-b980-002b4a9504a3'
    });
    
    if (testError) {
      console.error('❌ Function test failed:', testError.message);
    } else {
      console.log('✅ Function test succeeded on production!');
      console.log('📊 Result:', testResult);
    }
    
    // Check the trip status after function call
    console.log('\\n🔍 Checking trip status after function call...');
    const { data: tripData, error: tripError } = await supabase
      .from('trip_requests')
      .select('id, status, assigned_driver_id, load_description')
      .eq('id', 'e280b170-307a-44e2-b980-002b4a9504a3')
      .single();
    
    if (tripError) {
      console.error('❌ Cannot check trip:', tripError);
    } else {
      console.log('📋 Trip status after function call:');
      console.log('  Assigned Driver:', tripData.assigned_driver_id || 'NULL');
      console.log('  Has Queue:', tripData.load_description?.includes('[QUEUE:') ? 'YES' : 'NO');
      
      if (tripData.assigned_driver_id) {
        console.log('🎉 SUCCESS! Trip now has assigned_driver_id - drivers should see it!');
      } else {
        console.log('⚠️ Trip still has no assigned_driver_id - checking why...');
      }
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

deployASAPFunctionsToProduction();
