-- 🚀 SIMPLIFIED ASAP MATCHING FUNCTION
-- This version doesn't rely on find_nearby_available_drivers function
-- Instead it uses a simple approach to assign trips to approved drivers

CREATE OR REPLACE FUNCTION start_asap_matching_uber_style_simplified(trip_request_id UUID)
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
    RAISE NOTICE '🚀 SIMPLIFIED UBER-STYLE: Starting sequential matching for trip: %', trip_request_id;
    
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
    
    -- SIMPLIFIED: Get all approved drivers (no location requirements)
    SELECT ARRAY_AGG(user_id ORDER BY created_at ASC) 
    INTO available_drivers_array
    FROM driver_profiles 
    WHERE is_approved = true 
      AND approval_status = 'approved';
    
    driver_count := COALESCE(array_length(available_drivers_array, 1), 0);
    
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
    first_driver_id := available_drivers_array[1];
    timeout_time := NOW() + INTERVAL '30 seconds'; -- Longer timeout for testing
    
    -- UBER-STYLE: Assign to first driver (this triggers real-time notification!)
    UPDATE trip_requests 
    SET 
        status = 'pending',  -- Keep as pending until accepted
        assigned_driver_id = first_driver_id,  -- KEY: This enables real-time notifications!
        acceptance_deadline = timeout_time,    -- 30-second timeout
        matching_started_at = NOW()
    WHERE id = trip_request_id;
    
    RAISE NOTICE '✅ SIMPLIFIED UBER-STYLE: Assigned trip to driver % (1 of % drivers available)', first_driver_id, driver_count;
    
    RETURN QUERY SELECT 
        true, 
        format('Trip assigned to driver %s (1 of %s drivers available)', first_driver_id, driver_count),
        first_driver_id,
        driver_count,
        timeout_time;
END;
$$;

-- Update the main start_asap_matching function to use the simplified version
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
    -- Call the simplified Uber-style function
    SELECT * INTO result_record 
    FROM start_asap_matching_uber_style_simplified(trip_request_id);
    
    -- Return in the expected format
    RETURN QUERY SELECT 
        result_record.success,
        result_record.message,
        COALESCE(result_record.drivers_in_queue, 0);
END;
$$;

-- Test the simplified function
SELECT '🧪 TESTING SIMPLIFIED ASAP FUNCTION' as test_section;

-- Get a pending ASAP trip to test with
WITH test_trip AS (
    SELECT id 
    FROM trip_requests 
    WHERE pickup_time_preference = 'asap' 
      AND assigned_driver_id IS NULL
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    'Testing with trip: ' || id as test_info,
    (SELECT * FROM start_asap_matching_uber_style_simplified(id)) as result
FROM test_trip;

-- Check if it worked
SELECT 
    '🔍 RESULT CHECK' as test_section,
    SUBSTRING(id::text, 1, 8) as trip_id,
    status,
    CASE 
        WHEN assigned_driver_id IS NOT NULL THEN '✅ DRIVER ASSIGNED: ' || assigned_driver_id
        ELSE '❌ STILL NO DRIVER'
    END as assignment_status
FROM trip_requests 
WHERE pickup_time_preference = 'asap'
ORDER BY created_at DESC 
LIMIT 3;
