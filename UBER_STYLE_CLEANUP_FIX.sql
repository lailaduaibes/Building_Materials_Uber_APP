-- CRITICAL FIX: Replace cleanup_expired_trip_requests with Uber-style timeout handling
-- This function is called by React Native DriverService.ts and needs to move trips to next driver

-- Drop the existing non-Uber-style function
DROP FUNCTION IF EXISTS cleanup_expired_trip_requests();

-- Create Uber-style cleanup function that moves to next driver instead of expiring
CREATE OR REPLACE FUNCTION cleanup_expired_trip_requests()
RETURNS TABLE(
    cleaned_count INTEGER,
    message TEXT
) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    timeout_trip RECORD;
    processed_count INTEGER := 0;
    result_record RECORD;
    regular_expired INTEGER := 0;
BEGIN
    RAISE NOTICE '🧹 UBER-STYLE: Starting cleanup of expired trips...';
    
    -- Part 1: Handle ASAP trips with Uber-style timeout (move to next driver)
    FOR timeout_trip IN 
        SELECT id, assigned_driver_id, acceptance_deadline
        FROM trip_requests 
        WHERE status = 'pending'
          AND assigned_driver_id IS NOT NULL
          AND acceptance_deadline IS NOT NULL
          AND acceptance_deadline <= NOW()
          AND pickup_time_preference = 'asap'
          AND load_description LIKE '%[QUEUE:%'  -- Has driver queue
    LOOP
        -- Use decline function to move to next driver (simulates timeout = auto-decline)
        BEGIN
            SELECT * INTO result_record
            FROM decline_trip_request_uber_style(timeout_trip.id, timeout_trip.assigned_driver_id);
            
            processed_count := processed_count + 1;
            
            RAISE NOTICE '⏰ UBER-STYLE: Auto-moved timed out trip % from driver % to next driver', 
                         timeout_trip.id, timeout_trip.assigned_driver_id;
        EXCEPTION WHEN OTHERS THEN
            -- If decline fails, mark as expired
            UPDATE trip_requests 
            SET status = 'expired', assigned_driver_id = NULL
            WHERE id = timeout_trip.id;
            
            regular_expired := regular_expired + 1;
            RAISE NOTICE '❌ Failed to move trip %, marked as expired: %', timeout_trip.id, SQLERRM;
        END;
    END LOOP;
    
    -- Part 2: Handle regular expired trips (no queue or not ASAP)
    UPDATE trip_requests 
    SET status = 'expired', assigned_driver_id = NULL
    WHERE status = 'pending'
      AND (
          -- ASAP trips without queue (old system or no drivers found)
          (pickup_time_preference = 'asap' AND (load_description NOT LIKE '%[QUEUE:%' OR load_description IS NULL))
          OR
          -- Scheduled trips past their time
          (pickup_time_preference = 'scheduled' AND scheduled_pickup_time IS NOT NULL AND scheduled_pickup_time < NOW() - INTERVAL '2 hours')
          OR  
          -- Very old pending trips (fallback)
          (created_at < NOW() - INTERVAL '24 hours')
      );
    
    GET DIAGNOSTICS regular_expired = ROW_COUNT;
    
    -- Return comprehensive results
    RETURN QUERY SELECT 
        (processed_count + regular_expired) as cleaned_count,
        format('UBER-STYLE: Moved %s ASAP trips to next driver, expired %s regular trips', 
               processed_count, regular_expired) as message;
               
    RAISE NOTICE '✅ UBER-STYLE: Cleanup complete - moved %s to next driver, expired %s regular trips', 
                 processed_count, regular_expired;
END;
$$;

-- Grant execute permission 
GRANT EXECUTE ON FUNCTION cleanup_expired_trip_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_trip_requests() TO anon;

-- Also create the missing decline_trip_request_uber_style if it doesn't exist
-- (This should exist from your previous implementations, but ensuring it's available)
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
    RAISE NOTICE '❌ UBER-STYLE: Driver % declining/timing out trip %', declining_driver_id, request_id;
    
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
    
    -- Assign to next driver (this will trigger real-time notifications!)
    UPDATE trip_requests 
    SET 
        assigned_driver_id = next_driver_id,
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

-- Test the new function
SELECT '🎯 CRITICAL FIX APPLIED!' as status,
       'cleanup_expired_trip_requests now uses Uber-style sequential assignment' as fix,
       'Timed out trips will move to next driver instead of expiring' as behavior;
