// Test the fixed trip creation
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFixedTripCreation() {
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
    
    const authUser = authData.user;
    console.log('Authenticated:', authUser.email);
    
    // Get the corresponding user from the custom users table (by email)
    const { data: dbUser, error: dbUserError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('email', authUser.email)
      .single();

    if (dbUserError || !dbUser) {
      console.error('❌ Database user not found:', dbUserError);
      return;
    }

    console.log('✅ Database user found:', dbUser.email, 'DB ID:', dbUser.id);
    
    // Test trip creation with database user ID
    console.log('\n🚛 Testing trip creation with fixed logic...');
    
    const tripData = {
      customer_id: dbUser.id, // Use database user ID
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
      load_description: "Test load from fixed service",
      status: "pending"
    };
    
    console.log('Attempting insert with data:', {
      customer_id: tripData.customer_id,
      material_type: tripData.material_type,
      load_description: tripData.load_description
    });
    
    const { data: trip, error: tripError } = await supabase
      .from('trip_requests')
      .insert([tripData])
      .select()
      .single();
    
    if (tripError) {
      console.error('❌ Trip creation failed:', tripError);
      console.error('Error details:', {
        message: tripError.message,
        details: tripError.details,
        hint: tripError.hint,
        code: tripError.code
      });
    } else {
      console.log('✅ Trip created successfully!');
      console.log('Trip ID:', trip.id);
      console.log('Customer ID:', trip.customer_id);
      console.log('Status:', trip.status);
      
      // Clean up
      await supabase.from('trip_requests').delete().eq('id', trip.id);
      console.log('✅ Test trip cleaned up');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testFixedTripCreation();
