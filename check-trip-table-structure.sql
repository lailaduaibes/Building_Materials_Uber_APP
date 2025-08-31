-- ========================================
-- Check Trip Requests Table Structure
-- ========================================
-- Let's see what fields actually exist and simplify the expiration logic

-- 1. Check the actual table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'trip_requests' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check what status values actually exist
SELECT 
    'Current status values' as check_name,
    status,
    COUNT(*) as count
FROM trip_requests 
GROUP BY status
ORDER BY count DESC;

-- 3. Check if scheduled_pickup_time is the main field for expiration
SELECT 
    'Scheduled pickup time analysis' as check_name,
    COUNT(*) as total_trips,
    COUNT(*) FILTER (WHERE scheduled_pickup_time IS NOT NULL) as has_scheduled_time,
    COUNT(*) FILTER (WHERE pickup_time_preference = 'scheduled') as marked_as_scheduled,
    COUNT(*) FILTER (WHERE pickup_time_preference = 'asap') as marked_as_asap
FROM trip_requests;

-- 4. Show trips that might need to be expired (simple logic)
SELECT 
    'Trips that should probably be expired' as section,
    id,
    status,
    pickup_time_preference,
    scheduled_pickup_time,
    created_at,
    CASE 
        -- Simple rule: if pickup time passed and no driver accepted, expire it
        WHEN status = 'pending' AND pickup_time_preference = 'scheduled' 
             AND scheduled_pickup_time < NOW() THEN 'SHOULD BE EXPIRED'
        WHEN status = 'pending' AND pickup_time_preference = 'asap' 
             AND created_at < NOW() - INTERVAL '1 hour' THEN 'SHOULD BE EXPIRED (old ASAP)'
        ELSE 'KEEP AS PENDING'
    END as simple_expiration_rule
FROM trip_requests 
WHERE status = 'pending'
ORDER BY created_at DESC;
