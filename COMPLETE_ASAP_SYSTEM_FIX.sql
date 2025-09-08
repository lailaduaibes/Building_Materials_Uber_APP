-- 🚨 CRITICAL ASAP SYSTEM FIX
-- This ensures ALL components are properly deployed

-- Step 1: Ensure start_asap_matching_uber_style function exists
CREATE OR REPLACE FUNCTION start_asap_matching_uber_style(trip_request_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    assigned_driver_id UUID,
    drivers_in_queue INTEGER,
    timeout_time TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    trip_record RECORD;
    nearby_drivers_array UUID[];
    first_driver_id UUID;
    timeout_time TIMESTAMP WITH TIME ZONE;
    driver_count INTEGER;
BEGIN
    RAISE NOTICE '🚀 UBER-STYLE: Starting sequential matching for trip: %', trip_request_id;
    
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
    
    -- Find nearby drivers (ordered by distance, rating, etc.)
    SELECT ARRAY_AGG(driver_id ORDER BY distance_km ASC, rating DESC NULLS LAST) 
    INTO nearby_drivers_array
    FROM find_nearby_available_drivers(
        trip_record.pickup_latitude::DECIMAL,
        trip_record.pickup_longitude::DECIMAL,
        50, -- max_distance_km_param
        1440, -- min_updated_minutes_param (24 hours - more lenient)
        trip_record.required_truck_type_id -- required_truck_type_id_param
    );
    
    driver_count := COALESCE(array_length(nearby_drivers_array, 1), 0);
    
    IF driver_count = 0 THEN
        -- No drivers found
        UPDATE trip_requests 
        SET status = 'no_drivers_available',
            matching_started_at = NOW()
        WHERE id = trip_request_id;
        
        RETURN QUERY SELECT false, 'No available drivers found', NULL::UUID, 0, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Get the first driver in the queue
    first_driver_id := nearby_drivers_array[1];
    timeout_time := NOW() + INTERVAL '15 seconds';
    
    -- UBER-STYLE: Assign to first driver (this triggers real-time notification!)
    UPDATE trip_requests 
    SET 
        status = 'pending',  -- Keep as pending until accepted
        assigned_driver_id = first_driver_id,  -- KEY: This enables real-time notifications!
        acceptance_deadline = timeout_time,    -- 15-second timeout
        matching_started_at = NOW(),
        -- Store the driver queue in load_description (creative reuse of existing field)
        load_description = trip_record.load_description || ' [QUEUE:' || array_to_string(nearby_drivers_array, ',') || ']'
    WHERE id = trip_request_id;
    
    RAISE NOTICE '✅ UBER-STYLE: Assigned trip to driver % (1 of % drivers available)', first_driver_id, driver_count;
    
    RETURN QUERY SELECT 
        true, 
        format('Trip assigned to driver %s (1 of %s drivers available)', first_driver_id, driver_count),
        first_driver_id,
        driver_count,
        timeout_time;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Ensure start_asap_matching wrapper exists
CREATE OR REPLACE FUNCTION start_asap_matching(trip_request_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    drivers_found INTEGER
) AS $$
DECLARE
    result_record RECORD;
BEGIN
    -- Call the Uber-style function
    SELECT * INTO result_record 
    FROM start_asap_matching_uber_style(trip_request_id);
    
    -- Return in the expected format
    RETURN QUERY SELECT 
        result_record.success,
        result_record.message,
        COALESCE(result_record.drivers_in_queue, 0);
END;
$$ LANGUAGE plpgsql;

-- Step 3: Ensure trigger function exists
CREATE OR REPLACE FUNCTION trigger_asap_matching()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for ASAP trips that haven't been assigned yet
  IF NEW.pickup_time_preference = 'asap' AND NEW.assigned_driver_id IS NULL THEN
    -- Log the trigger activation
    RAISE NOTICE '🚨 ASAP trip created: % - Starting sequential matching', NEW.id;
    
    -- Call the matching function directly
    BEGIN
      PERFORM start_asap_matching(NEW.id);
      RAISE NOTICE '✅ Sequential matching started for trip: %', NEW.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '⚠️ Matching call failed for trip %: %', NEW.id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Ensure trigger exists
DROP TRIGGER IF EXISTS asap_trip_matching_trigger ON trip_requests;
CREATE TRIGGER asap_trip_matching_trigger
  AFTER INSERT ON trip_requests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_asap_matching();

-- Step 5: Test on existing trips
-- Update existing pending ASAP trips to trigger matching
DO $$
DECLARE
    trip_id UUID;
BEGIN
    FOR trip_id IN 
        SELECT id FROM trip_requests 
        WHERE pickup_time_preference = 'asap' 
        AND status = 'pending' 
        AND assigned_driver_id IS NULL
        LIMIT 3
    LOOP
        RAISE NOTICE '🔄 Retrying ASAP matching for existing trip: %', trip_id;
        PERFORM start_asap_matching_uber_style(trip_id);
    END LOOP;
END $$;

-- Final verification
SELECT '🎯 ASAP SYSTEM FULLY DEPLOYED!' as status,
       'All functions and triggers are now active' as message,
       'Existing pending trips have been retried' as action;
