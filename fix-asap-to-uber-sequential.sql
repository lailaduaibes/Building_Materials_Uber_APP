-- Fix ASAP System to Use True Uber Sequential Pattern
-- This will modify the existing functions to implement proper sequential driver offers

-- STEP 1: Create a proper sequential ASAP matching function
CREATE OR REPLACE FUNCTION start_asap_matching_uber_style(trip_request_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    driver_offered_to UUID,
    offer_expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    trip_record RECORD;
    selected_driver_id UUID;
    offer_expiry TIMESTAMP WITH TIME ZONE;
BEGIN
    RAISE NOTICE '🚀 [UBER STYLE] Starting sequential ASAP matching for trip: %', trip_request_id;
    
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
    
    -- Check if already assigned or in progress
    IF trip_record.status NOT IN ('pending', 'no_drivers_available') THEN
        RETURN QUERY SELECT false, 'Trip already in progress', NULL::UUID, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Mark trip as matching started
    UPDATE trip_requests 
    SET status = 'matching', matching_started_at = NOW()
    WHERE id = trip_request_id;
    
    RAISE NOTICE '✅ [UBER STYLE] Trip marked as matching, finding best driver...';
    
    -- Find the best available driver (closest)
    SELECT driver_id INTO selected_driver_id
    FROM find_nearby_available_drivers(
        trip_record.pickup_latitude::DECIMAL,
        trip_record.pickup_longitude::DECIMAL,
        50, -- 50km max distance
        60, -- updated within 60 minutes
        trip_record.required_truck_type_id
    )
    ORDER BY distance_km ASC
    LIMIT 1;
    
    IF selected_driver_id IS NULL THEN
        -- No drivers available
        UPDATE trip_requests 
        SET status = 'no_drivers_available'
        WHERE id = trip_request_id;
        
        RAISE NOTICE '❌ [UBER STYLE] No available drivers found';
        RETURN QUERY SELECT false, 'No available drivers found', NULL::UUID, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Set offer expiry (15 seconds from now)
    offer_expiry := NOW() + INTERVAL '15 seconds';
    
    -- UBER STYLE: Assign to specific driver with deadline
    UPDATE trip_requests 
    SET 
        assigned_driver_id = selected_driver_id,
        status = 'offered',
        acceptance_deadline = offer_expiry,
        driver_request_sent_at = NOW()
    WHERE id = trip_request_id;
    
    RAISE NOTICE '✅ [UBER STYLE] Trip offered to driver: % (expires at: %)', selected_driver_id, offer_expiry;
    
    RETURN QUERY SELECT true, 'Trip offered to driver', selected_driver_id, offer_expiry;
END;
$$ LANGUAGE plpgsql;

-- STEP 2: Create function to handle driver decline and move to next driver
CREATE OR REPLACE FUNCTION decline_and_offer_next_driver(trip_request_id UUID, declining_driver_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    next_driver_id UUID,
    offer_expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    trip_record RECORD;
    selected_driver_id UUID;
    offer_expiry TIMESTAMP WITH TIME ZONE;
    declined_drivers UUID[];
BEGIN
    RAISE NOTICE '🔄 [UBER STYLE] Driver % declined trip %, finding next driver...', declining_driver_id, trip_request_id;
    
    -- Get the trip request
    SELECT * INTO trip_record FROM trip_requests WHERE id = trip_request_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Trip request not found', NULL::UUID, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Verify this driver was actually assigned
    IF trip_record.assigned_driver_id != declining_driver_id THEN
        RETURN QUERY SELECT false, 'Driver was not assigned to this trip', NULL::UUID, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Get list of drivers who have already declined (stored in special requirements field for now)
    -- In production, you might want a separate table for this
    declined_drivers := COALESCE(
        string_to_array(trip_record.special_requirements, ',')::UUID[], 
        ARRAY[]::UUID[]
    ) || ARRAY[declining_driver_id];
    
    -- Find next available driver (excluding those who already declined)
    SELECT driver_id INTO selected_driver_id
    FROM find_nearby_available_drivers(
        trip_record.pickup_latitude::DECIMAL,
        trip_record.pickup_longitude::DECIMAL,
        50, -- 50km max distance
        60, -- updated within 60 minutes
        trip_record.required_truck_type_id
    )
    WHERE driver_id != ALL(declined_drivers)
    ORDER BY distance_km ASC
    LIMIT 1;
    
    IF selected_driver_id IS NULL THEN
        -- No more drivers available
        UPDATE trip_requests 
        SET 
            status = 'no_drivers_available',
            assigned_driver_id = NULL,
            acceptance_deadline = NULL
        WHERE id = trip_request_id;
        
        RAISE NOTICE '❌ [UBER STYLE] No more available drivers, trip marked as no drivers available';
        RETURN QUERY SELECT false, 'No more available drivers', NULL::UUID, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Set new offer expiry
    offer_expiry := NOW() + INTERVAL '15 seconds';
    
    -- Offer to next driver
    UPDATE trip_requests 
    SET 
        assigned_driver_id = selected_driver_id,
        status = 'offered',
        acceptance_deadline = offer_expiry,
        driver_request_sent_at = NOW(),
        special_requirements = array_to_string(declined_drivers, ',') -- Store declined drivers list
    WHERE id = trip_request_id;
    
    RAISE NOTICE '✅ [UBER STYLE] Trip offered to next driver: % (expires at: %)', selected_driver_id, offer_expiry;
    
    RETURN QUERY SELECT true, 'Trip offered to next driver', selected_driver_id, offer_expiry;
END;
$$ LANGUAGE plpgsql;

-- STEP 3: Create function to handle timeout and move to next driver automatically
CREATE OR REPLACE FUNCTION handle_offer_timeout(trip_request_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    next_driver_id UUID,
    offer_expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    trip_record RECORD;
    current_driver_id UUID;
BEGIN
    RAISE NOTICE '⏰ [UBER STYLE] Handling offer timeout for trip: %', trip_request_id;
    
    -- Get the trip request
    SELECT * INTO trip_record FROM trip_requests WHERE id = trip_request_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Trip request not found', NULL::UUID, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Check if offer has actually expired
    IF trip_record.acceptance_deadline > NOW() THEN
        RETURN QUERY SELECT false, 'Offer has not expired yet', NULL::UUID, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Check if trip is in offered status
    IF trip_record.status != 'offered' THEN
        RETURN QUERY SELECT false, 'Trip is not in offered status', NULL::UUID, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    current_driver_id := trip_record.assigned_driver_id;
    
    -- Call decline_and_offer_next_driver to move to next driver
    RETURN QUERY 
    SELECT * FROM decline_and_offer_next_driver(trip_request_id, current_driver_id);
END;
$$ LANGUAGE plpgsql;

-- STEP 4: Update accept_trip_request to work with new system
CREATE OR REPLACE FUNCTION accept_trip_request_uber_style(request_id UUID, accepting_driver_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    trip_id UUID
) AS $$
DECLARE
    trip_record RECORD;
BEGIN
    RAISE NOTICE '✅ [UBER STYLE] Driver % accepting trip %', accepting_driver_id, request_id;
    
    -- Get the trip request
    SELECT * INTO trip_record FROM trip_requests WHERE id = request_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Trip request not found', NULL::UUID;
        RETURN;
    END IF;
    
    -- Verify this driver is assigned and offer hasn't expired
    IF trip_record.assigned_driver_id != accepting_driver_id THEN
        RETURN QUERY SELECT false, 'You are not assigned to this trip', NULL::UUID;
        RETURN;
    END IF;
    
    IF trip_record.status != 'offered' THEN
        RETURN QUERY SELECT false, 'Trip offer is no longer available', NULL::UUID;
        RETURN;
    END IF;
    
    IF trip_record.acceptance_deadline < NOW() THEN
        RETURN QUERY SELECT false, 'Trip offer has expired', NULL::UUID;
        RETURN;
    END IF;
    
    -- Accept the trip
    UPDATE trip_requests 
    SET 
        status = 'accepted',
        acceptance_deadline = NULL,
        updated_at = NOW()
    WHERE id = request_id;
    
    RAISE NOTICE '🎉 [UBER STYLE] Trip successfully accepted by driver %', accepting_driver_id;
    
    RETURN QUERY SELECT true, 'Trip successfully accepted', request_id;
END;
$$ LANGUAGE plpgsql;

-- STEP 5: Test the new system
DO $$
DECLARE
    test_result RECORD;
BEGIN
    RAISE NOTICE '🧪 [TEST] Testing new Uber-style ASAP system...';
    
    -- Find a recent pending ASAP trip to test with
    SELECT id INTO test_result 
    FROM trip_requests 
    WHERE pickup_time_preference = 'asap' 
        AND status IN ('pending', 'no_drivers_available')
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF test_result.id IS NOT NULL THEN
        RAISE NOTICE '🎯 [TEST] Testing with trip: %', test_result.id;
        
        -- Reset trip for testing
        UPDATE trip_requests 
        SET 
            status = 'pending',
            assigned_driver_id = NULL,
            acceptance_deadline = NULL,
            matching_started_at = NULL,
            special_requirements = NULL
        WHERE id = test_result.id;
        
        -- Test the new function
        SELECT * INTO test_result FROM start_asap_matching_uber_style(test_result.id);
        
        RAISE NOTICE '📊 [TEST] Result: %', test_result;
    ELSE
        RAISE NOTICE '⚠️ [TEST] No ASAP trips found for testing';
    END IF;
END $$;

SELECT '🎯 Uber-style ASAP system created! Ready to test with CustomerAppNew.' as status;
