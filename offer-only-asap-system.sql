-- 🎯 OFFER-ONLY ASAP SYSTEM
-- Trips are shown for CONSIDERATION only - not added to driver's trips until accepted
-- Eliminates the issue where trips appear and disappear from driver's trips list

-- First, add the considering_driver_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trip_requests' 
        AND column_name = 'considering_driver_id'
    ) THEN
        ALTER TABLE trip_requests ADD COLUMN considering_driver_id UUID REFERENCES users(id);
        CREATE INDEX IF NOT EXISTS idx_trip_requests_considering_driver_id 
        ON trip_requests(considering_driver_id) 
        WHERE considering_driver_id IS NOT NULL;
    END IF;
END $$;

-- Clean up all existing functions first
DROP FUNCTION IF EXISTS get_next_asap_trip_for_driver(UUID) CASCADE;
DROP FUNCTION IF EXISTS accept_asap_trip_simple(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS decline_asap_trip_simple(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS debug_asap_trip_states() CASCADE;
DROP FUNCTION IF EXISTS clean_expired_asap_trips() CASCADE;
DROP FUNCTION IF EXISTS check_orphaned_assignments() CASCADE;
DROP FUNCTION IF EXISTS check_duplicate_assignments() CASCADE;
DROP FUNCTION IF EXISTS monitor_assignments() CASCADE;

-- 🎯 OFFER-ONLY: Show trips for consideration WITHOUT adding to driver's trips
CREATE OR REPLACE FUNCTION get_next_asap_trip_for_driver(driver_id UUID)
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
BEGIN
    -- Get driver's current location
    SELECT current_latitude, current_longitude 
    INTO driver_lat, driver_lng
    FROM users 
    WHERE id = driver_id;
    
    IF driver_lat IS NULL OR driver_lng IS NULL THEN
        RETURN;
    END IF;
    
    -- 🎯 FIRST: Check if driver already has a trip under consideration
    -- This prevents repeated reservations and duplicate notifications
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
      AND tr.considering_driver_id = driver_id  -- Check considering, not assigned
      AND tr.acceptance_deadline > NOW()  -- Not expired
    ORDER BY tr.created_at
    LIMIT 1;
    
    -- Return existing consideration if found (AVOID duplicate reservations)
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
    
    -- ONLY if no existing consideration, look for new trips
    expiry_time := NOW() + INTERVAL '15 seconds';
    
    -- 🎯 OFFER-ONLY: Reserve trip for consideration but DON'T assign to driver yet
    -- This prevents trips from appearing in driver's trips list until accepted
    WITH available_trip AS (
        SELECT tr.id
        FROM trip_requests tr
        WHERE tr.pickup_time_preference = 'asap'
          AND tr.status = 'pending'
          AND tr.created_at > NOW() - INTERVAL '1 hour'
          AND tr.pickup_latitude IS NOT NULL
          AND tr.pickup_longitude IS NOT NULL
          AND (
            -- Only truly unassigned trips OR trips with EXPIRED considerations
            (tr.assigned_driver_id IS NULL AND tr.considering_driver_id IS NULL)
            OR (tr.acceptance_deadline IS NOT NULL AND tr.acceptance_deadline <= NOW())
          )
          AND (6371 * acos(
                cos(radians(driver_lat)) * 
                cos(radians(tr.pickup_latitude)) * 
                cos(radians(tr.pickup_longitude) - radians(driver_lng)) + 
                sin(radians(driver_lat)) * 
                sin(radians(tr.pickup_latitude))
            )) <= 30  -- Within 30km
        ORDER BY 
            -- PRIORITY: Truly unassigned trips first
            (CASE 
                WHEN tr.assigned_driver_id IS NULL AND tr.considering_driver_id IS NULL THEN 0
                WHEN tr.acceptance_deadline <= NOW() THEN 1  -- Expired considerations
                ELSE 999
            END),
            -- Then by distance (closest first)
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
        -- 🚨 KEY: Set CONSIDERING fields instead of assigned_driver_id
        -- This reserves the trip for consideration WITHOUT assigning it
        considering_driver_id = driver_id,
        matching_started_at = NOW(),
        acceptance_deadline = expiry_time
    FROM available_trip
    WHERE trip_requests.id = available_trip.id
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
    
    -- If we successfully reserved a trip for consideration, return it
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

    -- No trips available for this driver
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Accept function: Promote from consideration to actual assignment
CREATE OR REPLACE FUNCTION accept_asap_trip_simple(trip_id UUID, driver_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 🎯 PROMOTE FROM CONSIDERATION TO ASSIGNMENT
    -- Only accept if the trip is under consideration by this driver
    UPDATE trip_requests 
    SET 
        status = 'matched',
        matched_at = NOW(),
        assigned_driver_id = driver_id,      -- NOW assign the driver (not before!)
        considering_driver_id = NULL,        -- Clear consideration
        acceptance_deadline = NULL
    WHERE id = trip_id 
      AND status = 'pending'
      AND pickup_time_preference = 'asap'
      AND considering_driver_id = driver_id  -- Must be considering this trip
      AND acceptance_deadline > NOW();       -- Not expired
    
    IF FOUND THEN
        RETURN QUERY SELECT true, 'Trip accepted and added to your trips';
    ELSE
        RETURN QUERY SELECT false, 'Trip not available for acceptance or expired';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Decline function: Clear consideration without assignment
CREATE OR REPLACE FUNCTION decline_asap_trip_simple(trip_id UUID, driver_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 🎯 CLEAR CONSIDERATION (no assignment to clear!)
    -- Release the trip from consideration back to unassigned
    UPDATE trip_requests 
    SET 
        considering_driver_id = NULL,
        matching_started_at = NULL,
        acceptance_deadline = NULL
    WHERE id = trip_id 
      AND status = 'pending'
      AND pickup_time_preference = 'asap'
      AND considering_driver_id = driver_id;  -- Must be considering this trip
    
    IF FOUND THEN
        RETURN QUERY SELECT true, 'Trip declined and made available to other drivers';
    ELSE
        RETURN QUERY SELECT false, 'Trip not under your consideration';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Clean expired considerations
CREATE OR REPLACE FUNCTION clean_expired_asap_trips()
RETURNS INTEGER 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    cleaned_count INTEGER := 0;
BEGIN
    -- Clear expired considerations
    UPDATE trip_requests 
    SET 
        considering_driver_id = NULL,
        matching_started_at = NULL,
        acceptance_deadline = NULL
    WHERE pickup_time_preference = 'asap'
      AND status = 'pending'
      AND acceptance_deadline IS NOT NULL
      AND acceptance_deadline < NOW();
      
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    -- Expire old trips (older than 1 hour)
    UPDATE trip_requests 
    SET status = 'expired'
    WHERE pickup_time_preference = 'asap'
      AND status = 'pending'
      AND created_at <= NOW() - INTERVAL '1 hour';
    
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- Debug function: Show current state
CREATE OR REPLACE FUNCTION debug_asap_trip_states()
RETURNS TABLE(
    trip_id UUID,
    status TEXT,
    considering_driver UUID,
    assigned_driver UUID,
    age_minutes NUMERIC,
    deadline_expires_in_seconds NUMERIC,
    load_description TEXT
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tr.id as trip_id,
        tr.status,
        tr.considering_driver_id as considering_driver,
        tr.assigned_driver_id as assigned_driver,
        ROUND(EXTRACT(EPOCH FROM (NOW() - tr.created_at))/60, 1) as age_minutes,
        CASE 
            WHEN tr.acceptance_deadline IS NOT NULL 
            THEN ROUND(EXTRACT(EPOCH FROM (tr.acceptance_deadline - NOW())), 1)
            ELSE NULL 
        END as deadline_expires_in_seconds,
        tr.load_description
    FROM trip_requests tr
    WHERE tr.pickup_time_preference = 'asap' 
      AND tr.status IN ('pending', 'matched')
    ORDER BY tr.created_at;
END;
$$ LANGUAGE plpgsql;

-- Test and setup
SELECT 'OFFER-ONLY ASAP System Installed!' as status;
SELECT 'Trips are shown for CONSIDERATION only' as key_feature;
SELECT 'NO more trips appearing/disappearing from trips list!' as guarantee;
SELECT 'Accept to add trip to your trips - Decline to free for others' as usage;

-- Clean up any existing issues
SELECT clean_expired_asap_trips() as cleaned_expired_considerations;

-- Show current state
SELECT * FROM debug_asap_trip_states();
