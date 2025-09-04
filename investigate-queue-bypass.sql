-- 🔍 CRITICAL INVESTIGATION: How are trips bypassing the queue system?

-- Step 1: Check if trips are being created with assigned_driver_id already set
SELECT 
    '=== RECENT TRIP CREATION PATTERN ===' as section,
    id,
    status,
    assigned_driver_id,
    pickup_time_preference,
    created_at,
    matched_at,
    CASE 
        WHEN assigned_driver_id IS NOT NULL AND (matched_at IS NULL OR matched_at = created_at) THEN 'CREATED_WITH_ASSIGNMENT'
        WHEN assigned_driver_id IS NOT NULL AND matched_at > created_at THEN 'ASSIGNED_LATER_VIA_QUEUE'
        WHEN assigned_driver_id IS NULL AND status = 'pending' THEN 'PENDING_NO_ASSIGNMENT'
        WHEN assigned_driver_id IS NULL AND status = 'no_drivers_available' THEN 'QUEUE_FAILED'
        ELSE 'UNKNOWN_PATTERN'
    END as assignment_pattern
FROM trip_requests
WHERE created_at > NOW() - INTERVAL '2 hours'
AND pickup_time_preference = 'asap'
ORDER BY created_at DESC;

-- Step 2: Check database triggers that might be auto-assigning drivers
SELECT 
    '=== DATABASE TRIGGERS ON TRIP_REQUESTS ===' as section,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'trip_requests'
AND trigger_schema = 'public';

-- Step 3: Check what data is actually in driver_locations table
SELECT 
    '=== DRIVER_LOCATIONS CURRENT DATA ===' as section,
    COUNT(*) as total_locations,
    COUNT(CASE WHEN updated_at > NOW() - INTERVAL '30 minutes' THEN 1 END) as recent_locations,
    COUNT(DISTINCT driver_id) as unique_drivers_with_location
FROM driver_locations;

-- Show specific driver location data
SELECT 
    '=== SPECIFIC DRIVER LOCATIONS ===' as section,
    dl.driver_id,
    CONCAT(dp.first_name, ' ', dp.last_name) as driver_name,
    dl.latitude,
    dl.longitude,
    dl.updated_at,
    dp.is_available,
    dp.is_approved
FROM driver_locations dl
JOIN driver_profiles dp ON dl.driver_id = dp.user_id
WHERE dl.updated_at > NOW() - INTERVAL '1 hour'
ORDER BY dl.updated_at DESC;

-- Step 4: Test why the fixed function still finds 0 drivers
SELECT 
    '=== TESTING FIXED FUNCTION DIRECTLY ===' as section;

-- Test the fixed function with available drivers
SELECT 
    driver_id,
    driver_name,
    latitude,
    longitude,
    distance_km,
    last_updated
FROM find_nearby_available_drivers_fixed(
    24.4539,  -- Dubai latitude
    54.3773,  -- Dubai longitude  
    100,      -- max distance 100km
    NULL,     -- any truck type
    90        -- relaxed time requirement (90 minutes)
) 
LIMIT 5;

-- Step 5: Check if the issue is with the original start_asap_matching vs our fixed version
SELECT 
    '=== CHECKING WHICH FUNCTION IS ACTUALLY BEING USED ===' as section,
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name LIKE '%start_asap_matching%'
AND routine_schema = 'public'
ORDER BY routine_name;

-- Step 6: Most important - check if trips are reaching drivers through real-time subscription
-- without going through queue system at all
SELECT 
    '=== REAL-TIME BYPASS INVESTIGATION ===' as section,
    tr.id,
    tr.status,
    tr.assigned_driver_id,
    tr.pickup_time_preference,
    tr.created_at,
    aq.trip_request_id as in_queue,
    aq.driver_id as queue_driver,
    aq.status as queue_status
FROM trip_requests tr
LEFT JOIN asap_driver_queue aq ON tr.id = aq.trip_request_id
WHERE tr.created_at > NOW() - INTERVAL '2 hours'
AND tr.pickup_time_preference = 'asap'
ORDER BY tr.created_at DESC;

SELECT '🔍 This will show if trips are bypassing the queue system entirely!' as conclusion;
