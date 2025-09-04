-- ====================================================================
-- UBER-STYLE SEQUENTIAL ASAP SYSTEM - MANUAL SQL EXECUTION
-- ====================================================================
-- Execute these in order in your SQL editor

-- Step 1: Add queue fields to trip_requests table
ALTER TABLE trip_requests 
ADD COLUMN IF NOT EXISTS current_driver_position INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_drivers_queued INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_assigned_driver_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS driver_response_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS drivers_tried TEXT[] DEFAULT '{}';

-- Step 2: Create the Uber-style sequential matching function
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
    nearby_drivers UUID[];
    first_driver_id UUID;
    timeout_time TIMESTAMP WITH TIME ZONE;
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
    SELECT ARRAY_AGG(driver_id ORDER BY distance_km ASC, rating DESC) 
    INTO nearby_drivers
    FROM find_nearby_available_drivers(
        trip_record.pickup_latitude::DECIMAL,
        trip_record.pickup_longitude::DECIMAL,
        50, -- max_distance_km_param
        60, -- min_updated_minutes_param  
        trip_record.required_truck_type_id -- required_truck_type_id_param
    );
    
    IF nearby_drivers IS NULL OR array_length(nearby_drivers, 1) = 0 THEN
        -- No drivers found
        UPDATE trip_requests 
        SET status = 'no_drivers_available',
            matching_started_at = NOW()
        WHERE id = trip_request_id;
        
        RETURN QUERY SELECT false, 'No available drivers found', NULL::UUID, 0, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Get the first driver in the queue
    first_driver_id := nearby_drivers[1];
    timeout_time := NOW() + INTERVAL '15 seconds';
    
    -- Update trip with Uber-style queue information
    UPDATE trip_requests 
    SET 
        status = 'driver_assigned',
        assigned_driver_id = first_driver_id,  -- This is the key for real-time notifications!
        current_assigned_driver_id = first_driver_id,
        current_driver_position = 1,
        total_drivers_queued = array_length(nearby_drivers, 1),
        driver_response_deadline = timeout_time,
        drivers_tried = '{}',  -- Reset tried drivers
        matching_started_at = NOW()
    WHERE id = trip_request_id;
    
    RAISE NOTICE '✅ UBER-STYLE: Assigned trip to driver % (position 1 of %)', first_driver_id, array_length(nearby_drivers, 1);
    
    RETURN QUERY SELECT 
        true, 
        format('Trip assigned to driver %s (1 of %s drivers available)', first_driver_id, array_length(nearby_drivers, 1)),
        first_driver_id,
        array_length(nearby_drivers, 1),
        timeout_time;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create function to handle driver decline and move to next driver
CREATE OR REPLACE FUNCTION decline_trip_request_uber_style(request_id UUID, declining_driver_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    next_driver_assigned UUID,
    position_in_queue INTEGER
) AS $$
DECLARE
    trip_record RECORD;
    nearby_drivers UUID[];
    next_driver_id UUID;
    next_position INTEGER;
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
    
    -- Add this driver to the "tried" list
    UPDATE trip_requests 
    SET drivers_tried = array_append(drivers_tried, declining_driver_id::TEXT)
    WHERE id = request_id;
    
    -- Find nearby drivers again (excluding tried drivers)
    SELECT ARRAY_AGG(driver_id ORDER BY distance_km ASC, rating DESC) 
    INTO nearby_drivers
    FROM find_nearby_available_drivers(
        trip_record.pickup_latitude::DECIMAL,
        trip_record.pickup_longitude::DECIMAL,
        50, -- max_distance_km_param
        60, -- min_updated_minutes_param
        trip_record.required_truck_type_id -- required_truck_type_id_param
    )
    WHERE driver_id::TEXT != ALL(trip_record.drivers_tried || declining_driver_id::TEXT);
    
    IF nearby_drivers IS NULL OR array_length(nearby_drivers, 1) = 0 THEN
        -- No more drivers available
        UPDATE trip_requests 
        SET 
            status = 'expired',
            assigned_driver_id = NULL,
            current_assigned_driver_id = NULL
        WHERE id = request_id;
        
        RETURN QUERY SELECT true, 'No more drivers available - trip expired', NULL::UUID, 0;
        RETURN;
    END IF;
    
    -- Get next driver
    next_driver_id := nearby_drivers[1];
    next_position := trip_record.current_driver_position + 1;
    timeout_time := NOW() + INTERVAL '15 seconds';
    
    -- Assign to next driver
    UPDATE trip_requests 
    SET 
        assigned_driver_id = next_driver_id,  -- Real-time notification will trigger!
        current_assigned_driver_id = next_driver_id,
        current_driver_position = next_position,
        driver_response_deadline = timeout_time
    WHERE id = request_id;
    
    RAISE NOTICE '✅ UBER-STYLE: Moved to next driver % (position %)', next_driver_id, next_position;
    
    RETURN QUERY SELECT 
        true, 
        format('Trip moved to next driver (position %s)', next_position),
        next_driver_id,
        next_position;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create function to handle driver accept
CREATE OR REPLACE FUNCTION accept_trip_request_uber_style(request_id UUID, accepting_driver_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    trip_status TEXT
) AS $$
DECLARE
    trip_record RECORD;
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
    
    -- Accept the trip
    UPDATE trip_requests 
    SET 
        status = 'matched',
        driver_response_deadline = NULL
    WHERE id = request_id;
    
    RAISE NOTICE '🎉 UBER-STYLE: Trip % successfully matched to driver %', request_id, accepting_driver_id;
    
    RETURN QUERY SELECT true, 'Trip successfully accepted', 'matched';
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create timeout handler function
CREATE OR REPLACE FUNCTION handle_asap_timeout(request_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    action_taken TEXT
) AS $$
DECLARE
    trip_record RECORD;
BEGIN
    -- Get trip that has timed out
    SELECT * INTO trip_record 
    FROM trip_requests 
    WHERE id = request_id 
      AND status = 'driver_assigned'
      AND driver_response_deadline <= NOW();
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'No timed out trip found', 'none';
        RETURN;
    END IF;
    
    -- Automatically decline for the current driver and move to next
    RETURN QUERY 
    SELECT d.success, d.message, 'auto_declined' as action_taken
    FROM decline_trip_request_uber_style(request_id, trip_record.assigned_driver_id) d;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Update the main start_asap_matching to use Uber style
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

-- Step 7: Update accept_trip_request to use Uber style
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

-- Step 8: Update decline_trip_request to use Uber style
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

-- ====================================================================
-- VERIFICATION QUERIES - Run these to test the system
-- ====================================================================

-- Test 1: Check if functions were created successfully
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name LIKE '%uber_style%' 
ORDER BY routine_name;

-- Test 2: Check if new columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'trip_requests' 
  AND column_name IN ('current_driver_position', 'total_drivers_queued', 'current_assigned_driver_id', 'driver_response_deadline', 'drivers_tried')
ORDER BY column_name;

-- Test 3: Create a test trip and run the Uber-style matching
-- (Replace with actual customer ID)
/*
INSERT INTO trip_requests (
    customer_id,
    pickup_latitude, pickup_longitude, pickup_address,
    delivery_latitude, delivery_longitude, delivery_address,
    material_type, estimated_weight_tons, estimated_volume_m3,
    load_description, pickup_time_preference,
    estimated_duration_minutes, estimated_distance_km, quoted_price,
    status
) VALUES (
    'e5310d01-1a36-4f09-9c5c-2b06094e8c55', -- Replace with actual customer ID
    32.7767, -96.7970, 'Test Dallas Pickup',
    32.7867, -96.8070, 'Test Dallas Delivery',
    'concrete', 15, 12,
    'Uber-style test load', 'asap',
    90, 20, 500,
    'pending'
) RETURNING id;

-- Then test the matching (replace trip_id with the returned ID above):
SELECT * FROM start_asap_matching_uber_style('YOUR_TRIP_ID_HERE');
*/

SELECT '✅ UBER-STYLE ASAP SYSTEM INSTALLED SUCCESSFULLY!' as status,
       'Now the system will offer trips to drivers sequentially, one at a time' as behavior,
       'Real-time notifications will work because assigned_driver_id is set' as notifications;
