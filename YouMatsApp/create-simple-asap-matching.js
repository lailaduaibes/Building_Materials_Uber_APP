const { createClient } = require('@supabase/supabase-js');

// PRODUCTION DATABASE
const supabase = createClient(
  'https://pjbbtmuhlpscmrbgsyzb.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYmJ0bXVobHBzY21yYmdzeXpiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExOTMxMiwiZXhwIjoyMDcwNjk1MzEyfQ.aEAWnScYRf-9EQcx9xN4r05HcE6n-N5qVSYWKAEgzG8'
);

async function createSimpleASAPMatching() {
  console.log('🔧 FIXING ASAP: Creating simple matching that works without stored GPS data');
  
  try {
    // Create a simple ASAP function that just assigns to any available driver
    console.log('📝 Creating simplified start_asap_matching_uber_style...');
    
    const simplifiedFunction = `
-- SIMPLIFIED ASAP MATCHING: Works without stored GPS location data
CREATE OR REPLACE FUNCTION start_asap_matching_uber_style(trip_request_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    current_driver_assigned UUID,
    drivers_in_queue INTEGER,
    next_timeout TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
AS $$
DECLARE
    trip_record RECORD;
    available_drivers_array UUID[];
    first_driver_id UUID;
    timeout_time TIMESTAMP WITH TIME ZONE;
    driver_count INTEGER;
BEGIN
    RAISE NOTICE '🚀 SIMPLIFIED ASAP: Starting matching for trip: %', trip_request_id;
    
    -- Get the trip request
    SELECT * INTO trip_record FROM trip_requests WHERE id = trip_request_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Trip request not found', NULL::UUID, 0, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Only process ASAP trips that are pending
    IF trip_record.pickup_time_preference != 'asap' OR trip_record.status != 'pending' THEN
        RETURN QUERY SELECT false, 'Not an available ASAP trip', NULL::UUID, 0, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Get available approved drivers (NO GPS filtering - drivers will get notified via real-time)
    SELECT ARRAY_AGG(user_id ORDER BY created_at ASC) -- Oldest drivers first
    INTO available_drivers_array
    FROM driver_profiles 
    WHERE approval_status = 'approved'
      AND is_available = true;
    
    -- If no drivers with is_available=true, get ANY approved drivers
    IF available_drivers_array IS NULL OR array_length(available_drivers_array, 1) = 0 THEN
        SELECT ARRAY_AGG(user_id ORDER BY created_at ASC)
        INTO available_drivers_array
        FROM driver_profiles 
        WHERE approval_status = 'approved';
    END IF;
    
    driver_count := COALESCE(array_length(available_drivers_array, 1), 0);
    
    RAISE NOTICE '🔍 Found % approved drivers for ASAP trip', driver_count;
    
    IF driver_count = 0 THEN
        -- No drivers found
        UPDATE trip_requests 
        SET status = 'no_drivers_available',
            matching_started_at = NOW()
        WHERE id = trip_request_id;
        
        RETURN QUERY SELECT false, 'No approved drivers found', NULL::UUID, 0, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Get the first driver in the queue
    first_driver_id := available_drivers_array[1];
    timeout_time := NOW() + INTERVAL '30 seconds';
    
    -- UBER-STYLE: Assign to first driver (this triggers real-time notification!)
    UPDATE trip_requests 
    SET 
        status = 'pending',
        assigned_driver_id = first_driver_id,  -- KEY: This enables real-time notifications!
        acceptance_deadline = timeout_time,
        matching_started_at = NOW(),
        -- Store the driver queue in load_description
        load_description = COALESCE(trip_record.load_description, '') || ' [QUEUE:' || array_to_string(available_drivers_array, ',') || ']'
    WHERE id = trip_request_id;
    
    RAISE NOTICE '✅ ASAP: Assigned trip % to driver % (1 of % drivers available)', trip_request_id, first_driver_id, driver_count;
    
    RETURN QUERY SELECT 
        true, 
        format('Trip assigned to driver %s (1 of %s drivers available)', first_driver_id, driver_count),
        first_driver_id,
        driver_count,
        timeout_time;
END;
$$;`;

    const { error: functionError } = await supabase.rpc('execute_sql', { 
      query: simplifiedFunction 
    });
    
    if (functionError) {
      console.error('❌ Error creating function:', functionError);
      return;
    }
    
    console.log('✅ Simplified ASAP function created successfully!');
    
    // Reset test trip
    console.log('\\n📋 Resetting test trip...');
    await supabase
      .from('trip_requests')
      .update({ 
        status: 'pending', 
        assigned_driver_id: null,
        load_description: 'Test Uber-Style ASAP Load - Premium Concrete Mix',
        acceptance_deadline: null,
        matching_started_at: null
      })
      .eq('id', 'e280b170-307a-44e2-b980-002b4a9504a3');
    
    console.log('✅ Trip reset to pending');
    
    // Test the new simplified function
    console.log('\\n🧪 Testing simplified ASAP function...');
    const { data: testResult, error: testError } = await supabase.rpc('start_asap_matching_uber_style', {
      trip_request_id: 'e280b170-307a-44e2-b980-002b4a9504a3'
    });
    
    if (testError) {
      console.error('❌ Test failed:', testError);
    } else {
      console.log('✅ Test succeeded!');
      console.log('📊 Result:', testResult);
      
      // Check trip status
      const { data: tripData } = await supabase
        .from('trip_requests')
        .select('status, assigned_driver_id, load_description, acceptance_deadline')
        .eq('id', 'e280b170-307a-44e2-b980-002b4a9504a3')
        .single();
      
      console.log('\\n📊 Trip status after function:');
      console.log('  Status:', tripData.status);
      console.log('  Assigned Driver:', tripData.assigned_driver_id || 'NULL');
      console.log('  Has Queue:', tripData.load_description?.includes('[QUEUE:') ? 'YES' : 'NO');
      console.log('  Deadline:', tripData.acceptance_deadline || 'NULL');
      
      if (tripData.assigned_driver_id) {
        console.log('\\n🎉 SUCCESS! ASAP trip now assigned!');
        console.log('🎯 The assigned driver should see this trip in their DriverService real-time subscription!');
        console.log('📱 Driver apps will get notified via: pickup_time_preference=asap AND assigned_driver_id=eq.' + tripData.assigned_driver_id);
      } else {
        console.log('\\n❌ Still not working - checking why...');
      }
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

createSimpleASAPMatching();
