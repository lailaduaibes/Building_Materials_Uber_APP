-- 🔧 ENHANCED OFFER-ONLY ASAP SYSTEM - VERSION 2
-- Additional safety measures to prevent any possible race conditions

-- Clean up and recreate with enhanced safety
DROP FUNCTION IF EXISTS get_next_asap_trip_for_driver_v2(UUID) CASCADE;

-- 🎯 ENHANCED OFFER-ONLY: Even more robust against race conditions  
CREATE OR REPLACE FUNCTION get_next_asap_trip_for_driver_v2(driver_id UUID)
RETURNS TABLE(
    trip_id UUID,
    pickup_latitude DECIMAL,
    pickup_longitude DECIMAL,
    delivery_latitude DECIMAL,
    delivery_longitude DECIMAL,
    load_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    distance_km DOUBLE PRECISION,
    expires_at TIMESTAMP WITH TIME ZONE,
    reserved_for_driver UUID
) 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    driver_lat DECIMAL;
    driver_lng DECIMAL;
    target_trip RECORD;
    expiry_time TIMESTAMP WITH TIME ZONE;
    safety_buffer INTERVAL := INTERVAL '1 second'; -- Safety buffer for expiry checks
BEGIN
    -- Get driver's current location
    SELECT current_latitude, current_longitude 
    INTO driver_lat, driver_lng
    FROM users 
    WHERE id = driver_id;
    
    IF driver_lat IS NULL OR driver_lng IS NULL THEN
        RETURN;
    END IF;
    
    -- Clean up expired considerations first (atomic operation)
    UPDATE trip_requests 
    SET 
        considering_driver_id = NULL,
        matching_started_at = NULL,
        acceptance_deadline = NULL
    WHERE pickup_time_preference = 'asap'
      AND status = 'pending'
      AND acceptance_deadline IS NOT NULL
      AND acceptance_deadline < (NOW() - safety_buffer); -- Add safety buffer
    
    -- 🎯 FIRST: Check if driver already has a trip under consideration
    SELECT 
        tr.id,
        tr.pickup_latitude,
        tr.pickup_longitude,
        tr.delivery_latitude,
        tr.delivery_longitude,
        tr.load_description,
        tr.created_at,
        tr.acceptance_deadline,
        (6371 * acos(
            cos(radians(driver_lat)) * 
            cos(radians(tr.pickup_latitude)) * 
            cos(radians(tr.pickup_longitude) - radians(driver_lng)) + 
            sin(radians(driver_lat)) * 
            sin(radians(tr.pickup_latitude))
        )) as distance_km
    INTO target_trip
    FROM trip_requests tr
    WHERE tr.pickup_time_preference = 'asap'
      AND tr.status = 'pending'
      AND tr.considering_driver_id = driver_id  
      AND tr.acceptance_deadline > (NOW() + safety_buffer)  -- Must have time left + buffer
    ORDER BY tr.created_at
    LIMIT 1;
    
    -- Return existing consideration if found
    IF target_trip.id IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            target_trip.id as trip_id,
            target_trip.pickup_latitude,
            target_trip.pickup_longitude,
            target_trip.delivery_latitude,
            target_trip.delivery_longitude,
            target_trip.load_description,
            target_trip.created_at,
            target_trip.distance_km,
            target_trip.acceptance_deadline as expires_at,
            driver_id as reserved_for_driver;
        RETURN;
    END IF;
    
    -- Set expiry time
    expiry_time := NOW() + INTERVAL '15 seconds';
    
    -- 🎯 ENHANCED SAFETY: More restrictive conditions
    WITH available_trip AS (
        SELECT tr.id
        FROM trip_requests tr
        WHERE tr.pickup_time_preference = 'asap'
          AND tr.status = 'pending'
          AND tr.created_at > NOW() - INTERVAL '1 hour'
          AND tr.pickup_latitude IS NOT NULL
          AND tr.pickup_longitude IS NOT NULL
          -- 🚨 ENHANCED: Only truly unassigned trips (no expiry edge cases)
          AND tr.assigned_driver_id IS NULL 
          AND tr.considering_driver_id IS NULL
          AND tr.acceptance_deadline IS NULL  -- Must be completely clean
          AND (6371 * acos(
                cos(radians(driver_lat)) * 
                cos(radians(tr.pickup_latitude)) * 
                cos(radians(tr.pickup_longitude) - radians(driver_lng)) + 
                sin(radians(driver_lat)) * 
                sin(radians(tr.pickup_latitude))
            )) <= 30  -- Within 30km
        ORDER BY 
            -- Closest first
            (6371 * acos(
                cos(radians(driver_lat)) * 
                cos(radians(tr.pickup_latitude)) * 
                cos(radians(tr.pickup_longitude) - radians(driver_lng)) + 
                sin(radians(driver_lat)) * 
                sin(radians(tr.pickup_latitude))
            ))
        LIMIT 1
        FOR UPDATE SKIP LOCKED  -- Immediate exclusive lock
    )
    UPDATE trip_requests 
    SET 
        considering_driver_id = driver_id,
        matching_started_at = NOW(),
        acceptance_deadline = expiry_time
    FROM available_trip
    WHERE trip_requests.id = available_trip.id
      -- Double-check conditions in UPDATE to prevent any race condition
      AND trip_requests.assigned_driver_id IS NULL
      AND trip_requests.considering_driver_id IS NULL
      AND trip_requests.status = 'pending'
    RETURNING 
        trip_requests.id,
        trip_requests.pickup_latitude,
        trip_requests.pickup_longitude,
        trip_requests.delivery_latitude,
        trip_requests.delivery_longitude,
        trip_requests.load_description,
        trip_requests.created_at,
        (6371 * acos(
            cos(radians(driver_lat)) * 
            cos(radians(trip_requests.pickup_latitude)) * 
            cos(radians(trip_requests.pickup_longitude) - radians(driver_lng)) + 
            sin(radians(driver_lat)) * 
            sin(radians(trip_requests.pickup_latitude))
        )) as distance_km,
        trip_requests.acceptance_deadline
    INTO target_trip;
    
    -- Return the reserved trip if successful
    IF target_trip.id IS NOT NULL THEN
        RETURN QUERY
        SELECT 
            target_trip.id as trip_id,
            target_trip.pickup_latitude,
            target_trip.pickup_longitude,
            target_trip.delivery_latitude,
            target_trip.delivery_longitude,
            target_trip.load_description,
            target_trip.created_at,
            target_trip.distance_km,
            target_trip.acceptance_deadline as expires_at,
            driver_id as reserved_for_driver;
        RETURN;
    END IF;

    -- No trips available
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Test the enhanced version
SELECT 'Enhanced OFFER-ONLY ASAP System V2 Installed!' as status;
SELECT 'Even more robust against race conditions' as improvement;
