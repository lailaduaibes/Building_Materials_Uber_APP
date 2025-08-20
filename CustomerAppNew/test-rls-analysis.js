// Test RLS with proper user session
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRLSWithSession() {
  try {
    console.log('🧪 Testing RLS with Proper User Session\n');
    
    // First test with existing user (your account)
    console.log('📝 Step 1: Testing with existing user...');
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'lailaghassan2001@gmail.com',
      password: 'Hatelove@1412'
    });
    
    if (authError) {
      console.error('❌ Auth error:', authError.message);
      return;
    }
    
    console.log('✅ Signed in as:', authData.user.email);
    
    // Test trip creation with existing user
    const tripData = {
      customer_id: authData.user.id,
      pickup_latitude: 33.8938,
      pickup_longitude: 35.5018,
      pickup_address: {
        street: "Test Pickup Street",
        city: "Beirut",
        state: "Beirut",
        postal_code: "1200",
        formatted_address: "Test Pickup Street, Beirut, Lebanon"
      },
      delivery_latitude: 33.8869,
      delivery_longitude: 35.5131,
      delivery_address: {
        street: "Test Delivery Street",
        city: "Beirut",
        state: "Beirut",
        postal_code: "1201",
        formatted_address: "Test Delivery Street, Beirut, Lebanon"
      },
      material_type: "cement",
      load_description: "Test with existing user session",
      status: "pending"
    };
    
    const { data: trip1, error: tripError1 } = await supabase
      .from('trip_requests')
      .insert([tripData])
      .select()
      .single();
    
    if (tripError1) {
      console.error('❌ Existing user trip failed:', tripError1.message);
    } else {
      console.log('✅ Existing user trip created:', trip1.id);
      await supabase.from('trip_requests').delete().eq('id', trip1.id);
      console.log('✅ Cleaned up existing user trip');
    }
    
    // Now test the full flow with new user
    console.log('\n📝 Step 2: Testing complete new user flow...');
    
    // Sign out first
    await supabase.auth.signOut();
    console.log('🚪 Signed out');
    
    // Create new user
    const timestamp = Date.now();
    const testEmail = `testuser.${timestamp}@testemail.com`;
    const testPassword = 'TestPassword123!';
    
    console.log('📧 Creating new user:', testEmail);
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          first_name: 'Test',
          last_name: 'User',
          role: 'customer'
        }
      }
    });
    
    if (signUpError) {
      console.error('❌ Sign up failed:', signUpError.message);
      return;
    }
    
    const newUser = signUpData.user;
    console.log('✅ New user created:', newUser.id);
    
    // Create in custom users table
    const customUserData = {
      id: newUser.id,
      email: newUser.email,
      password_hash: 'supabase_auth',
      first_name: 'Test',
      last_name: 'User',
      phone: '',
      role: 'customer',
      user_type: 'customer',
      is_active: true
    };

    const { data: customUser, error: customUserError } = await supabase
      .from('users')
      .insert([customUserData])
      .select()
      .single();

    if (customUserError) {
      console.error('❌ Custom user creation failed:', customUserError.message);
      return;
    }

    console.log('✅ Custom user created:', customUser.id);
    
    // Try to sign in as new user (this might be the key for RLS)
    console.log('\n🔐 Attempting to sign in as new user...');
    
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (loginError) {
      console.log('⚠️ Login failed (might need email confirmation):', loginError.message);
      
      // Try trip creation without session (should fail)
      console.log('\n🚛 Testing trip creation without proper session...');
      const tripData2 = {
        ...tripData,
        customer_id: newUser.id,
        load_description: "Test without session"
      };
      
      const { data: trip2, error: tripError2 } = await supabase
        .from('trip_requests')
        .insert([tripData2])
        .select()
        .single();
      
      if (tripError2) {
        console.error('❌ Expected failure - trip creation failed:', tripError2.message);
        console.log('💡 This confirms RLS requires an active authenticated session');
      }
      
    } else {
      console.log('✅ Login successful as new user');
      
      // Now try trip creation with proper session
      console.log('\n🚛 Testing trip creation with authenticated session...');
      const tripData3 = {
        ...tripData,
        customer_id: newUser.id,
        load_description: "Test with authenticated session"
      };
      
      const { data: trip3, error: tripError3 } = await supabase
        .from('trip_requests')
        .insert([tripData3])
        .select()
        .single();
      
      if (tripError3) {
        console.error('❌ Trip creation still failed:', tripError3.message);
      } else {
        console.log('✅ Trip created with authenticated session:', trip3.id);
        await supabase.from('trip_requests').delete().eq('id', trip3.id);
        console.log('✅ Cleaned up trip');
      }
    }
    
    // Cleanup
    await supabase.from('users').delete().eq('id', newUser.id);
    console.log('✅ Cleaned up test user');
    
    console.log('\n📋 RLS ANALYSIS:');
    console.log('════════════════════════════════════════');
    console.log('🔍 RLS Policy likely requires:');
    console.log('   1. Active authenticated session');
    console.log('   2. Session user ID matches customer_id');
    console.log('   3. User exists in both auth and custom tables');
    console.log('\n💡 SOLUTION: Users must be properly authenticated before trip creation');
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

testRLSWithSession();
