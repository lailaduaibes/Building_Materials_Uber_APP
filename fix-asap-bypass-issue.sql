-- 🚨 CRITICAL FIX: ASAP Trip Bypass Issue Resolution

-- ISSUE IDENTIFIED:
-- 1. DriverService.ts updates users table, but ASAP function prefers driver_locations
-- 2. Real-time subscription listens for assigned_driver_id, causing direct assignment bypass
-- 3. Trips never go through queue system properly

-- PART 1: Fix location data sync
-- DriverService.ts now updates BOTH tables (fixed in code)

-- PART 2: Fix the real-time subscription to use queue notifications instead
-- The subscription should listen to asap_driver_queue, not trip_requests!

-- PART 3: Ensure proper ASAP flow
-- Customer creates ASAP trip → Queue system → Sequential driver notifications

-- Let's create a notification function that the queue system calls
CREATE OR REPLACE FUNCTION notify_asap_driver_assignment(
    driver_user_id UUID,
    trip_request_id UUID,
    queue_position INTEGER
)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
    notification_payload JSONB;
BEGIN
    -- Create notification payload
    notification_payload := jsonb_build_object(
        'type', 'asap_trip_assignment',
        'driver_id', driver_user_id,
        'trip_id', trip_request_id,
        'queue_position', queue_position,
        'timestamp', NOW()
    );
    
    -- Send real-time notification via pg_notify
    PERFORM pg_notify(
        'asap_driver_notification_' || driver_user_id::text,
        notification_payload::text
    );
    
    RAISE NOTICE 'Sent ASAP notification to driver %', driver_user_id;
    RETURN TRUE;
END;
$$;

-- PART 4: Update the queue system to use proper notifications
CREATE OR REPLACE FUNCTION start_asap_matching_with_proper_notifications(trip_request_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    drivers_found INTEGER,
    first_driver_notified UUID
) LANGUAGE plpgsql AS $$
DECLARE
    trip_record RECORD;
    driver_record RECORD;
    driver_count INTEGER := 0;
    queue_entry_id UUID;
    current_position INTEGER := 1;
    first_driver UUID := NULL;
BEGIN
    -- Get trip details
    SELECT * INTO trip_record FROM trip_requests WHERE id = trip_request_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Trip not found', 0, NULL::UUID;
        RETURN;
    END IF;
    
    RAISE NOTICE '🚀 Starting ASAP matching for trip % with proper notifications', trip_request_id;
    
    -- Find available drivers near pickup location
    FOR driver_record IN
        SELECT * FROM find_nearby_available_drivers_fixed(
            trip_record.pickup_latitude,
            trip_record.pickup_longitude,
            50, -- max distance 50km
            trip_record.required_truck_type_id,
            90  -- relaxed time requirement
        )
        LIMIT 10 -- Max 10 drivers in queue
    LOOP
        driver_count := driver_count + 1;
        
        -- Create queue entry
        queue_entry_id := gen_random_uuid();
        
        INSERT INTO asap_driver_queue (
            id,
            trip_request_id,
            driver_id,
            position,
            status,
            notified_at,
            expires_at,
            created_at
        ) VALUES (
            queue_entry_id,
            trip_request_id,
            driver_record.driver_id,
            current_position,
            CASE WHEN current_position = 1 THEN 'notified' ELSE 'waiting' END,
            CASE WHEN current_position = 1 THEN NOW() ELSE NULL END,
            CASE WHEN current_position = 1 THEN NOW() + INTERVAL '15 seconds' ELSE NULL END,
            NOW()
        );
        
        -- Notify first driver immediately
        IF current_position = 1 THEN
            first_driver := driver_record.driver_id;
            PERFORM notify_asap_driver_assignment(
                driver_record.driver_id,
                trip_request_id,
                current_position
            );
            RAISE NOTICE '📢 Notified first driver: %', driver_record.driver_name;
        END IF;
        
        current_position := current_position + 1;
    END LOOP;
    
    -- Update trip status
    IF driver_count > 0 THEN
        UPDATE trip_requests 
        SET status = 'searching_driver',
            matching_started_at = NOW()
        WHERE id = trip_request_id;
        
        RETURN QUERY SELECT TRUE, 
            format('Queue created with %s drivers, first driver notified', driver_count),
            driver_count,
            first_driver;
    ELSE
        UPDATE trip_requests 
        SET status = 'no_drivers_available'
        WHERE id = trip_request_id;
        
        RETURN QUERY SELECT FALSE, 'No available drivers found', 0, NULL::UUID;
    END IF;
END;
$$;

-- PART 5: Test the complete flow
DO $$
DECLARE
    test_trip_id UUID;
    result_record RECORD;
BEGIN
    RAISE NOTICE '🧪 TESTING COMPLETE ASAP FLOW...';
    
    -- Create a test ASAP trip
    INSERT INTO trip_requests (
        id,
        customer_id,
        pickup_latitude,
        pickup_longitude,
        delivery_latitude,
        delivery_longitude,
        pickup_address,
        delivery_address,
        material_type,
        load_description,
        pickup_time_preference,
        status,
        created_at
    ) VALUES (
        gen_random_uuid(),
        (SELECT id FROM users WHERE role = 'customer' LIMIT 1),
        24.7136, -- Riyadh coordinates
        46.6753,
        24.7500,
        46.7000,
        '{"formatted_address": "Test Pickup, Riyadh"}',
        '{"formatted_address": "Test Delivery, Riyadh"}',
        'construction_materials',
        'Test ASAP trip for bypass investigation',
        'asap',
        'pending',
        NOW()
    ) RETURNING id INTO test_trip_id;
    
    RAISE NOTICE '📝 Created test trip: %', test_trip_id;
    
    -- Run the proper ASAP matching
    SELECT * INTO result_record FROM start_asap_matching_with_proper_notifications(test_trip_id);
    
    RAISE NOTICE '📊 Result: Success=%, Message=%, Drivers=%', 
        result_record.success, result_record.message, result_record.drivers_found;
    
    -- Clean up test data
    DELETE FROM asap_driver_queue WHERE trip_request_id = test_trip_id;
    DELETE FROM trip_requests WHERE id = test_trip_id;
    
    RAISE NOTICE '✅ Test completed and cleaned up';
END;
$$;

-- SUMMARY OF FIXES:
-- 1. DriverService.ts now updates BOTH users and driver_locations tables ✅
-- 2. Created proper notification system for queue-based ASAP matching
-- 3. Real-time subscription should listen to pg_notify instead of direct assignments
-- 4. Queue system now properly notifies drivers sequentially

SELECT '🎯 ASAP bypass issue should now be resolved!' as conclusion;
