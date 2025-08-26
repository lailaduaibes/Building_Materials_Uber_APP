// Debug the foreign key constraint issue in trip_call_logs
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyOTg4MDgsImV4cCI6MjA4Mzg3NDgwOH0.oOLLDkd8s0TuJYXI5zDFULIwWk_JUaKBYGDSjPzAhSQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugForeignKeyIssue() {
  try {
    console.log('🔍 Debugging Foreign Key Issue...\n');
    
    // 1. Check the problematic driver ID from logs
    const problemDriverId = '4ab16336-a414-4b73-8dc9-ab97d0eed1a7';
    
    console.log('1. Checking driver profile...');
    const { data: driverProfile, error: dpError } = await supabase
      .from('driver_profiles')
      .select('id, first_name, last_name, phone, user_id')
      .eq('id', problemDriverId)
      .single();
      
    if (dpError) {
      console.error('❌ Driver profile error:', dpError);
    } else {
      console.log('✅ Driver profile found:', driverProfile);
    }
    
    // 2. Check the root problem - what should be used for receiver_id?
    console.log('\n2. The Real Issue:');
    console.log('❌ Code is using driver_profile.id as receiver_id');
    console.log('❌ But trip_call_logs.receiver_id references auth.users.id'); 
    console.log('❌ Need to use driver_profile.user_id instead');
    
    // 3. Check trip_call_logs table structure
    console.log('\n3. Checking trip_call_logs constraints...');
    const { data: constraints, error: constraintError } = await supabase.rpc('get_table_constraints', {
      table_name: 'trip_call_logs'
    });
    
    if (constraintError) {
      console.log('⚠️ Cannot query constraints:', constraintError.message);
    }
    
    // 4. Show all driver profiles and their auth relationships
    console.log('\n4. Checking all driver-auth relationships...');
    const { data: allDrivers, error: allError } = await supabase
      .from('driver_profiles')
      .select('id, first_name, last_name, user_id')
      .limit(5);
      
    if (!allError) {
      console.log('Driver profiles:');
      for (const driver of allDrivers) {
        // Check if corresponding auth user exists
        const { data: userCheck } = await supabase.auth.admin.getUserById(driver.user_id || driver.id);
        console.log(`- ${driver.first_name} ${driver.last_name}: driver_id=${driver.id}, user_id=${driver.user_id}, auth_exists=${!!userCheck?.user}`);
      }
    }
    
    // 5. The real issue: trip_call_logs.receiver_id should reference driver user_id, not driver profile id
    console.log('\n5. The Problem:');
    console.log('❌ trip_call_logs.receiver_id is trying to reference auth.users.id');
    console.log('❌ But we\'re passing driver_profile.id instead of driver_profile.user_id');
    console.log('❌ Or the foreign key constraint is wrong');
    
    // 6. Check what the receiver_id should be
    if (driverProfile && driverProfile.user_id) {
      console.log('\n6. Correct receiver_id should be:', driverProfile.user_id);
      
      // Test if this user_id exists in auth
      const { data: correctUser } = await supabase.auth.admin.getUserById(driverProfile.user_id);
      console.log('✅ Correct user exists:', !!correctUser?.user);
    }
    
  } catch (error) {
    console.error('💥 Debug error:', error);
  }
}

debugForeignKeyIssue();
