-- ====================================================================
-- UBER-STYLE ASAP SYSTEM - USING EXISTING COLUMNS (NO NEW COLUMNS NEEDED!)
-- ====================================================================
-- This implementation uses your existing trip_requests structure intelligently

-- Step 1: Create Uber-style sequential matching function (uses existing columns only)
CREATE OR REPLACE FUNCTION start_asap_matching_uber_style(trip_request_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    current_driver_assigned UUID,
    drivers_in_queue INTEGER,
    next_timeout TIMESTAMP WITH TIME ZONE
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

-- Step 2: Create function to handle driver decline and move to next driver
CREATE OR REPLACE FUNCTION decline_trip_request_uber_style(request_id UUID, declining_driver_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    next_driver_assigned UUID,
    position_in_queue INTEGER
) AS $$
DECLARE
    trip_record RECORD;
    queue_text TEXT;
    drivers_queue UUID[];
    current_position INTEGER;
    next_driver_id UUID;
    timeout_time TIMESTAMP WITH TIME ZONE;
BEGIN
    RAISE NOTICE '❌ UBER-STYLE: Driver % declining trip %', declining_driver_id, request_id;
    
    -- Get current trip state
    SELECT * INTO trip_record FROM trip_requests WHERE id = request_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Trip request not found', NULL::UUID, 0;
        RETURN;
    END IF;
    
    -- Verify this driver is currently assigned
    IF trip_record.assigned_driver_id != declining_driver_id THEN
        RETURN QUERY SELECT false, 'Driver is not currently assigned to this trip', NULL::UUID, 0;
        RETURN;
    END IF;
    
    -- Extract driver queue from load_description
    IF trip_record.load_description LIKE '%[QUEUE:%]' THEN
        queue_text := substring(trip_record.load_description FROM '\[QUEUE:([^\]]+)\]');
        drivers_queue := string_to_array(queue_text, ',')::UUID[];
    ELSE
        -- No queue found, mark as expired
        UPDATE trip_requests 
        SET status = 'expired', assigned_driver_id = NULL
        WHERE id = request_id;
        
        RETURN QUERY SELECT true, 'No more drivers available - trip expired', NULL::UUID, 0;
        RETURN;
    END IF;
    
    -- Find current position and get next driver
    current_position := array_position(drivers_queue, declining_driver_id);
    
    IF current_position IS NULL OR current_position >= array_length(drivers_queue, 1) THEN
        -- No more drivers in queue
        UPDATE trip_requests 
        SET status = 'expired', assigned_driver_id = NULL
        WHERE id = request_id;
        
        RETURN QUERY SELECT true, 'No more drivers available - trip expired', NULL::UUID, 0;
        RETURN;
    END IF;
    
    -- Get next driver
    next_driver_id := drivers_queue[current_position + 1];
    timeout_time := NOW() + INTERVAL '15 seconds';
    
    -- Assign to next driver
    UPDATE trip_requests 
    SET 
        assigned_driver_id = next_driver_id,  -- Real-time notification will trigger!
        acceptance_deadline = timeout_time
    WHERE id = request_id;
    
    RAISE NOTICE '✅ UBER-STYLE: Moved to next driver % (position %)', next_driver_id, current_position + 1;
    
    RETURN QUERY SELECT 
        true, 
        format('Trip moved to next driver (position %s)', current_position + 1),
        next_driver_id,
        current_position + 1;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create function to handle driver accept
CREATE OR REPLACE FUNCTION accept_trip_request_uber_style(request_id UUID, accepting_driver_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    trip_status TEXT
) AS $$
DECLARE
    trip_record RECORD;
    original_description TEXT;
BEGIN
    RAISE NOTICE '✅ UBER-STYLE: Driver % accepting trip %', accepting_driver_id, request_id;
    
    -- Get current trip state
    SELECT * INTO trip_record FROM trip_requests WHERE id = request_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Trip request not found', '';
        RETURN;
    END IF;
    
    -- Verify this driver is currently assigned
    IF trip_record.assigned_driver_id != accepting_driver_id THEN
        RETURN QUERY SELECT false, 'Driver is not currently assigned to this trip', trip_record.status;
        RETURN;
    END IF;
    
    -- Clean up the load_description (remove queue info)
    original_description := regexp_replace(trip_record.load_description, ' \[QUEUE:[^\]]+\]', '');
    
    -- Accept the trip
    UPDATE trip_requests 
    SET 
        status = 'matched',
        matched_at = NOW(),
        acceptance_deadline = NULL,
        load_description = original_description  -- Clean description
    WHERE id = request_id;
    
    RAISE NOTICE '🎉 UBER-STYLE: Trip % successfully matched to driver %', request_id, accepting_driver_id;
    
    RETURN QUERY SELECT true, 'Trip successfully accepted', 'matched';
END;
$$ LANGUAGE plpgsql;

-- Step 4: Update the main start_asap_matching to use Uber style
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

-- Step 5: Update accept_trip_request to use Uber style
CREATE OR REPLACE FUNCTION accept_trip_request(request_id UUID, accepting_driver_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    original_trip_id UUID
) AS $$
DECLARE
    result_record RECORD;
    trip_record RECORD;
BEGIN
    -- Call the Uber-style function
    SELECT * INTO result_record 
    FROM accept_trip_request_uber_style(request_id, accepting_driver_id);
    
    -- Get original trip id for compatibility
    SELECT original_trip_id INTO trip_record FROM trip_requests WHERE id = request_id;
    
    -- Return in the expected format
    RETURN QUERY SELECT 
        result_record.success,
        result_record.message,
        trip_record.original_trip_id;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Update decline_trip_request to use Uber style
CREATE OR REPLACE FUNCTION decline_trip_request(request_id UUID, declining_driver_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    result_record RECORD;
BEGIN
    -- Call the Uber-style function
    SELECT * INTO result_record 
    FROM decline_trip_request_uber_style(request_id, declining_driver_id);
    
    -- Return in the expected format
    RETURN QUERY SELECT 
        result_record.success,
        result_record.message;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create timeout handler function
CREATE OR REPLACE FUNCTION handle_asap_timeout()
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    trips_processed INTEGER
) AS $$
DECLARE
    timeout_trip RECORD;
    processed_count INTEGER := 0;
    result_record RECORD;
BEGIN
    -- Process all timed out trips
    FOR timeout_trip IN 
        SELECT id, assigned_driver_id 
        FROM trip_requests 
        WHERE status = 'pending'
          AND assigned_driver_id IS NOT NULL
          AND acceptance_deadline <= NOW()
          AND pickup_time_preference = 'asap'
    LOOP
        -- Automatically decline for the current driver and move to next
        SELECT * INTO result_record
        FROM decline_trip_request_uber_style(timeout_trip.id, timeout_trip.assigned_driver_id);
        
        processed_count := processed_count + 1;
        
        RAISE NOTICE '⏰ Auto-declined timed out trip % for driver %', 
                     timeout_trip.id, timeout_trip.assigned_driver_id;
    END LOOP;
    
    RETURN QUERY SELECT true, format('Processed %s timed out trips', processed_count), processed_count;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- VERIFICATION AND TEST QUERIES
-- ====================================================================

-- Test 1: Check if functions were created successfully
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name LIKE '%uber_style%' 
ORDER BY routine_name;

-- Test 2: Test the system with a real trip
-- (Find a pending ASAP trip to test with)
/*
-- Find a recent no_drivers_available trip to retry
SELECT id, status, load_description 
FROM trip_requests 
WHERE status = 'no_drivers_available' 
  AND pickup_time_preference = 'asap'
ORDER BY created_at DESC 
LIMIT 1;

-- Reset it and test the Uber-style matching
-- (Replace TRIP_ID with actual ID from above)
UPDATE trip_requests 
SET status = 'pending', 
    assigned_driver_id = NULL, 
    acceptance_deadline = NULL,
    matching_started_at = NULL
WHERE id = 'TRIP_ID_HERE';

-- Test the new Uber-style matching
SELECT * FROM start_asap_matching_uber_style('TRIP_ID_HERE');
*/

SELECT '✅ UBER-STYLE ASAP SYSTEM READY!' as status,
       'Uses existing columns cleverly - no schema changes needed' as implementation,
       'Driver queue stored in load_description field temporarily' as queue_storage,
       'Real-time notifications will work via assigned_driver_id' as notifications;
