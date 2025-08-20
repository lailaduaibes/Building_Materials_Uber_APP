// Test trip creation to identify the exact database error
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTripCreation() {
  try {
    console.log('Testing trip creation...');
    
    // Test 1: Check if we can connect and get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('Session check:', { hasSession: !!session, error: sessionError });
    
    if (!session) {
      // Try to sign in with the test user
      console.log('No session, trying to sign in...');
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'lailaghassan2001@gmail.com',
        password: 'Hatelove@1412'
      });
      
      if (authError) {
        console.error('Auth error:', authError);
        return;
      }
      
      console.log('Successfully signed in:', authData.user.email);
    }
    
    // Test 2: Check the trip_requests table structure
    console.log('\nChecking trip_requests table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('trip_requests')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('Table access error:', tableError);
    } else {
      console.log('Table accessible, sample structure:', Object.keys(tableInfo[0] || {}));
    }
    
    // Test 3: Try inserting a minimal trip request
    console.log('\nTesting minimal trip insertion...');
    
    const { data: { user } } = await supabase.auth.getUser();
    
    const minimalTrip = {
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
    
    console.log('Attempting to insert:', JSON.stringify(minimalTrip, null, 2));
    
    const { data, error } = await supabase
      .from('trip_requests')
      .insert([minimalTrip])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Insert error:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
    } else {
      console.log('✅ Success! Trip created:', data.id);
      
      // Clean up - delete the test trip
      await supabase.from('trip_requests').delete().eq('id', data.id);
      console.log('Test trip cleaned up');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testTripCreation();
