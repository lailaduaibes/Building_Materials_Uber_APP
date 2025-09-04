-- ====================================================================
-- TRIP_REQUESTS TABLE ANALYSIS - SQL COMMANDS
-- ====================================================================
-- Run these commands in your SQL editor and provide the results

-- 1. Get complete table structure
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'trip_requests' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check for existing indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'trip_requests' 
  AND schemaname = 'public';

-- 3. Check for foreign key constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'trip_requests';

-- 4. Check current trip statuses (to understand the flow)
SELECT 
    status,
    COUNT(*) as count,
    pickup_time_preference,
    COUNT(*) FILTER (WHERE assigned_driver_id IS NOT NULL) as with_assigned_driver,
    COUNT(*) FILTER (WHERE assigned_driver_id IS NULL) as without_assigned_driver
FROM trip_requests 
GROUP BY status, pickup_time_preference
ORDER BY status, pickup_time_preference;

-- 5. Check recent ASAP trips and their current structure
SELECT 
    id,
    status,
    pickup_time_preference,
    assigned_driver_id,
    original_trip_id,
    created_at,
    matching_started_at,
    acceptance_deadline,
    driver_request_sent_at
FROM trip_requests 
WHERE pickup_time_preference = 'asap'
ORDER BY created_at DESC 
LIMIT 5;

-- 6. Check if any of the proposed new columns already exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'trip_requests' 
  AND column_name IN (
    'current_driver_position',
    'total_drivers_queued', 
    'current_assigned_driver_id',
    'driver_response_deadline',
    'drivers_tried',
    'queue_position',
    'is_sequential_request'
  );

-- 7. Sample recent trip to see actual data structure
SELECT *
FROM trip_requests 
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC 
LIMIT 1;
