-- Check trip requests for today to analyze the scheduled trips visibility issue
-- This will help identify why trips with 7 AM pickup are still visible at 12:35 PM

-- 1. Get all trip requests created or scheduled for today
SELECT 
    id,
    status,
    pickup_time_preference,
    scheduled_pickup_time,
    acceptance_deadline,
    created_at,
    updated_at,
    pickup_address,
    delivery_address,
    estimated_earnings,
    -- Calculate time differences
    CASE 
        WHEN pickup_time_preference = 'asap' THEN 
            EXTRACT(EPOCH FROM (NOW() - created_at))/3600 || ' hours since creation (ASAP)'
        WHEN pickup_time_preference = 'scheduled' AND scheduled_pickup_time IS NOT NULL THEN
            EXTRACT(EPOCH FROM (NOW() - scheduled_pickup_time))/3600 || ' hours since scheduled pickup'
        ELSE 'No timing info'
    END as time_analysis,
    -- Check if should be visible based on current logic
    CASE 
        WHEN status != 'pending' THEN 'Hidden: Status is ' || status
        WHEN pickup_time_preference = 'asap' AND EXTRACT(EPOCH FROM (NOW() - created_at))/3600 > 1 THEN 
            'Should be hidden: ASAP > 1 hour old'
        WHEN pickup_time_preference = 'scheduled' AND scheduled_pickup_time IS NOT NULL AND EXTRACT(EPOCH FROM (NOW() - scheduled_pickup_time))/3600 > 2 THEN 
            'Should be hidden: Scheduled > 2 hours late'
        WHEN acceptance_deadline IS NOT NULL AND acceptance_deadline < NOW() THEN 
            'Should be hidden: Deadline passed'
        ELSE 'Should be visible'
    END as visibility_status
FROM trip_requests 
WHERE 
    DATE(created_at) = CURRENT_DATE 
    OR DATE(scheduled_pickup_time) = CURRENT_DATE
ORDER BY 
    CASE WHEN pickup_time_preference = 'scheduled' THEN scheduled_pickup_time ELSE created_at END DESC;

-- 2. Focus on problematic trips (scheduled for today but should be expired)
SELECT 
    'Problematic Scheduled Trips' as analysis_type,
    id,
    status,
    pickup_time_preference,
    scheduled_pickup_time,
    TO_CHAR(scheduled_pickup_time, 'HH24:MI') as pickup_time,
    EXTRACT(EPOCH FROM (NOW() - scheduled_pickup_time))/3600 as hours_since_pickup,
    acceptance_deadline,
    created_at
FROM trip_requests 
WHERE 
    status = 'pending'
    AND pickup_time_preference = 'scheduled' 
    AND scheduled_pickup_time IS NOT NULL
    AND DATE(scheduled_pickup_time) = CURRENT_DATE
    AND EXTRACT(EPOCH FROM (NOW() - scheduled_pickup_time))/3600 > 2
ORDER BY scheduled_pickup_time;

-- 3. Check data structure issues
SELECT 
    'Data Structure Analysis' as analysis_type,
    COUNT(*) as total_trips,
    COUNT(CASE WHEN pickup_time_preference = 'asap' THEN 1 END) as asap_trips,
    COUNT(CASE WHEN pickup_time_preference = 'scheduled' THEN 1 END) as scheduled_trips,
    COUNT(CASE WHEN scheduled_pickup_time IS NOT NULL THEN 1 END) as trips_with_scheduled_time,
    COUNT(CASE WHEN acceptance_deadline IS NOT NULL THEN 1 END) as trips_with_deadline,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_trips,
    COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_trips
FROM trip_requests 
WHERE DATE(created_at) = CURRENT_DATE OR DATE(scheduled_pickup_time) = CURRENT_DATE;

-- 4. Show current time for reference
SELECT 
    'Current Time Reference' as info,
    NOW() as current_time,
    CURRENT_DATE as current_date,
    TO_CHAR(NOW(), 'HH24:MI') as current_time_formatted;
