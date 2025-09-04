-- IMPLEMENT TRUE UBER-STYLE ASAP SYSTEM
-- This replaces the "broadcast to all" with "sequential queue" approach

-- Step 1: Add "offered" status to trip_requests
-- (This status means "currently offered to a specific driver")

-- Step 2: Create the TRUE Uber-style sequential assignment function
CREATE OR REPLACE FUNCTION start_uber_style_asap_matching(trip_request_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    offered_to_driver UUID,
    offer_expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    trip_record RECORD;
    nearest_driver_id UUID;
    offer_deadline TIMESTAMP WITH TIME ZONE;
BEGIN
    RAISE NOTICE '🚖 UBER-STYLE: Starting sequential assignment for trip: %', trip_request_id;
    
    -- Get the trip request
    SELECT * INTO trip_record FROM trip_requests WHERE id = trip_request_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Trip request not found', NULL::UUID, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Only process ASAP trips
    IF trip_record.pickup_time_preference != 'asap' THEN
        RETURN QUERY SELECT false, 'Not an ASAP trip', NULL::UUID, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Find the nearest available driver
    SELECT driver_id INTO nearest_driver_id
    FROM find_nearby_available_drivers(
        trip_record.pickup_latitude::DECIMAL,
        trip_record.pickup_longitude::DECIMAL,
        50, -- 50km radius
        60, -- 60 minutes location update tolerance
        trip_record.required_truck_type_id
    )
    LIMIT 1;
    
    IF nearest_driver_id IS NULL THEN
        -- No drivers available
        UPDATE trip_requests 
        SET status = 'no_drivers_available', matching_started_at = NOW()
        WHERE id = trip_request_id;
        
        RETURN QUERY SELECT false, 'No available drivers found', NULL::UUID, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Set offer deadline (15 seconds from now)
    offer_deadline := NOW() + INTERVAL '15 seconds';
    
    -- UBER APPROACH: Offer to ONE driver at a time
    UPDATE trip_requests 
    SET 
        status = 'offered',
        assigned_driver_id = nearest_driver_id,
        acceptance_deadline = offer_deadline,
        matching_started_at = NOW(),
        driver_request_sent_at = NOW()
    WHERE id = trip_request_id;
    
    RAISE NOTICE '✅ UBER-STYLE: Trip offered to driver % until %', nearest_driver_id, offer_deadline;
    
    RETURN QUERY SELECT true, 'Trip offered to nearest driver', nearest_driver_id, offer_deadline;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Function to handle driver decline and move to next driver
CREATE OR REPLACE FUNCTION decline_and_offer_to_next_driver(trip_request_id UUID, declining_driver_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    next_driver_id UUID,
    offer_expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    trip_record RECORD;
    next_driver UUID;
    drivers_tried UUID[] := ARRAY[]::UUID[];
    offer_deadline TIMESTAMP WITH TIME ZONE;
BEGIN
    RAISE NOTICE '🚖 UBER-STYLE: Driver % declined, finding next driver', declining_driver_id;
    
    -- Get current trip state
    SELECT * INTO trip_record FROM trip_requests WHERE id = trip_request_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Trip request not found', NULL::UUID, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Verify the declining driver was actually assigned
    IF trip_record.assigned_driver_id != declining_driver_id THEN
        RETURN QUERY SELECT false, 'Driver was not assigned to this trip', NULL::UUID, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Build list of drivers already tried (we'll enhance this later with a proper queue table)
    drivers_tried := ARRAY[declining_driver_id];
    
    -- Find next available driver (excluding those who already declined)
    SELECT driver_id INTO next_driver
    FROM find_nearby_available_drivers(
        trip_record.pickup_latitude::DECIMAL,
        trip_record.pickup_longitude::DECIMAL,
        50, -- 50km radius
        60, -- 60 minutes
        trip_record.required_truck_type_id
    )
    WHERE driver_id != ALL(drivers_tried)
    LIMIT 1;
    
    IF next_driver IS NULL THEN
        -- No more drivers available
        UPDATE trip_requests 
        SET status = 'no_drivers_available', assigned_driver_id = NULL
        WHERE id = trip_request_id;
        
        RETURN QUERY SELECT false, 'No more available drivers', NULL::UUID, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Offer to next driver
    offer_deadline := NOW() + INTERVAL '15 seconds';
    
    UPDATE trip_requests 
    SET 
        assigned_driver_id = next_driver,
        acceptance_deadline = offer_deadline,
        driver_request_sent_at = NOW()
    WHERE id = trip_request_id;
    
    RAISE NOTICE '✅ UBER-STYLE: Trip now offered to next driver % until %', next_driver, offer_deadline;
    
    RETURN QUERY SELECT true, 'Trip offered to next driver', next_driver, offer_deadline;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Function to accept trip (simpler now)
CREATE OR REPLACE FUNCTION accept_uber_style_trip(trip_request_id UUID, accepting_driver_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    trip_status TEXT
) AS $$
DECLARE
    trip_record RECORD;
BEGIN
    -- Get current trip state
    SELECT * INTO trip_record FROM trip_requests WHERE id = trip_request_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Trip request not found', NULL;
        RETURN;
    END IF;
    
    -- Verify the accepting driver is the one assigned
    IF trip_record.assigned_driver_id != accepting_driver_id THEN
        RETURN QUERY SELECT false, 'You are not assigned to this trip', trip_record.status;
        RETURN;
    END IF;
    
    -- Verify trip is in offered status
    IF trip_record.status != 'offered' THEN
        RETURN QUERY SELECT false, 'Trip is not available for acceptance', trip_record.status;
        RETURN;
    END IF;
    
    -- Accept the trip
    UPDATE trip_requests 
    SET 
        status = 'matched',
        acceptance_deadline = NULL
    WHERE id = trip_request_id;
    
    RAISE NOTICE '✅ UBER-STYLE: Trip accepted by driver %', accepting_driver_id;
    
    RETURN QUERY SELECT true, 'Trip accepted successfully', 'matched'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Function to handle timeouts automatically
CREATE OR REPLACE FUNCTION handle_offer_timeout(trip_request_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    action_taken TEXT
) AS $$
DECLARE
    trip_record RECORD;
    timeout_result RECORD;
BEGIN
    -- Get current trip state
    SELECT * INTO trip_record FROM trip_requests WHERE id = trip_request_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Trip request not found', 'none';
        RETURN;
    END IF;
    
    -- Check if trip has actually timed out
    IF trip_record.status != 'offered' OR trip_record.acceptance_deadline > NOW() THEN
        RETURN QUERY SELECT false, 'Trip has not timed out', 'none';
        RETURN;
    END IF;
    
    RAISE NOTICE '⏰ UBER-STYLE: Offer timed out for driver %, moving to next', trip_record.assigned_driver_id;
    
    -- Move to next driver
    SELECT * INTO timeout_result 
    FROM decline_and_offer_to_next_driver(trip_request_id, trip_record.assigned_driver_id);
    
    IF timeout_result.success THEN
        RETURN QUERY SELECT true, 'Moved to next driver due to timeout', 'offered_to_next';
    ELSE
        RETURN QUERY SELECT true, 'No more drivers available', 'expired';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Test the new system
DO $$
DECLARE
    test_trip_id UUID;
    result_record RECORD;
BEGIN
    -- Find a recent ASAP trip
    SELECT id INTO test_trip_id 
    FROM trip_requests 
    WHERE pickup_time_preference = 'asap'
        AND status IN ('pending', 'no_drivers_available')
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF test_trip_id IS NOT NULL THEN
        RAISE NOTICE '🧪 Testing Uber-style system with trip: %', test_trip_id;
        
        -- Reset for testing
        UPDATE trip_requests 
        SET status = 'pending', assigned_driver_id = NULL, matching_started_at = NULL
        WHERE id = test_trip_id;
        
        -- Test the system
        SELECT * INTO result_record FROM start_uber_style_asap_matching(test_trip_id);
        RAISE NOTICE '📊 Result: %', result_record;
    ELSE
        RAISE NOTICE '⚠️ No ASAP trips found for testing';
    END IF;
END $$;

SELECT '🚖 TRUE UBER-STYLE ASAP SYSTEM IMPLEMENTED!' as status,
       'Next: Update CustomerAppNew to call start_uber_style_asap_matching' as next_step,
       'Update DriverService real-time filter to status=offered' as driver_app_change;
