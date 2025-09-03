-- Test queries to run tomorrow to verify trip expiration logic
-- Run these queries on September 3, 2025 to test the functionality

-- 1. Check current time and cutoffs
SELECT 
    NOW() as current_time,
    NOW()::date as current_date,
    EXTRACT(HOUR FROM NOW()) as current_hour,
    NOW() - INTERVAL '1 hour' as asap_cutoff,
    NOW() - INTERVAL '2 hours' as scheduled_cutoff;

-- 2. Check the scheduled trip for tomorrow (should be visible before 7 AM, hidden after 9 AM)
SELECT 
    'Tomorrow 7AM Trip Status' as test_name,
    id,
    pickup_time_preference,
    scheduled_pickup_time,
    scheduled_pickup_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kuwait' as local_pickup_time,
    status,
    load_description,
    created_at,
    -- Time calculations
    NOW() - scheduled_pickup_time as time_past_pickup,
    EXTRACT(EPOCH FROM (NOW() - scheduled_pickup_time)) / 3600 as hours_past_pickup,
    -- Expiration logic
    CASE 
        WHEN pickup_time_preference = 'scheduled' AND scheduled_pickup_time IS NOT NULL THEN
            CASE 
                WHEN NOW() > scheduled_pickup_time + INTERVAL '2 hours' THEN 'SHOULD_BE_EXPIRED'
                WHEN NOW() > scheduled_pickup_time THEN 'PAST_PICKUP_TIME'
                ELSE 'STILL_UPCOMING'
            END
        ELSE 'N/A'
    END as expiration_status
FROM trip_requests 
WHERE pickup_time_preference = 'scheduled' 
    AND scheduled_pickup_time::date = '2025-09-03'
    AND status = 'pending'
ORDER BY scheduled_pickup_time;

-- 3. Check ASAP trips (should expire 1 hour after creation)
SELECT 
    'ASAP Trip Status' as test_name,
    id,
    pickup_time_preference,
    status,
    load_description,
    created_at,
    NOW() - created_at as age,
    EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 as hours_old,
    CASE 
        WHEN pickup_time_preference = 'asap' THEN
            CASE 
                WHEN NOW() > created_at + INTERVAL '1 hour' THEN 'SHOULD_BE_EXPIRED'
                ELSE 'STILL_VALID'
            END
        ELSE 'N/A'
    END as expiration_status
FROM trip_requests 
WHERE pickup_time_preference = 'asap' 
    AND status = 'pending'
    AND created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at DESC;

-- 4. Test the cleanup function
SELECT 'Cleanup Function Test' as test_name;
SELECT * FROM cleanup_expired_trip_requests();

-- 5. Verify what was cleaned up
SELECT 
    'After Cleanup Status' as test_name,
    pickup_time_preference,
    status,
    COUNT(*) as count
FROM trip_requests 
WHERE created_at > NOW() - INTERVAL '1 day'
GROUP BY pickup_time_preference, status
ORDER BY pickup_time_preference, status;

-- 6. Timeline for testing tomorrow:
-- Run at different times and expect these results:
/*
At 6:00 AM (before pickup): Scheduled trip should be visible, status 'pending'
At 7:00 AM (pickup time): Scheduled trip should still be visible, status 'pending' 
At 8:00 AM (1 hour past): Scheduled trip should still be visible, status 'pending'
At 9:00 AM (2 hours past): Scheduled trip should be hidden/expired after cleanup
At 10:00 AM (3 hours past): Scheduled trip should definitely be expired

For ASAP trips: Should expire 1 hour after creation
*/
