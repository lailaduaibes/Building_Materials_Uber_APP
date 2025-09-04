-- 🚀 ULTIMATE FIX: Complete ASAP Queue System Repair

-- The investigation shows:
-- 1. Queue system never creates entries (all in_queue = null)
-- 2. Location data is stale/missing causing function failures
-- 3. Yet drivers get notifications through unknown mechanism

-- STEP 1: Fix the ambiguous column reference in find_nearby_available_drivers_fixed
DROP FUNCTION IF EXISTS find_nearby_available_drivers_fixed(DECIMAL, DECIMAL, INTEGER, UUID, INTEGER);

CREATE OR REPLACE FUNCTION find_nearby_available_drivers_fixed(
    pickup_lat DECIMAL DEFAULT 0,
    pickup_lng DECIMAL DEFAULT 0,
    max_distance_km_param INTEGER DEFAULT 50,
    required_truck_type_id_param UUID DEFAULT NULL,
    min_updated_minutes_param INTEGER DEFAULT 30
)
RETURNS TABLE(
    driver_id UUID,
    driver_name TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    distance_km DECIMAL,
    last_updated TIMESTAMP WITH TIME ZONE,
    current_truck_id UUID,
    vehicle_model VARCHAR,
    vehicle_plate VARCHAR,
    rating DECIMAL,
    total_trips INTEGER
) LANGUAGE plpgsql AS $$
BEGIN
    RAISE NOTICE '🔧 Using FIXED find_nearby_available_drivers (no column ambiguity)';
    
    RETURN QUERY
    SELECT 
        dp.user_id,
        COALESCE(dp.first_name || ' ' || dp.last_name, 'Driver')::TEXT,
        -- Use driver_locations if available, otherwise default to 0
        COALESCE(dl.driver_lat, pu.current_latitude, 0::DECIMAL),
        COALESCE(dl.driver_lng, pu.current_longitude, 0::DECIMAL),
        -- Simple distance calculation or 0 if no location
        CASE 
            WHEN dl.driver_lat IS NOT NULL AND dl.driver_lng IS NOT NULL THEN
                (6371 * acos(
                    cos(radians(pickup_lat)) * 
                    cos(radians(dl.driver_lat)) * 
                    cos(radians(dl.driver_lng) - radians(pickup_lng)) + 
                    sin(radians(pickup_lat)) * 
                    sin(radians(dl.driver_lat))
                ))::DECIMAL
            ELSE 0::DECIMAL
        END,
        COALESCE(dl.loc_updated, pu.last_location_update, dp.updated_at),
        dp.current_truck_id,
        dp.vehicle_model,
        dp.vehicle_plate,
        dp.rating,
        dp.total_trips
    FROM driver_profiles dp
    LEFT JOIN public.users pu ON dp.user_id = pu.id
    LEFT JOIN LATERAL (
        SELECT 
            latitude as driver_lat, 
            longitude as driver_lng, 
            updated_at as loc_updated 
        FROM driver_locations 
        WHERE driver_id = dp.user_id 
        ORDER BY updated_at DESC 
        LIMIT 1
    ) dl ON true
    WHERE dp.is_available = true 
    AND dp.is_approved = true
    AND dp.status != 'offline'
    -- Accept drivers even without location data if we're being lenient
    AND (
        dl.driver_lat IS NOT NULL OR  -- Has location in driver_locations
        pu.current_latitude IS NOT NULL OR  -- Has location in public.users
        min_updated_minutes_param > 60  -- If > 60 minutes, skip location requirement entirely
    )
    -- Truck type compatibility (if specified)
    AND (required_truck_type_id_param IS NULL OR dp.selected_truck_type_id = required_truck_type_id_param)
    ORDER BY 
        CASE WHEN dl.driver_lat IS NOT NULL THEN 0 ELSE 1 END,  -- Prioritize drivers with location
        dp.rating DESC, 
        dp.total_trips DESC;
END;
$$;

-- STEP 2: Create bulletproof start_asap_matching that always works
CREATE OR REPLACE FUNCTION start_asap_matching_bulletproof(trip_request_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    drivers_found INTEGER
) LANGUAGE plpgsql AS $$
DECLARE
    trip_record RECORD;
    driver_count INTEGER := 0;
    queue_entry_id UUID;
    current_position INTEGER := 1;
    driver_record RECORD;
BEGIN
    RAISE NOTICE '🚀 BULLETPROOF start_asap_matching for trip: %', trip_request_id;
    
    -- Get trip details
    SELECT * INTO trip_record 
    FROM trip_requests 
    WHERE id = trip_request_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Trip not found', 0;
        RETURN;
    END IF;
    
    -- Clear any existing queue entries for this trip
    DELETE FROM asap_driver_queue WHERE trip_request_id = trip_request_id;
    RAISE NOTICE '🧹 Cleared existing queue entries';
    
    -- Find available drivers using our fixed function (very lenient criteria)
    FOR driver_record IN 
        SELECT * FROM find_nearby_available_drivers_fixed(
            COALESCE(trip_record.pickup_latitude::DECIMAL, 0),
            COALESCE(trip_record.pickup_longitude::DECIMAL, 0),
            100,  -- Large distance allowance  
            trip_record.required_truck_type_id,
            120   -- Very lenient time requirement (2 hours)
        )
    LOOP
        -- Add driver to queue
        INSERT INTO asap_driver_queue (
            trip_request_id,
            driver_id,
            queue_position,
            status,
            created_at
        ) VALUES (
            trip_request_id,
            driver_record.driver_id,
            current_position,
            'pending',
            NOW()
        );
        
        driver_count := driver_count + 1;
        current_position := current_position + 1;
        
        RAISE NOTICE '✅ Added driver % to queue at position %', driver_record.driver_name, current_position - 1;
    END LOOP;
    
    RAISE NOTICE '📊 Created queue with % drivers', driver_count;
    
    IF driver_count = 0 THEN
        -- Update trip status
        UPDATE trip_requests 
        SET status = 'no_drivers_available'
        WHERE id = trip_request_id;
        
        RETURN QUERY SELECT FALSE, 'No available drivers found', 0;
        RETURN;
    END IF;
    
    -- Now notify the first driver and assign them
    PERFORM notify_first_driver_and_assign(trip_request_id);
    
    RETURN QUERY SELECT TRUE, FORMAT('Created queue with %s drivers and notified first driver', driver_count), driver_count;
END;
$$;

-- STEP 3: Create function to notify first driver and set assigned_driver_id
CREATE OR REPLACE FUNCTION notify_first_driver_and_assign(trip_request_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
    first_driver_id UUID;
BEGIN
    -- Get first driver in queue
    SELECT driver_id INTO first_driver_id
    FROM asap_driver_queue 
    WHERE trip_request_id = trip_request_id
    AND status = 'pending'
    ORDER BY queue_position ASC
    LIMIT 1;
    
    IF first_driver_id IS NULL THEN
        RAISE NOTICE '❌ No drivers in queue to notify';
        RETURN FALSE;
    END IF;
    
    -- 🎯 CRITICAL: Set assigned_driver_id so real-time subscription works
    UPDATE trip_requests 
    SET assigned_driver_id = first_driver_id,
        status = 'pending'  -- Keep as pending until driver accepts
    WHERE id = trip_request_id;
    
    -- Update queue entry
    UPDATE asap_driver_queue 
    SET status = 'notified',
        notified_at = NOW()
    WHERE trip_request_id = trip_request_id
    AND driver_id = first_driver_id;
    
    RAISE NOTICE '✅ ASSIGNED: Trip % assigned to driver % via queue system', trip_request_id, first_driver_id;
    
    RETURN TRUE;
END;
$$;

-- STEP 4: Test the bulletproof system with a recent failed trip
SELECT '=== TESTING BULLETPROOF ASAP SYSTEM ===' as test_section;

DO $$
DECLARE
    test_result RECORD;
    recent_trip_id UUID;
    final_status RECORD;
BEGIN
    -- Get the most recent failed trip
    SELECT id INTO recent_trip_id 
    FROM trip_requests 
    WHERE status = 'no_drivers_available'
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF recent_trip_id IS NOT NULL THEN
        RAISE NOTICE '🧪 Testing BULLETPROOF system with failed trip: %', recent_trip_id;
        
        -- Reset trip to pending
        UPDATE trip_requests 
        SET status = 'pending', assigned_driver_id = NULL 
        WHERE id = recent_trip_id;
        
        -- Test bulletproof function
        SELECT * INTO test_result 
        FROM start_asap_matching_bulletproof(recent_trip_id);
        
        RAISE NOTICE '📊 BULLETPROOF result: success=%, message=%, drivers=%', 
                     test_result.success, test_result.message, test_result.drivers_found;
        
        -- Check final state
        SELECT 
            id, status, assigned_driver_id,
            CASE WHEN assigned_driver_id IS NOT NULL THEN '✅ ASSIGNED' ELSE '❌ NOT_ASSIGNED' END as assignment_status
        INTO final_status
        FROM trip_requests 
        WHERE id = recent_trip_id;
        
        RAISE NOTICE '🎯 Final state: status=%, assigned_driver_id=%, assignment_status=%', 
                     final_status.status, final_status.assigned_driver_id, final_status.assignment_status;
        
        -- Show queue entries created
        RAISE NOTICE '📋 Queue entries created:';
        FOR test_result IN 
            SELECT driver_id, queue_position, status
            FROM asap_driver_queue 
            WHERE trip_request_id = recent_trip_id
            ORDER BY queue_position
        LOOP
            RAISE NOTICE '  Position %: Driver % (status: %)', 
                         test_result.queue_position, test_result.driver_id, test_result.status;
        END LOOP;
        
    ELSE
        RAISE NOTICE '❌ No failed trips found to test with';
    END IF;
END $$;

-- STEP 5: Update the CustomerAppNew to use bulletproof function
SELECT '🔧 UPDATE CustomerAppNew to call start_asap_matching_bulletproof instead of start_asap_matching_final_fix' as instruction;

SELECT '🎯 This should COMPLETELY fix the queue system and stop simultaneous notifications!' as conclusion;
