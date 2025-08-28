-- Check the status of our latest test ASAP trip

-- Find the latest test trip
SELECT 
    '🎯 LATEST TEST TRIP:' as info,
    id,
    load_description,
    status,
    pickup_time_preference,
    matching_started_at,
    assigned_driver_id,
    created_at
FROM trip_requests 
WHERE load_description LIKE '%TEST ASAP Trip - Flatbed Compatible%'
ORDER BY created_at DESC 
LIMIT 1;

-- Check if driver-specific requests were created
SELECT 
    '🚨 DRIVER REQUESTS FOR THIS TRIP:' as info,
    tr.id,
    tr.assigned_driver_id,
    dp.first_name || ' ' || dp.last_name as driver_name,
    tr.status,
    tr.acceptance_deadline,
    CASE 
        WHEN tr.acceptance_deadline > NOW() THEN 'ACTIVE'
        ELSE 'EXPIRED'
    END as request_status,
    EXTRACT(SECOND FROM (tr.acceptance_deadline - NOW())) as seconds_remaining
FROM trip_requests tr
LEFT JOIN driver_profiles dp ON tr.assigned_driver_id = dp.user_id
WHERE tr.original_trip_id IN (
    SELECT id FROM trip_requests 
    WHERE load_description LIKE '%TEST ASAP Trip - Flatbed Compatible%'
    ORDER BY created_at DESC 
    LIMIT 1
)
ORDER BY tr.created_at DESC;

-- Check available drivers at the time
SELECT 
    '📍 AVAILABLE DRIVERS WITH LOCATIONS:' as info,
    dp.user_id,
    dp.first_name || ' ' || dp.last_name as name,
    dp.is_available,
    dp.is_approved,
    dl.updated_at,
    EXTRACT(MINUTE FROM (NOW() - dl.updated_at)) as minutes_ago
FROM driver_profiles dp
LEFT JOIN driver_locations dl ON dp.user_id = dl.driver_id
WHERE dp.is_available = true AND dp.is_approved = true
ORDER BY dl.updated_at DESC;
