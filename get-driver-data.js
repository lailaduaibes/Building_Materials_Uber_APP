const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function getDriverData() {
  try {
    const driverId = '7a9ce2f0-db9d-46a7-aef3-c01635d90592';
    
    console.log('🔍 Getting complete driver data...');
    
    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', driverId)
      .single();
    
    if (userError) {
      console.error('User error:', userError);
    } else {
      console.log('👤 User data:', JSON.stringify(userData, null, 2));
    }

    // Get driver profile data
    const { data: driverData, error: driverError } = await supabase
      .from('driver_profiles')
      .select('*')
      .eq('user_id', driverId)
      .single();
    
    if (driverError) {
      console.error('Driver profile error:', driverError);
    } else {
      console.log('🚗 Driver profile data:', JSON.stringify(driverData, null, 2));
    }

    // Get trip stats
    const { data: tripStats, error: statsError } = await supabase
      .from('trip_requests')
      .select('id, status, final_price, customer_rating, created_at')
      .eq('assigned_driver_id', driverId);
    
    if (statsError) {
      console.error('Trip stats error:', statsError);
    } else {
      console.log('📊 Trip statistics:');
      console.log('   Total trips:', tripStats.length);
      
      const deliveredTrips = tripStats.filter(t => t.status === 'delivered');
      console.log('   Completed trips:', deliveredTrips.length);
      
      const ratingsArray = deliveredTrips
        .filter(t => t.customer_rating)
        .map(t => t.customer_rating);
      
      const avgRating = ratingsArray.length > 0 
        ? ratingsArray.reduce((sum, rating) => sum + rating, 0) / ratingsArray.length
        : 0;
      console.log('   Average rating:', avgRating.toFixed(1) || 'No ratings yet');
      
      const totalEarnings = deliveredTrips
        .filter(t => t.final_price)
        .reduce((sum, t) => sum + t.final_price, 0);
      console.log('   Total earnings: $' + totalEarnings);
      
      if (tripStats.length > 0) {
        const firstTrip = tripStats.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];
        const yearsActive = Math.max(1, new Date().getFullYear() - new Date(firstTrip.created_at).getFullYear());
        console.log('   Years active:', yearsActive);
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

getDriverData();
