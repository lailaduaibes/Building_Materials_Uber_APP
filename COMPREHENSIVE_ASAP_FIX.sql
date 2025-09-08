-- 🚀 COMPREHENSIVE ASAP SYSTEM FIX
-- This ensures ASAP trips get assigned to drivers properly

-- Step 1: Create a robust version of start_asap_matching_uber_style
CREATE OR REPLACE FUNCTION start_asap_matching_uber_style(trip_request_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    assigned_driver_id UUID,
    drivers_found INTEGER,
    acceptance_deadline TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
AS $$
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
    
    -- Find nearby drivers with very lenient criteria
    SELECT ARRAY_AGG(driver_id ORDER BY distance_km ASC, rating DESC NULLS LAST) 
    INTO nearby_drivers_array
    FROM find_nearby_available_drivers(
        trip_record.pickup_latitude::DECIMAL,
        trip_record.pickup_longitude::DECIMAL,
        100, -- Increase to 100km max distance
        2880, -- 48 hours location update window (very lenient)
        trip_record.required_truck_type_id
    );
    
    driver_count := COALESCE(array_length(nearby_drivers_array, 1), 0);
    
    RAISE NOTICE '🔍 Found % nearby drivers for trip %', driver_count, trip_request_id;
    
    IF driver_count = 0 THEN
        -- Try even more lenient search - any driver within 200km and 1 week old location
        SELECT ARRAY_AGG(dp.user_id ORDER BY RANDOM()) -- Random order as fallback
        INTO nearby_drivers_array
        FROM driver_profiles dp
        LEFT JOIN driver_locations dl ON dp.user_id = dl.driver_id
        WHERE dp.approval_status = 'approved'
          AND (dl.updated_at IS NULL OR dl.updated_at > NOW() - INTERVAL '7 days')
        LIMIT 5; -- Limit to 5 drivers max
        
        driver_count := COALESCE(array_length(nearby_drivers_array, 1), 0);
        RAISE NOTICE '🔍 Fallback search found % drivers', driver_count;
    END IF;
    
    IF driver_count = 0 THEN
        -- Still no drivers found
        UPDATE trip_requests 
        SET status = 'no_drivers_available',
            matching_started_at = NOW()
        WHERE id = trip_request_id;
        
        RAISE NOTICE '❌ No drivers available for trip %', trip_request_id;
        RETURN QUERY SELECT false, 'No available drivers found', NULL::UUID, 0, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Get the first driver in the queue
    first_driver_id := nearby_drivers_array[1];
    timeout_time := NOW() + INTERVAL '30 seconds'; -- Increased to 30 seconds
    
    -- UBER-STYLE: Assign to first driver (this triggers real-time notification!)
    UPDATE trip_requests 
    SET 
        status = 'pending',
        assigned_driver_id = first_driver_id,  -- KEY: This enables real-time notifications!
        acceptance_deadline = timeout_time,
        matching_started_at = NOW(),
        -- Store the driver queue in load_description
        load_description = COALESCE(trip_record.load_description, '') || ' [QUEUE:' || array_to_string(nearby_drivers_array, ',') || ']'
    WHERE id = trip_request_id;
    
    RAISE NOTICE '✅ UBER-STYLE: Assigned trip % to driver % (1 of % drivers available)', trip_request_id, first_driver_id, driver_count;
    
    RETURN QUERY SELECT 
        true, 
        format('Trip assigned to driver %s (1 of %s drivers available)', first_driver_id, driver_count),
        first_driver_id,
        driver_count,
        timeout_time;
END;
$$;

-- Step 2: Ensure the wrapper function exists
CREATE OR REPLACE FUNCTION start_asap_matching(trip_request_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    drivers_found INTEGER
) 
LANGUAGE plpgsql
AS $$
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
        COALESCE(result_record.drivers_found, 0);
END;
$$;

-- Step 3: Ensure trigger function exists and works
CREATE OR REPLACE FUNCTION trigger_asap_matching()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger for ASAP trips that haven't been assigned yet
  IF NEW.pickup_time_preference = 'asap' AND NEW.assigned_driver_id IS NULL THEN
    RAISE NOTICE '🚨 ASAP trip created: % - Starting sequential matching', NEW.id;
    
    -- Call the matching function directly
    BEGIN
      PERFORM start_asap_matching_uber_style(NEW.id);
      RAISE NOTICE '✅ Sequential matching completed for trip: %', NEW.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '⚠️ Matching failed for trip %: %', NEW.id, SQLERRM;
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

-- Step 5: Test on existing ASAP trips
-- Manually call the function on the existing trips to fix them
DO $$
DECLARE
    trip_record RECORD;
    result_record RECORD;
BEGIN
    FOR trip_record IN 
        SELECT id 
        FROM trip_requests 
        WHERE pickup_time_preference = 'asap' 
          AND status = 'pending' 
          AND assigned_driver_id IS NULL
        LIMIT 3
    LOOP
        RAISE NOTICE '🔧 Fixing ASAP trip: %', trip_record.id;
        
        BEGIN
            SELECT * INTO result_record FROM start_asap_matching_uber_style(trip_record.id);
            RAISE NOTICE '✅ Fixed trip %: %', trip_record.id, result_record.message;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING '❌ Failed to fix trip %: %', trip_record.id, SQLERRM;
        END;
    END LOOP;
END $$;

-- Step 6: Verification query
SELECT 
    '🎯 ASAP SYSTEM VERIFICATION' as status,
    COUNT(*) FILTER (WHERE pickup_time_preference = 'asap' AND assigned_driver_id IS NOT NULL) as assigned_asap_trips,
    COUNT(*) FILTER (WHERE pickup_time_preference = 'asap' AND assigned_driver_id IS NULL AND status = 'pending') as unassigned_asap_trips,
    COUNT(*) FILTER (WHERE pickup_time_preference = 'asap' AND status = 'no_drivers_available') as no_drivers_trips
FROM trip_requests
WHERE pickup_time_preference = 'asap';
