-- Deploy the corrected function directly
CREATE OR REPLACE FUNCTION start_asap_offers_simple(trip_request_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    first_driver_id UUID,
    driver_count INTEGER,
    offer_expires_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    trip_record RECORD;
    nearby_drivers_array UUID[];
    first_driver_id_var UUID;
    timeout_time TIMESTAMP WITH TIME ZONE;
    driver_count_var INTEGER;
BEGIN
    RAISE NOTICE '🚀 UBER-STYLE SIMPLE: Starting offer system for trip: %', trip_request_id;
    
    -- Get the trip request
    SELECT * INTO trip_record FROM trip_requests WHERE id = trip_request_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Trip request not found', NULL::UUID, 0, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Only process ASAP trips that are pending/processing and unassigned
    IF trip_record.pickup_time_preference != 'asap' OR (trip_record.status != 'pending' AND trip_record.status != 'processing') OR trip_record.assigned_driver_id IS NOT NULL THEN
        RETURN QUERY SELECT false, 'Not an available ASAP trip', NULL::UUID, 0, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    -- Find nearby drivers
    SELECT ARRAY_AGG(driver_id ORDER BY distance_km ASC, rating DESC NULLS LAST) 
    INTO nearby_drivers_array
    FROM find_nearby_available_drivers(
        trip_record.pickup_latitude::DECIMAL,
        trip_record.pickup_longitude::DECIMAL,
        50, 1440, trip_record.required_truck_type_id
    );
    
    driver_count_var := COALESCE(array_length(nearby_drivers_array, 1), 0);
    
    IF driver_count_var = 0 THEN
        UPDATE trip_requests 
        SET status = 'no_drivers_available', matching_started_at = NOW()
        WHERE id = trip_request_id;
        RETURN QUERY SELECT false, 'No available drivers found', NULL::UUID, 0, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;
    
    first_driver_id_var := nearby_drivers_array[1];
    timeout_time := NOW() + INTERVAL '15 seconds';
    
    -- CORRECTED: Use existing fields for offer system
    -- status = 'offering_to_driver' (NEW STATUS - being offered, not assigned!)
    -- assigned_driver_id = NULL (still null - just an offer!)
    -- acceptance_deadline = when offer expires  
    -- special_requirements = store current offer details
    UPDATE trip_requests 
    SET 
        status = 'offering_to_driver',  -- Being offered, not assigned!
        assigned_driver_id = NULL,      -- Still NULL - just an offer!
        acceptance_deadline = timeout_time,
        matching_started_at = NOW(),
        load_description = COALESCE(trip_record.load_description, '') || 
                          ' [DRIVER_QUEUE:' || array_to_string(nearby_drivers_array, ',') || ']',
        special_requirements = jsonb_set(
            COALESCE(trip_record.special_requirements, '{}'::jsonb),
            '{current_driver_offer}',
            json_build_object(
                'driver_id', first_driver_id_var,
                'queue_position', 1,
                'total_drivers', driver_count_var,
                'expires_at', timeout_time
            )::jsonb
        )
    WHERE id = trip_request_id;
    
    RAISE NOTICE '✅ OFFERING trip to driver % (not assigned yet!)', first_driver_id_var;
    
    RETURN QUERY SELECT 
        true, 
        format('Trip OFFERED to driver %s (1 of %s) - waiting for response', first_driver_id_var, driver_count_var),
        first_driver_id_var,
        driver_count_var,
        timeout_time;
END;
$$ LANGUAGE plpgsql;
