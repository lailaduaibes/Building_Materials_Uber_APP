const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createDriverProfile() {
  console.log('🔧 Creating driver profile with authenticated session...');
  
  const driverUserId = '7a9ce2f0-db9d-46a7-aef3-c01635d90592';
  
  // First authenticate as the driver user
  try {
    console.log('🔑 Signing in as driver...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'yayajiji1412@gmail.com',
      password: 'password123'
    });
    
    if (authError) {
      console.error('❌ Authentication failed:', authError);
      return;
    }
    
    console.log('✅ Authentication successful');
  } catch (authErr) {
    console.error('❌ Exception during authentication:', authErr);
    return;
  }

  // Wait a moment for session to establish
  await new Promise(resolve => setTimeout(resolve, 1000));

  try {
    // Create the driver profile with only available columns
    const { data, error } = await supabase
      .from('driver_profiles')
      .insert({
        user_id: driverUserId,
        first_name: 'Ahmed',
        last_name: 'Driver',
        phone: '+966 50 123 4567',
        is_available: false,
        vehicle_plate: 'ABC123',
        vehicle_model: 'Toyota Hilux',
        status: 'offline'
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating driver profile:', error);
    } else {
      console.log('✅ Driver profile created successfully:', data);
    }
  } catch (err) {
    console.error('❌ Exception creating driver profile:', err);
  }

  // Now test the status update
  console.log('\n🔧 Testing status update after profile creation...');
  
  try {
    const { data: updateData, error: updateError } = await supabase
      .from('driver_profiles')
      .update({
        status: 'online',
        is_available: true,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', driverUserId)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Status update failed:', updateError);
    } else {
      console.log('✅ Status update successful:', updateData);
    }
  } catch (err) {
    console.error('❌ Exception during status update:', err);
  }
}

createDriverProfile().catch(console.error);
