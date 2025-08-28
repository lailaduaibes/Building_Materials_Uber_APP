-- Manual ASAP matching test to see what's happening

-- 1. Get your test trip ID
WITH test_trip AS (
    SELECT id, status, pickup_time_preference
    FROM trip_requests 
    WHERE load_description LIKE '%TEST ASAP Trip - Flatbed Compatible%'
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    'TEST TRIP FOUND:' as info,
    id,
    status,
    pickup_time_preference
FROM test_trip;

-- 2. Check if we have available drivers
SELECT 
    'AVAILABLE DRIVERS:' as info,
    COUNT(*) as total_drivers,
    COUNT(CASE WHEN is_available = true THEN 1 END) as available_drivers,
    COUNT(CASE WHEN is_approved = true THEN 1 END) as approved_drivers,
    COUNT(CASE WHEN is_available = true AND is_approved = true THEN 1 END) as available_approved
FROM driver_profiles;

-- 3. Test proximity search with test trip coordinates
SELECT 
    'NEARBY DRIVERS FOR TEST TRIP:' as info,
    driver_id,
    driver_name,
    distance_km,
    rating,
    total_trips
FROM find_nearby_available_drivers(
    32.387000, -- test trip pickup lat
    35.324000, -- test trip pickup lng
    100,       -- 100km radius (very wide for testing)
    120        -- 120 minutes location freshness (very lenient)
)
LIMIT 5;

-- 4. Check driver locations table
SELECT 
    'DRIVER LOCATIONS:' as info,
    COUNT(*) as total_locations,
    COUNT(CASE WHEN updated_at > NOW() - INTERVAL '2 hours' THEN 1 END) as recent_locations,
    MAX(updated_at) as latest_location_update
FROM driver_locations;

-- 5. Now manually trigger ASAP matching
WITH test_trip AS (
    SELECT id 
    FROM trip_requests 
    WHERE load_description LIKE '%TEST ASAP Trip - Flatbed Compatible%'
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    'MANUALLY TRIGGERING ASAP MATCHING:' as action,
    start_asap_matching(id) as result
FROM test_trip;

-- 6. Check what happened after manual matching
SELECT 
    'AFTER MANUAL MATCHING - TEST TRIP:' as info,
    id,
    status,
    matching_started_at,
    assigned_driver_id
FROM trip_requests 
WHERE load_description LIKE '%TEST ASAP Trip - Flatbed Compatible%'
ORDER BY created_at DESC;

-- 7. Check for driver-specific requests created
SELECT 
    'DRIVER REQUESTS CREATED:' as info,
    COUNT(*) as count,
    array_agg(DISTINCT assigned_driver_id) as drivers_notified
FROM trip_requests 
WHERE original_trip_id IN (
    SELECT id FROM trip_requests 
    WHERE load_description LIKE '%TEST ASAP Trip - Flatbed Compatible%'
);

-- 8. Show any driver requests with details
SELECT 
    'DRIVER REQUEST DETAILS:' as info,
    id,
    status,
    assigned_driver_id,
    acceptance_deadline,
    EXTRACT(EPOCH FROM (acceptance_deadline - NOW()))::INTEGER as seconds_remaining
FROM trip_requests 
WHERE original_trip_id IN (
    SELECT id FROM trip_requests 
    WHERE load_description LIKE '%TEST ASAP Trip - Flatbed Compatible%'
);

SELECT 'Manual ASAP test complete!' as final_message;
