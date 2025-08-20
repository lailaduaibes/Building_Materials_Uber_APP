const { createClient } = require('@supabase/supabase-js');

// Test with regular user authentication like the driver app uses
const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28'
);

(async () => {
  try {
    console.log('Testing driver authentication and trip acceptance...');
    
    // First authenticate as the driver user
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'yayajiji1412@gmail.com',
      password: 'password123'
    });
    
    if (signInError) {
      console.error('❌ Driver sign-in error:', signInError);
      return;
    }
    
    console.log('✅ Driver signed in:', signInData.user?.id);
    
    // Check driver profile
    const { data: driverProfile, error: profileError } = await supabase
      .from('driver_profiles')
      .select('*')
      .eq('user_id', signInData.user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Driver profile error:', profileError);
      return;
    }
    
    console.log('✅ Driver profile found:', {
      id: driverProfile.id,
      status: driverProfile.status,
      user_id: driverProfile.user_id
    });
    
    // Get a pending trip
    const { data: pendingTrips, error: tripsError } = await supabase
      .from('trip_requests')
      .select('*')
      .eq('status', 'pending')
      .is('assigned_driver_id', null)
      .limit(1);
    
    if (tripsError) {
      console.error('❌ Trips fetch error:', tripsError);
      return;
    }
    
    if (!pendingTrips || pendingTrips.length === 0) {
      console.log('❌ No pending trips found');
      return;
    }
    
    const trip = pendingTrips[0];
    console.log('✅ Found pending trip:', trip.id);
    
    // Try to accept the trip
    console.log('\n🔄 Attempting trip acceptance...');
    const { data: updateResult, error: updateError } = await supabase
      .from('trip_requests')
      .update({ 
        assigned_driver_id: driverProfile.id,
        status: 'pending' // Keep as pending for now
      })
      .eq('id', trip.id)
      .select();
    
    if (updateError) {
      console.error('❌ Trip acceptance error:', updateError);
      
      // Check if the issue is driver status
      if (driverProfile.status !== 'available') {
        console.log(`\n💡 Driver status is "${driverProfile.status}" but policy requires "available"`);
        
        // Try updating driver status
        console.log('🔄 Updating driver status to available...');
        const { error: statusError } = await supabase
          .from('driver_profiles')
          .update({ status: 'available' })
          .eq('id', driverProfile.id);
        
        if (statusError) {
          console.error('❌ Status update error:', statusError);
        } else {
          console.log('✅ Driver status updated to available');
          
          // Try trip acceptance again
          console.log('🔄 Retrying trip acceptance...');
          const { data: retryResult, error: retryError } = await supabase
            .from('trip_requests')
            .update({ 
              assigned_driver_id: driverProfile.id,
              status: 'pending'
            })
            .eq('id', trip.id)
            .select();
          
          if (retryError) {
            console.error('❌ Retry error:', retryError);
          } else {
            console.log('✅ Trip acceptance successful on retry!', retryResult);
          }
        }
      }
    } else {
      console.log('✅ Trip acceptance successful!', updateResult);
    }
    
  } catch (err) {
    console.error('❌ Script error:', err);
  }
})();
