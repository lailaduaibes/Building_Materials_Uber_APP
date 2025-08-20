const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pjbbtmuhlpscmrbgsyzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTkzMTIsImV4cCI6MjA3MDY5NTMxMn0.bBBBaL7odpkTSGmEstQp8ihkEsdgYsycrRgFVKGvJ28';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDriverStatusUpdate() {
  console.log('🔧 Testing driver status update...');
  
  const driverUserId = '7a9ce2f0-db9d-46a7-aef3-c01635d90592';
  
  try {
    // First check if the driver profile exists
    console.log('🔍 Checking for existing driver profile...');
    const { data: existingProfile, error: fetchError } = await supabase
      .from('driver_profiles')
      .select('*')
      .eq('user_id', driverUserId)
      .single();
    
    if (fetchError) {
      console.error('❌ Error fetching driver profile:', fetchError);
      return;
    }
    
    console.log('✅ Driver profile found:', existingProfile);
    
    // Now test the status update
    console.log('\n🔧 Testing status update...');
    
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
    
    // Test updating back to offline
    console.log('\n🔧 Testing status update to offline...');
    
    const { data: offlineData, error: offlineError } = await supabase
      .from('driver_profiles')
      .update({
        status: 'offline',
        is_available: false,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', driverUserId)
      .select()
      .single();
    
    if (offlineError) {
      console.error('❌ Offline update failed:', offlineError);
    } else {
      console.log('✅ Offline update successful:', offlineData);
    }
    
  } catch (err) {
    console.error('❌ Exception during testing:', err);
  }
}

testDriverStatusUpdate().catch(console.error);
