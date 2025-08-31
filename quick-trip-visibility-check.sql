-- ========================================
-- Quick Trip Disappearance Check
-- ========================================
-- Run this to quickly check if trips are wrongly disappearing

-- 1. Quick overview
SELECT 
    'Current trip status overview' as check_name,
    status,
    COUNT(*) as count
FROM trip_requests 
GROUP BY status
ORDER BY status;

-- 2. Check for trips that should be visible but might be hidden
WITH should_be_visible AS (
    SELECT 
        id,
        status,
        acceptance_deadline,
        pickup_time_preference,
        scheduled_pickup_time,
        created_at,
        -- Calculate if should be visible
        CASE 
            WHEN status != 'pending' THEN false
            WHEN acceptance_deadline <= NOW() THEN false
            WHEN pickup_time_preference = 'scheduled' 
                 AND scheduled_pickup_time < NOW() - INTERVAL '2 hours' THEN false
            ELSE true
        END as should_be_visible
    FROM trip_requests
)
SELECT 
    'Trips that should be visible to drivers' as check_name,
    COUNT(*) FILTER (WHERE should_be_visible = true) as should_see,
    COUNT(*) FILTER (WHERE should_be_visible = false) as should_hide,
    COUNT(*) as total
FROM should_be_visible;

-- 3. Show specific trips that should be visible
SELECT 
    'These trips should be visible to drivers:' as check_name,
    id,
    status,
    pickup_time_preference,
    EXTRACT(MINUTE FROM (acceptance_deadline - NOW())) as minutes_until_deadline,
    CASE 
        WHEN scheduled_pickup_time IS NOT NULL THEN
            EXTRACT(HOUR FROM (scheduled_pickup_time - NOW()))
        ELSE NULL
    END as hours_until_scheduled,
    created_at
FROM trip_requests
WHERE status = 'pending'
AND acceptance_deadline > NOW()
AND (
    pickup_time_preference != 'scheduled' 
    OR scheduled_pickup_time > NOW() - INTERVAL '2 hours'
)
ORDER BY created_at DESC;

-- 4. Check recent activity
SELECT 
    'Recent trip activity (last 2 hours)' as check_name,
    COUNT(*) as trips_created,
    COUNT(*) FILTER (WHERE status = 'pending') as still_pending,
    COUNT(*) FILTER (WHERE status = 'expired') as expired
FROM trip_requests 
WHERE created_at > NOW() - INTERVAL '2 hours';
