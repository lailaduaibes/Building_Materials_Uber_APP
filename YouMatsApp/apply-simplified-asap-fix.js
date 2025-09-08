/**
 * 🔧 APPLY SIMPLIFIED ASAP FIX
 * This will replace the complex ASAP function with a simpler one that doesn't rely on missing functions
 */

async function applySimplifiedASAPFix() {
  console.log('🔧 Applying Simplified ASAP Fix...\n');

  const { createClient } = require('@supabase/supabase-js');
  const fs = require('fs');

  const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
  const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Read the SQL file
    const sqlContent = fs.readFileSync('../fix-asap-missing-function.sql', 'utf8');
    
    console.log('📋 Executing simplified ASAP function SQL...\n');
    
    // Split by SQL statements and execute each one
    const statements = sqlContent.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement.length === 0) continue;
      
      console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        const { data, error } = await supabase.rpc('execute_sql', {
          query: statement
        });

        if (error) {
          console.log(`❌ Error in statement ${i + 1}:`, error.message);
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
          if (data && data.length > 0) {
            console.log('   Result:', data);
          }
        }
      } catch (err) {
        console.log(`❌ Exception in statement ${i + 1}:`, err.message);
      }
    }

    console.log('\n🧪 Testing the fixed function...');
    
    // Test the function directly
    const { data: testResult, error: testError } = await supabase.rpc('start_asap_matching_uber_style_simplified', {
      trip_request_id: '6bbfc8f0-7cef-41d4-a994-b9d56a02bb7e' // The pending trip we found earlier
    });

    if (testError) {
      console.log('❌ Test error:', testError.message);
    } else {
      console.log('✅ Test result:', testResult);
    }

    // Check if the trip got assigned
    const { data: tripCheck } = await supabase
      .from('trip_requests')
      .select('id, status, assigned_driver_id')
      .eq('id', '6bbfc8f0-7cef-41d4-a994-b9d56a02bb7e')
      .single();

    console.log('\n📋 Trip status after fix:');
    console.log(`   Status: ${tripCheck?.status}`);
    console.log(`   Driver: ${tripCheck?.assigned_driver_id || 'NONE'}`);
    
    if (tripCheck?.assigned_driver_id) {
      console.log('\n🎉 SUCCESS! Trip now has assigned driver!');
      console.log('✅ This should fix the multiple notification issue.');
    } else {
      console.log('\n❌ Trip still has no assigned driver. Need to investigate further.');
    }

  } catch (error) {
    console.error('💥 Fix application failed:', error);
  }
}

// Run the fix
applySimplifiedASAPFix();
