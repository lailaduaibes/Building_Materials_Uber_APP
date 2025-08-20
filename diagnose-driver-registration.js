const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bqfclflxjuixcmfkfcek.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZmNsZmx4anVpeGNtZmtmY2VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIwMzk2MDQsImV4cCI6MjA0NzYxNTYwNH0.AHlrLdpRGPy0kkFvs-xElAHdjhOxpJJNg6HBTLrSV1Q';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCurrentIssue() {
  console.log('\n🔍 Diagnosing Current Driver Registration Issue');
  console.log('==============================================');
  
  try {
    // Test 1: Check if we can access the users table at all
    console.log('\n📝 Test 1: Checking users table accessibility...');
    const { data: testQuery, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.error('❌ Cannot access users table:', testError);
      console.error('   Error code:', testError.code);
      console.error('   Error message:', testError.message);
      console.error('   Error details:', testError.details);
    } else {
      console.log('✅ Users table is accessible');
    }

    // Test 2: Try to check RLS policies on users table
    console.log('\n📝 Test 2: Checking RLS status on users table...');
    const { data: rlsCheck, error: rlsError } = await supabase
      .rpc('check_table_rls', { table_name: 'users' });
    
    if (rlsError) {
      console.log('⚠️ Could not check RLS status:', rlsError.message);
    } else {
      console.log('RLS status result:', rlsCheck);
    }

    // Test 3: Try a simple insert to see what specific error we get
    console.log('\n📝 Test 3: Testing simple insert to users table...');
    const testUserData = {
      id: '00000000-0000-0000-0000-000000000001', // Test UUID
      email: 'test@example.com',
      password_hash: 'test',
      first_name: 'Test',
      last_name: 'User',
      phone: '+1234567890',
      role: 'driver',
      user_type: 'driver',
      is_active: true
    };

    const { data: insertResult, error: insertError } = await supabase
      .from('users')
      .insert([testUserData])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert failed with error:');
      console.error('   Code:', insertError.code);
      console.error('   Message:', insertError.message);
      console.error('   Details:', insertError.details);
      console.error('   Hint:', insertError.hint);
      
      // Analyze the specific error
      if (insertError.code === '42501') {
        console.log('\n💡 DIAGNOSIS: Permission denied (42501)');
        console.log('   This means RLS policies are blocking the insert');
        console.log('   Need to check RLS policies on users table');
      } else if (insertError.code === '23505') {
        console.log('\n💡 DIAGNOSIS: Duplicate key (23505)');
        console.log('   User already exists - this is expected for test data');
      } else if (insertError.code === '23503') {
        console.log('\n💡 DIAGNOSIS: Foreign key constraint (23503)');
        console.log('   Some referenced table/field is missing');
      }
    } else {
      console.log('✅ Insert successful:', insertResult.id);
      
      // Clean up test data
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', testUserData.id);
      
      if (deleteError) {
        console.log('⚠️ Could not clean up test data:', deleteError.message);
      } else {
        console.log('✅ Test data cleaned up');
      }
    }

    // Test 4: Check what authentication method is being used
    console.log('\n📝 Test 4: Checking current authentication context...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.log('ℹ️ No authenticated user (this is normal for testing)');
    } else if (user) {
      console.log('ℹ️ Currently authenticated as:', user.email);
      console.log('   User role from auth metadata:', user.user_metadata?.role);
    } else {
      console.log('ℹ️ No authenticated user');
    }

  } catch (error) {
    console.error('💥 Test failed with unexpected error:', error);
  }
}

checkCurrentIssue();
