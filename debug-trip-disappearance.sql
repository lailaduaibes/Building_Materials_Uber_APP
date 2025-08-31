-- ========================================
-- Trip Disappearance Investigation
-- ========================================
-- This script helps debug why trips might be disappearing
-- when they should still be visible to drivers

-- 1. Show ALL trips with their expiration status
SELECT 
    '=== ALL TRIPS ANALYSIS ===' as section,
    id,
    status,
    pickup_time_preference,
    scheduled_pickup_time,
    acceptance_deadline,
    created_at,
    -- Calculate expiration status
    CASE 
        WHEN status != 'pending' THEN 'Not pending'
        WHEN acceptance_deadline < NOW() THEN 'Acceptance deadline expired'
        WHEN pickup_time_preference = 'scheduled' AND scheduled_pickup_time < NOW() - INTERVAL '2 hours' THEN 'Scheduled pickup long past'
        WHEN pickup_time_preference = 'scheduled' AND scheduled_pickup_time < NOW() THEN 'Scheduled pickup recently past'
        ELSE 'SHOULD BE VISIBLE'
    END as visibility_status,
    -- Time calculations
    EXTRACT(MINUTE FROM (NOW() - acceptance_deadline)) as minutes_past_deadline,
    CASE 
        WHEN scheduled_pickup_time IS NOT NULL THEN 
            EXTRACT(HOUR FROM (NOW() - scheduled_pickup_time))
        ELSE NULL 
    END as hours_past_scheduled_pickup
FROM trip_requests 
ORDER BY created_at DESC;

-- 2. Check what drivers should see vs what they actually see
SELECT 
    '=== DRIVER VISIBILITY CHECK ===' as section,
    COUNT(*) as total_trips,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_trips,
    COUNT(*) FILTER (WHERE status = 'pending' AND acceptance_deadline > NOW()) as not_deadline_expired,
    COUNT(*) FILTER (WHERE 
        status = 'pending' 
        AND acceptance_deadline > NOW()
        AND (pickup_time_preference != 'scheduled' OR scheduled_pickup_time > NOW() - INTERVAL '30 minutes')
    ) as should_be_visible_to_drivers,
    COUNT(*) FILTER (WHERE status = 'expired') as explicitly_expired
FROM trip_requests;

-- 3. Show trips that might be wrongly hidden
SELECT 
    '=== POTENTIALLY WRONGLY HIDDEN TRIPS ===' as section,
    id,
    status,
    pickup_time_preference,
    scheduled_pickup_time,
    acceptance_deadline,
    created_at,
    'This trip might be wrongly hidden' as warning
FROM trip_requests 
WHERE status = 'pending'
AND acceptance_deadline > NOW() -- Not deadline expired
AND (
    pickup_time_preference != 'scheduled' 
    OR scheduled_pickup_time > NOW() - INTERVAL '30 minutes' -- Not long past scheduled time
)
ORDER BY created_at DESC;

-- 4. Check if there are trips that disappeared due to wrong queries
SELECT 
    '=== TRIPS BY TIME WINDOWS ===' as section,
    'Last 1 hour' as time_window,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'expired') as expired
FROM trip_requests 
WHERE created_at > NOW() - INTERVAL '1 hour'

UNION ALL

SELECT 
    '=== TRIPS BY TIME WINDOWS ===' as section,
    'Last 6 hours' as time_window,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'expired') as expired
FROM trip_requests 
WHERE created_at > NOW() - INTERVAL '6 hours'

UNION ALL

SELECT 
    '=== TRIPS BY TIME WINDOWS ===' as section,
    'Last 24 hours' as time_window,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'expired') as expired
FROM trip_requests 
WHERE created_at > NOW() - INTERVAL '24 hours';

-- 5. Test the exact query that the driver app uses
SELECT 
    '=== DRIVER APP QUERY SIMULATION ===' as section,
    id,
    status,
    pickup_time_preference,
    scheduled_pickup_time,
    acceptance_deadline,
    assigned_driver_id,
    'This is what drivers should see' as note
FROM trip_requests
WHERE status = 'pending'
AND acceptance_deadline > NOW() -- This is the key filter
ORDER BY created_at DESC;

-- 6. Show recent status changes (if we had a history table)
SELECT 
    '=== DEBUGGING INFO ===' as section,
    'Current time: ' || NOW()::text as debug_info

UNION ALL

SELECT 
    '=== DEBUGGING INFO ===' as section,
    'Total trip_requests count: ' || COUNT(*)::text as debug_info
FROM trip_requests

UNION ALL

SELECT 
    '=== DEBUGGING INFO ===' as section,
    'Trips created today: ' || COUNT(*)::text as debug_info
FROM trip_requests 
WHERE created_at::date = CURRENT_DATE;

-- 7. Check for edge cases in the expiration logic
SELECT 
    '=== EDGE CASE ANALYSIS ===' as section,
    id,
    status,
    acceptance_deadline,
    EXTRACT(MINUTE FROM (acceptance_deadline - NOW())) as minutes_until_deadline,
    'Trips expiring soon' as note
FROM trip_requests 
WHERE status = 'pending'
AND acceptance_deadline BETWEEN NOW() AND NOW() + INTERVAL '5 minutes'
ORDER BY acceptance_deadline;
