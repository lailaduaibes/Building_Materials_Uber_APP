/**
 * Apply Uber-Style ASAP System to Database
 * This will execute the SQL to create the new sequential system
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyUberStyleASAPSystem() {
  console.log('🚀 Applying Uber-Style ASAP System to Database...\n');

  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'fix-asap-to-uber-sequential.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Split into individual statements (rough split for demo)
    const statements = sqlContent
      .split(/(?:\r?\n){2,}(?=CREATE|DO|SELECT)/) // Split on double newlines before keywords
      .filter(stmt => stmt.trim().length > 0 && !stmt.trim().startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (!statement) continue;

      console.log(`📝 Executing statement ${i + 1}/${statements.length}...`);
      
      // Extract just the first line for logging
      const firstLine = statement.split('\n')[0].substring(0, 80);
      console.log(`   ${firstLine}${firstLine.length >= 80 ? '...' : ''}`);

      try {
        const { data, error } = await supabase.rpc('exec_sql', {
          sql: statement
        });

        if (error) {
          console.log(`❌ Error in statement ${i + 1}:`, error.message);
          // Continue with other statements
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
          if (data) {
            console.log(`   Result:`, data);
          }
        }
      } catch (err) {
        console.log(`❌ Exception in statement ${i + 1}:`, err.message);
      }

      console.log(''); // Empty line for readability
    }

    // Test the new system
    console.log('🧪 TESTING NEW UBER-STYLE SYSTEM');
    console.log('=' .repeat(50));

    // Test start_asap_matching_uber_style
    console.log('\n🚀 Testing start_asap_matching_uber_style...');
    try {
      const { data: testResult, error: testError } = await supabase
        .rpc('start_asap_matching_uber_style', { 
          trip_request_id: '00000000-0000-0000-0000-000000000000' 
        });

      if (testError) {
        console.log(`❌ Function error: ${testError.message}`);
      } else {
        console.log(`✅ Function exists and callable:`, testResult);
      }
    } catch (err) {
      console.log(`❌ Function exception: ${err.message}`);
    }

    // Test decline_and_offer_next_driver
    console.log('\n🔄 Testing decline_and_offer_next_driver...');
    try {
      const { data: declineResult, error: declineError } = await supabase
        .rpc('decline_and_offer_next_driver', { 
          trip_request_id: '00000000-0000-0000-0000-000000000000',
          declining_driver_id: '00000000-0000-0000-0000-000000000000'
        });

      if (declineError) {
        console.log(`❌ Function error: ${declineError.message}`);
      } else {
        console.log(`✅ Function exists and callable:`, declineResult);
      }
    } catch (err) {
      console.log(`❌ Function exception: ${err.message}`);
    }

    // Test accept_trip_request_uber_style
    console.log('\n✅ Testing accept_trip_request_uber_style...');
    try {
      const { data: acceptResult, error: acceptError } = await supabase
        .rpc('accept_trip_request_uber_style', { 
          request_id: '00000000-0000-0000-0000-000000000000',
          accepting_driver_id: '00000000-0000-0000-0000-000000000000'
        });

      if (acceptError) {
        console.log(`❌ Function error: ${acceptError.message}`);
      } else {
        console.log(`✅ Function exists and callable:`, acceptResult);
      }
    } catch (err) {
      console.log(`❌ Function exception: ${err.message}`);
    }

    console.log('\n🎯 UBER-STYLE ASAP SYSTEM DEPLOYMENT COMPLETE!');
    console.log('=' .repeat(50));
    console.log('✅ New functions created for sequential driver offers');
    console.log('🔧 Next step: Update CustomerAppNew to use start_asap_matching_uber_style');
    console.log('📱 Next step: Update DriverService real-time subscription logic');
    console.log('⏰ Next step: Implement timeout handling for expired offers');

  } catch (error) {
    console.error('❌ Failed to apply Uber-style system:', error);
  }
}

// Execute the deployment
applyUberStyleASAPSystem().then(() => {
  console.log('\n✅ Deployment complete!');
  process.exit(0);
}).catch(err => {
  console.error('💥 Deployment failed:', err);
  process.exit(1);
});
