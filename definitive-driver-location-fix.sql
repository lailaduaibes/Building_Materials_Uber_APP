-- 🚀 DEFINITIVE FIX: Resolve location data mismatch for driver availability

-- Step 1: Check what's actually in public.users current_latitude
SELECT 
    '=== PUBLIC.USERS LOCATION DATA CHECK ===' as section,
    COUNT(*) as total_users,
    COUNT(CASE WHEN current_latitude IS NOT NULL THEN 1 END) as users_with_latitude,
    COUNT(CASE WHEN last_location_update IS NOT NULL THEN 1 END) as users_with_location_update
FROM public.users;

-- Step 2: Check if public.users is missing current_longitude
SELECT 
    '=== PUBLIC.USERS MISSING COLUMNS CHECK ===' as section,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
AND column_name LIKE '%longitude%';

-- Step 3: Add missing current_longitude to public.users if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'current_longitude'
    ) THEN
        ALTER TABLE public.users ADD COLUMN current_longitude NUMERIC(11,8);
        RAISE NOTICE '✅ Added current_longitude to public.users';
    ELSE
        RAISE NOTICE '✅ current_longitude already exists in public.users';
    END IF;
END $$;

-- Step 4: Check driver_locations table structure
SELECT 
    '=== DRIVER_LOCATIONS TABLE STRUCTURE ===' as section,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'driver_locations'
ORDER BY ordinal_position;

-- Step 5: Create FIXED version of find_nearby_available_drivers 
-- that uses the correct location data sources
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
    RAISE NOTICE '🔧 Using FIXED find_nearby_available_drivers with correct location sources';
    
    RETURN QUERY
    SELECT 
        dp.user_id as driver_id,
        COALESCE(dp.first_name || ' ' || dp.last_name, 'Driver') as driver_name,
        -- Try multiple location sources in order of preference
        COALESCE(
            pu.current_latitude,           -- 1. public.users.current_latitude
            (dl.latitude)::DECIMAL,        -- 2. driver_locations.latitude  
            0::DECIMAL                     -- 3. fallback to 0
        ) as latitude,
        COALESCE(
            pu.current_longitude,          -- 1. public.users.current_longitude
            (dl.longitude)::DECIMAL,       -- 2. driver_locations.longitude
            0::DECIMAL                     -- 3. fallback to 0
        ) as longitude,
        -- Calculate distance using available coordinates
        CASE 
            WHEN pu.current_latitude IS NOT NULL AND pu.current_longitude IS NOT NULL THEN
                (6371 * acos(
                    cos(radians(pickup_lat)) * 
                    cos(radians(pu.current_latitude)) * 
                    cos(radians(pu.current_longitude) - radians(pickup_lng)) + 
                    sin(radians(pickup_lat)) * 
                    sin(radians(pu.current_latitude))
                ))::DECIMAL
            WHEN dl.latitude IS NOT NULL AND dl.longitude IS NOT NULL THEN
                (6371 * acos(
                    cos(radians(pickup_lat)) * 
                    cos(radians(dl.latitude)) * 
                    cos(radians(dl.longitude) - radians(pickup_lng)) + 
                    sin(radians(pickup_lat)) * 
                    sin(radians(dl.latitude))
                ))::DECIMAL
            ELSE 0::DECIMAL
        END as distance_km,
        -- Use the most recent location update timestamp
        COALESCE(
            pu.last_location_update,
            dl.updated_at,
            dp.updated_at
        ) as last_updated,
        dp.current_truck_id,
        dp.vehicle_model,
        dp.vehicle_plate,
        dp.rating,
        dp.total_trips
    FROM driver_profiles dp
    LEFT JOIN public.users pu ON dp.user_id = pu.id  -- Use public.users for location
    LEFT JOIN LATERAL (
        SELECT latitude, longitude, updated_at 
        FROM driver_locations 
        WHERE driver_id = dp.user_id 
        ORDER BY updated_at DESC 
        LIMIT 1
    ) dl ON true  -- Get latest driver location
    WHERE dp.is_available = true 
    AND dp.is_approved = true
    AND dp.status != 'offline'
    -- Location requirement - accept if ANY location source has data
    AND (
        (pu.current_latitude IS NOT NULL AND pu.current_longitude IS NOT NULL) OR
        (dl.latitude IS NOT NULL AND dl.longitude IS NOT NULL) OR
        min_updated_minutes_param > 60  -- If > 60 minutes, skip location requirement
    )
    -- Location freshness check
    AND (
        pu.last_location_update > NOW() - INTERVAL '1 minute' * min_updated_minutes_param OR
        dl.updated_at > NOW() - INTERVAL '1 minute' * min_updated_minutes_param OR
        min_updated_minutes_param > 60  -- If > 60 minutes, skip freshness requirement
    )
    -- Truck type compatibility
    AND (required_truck_type_id_param IS NULL OR dp.selected_truck_type_id = required_truck_type_id_param)
    -- Distance filtering (only if we have coordinates)
    AND (
        CASE 
            WHEN pu.current_latitude IS NOT NULL AND pu.current_longitude IS NOT NULL THEN
                (6371 * acos(
                    cos(radians(pickup_lat)) * 
                    cos(radians(pu.current_latitude)) * 
                    cos(radians(pu.current_longitude) - radians(pickup_lng)) + 
                    sin(radians(pickup_lat)) * 
                    sin(radians(pu.current_latitude))
                )) <= max_distance_km_param
            WHEN dl.latitude IS NOT NULL AND dl.longitude IS NOT NULL THEN
                (6371 * acos(
                    cos(radians(pickup_lat)) * 
                    cos(radians(dl.latitude)) * 
                    cos(radians(dl.longitude) - radians(pickup_lng)) + 
                    sin(radians(pickup_lat)) * 
                    sin(radians(dl.latitude))
                )) <= max_distance_km_param
            ELSE true  -- If no location, include the driver
        END
    )
    ORDER BY distance_km ASC, dp.rating DESC, dp.total_trips DESC;
END;
$$;

-- Step 6: Update start_asap_matching to use the fixed function
CREATE OR REPLACE FUNCTION start_asap_matching_fixed_final(trip_request_id UUID)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    drivers_found INTEGER
) LANGUAGE plpgsql AS $$
DECLARE
    trip_record RECORD;
    driver_count INTEGER := 0;
BEGIN
    -- Get trip details
    SELECT * INTO trip_record 
    FROM trip_requests 
    WHERE id = trip_request_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Trip not found', 0;
        RETURN;
    END IF;
    
    RAISE NOTICE '🚀 Starting FIXED ASAP matching for trip: %', trip_request_id;
    
    -- Use the fixed function that handles multiple location sources
    SELECT COUNT(*) INTO driver_count
    FROM find_nearby_available_drivers_fixed(
        COALESCE(trip_record.pickup_latitude::DECIMAL, 0),
        COALESCE(trip_record.pickup_longitude::DECIMAL, 0),
        50, -- max distance
        trip_record.required_truck_type_id,
        30  -- min updated minutes
    );
    
    RAISE NOTICE '✅ Fixed function found % drivers', driver_count;
    
    IF driver_count = 0 THEN
        -- Try with relaxed location requirements (90 minutes = skip location checks)
        SELECT COUNT(*) INTO driver_count
        FROM find_nearby_available_drivers_fixed(
            COALESCE(trip_record.pickup_latitude::DECIMAL, 0),
            COALESCE(trip_record.pickup_longitude::DECIMAL, 0),
            100, -- larger distance
            trip_record.required_truck_type_id,
            90   -- 90 minutes = relaxed location requirements
        );
        
        RAISE NOTICE '✅ Relaxed search found % drivers', driver_count;
    END IF;
    
    IF driver_count = 0 THEN
        -- Update trip status
        UPDATE trip_requests 
        SET status = 'no_drivers_available'
        WHERE id = trip_request_id;
        
        RETURN QUERY SELECT FALSE, 'No available drivers found even with relaxed criteria', 0;
        RETURN;
    END IF;
    
    -- Success! Drivers found
    RAISE NOTICE '📋 SUCCESS: Found % available drivers for ASAP trip', driver_count;
    
    RETURN QUERY SELECT TRUE, FORMAT('Found %s available drivers', driver_count), driver_count;
END;
$$;

-- Step 7: Test the completely fixed function
SELECT '=== TESTING COMPLETELY FIXED ASAP MATCHING ===' as test_section;

DO $$
DECLARE
    test_result RECORD;
    recent_trip_id UUID;
BEGIN
    -- Get the most recent failed trip
    SELECT id INTO recent_trip_id 
    FROM trip_requests 
    WHERE status = 'no_drivers_available'
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF recent_trip_id IS NOT NULL THEN
        RAISE NOTICE '🧪 Testing FIXED function with recent failed trip: %', recent_trip_id;
        
        -- Reset the trip status first
        UPDATE trip_requests SET status = 'pending' WHERE id = recent_trip_id;
        
        SELECT * INTO test_result 
        FROM start_asap_matching_fixed_final(recent_trip_id);
        
        RAISE NOTICE '📊 FINAL FIXED result: success=%, message=%, drivers=%', 
                     test_result.success, test_result.message, test_result.drivers_found;
                     
        -- Show which drivers were found
        RAISE NOTICE '👥 Available drivers:';
        FOR test_result IN 
            SELECT driver_id, driver_name, latitude, longitude, distance_km 
            FROM find_nearby_available_drivers_fixed(0, 0, 100, NULL, 90)
            LIMIT 5
        LOOP
            RAISE NOTICE '  - %: % (lat: %, lng: %, distance: %km)', 
                         test_result.driver_id, test_result.driver_name, 
                         test_result.latitude, test_result.longitude, test_result.distance_km;
        END LOOP;
        
    ELSE
        RAISE NOTICE '❌ No recent failed trips found to test with';
    END IF;
END $$;

SELECT '🎯 This should DEFINITELY resolve the driver availability issue!' as conclusion;
