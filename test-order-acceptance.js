const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

(async () => {
  try {
    console.log('🚀 Testing Order Acceptance Flow...\n');
    
    // Step 1: Get available trips
    console.log('1️⃣ Fetching available trips...');
    const { data: availableTrips, error: tripsError } = await supabase
      .from('trip_requests')
      .select('*')
      .eq('status', 'pending')
      .is('assigned_driver_id', null)
      .limit(1);
    
    if (tripsError || !availableTrips?.length) {
      console.log('❌ No available trips found');
      return;
    }
    
    const tripToAccept = availableTrips[0];
    console.log('✅ Found trip to accept:', {
      id: tripToAccept.id,
      pickup: tripToAccept.pickup_address?.formatted_address,
      delivery: tripToAccept.delivery_address?.formatted_address,
      price: tripToAccept.quoted_price
    });
    
    // Step 2: Get a test driver
    console.log('\n2️⃣ Getting test driver...');
    const { data: drivers, error: driverError } = await supabase
      .from('driver_profiles')
      .select('*')
      .limit(1);
    
    if (driverError || !drivers?.length) {
      console.log('❌ No drivers found');
      return;
    }
    
    const testDriver = drivers[0];
    console.log('✅ Using driver:', {
      id: testDriver.id,
      user_id: testDriver.user_id,
      name: testDriver.full_name
    });
    
    // Step 3: Accept the order
    console.log('\n3️⃣ Accepting the order...');
    const { data: acceptResult, error: acceptError } = await supabase
      .from('trip_requests')
      .update({ 
        status: 'matched',
        assigned_driver_id: testDriver.user_id,
        matched_at: new Date().toISOString()
      })
      .eq('id', tripToAccept.id)
      .eq('status', 'pending')
      .is('assigned_driver_id', null)
      .select()
      .single();

    if (acceptError) {
      console.error('❌ Accept error:', acceptError);
      return;
    }

    if (!acceptResult) {
      console.log('❌ Trip no longer available');
      return;
    }

    console.log('✅ Order accepted successfully!');
    console.log('📋 Updated trip:', {
      id: acceptResult.id,
      status: acceptResult.status,
      assigned_driver_id: acceptResult.assigned_driver_id,
      matched_at: acceptResult.matched_at
    });
    
    // Step 4: Verify the update
    console.log('\n4️⃣ Verifying the update...');
    const { data: verifyResult, error: verifyError } = await supabase
      .from('trip_requests')
      .select('*')
      .eq('id', tripToAccept.id)
      .single();
    
    if (verifyError) {
      console.error('❌ Verify error:', verifyError);
      return;
    }
    
    console.log('🔍 Final verification:', {
      status: verifyResult.status,
      assigned_driver_id: verifyResult.assigned_driver_id,
      matched_at: verifyResult.matched_at
    });
    
    console.log('\n🎉 Order acceptance flow completed successfully!');
    
  } catch (err) {
    console.error('❌ Script error:', err);
  }
})();
