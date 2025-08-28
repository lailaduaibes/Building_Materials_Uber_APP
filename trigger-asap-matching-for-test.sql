-- Trigger ASAP matching for the existing test trip
-- This will assign the trip to your driver and trigger the notification

-- First, find your test ASAP trip
WITH test_trip AS (
    SELECT id, status, pickup_time_preference, assigned_driver_id, acceptance_deadline
    FROM trip_requests 
    WHERE load_description LIKE '%TEST ASAP Trip - Flatbed Compatible%'
    AND pickup_time_preference = 'asap'
    AND status = 'pending'
    AND assigned_driver_id IS NULL
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    'Found ASAP test trip:' as info,
    id as trip_id,
    status,
    pickup_time_preference,
    assigned_driver_id,
    acceptance_deadline
FROM test_trip;

-- Now trigger ASAP matching for this trip
WITH latest_test_trip AS (
    SELECT id 
    FROM trip_requests 
    WHERE load_description LIKE '%TEST ASAP Trip - Flatbed Compatible%'
    AND pickup_time_preference = 'asap'
    AND status = 'pending'
    AND assigned_driver_id IS NULL
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    '🚨 TRIGGERING ASAP MATCHING:' as action,
    start_asap_matching(id) as result
FROM latest_test_trip;

-- Check if driver requests were created after matching
SELECT 
    '📱 CHECKING DRIVER NOTIFICATIONS:' as info,
    COUNT(*) as notifications_created,
    array_agg(DISTINCT assigned_driver_id) as drivers_notified,
    array_agg(DISTINCT original_trip_id) as original_trips
FROM trip_requests 
WHERE original_trip_id IN (
    SELECT id 
    FROM trip_requests 
    WHERE load_description LIKE '%TEST ASAP Trip - Flatbed Compatible%'
    AND pickup_time_preference = 'asap'
    ORDER BY created_at DESC 
    LIMIT 1
);

-- Show current status of test trip and any notifications
WITH test_trip AS (
    SELECT id 
    FROM trip_requests 
    WHERE load_description LIKE '%TEST ASAP Trip - Flatbed Compatible%'
    AND pickup_time_preference = 'asap'
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    '🎯 FINAL STATUS:' as summary,
    tr.id,
    tr.status,
    tr.assigned_driver_id,
    tr.acceptance_deadline,
    tr.original_trip_id,
    CASE 
        WHEN tr.assigned_driver_id IS NOT NULL AND tr.acceptance_deadline IS NOT NULL 
        THEN '✅ SHOULD TRIGGER NOTIFICATION'
        WHEN tr.original_trip_id IS NOT NULL 
        THEN '🔄 IS A NOTIFICATION REQUEST'
        ELSE '❌ NO NOTIFICATION SETUP'
    END as notification_status
FROM trip_requests tr
WHERE tr.id IN (SELECT id FROM test_trip)
   OR tr.original_trip_id IN (SELECT id FROM test_trip)
ORDER BY tr.created_at DESC;

SELECT '🎯 If you see driver notifications created, check your driver app now!' as final_message;
