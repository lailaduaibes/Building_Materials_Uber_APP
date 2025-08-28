-- Fix the ASAP matching function bugs

-- Drop and recreate the function with proper variable naming
DROP FUNCTION IF EXISTS find_nearby_available_drivers(DECIMAL, DECIMAL, INTEGER, INTEGER, UUID);

CREATE OR REPLACE FUNCTION find_nearby_available_drivers(
    pickup_lat DECIMAL,
    pickup_lng DECIMAL, 
    max_distance_km_param INTEGER DEFAULT 10,
    min_updated_minutes_param INTEGER DEFAULT 5,
    required_truck_type_id_param UUID DEFAULT NULL
)
RETURNS TABLE(
    driver_id UUID,
    driver_name TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    distance_km DECIMAL,
    last_updated TIMESTAMP WITH TIME ZONE,
    current_truck_id UUID,
    vehicle_model TEXT,
    vehicle_plate TEXT,
    rating DECIMAL,
    total_trips INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dp.user_id as driver_id,
        COALESCE(dp.first_name || ' ' || dp.last_name, 'Driver') as driver_name,
        dl.latitude,
        dl.longitude,
        -- Calculate distance using Haversine formula
        (6371 * acos(
            cos(radians(pickup_lat)) * 
            cos(radians(dl.latitude)) * 
            cos(radians(dl.longitude) - radians(pickup_lng)) + 
            sin(radians(pickup_lat)) * 
            sin(radians(dl.latitude))
        ))::DECIMAL as distance_km,
        dl.updated_at as last_updated,
        dp.current_truck_id,
        dp.vehicle_model,
        dp.vehicle_plate,
        dp.rating,
        dp.total_trips
    FROM driver_profiles dp
    INNER JOIN driver_locations dl ON dp.user_id = dl.driver_id
    WHERE dp.is_available = true 
    AND dp.is_approved = true
    AND dp.status != 'offline'
    AND dl.updated_at > NOW() - INTERVAL '1 minute' * min_updated_minutes_param
    AND (required_truck_type_id_param IS NULL OR dp.selected_truck_type_id = required_truck_type_id_param)
    AND (6371 * acos(
        cos(radians(pickup_lat)) * 
        cos(radians(dl.latitude)) * 
        cos(radians(dl.longitude) - radians(pickup_lng)) + 
        sin(radians(pickup_lat)) * 
        sin(radians(dl.latitude))
    )) <= max_distance_km_param
    ORDER BY distance_km ASC, dp.rating DESC, dp.total_trips DESC;
END;
$$ LANGUAGE plpgsql;

-- Update your driver location to current time for testing
UPDATE driver_locations 
SET updated_at = NOW()
WHERE driver_id IN (
    SELECT user_id FROM driver_profiles 
    WHERE is_available = true AND is_approved = true
    LIMIT 1
);

-- Test the fixed function
SELECT 
    'FIXED FUNCTION TEST:' as info,
    driver_id,
    driver_name,
    distance_km,
    last_updated
FROM find_nearby_available_drivers(
    32.387000, -- test trip pickup lat
    35.324000, -- test trip pickup lng
    100,       -- 100km radius
    60         -- 60 minutes freshness
)
LIMIT 3;

-- Now test ASAP matching with the fixed function
WITH test_trip AS (
    SELECT id 
    FROM trip_requests 
    WHERE load_description LIKE '%TEST ASAP Trip - Flatbed Compatible%'
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    'TESTING FIXED ASAP MATCHING:' as action,
    start_asap_matching(id) as result
FROM test_trip;

-- Check results
SELECT 
    'AFTER FIX - TEST TRIP STATUS:' as info,
    id,
    status,
    matching_started_at,
    assigned_driver_id
FROM trip_requests 
WHERE load_description LIKE '%TEST ASAP Trip - Flatbed Compatible%'
ORDER BY created_at DESC;

-- Check driver requests created
SELECT 
    'DRIVER REQUESTS AFTER FIX:' as info,
    COUNT(*) as count,
    array_agg(DISTINCT assigned_driver_id) as drivers_notified
FROM trip_requests 
WHERE original_trip_id IN (
    SELECT id FROM trip_requests 
    WHERE load_description LIKE '%TEST ASAP Trip - Flatbed Compatible%'
);

SELECT '🎯 Function fixed and tested!' as final_message;
