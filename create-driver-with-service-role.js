const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createDriverProfileWithServiceRole() {
  console.log('🔧 Creating driver profile with service role...');
  
  const driverUserId = '7a9ce2f0-db9d-46a7-aef3-c01635d90592';
  
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
        status: 'offline',
        years_experience: 5,
        rating: 4.8,
        total_trips: 156,
        total_earnings: 2450.75
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating driver profile:', error);
    } else {
      console.log('✅ Driver profile created successfully:', data);
      
      // Now test the status update with the regular anon key
      console.log('\n🔧 Testing status update with anon key...');
      
      const anonSupabase = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28');
      
      const { data: updateData, error: updateError } = await anonSupabase
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
    }
  } catch (err) {
    console.error('❌ Exception creating driver profile:', err);
  }
}

createDriverProfileWithServiceRole().catch(console.error);
