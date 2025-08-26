// =============================================================================
// SAFE DATABASE STATUS CHECK VIA NODE.JS
// This script safely checks the current database status
// =============================================================================

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://gvdoezpnwfcegdtnfcjm.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2ZG9lenBud2ZjZWdkdG5mY2ptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxNTYzNjEsImV4cCI6MjA0OTczMjM2MX0.xLF5Dj-_Qnh4jN-AoLmSuBEhVXWrpGfhYBc6VsGV6Ks';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseStatus() {
  console.log('🔍 CHECKING DATABASE STATUS - READ ONLY');
  console.log('=' * 50);
  
  try {
    // 1. Check trip_requests table structure
    console.log('\n1. 📋 TRIP_REQUESTS TABLE CHECK:');
    const { data: tripData, error: tripError } = await supabase
      .from('trip_requests')
      .select('*')
      .limit(1);
    
    if (tripData && tripData.length > 0) {
      console.log('✅ trip_requests table exists');
      console.log('📊 Available columns:', Object.keys(tripData[0]).join(', '));
      
      // Check for payment columns specifically
      const paymentColumns = Object.keys(tripData[0]).filter(col => 
        col.includes('payment') || col.includes('paid')
      );
      console.log('💳 Payment-related columns:', paymentColumns.length > 0 ? paymentColumns.join(', ') : 'NONE FOUND');
      
    } else {
      console.log('❌ trip_requests table issue:', tripError?.message || 'No data found');
    }

    // 2. Check payment_methods table
    console.log('\n2. 💳 PAYMENT_METHODS TABLE CHECK:');
    const { data: paymentData, error: paymentError } = await supabase
      .from('payment_methods')
      .select('*')
      .limit(1);
    
    if (paymentData && paymentData.length > 0) {
      console.log('✅ payment_methods table exists');
      console.log('📊 Available columns:', Object.keys(paymentData[0]).join(', '));
    } else if (paymentError?.code === 'PGRST116') {
      console.log('❌ payment_methods table does not exist');
    } else {
      console.log('⚠️ payment_methods table issue:', paymentError?.message || 'No data found');
    }

    // 3. Count records
    console.log('\n3. 📈 DATA COUNTS:');
    const { count: tripCount } = await supabase
      .from('trip_requests')
      .select('*', { count: 'exact', head: true });
    console.log(`📋 Total trip_requests: ${tripCount || 0}`);

    const { count: paymentCount } = await supabase
      .from('payment_methods')
      .select('*', { count: 'exact', head: true });
    console.log(`💳 Total payment_methods: ${paymentCount || 0}`);

    // 4. Sample data check
    console.log('\n4. 🔍 SAMPLE DATA:');
    if (tripData && tripData.length > 0) {
      const sample = tripData[0];
      console.log('📋 Sample trip_request:');
      console.log(`  - ID: ${sample.id}`);
      console.log(`  - Status: ${sample.status}`);
      console.log(`  - Price: ${sample.quoted_price || 'N/A'}`);
      console.log(`  - Customer: ${sample.customer_id}`);
    }

    // 5. Check for potential relationship
    console.log('\n5. 🔗 RELATIONSHIP STATUS:');
    if (tripData && tripData.length > 0) {
      const hasPaymentMethodId = 'payment_method_id' in tripData[0];
      const hasPaymentStatus = 'payment_status' in tripData[0];
      console.log(`💳 payment_method_id column: ${hasPaymentMethodId ? '✅ EXISTS' : '❌ MISSING'}`);
      console.log(`📊 payment_status column: ${hasPaymentStatus ? '✅ EXISTS' : '❌ MISSING'}`);
    }

    console.log('\n🎯 SUMMARY:');
    console.log('- Run the full SQL script (check-database-status-safely.sql) in Supabase SQL Editor for complete analysis');
    console.log('- This gives us the basic structure needed for next steps');

  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  }
}

// Run the check
checkDatabaseStatus().catch(console.error);
