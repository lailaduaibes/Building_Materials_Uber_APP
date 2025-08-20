// Test complete user registration and trip creation flow for new users
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCompleteUserFlow() {
  try {
    console.log('🧪 Testing Complete User Registration and Trip Creation Flow\n');
    
    // Generate a unique test email
    const timestamp = Date.now();
    const testEmail = `testuser.${timestamp}@testemail.com`;
    const testPassword = 'TestPassword123!';
    
    console.log('📧 Test email:', testEmail);
    
    // Step 1: Register a new user
    console.log('\n📝 Step 1: Registering new user...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          first_name: 'Test',
          last_name: 'User'
        }
      }
    });
    
    if (signUpError) {
      console.error('❌ Registration failed:', signUpError.message);
      return;
    }
    
    const authUser = signUpData.user;
    console.log('✅ User registered with Auth ID:', authUser.id);
    
    // Step 2: Check if user was automatically created in users table
    console.log('\n🔍 Step 2: Checking if user exists in custom users table...');
    const { data: dbUser, error: dbUserError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();
    
    if (dbUserError || !dbUser) {
      console.log('❌ User NOT automatically created in users table');
      console.log('Error:', dbUserError?.message || 'User not found');
      
      // Step 3: Manually create user in users table (this is the gap we need to fix)
      console.log('\n🔧 Step 3: Creating user in custom users table...');
      const newUserData = {
        id: authUser.id,
        email: authUser.email,
        password_hash: 'supabase_auth', // Placeholder since we use Supabase Auth
        first_name: authUser.user_metadata?.first_name || 'Test',
        last_name: authUser.user_metadata?.last_name || 'User',
        phone: authUser.user_metadata?.phone || '',
        role: 'customer',
        user_type: 'customer',
        is_active: true
      };
      
      const { data: createdUser, error: createError } = await supabase
        .from('users')
        .insert([newUserData])
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Failed to create user in users table:', createError.message);
        return;
      }
      
      console.log('✅ User created in users table:', createdUser.id);
    } else {
      console.log('✅ User already exists in users table:', dbUser.id);
      console.log('IDs match:', authUser.id === dbUser.id);
    }
    
    // Step 4: Test trip creation
    console.log('\n🚛 Step 4: Testing trip creation...');
    
    const tripData = {
      customer_id: authUser.id,
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
      load_description: "Test order from new user flow",
      status: "pending"
    };
    
    const { data: trip, error: tripError } = await supabase
      .from('trip_requests')
      .insert([tripData])
      .select()
      .single();
    
    if (tripError) {
      console.error('❌ Trip creation failed:', tripError.message);
      console.error('Error details:', {
        code: tripError.code,
        details: tripError.details,
        hint: tripError.hint
      });
    } else {
      console.log('✅ Trip created successfully!');
      console.log('Trip ID:', trip.id);
      console.log('Customer ID matches Auth ID:', trip.customer_id === authUser.id);
    }
    
    // Step 5: Cleanup test data
    console.log('\n🧹 Step 5: Cleaning up test data...');
    
    if (trip?.id) {
      await supabase.from('trip_requests').delete().eq('id', trip.id);
      console.log('✅ Test trip deleted');
    }
    
    await supabase.from('users').delete().eq('id', authUser.id);
    console.log('✅ Test user deleted from users table');
    
    // Note: We can't easily delete from Supabase Auth via client SDK
    console.log('⚠️ Note: Auth user remains (normal for Supabase Auth)');
    
    console.log('\n🎉 Test completed successfully!');
    
    // Summary and recommendations
    console.log('\n📋 ANALYSIS AND RECOMMENDATIONS:');
    console.log('════════════════════════════════════════');
    
    if (dbUserError) {
      console.log('❌ ISSUE FOUND: Users are NOT automatically created in the custom users table');
      console.log('💡 SOLUTION NEEDED: Implement automatic user creation trigger or function');
      console.log('📝 RECOMMENDATION: Add user creation logic to AuthService signup method');
    } else {
      console.log('✅ SUCCESS: User creation flow works correctly');
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

testCompleteUserFlow();
