// Check users table and create user if needed
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndCreateUser() {
  try {
    // Sign in first
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'lailaghassan2001@gmail.com',
      password: 'Hatelove@1412'
    });
    
    if (authError) {
      console.error('Auth error:', authError);
      return;
    }
    
    const user = authData.user;
    console.log('Authenticated user ID:', user.id);
    console.log('User email:', user.email);
    
    // Check if user exists in custom users table
    console.log('\nChecking if user exists in users table...');
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking user:', checkError);
      return;
    }
    
    if (existingUser) {
      console.log('✅ User already exists in users table:', existingUser);
    } else {
      console.log('❌ User does not exist in users table. Creating...');
      
      // Create user in custom users table
      const newUser = {
        id: user.id,
        email: user.email,
        password_hash: 'supabase_auth', // Since we're using Supabase Auth, we don't need the actual hash
        first_name: user.user_metadata?.first_name || 'Laila',
        last_name: user.user_metadata?.last_name || 'Ghassan',
        phone: user.user_metadata?.phone || '',
        role: 'customer',
        user_type: 'customer',
        is_active: true
      };
      
      const { data: createdUser, error: createError } = await supabase
        .from('users')
        .insert([newUser])
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating user:', createError);
      } else {
        console.log('✅ User created successfully:', createdUser);
      }
    }
    
    // Now test trip creation again
    console.log('\n🚛 Testing trip creation...');
    
    const tripData = {
      customer_id: user.id,
      pickup_latitude: 33.8938,
      pickup_longitude: 35.5018,
      pickup_address: {
        street: "Test Street",
        city: "Beirut",
        state: "Beirut",
        postal_code: "1200",
        formatted_address: "Test Street, Beirut, Lebanon"
      },
      delivery_latitude: 33.8869,
      delivery_longitude: 35.5131,
      delivery_address: {
        street: "Delivery Street",
        city: "Beirut", 
        state: "Beirut",
        postal_code: "1201",
        formatted_address: "Delivery Street, Beirut, Lebanon"
      },
      material_type: "cement",
      load_description: "Test load",
      status: "pending"
    };
    
    const { data: trip, error: tripError } = await supabase
      .from('trip_requests')
      .insert([tripData])
      .select()
      .single();
    
    if (tripError) {
      console.error('❌ Trip creation failed:', tripError);
    } else {
      console.log('✅ Trip created successfully:', trip.id);
      
      // Clean up
      await supabase.from('trip_requests').delete().eq('id', trip.id);
      console.log('Test trip cleaned up');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkAndCreateUser();
