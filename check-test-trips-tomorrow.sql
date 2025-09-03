-- Query to check test trips tomorrow (September 3, 2025)
-- Use this to verify the expiration logic is working

-- Current time and cutoffs
SELECT 
    NOW() as current_time,
    NOW()::date as current_date,
    NOW() - INTERVAL '1 hour' as asap_cutoff,
    NOW() - INTERVAL '2 hours' as scheduled_cutoff;

-- Check all test trips created today
SELECT 
    'All Test Trips' as query_type,
    id,
    pickup_time_preference,
    status,
    scheduled_pickup_time,
    created_at,
    load_description,
    CASE 
        WHEN pickup_time_preference = 'scheduled' AND scheduled_pickup_time IS NOT NULL THEN
            CASE 
                WHEN NOW() - scheduled_pickup_time > INTERVAL '2 hours' THEN 'SHOULD_BE_EXPIRED'
                WHEN NOW() > scheduled_pickup_time THEN 'PAST_PICKUP_TIME' 
                ELSE 'FUTURE_PICKUP'
            END
        WHEN pickup_time_preference = 'asap' THEN
            CASE 
                WHEN NOW() - created_at > INTERVAL '1 hour' THEN 'SHOULD_BE_EXPIRED'
                ELSE 'STILL_VALID'
            END
        ELSE 'UNKNOWN'
    END as expiration_status
FROM trip_requests 
WHERE load_description LIKE '%TEST%'
ORDER BY created_at DESC;

-- Check specifically the tomorrow 7AM trip
SELECT 
    'Tomorrow 7AM Trip Analysis' as query_type,
    id,
    pickup_time_preference,
    status,
    scheduled_pickup_time,
    scheduled_pickup_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jerusalem' as local_pickup_time,
    created_at,
    load_description,
    NOW() - scheduled_pickup_time as time_past_pickup,
    CASE 
        WHEN NOW() - scheduled_pickup_time > INTERVAL '2 hours' THEN 'SHOULD_BE_EXPIRED'
        WHEN NOW() > scheduled_pickup_time THEN 'PAST_PICKUP_TIME' 
        ELSE 'FUTURE_PICKUP'
    END as expiration_status
FROM trip_requests 
WHERE load_description LIKE '%Tomorrow 7AM%'
ORDER BY created_at DESC;

-- Test the cleanup function (dry run to see what would be cleaned)
SELECT 'Cleanup Function Test' as query_type, * FROM cleanup_expired_trip_requests();
