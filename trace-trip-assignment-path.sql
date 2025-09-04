-- 🔍 TRACE: How is trip reaching driver app despite "no drivers available"?

SELECT '=== INVESTIGATION: Trip Assignment Path ===' as section;

-- Check if there are trips with assigned_driver_id but queue said no drivers
SELECT 
    '1. Recent trips with assignments despite queue issues' as check_type,
    tr.id,
    tr.status,
    tr.assigned_driver_id,
    tr.pickup_time_preference,
    tr.created_at,
    tr.matched_at,
    CASE 
        WHEN tr.assigned_driver_id IS NOT NULL THEN 'ASSIGNED'
        ELSE 'NOT_ASSIGNED'
    END as assignment_status
FROM trip_requests tr
WHERE tr.created_at > NOW() - INTERVAL '1 hour'
AND tr.pickup_time_preference = 'asap'
ORDER BY tr.created_at DESC
LIMIT 5;

-- Check if your driver ID is being set directly somewhere
SELECT 
    '2. Check your specific driver assignments' as check_type,
    tr.id,
    tr.status,
    tr.assigned_driver_id,
    tr.created_at,
    dp.first_name,
    dp.last_name,
    dp.is_available,
    dp.is_approved,
    dp.status as profile_status
FROM trip_requests tr
LEFT JOIN driver_profiles dp ON tr.assigned_driver_id = dp.user_id
WHERE tr.created_at > NOW() - INTERVAL '2 hours'
AND tr.pickup_time_preference = 'asap'
AND tr.assigned_driver_id IS NOT NULL
ORDER BY tr.created_at DESC;

-- Check if there's a trigger or function bypassing the queue
SELECT 
    '3. Check for database triggers on trip_requests' as check_type,
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'trip_requests'
AND trigger_schema = 'public';

-- Check if trips are being inserted with assigned_driver_id already set
SELECT 
    '4. Check recent ASAP trips creation pattern' as check_type,
    id,
    status,
    assigned_driver_id,
    pickup_time_preference,
    created_at,
    CASE 
        WHEN assigned_driver_id IS NOT NULL AND created_at = matched_at THEN 'CREATED_WITH_ASSIGNMENT'
        WHEN assigned_driver_id IS NOT NULL AND matched_at > created_at THEN 'ASSIGNED_LATER'
        WHEN assigned_driver_id IS NULL THEN 'NOT_ASSIGNED'
        ELSE 'UNKNOWN_PATTERN'
    END as assignment_pattern
FROM trip_requests
WHERE created_at > NOW() - INTERVAL '2 hours'
AND pickup_time_preference = 'asap'
ORDER BY created_at DESC;

-- Most important: Check actual queue entries for recent trips
SELECT 
    '5. Queue entries for recent ASAP trips' as check_type,
    aq.trip_request_id,
    aq.driver_id,
    aq.queue_position,
    aq.status as queue_status,
    aq.notified_at,
    aq.created_at as queue_created,
    tr.status as trip_status,
    tr.assigned_driver_id,
    tr.created_at as trip_created
FROM asap_driver_queue aq
RIGHT JOIN trip_requests tr ON aq.trip_request_id = tr.id
WHERE tr.created_at > NOW() - INTERVAL '2 hours'
AND tr.pickup_time_preference = 'asap'
ORDER BY tr.created_at DESC;

SELECT '🎯 This will show HOW trips are getting assigned to drivers!' as conclusion;
