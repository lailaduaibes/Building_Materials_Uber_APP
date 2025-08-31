const { createClient } = require('@supabase/supabase-js');

// Get environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugUserQuery() {
  try {
    console.log('🔍 Testing user query...');
    
    // First, get current auth user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
      return;
    }
    
    if (!session?.user) {
      console.log('⚠️ No authenticated user found');
      return;
    }
    
    console.log('✅ Found authenticated user:', session.user.id);
    console.log('📧 Email:', session.user.email);
    console.log('🎭 User metadata:', session.user.user_metadata);
    
    // Now test the database query
    console.log('\n🔍 Testing database query...');
    const { data: userData, error } = await supabase
      .from('users')
      .select('first_name, last_name, phone, role, created_at, last_seen')
      .eq('id', session.user.id)
      .single();
      
    if (error) {
      console.error('❌ Database query error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
    } else {
      console.log('✅ Database query successful:', userData);
    }
    
    // Test if the user record exists at all
    console.log('\n🔍 Testing if user record exists...');
    const { data: allUsers, error: countError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('id', session.user.id);
      
    if (countError) {
      console.error('❌ Count query error:', countError);
    } else {
      console.log('📊 User records found:', allUsers?.length || 0);
      if (allUsers && allUsers.length > 0) {
        console.log('📄 User record:', allUsers[0]);
      }
    }
    
    // Check table structure
    console.log('\n🔍 Testing table access...');
    const { data: sampleUsers, error: sampleError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role')
      .limit(3);
      
    if (sampleError) {
      console.error('❌ Sample query error:', sampleError);
    } else {
      console.log('📋 Sample users:', sampleUsers?.length || 0, 'records found');
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the debug
debugUserQuery().then(() => {
  console.log('\n✅ Debug complete');
  process.exit(0);
}).catch(error => {
  console.error('💥 Debug failed:', error);
  process.exit(1);
});
