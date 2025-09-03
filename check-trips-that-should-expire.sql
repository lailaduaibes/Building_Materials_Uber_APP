-- Check which trips should be expired based on current logic
-- This will help us understand what the cleanup function will do

-- Current time for reference
SELECT NOW() as current_time, 
       NOW() - INTERVAL '1 hour' as asap_cutoff,
       NOW() - INTERVAL '2 hours' as scheduled_cutoff;

-- Check ASAP trips that should be expired (pending + created > 1 hour ago)
SELECT 
    'ASAP - Should be expired' as trip_type,
    id,
    pickup_time_preference,
    status,
    created_at,
    NOW() - created_at as age,
    CASE 
        WHEN NOW() - created_at > INTERVAL '1 hour' THEN 'SHOULD_EXPIRE'
        ELSE 'STILL_VALID'
    END as expiration_status
FROM trip_requests 
WHERE status = 'pending' 
    AND pickup_time_preference = 'asap'
ORDER BY created_at DESC;

-- Check scheduled trips that should be expired (pending + scheduled_pickup_time > 2 hours ago)
SELECT 
    'Scheduled - Should be expired' as trip_type,
    id,
    pickup_time_preference,
    status,
    scheduled_pickup_time,
    NOW() - scheduled_pickup_time as time_past_pickup,
    CASE 
        WHEN scheduled_pickup_time IS NOT NULL AND NOW() - scheduled_pickup_time > INTERVAL '2 hours' THEN 'SHOULD_EXPIRE'
        ELSE 'STILL_VALID'
    END as expiration_status
FROM trip_requests 
WHERE status = 'pending' 
    AND pickup_time_preference = 'scheduled'
    AND scheduled_pickup_time IS NOT NULL
ORDER BY scheduled_pickup_time DESC;

-- Check the specific problematic trip we found earlier
SELECT 
    'Problematic trip analysis' as analysis_type,
    id,
    pickup_time_preference,
    status,
    scheduled_pickup_time,
    created_at,
    NOW() - scheduled_pickup_time as time_past_pickup,
    NOW() - created_at as age,
    CASE 
        WHEN pickup_time_preference = 'asap' AND NOW() - created_at > INTERVAL '1 hour' THEN 'SHOULD_EXPIRE_ASAP'
        WHEN pickup_time_preference = 'scheduled' AND scheduled_pickup_time IS NOT NULL AND NOW() - scheduled_pickup_time > INTERVAL '2 hours' THEN 'SHOULD_EXPIRE_SCHEDULED'
        ELSE 'STILL_VALID'
    END as expiration_status
FROM trip_requests 
WHERE id = 'ecec4c6c-e2dd-4364-adf3-01ad0bfc6762';
