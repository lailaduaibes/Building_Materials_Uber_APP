-- Analyze Rating System Database Relationships
-- This will help us understand the table structure and create proper JOINs

-- 1. Check trip_requests table structure and columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'trip_requests' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check driver_profiles table structure and columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'driver_profiles' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check foreign key relationships between trip_requests and driver_profiles
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND (tc.table_name = 'trip_requests' OR tc.table_name = 'driver_profiles');

-- 4. Sample data from trip_requests showing driver assignment
SELECT 
    id,
    customer_id,
    assigned_driver_id,
    status,
    driver_rating,
    driver_feedback,
    created_at,
    completed_at
FROM trip_requests 
WHERE assigned_driver_id IS NOT NULL 
LIMIT 5;

-- 5. Sample data from driver_profiles
SELECT 
    id,
    user_id,
    first_name,
    last_name,
    full_name,
    phone,
    profile_picture
FROM driver_profiles 
LIMIT 5;

-- 6. Test JOIN relationship between trip_requests and driver_profiles
SELECT 
    tr.id as trip_id,
    tr.customer_id,
    tr.assigned_driver_id,
    tr.status,
    tr.driver_rating,
    dp.user_id as driver_user_id,
    dp.first_name,
    dp.last_name,
    dp.full_name
FROM trip_requests tr
LEFT JOIN driver_profiles dp ON tr.assigned_driver_id = dp.user_id
WHERE tr.assigned_driver_id IS NOT NULL
LIMIT 10;

-- 7. Check for delivered trips that need rating
SELECT 
    tr.id,
    tr.customer_id,
    tr.assigned_driver_id,
    tr.status,
    tr.driver_rating,
    tr.completed_at,
    dp.full_name as driver_name
FROM trip_requests tr
LEFT JOIN driver_profiles dp ON tr.assigned_driver_id = dp.user_id
WHERE tr.status = 'delivered' 
    AND tr.driver_rating IS NULL
    AND tr.assigned_driver_id IS NOT NULL
ORDER BY tr.completed_at DESC
LIMIT 10;

-- 8. Check for any existing rating-related functions
SELECT 
    routine_name,
    routine_type,
    specific_name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
    AND routine_name LIKE '%rating%';

-- 9. Check if there are any trips with ratings already
SELECT 
    COUNT(*) as total_trips,
    COUNT(CASE WHEN driver_rating IS NOT NULL THEN 1 END) as rated_trips,
    COUNT(CASE WHEN driver_rating IS NULL AND status = 'delivered' THEN 1 END) as unrated_delivered_trips
FROM trip_requests;

-- 10. Sample of actual trip-driver relationships
SELECT 
    'Sample Join Test' as test_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN dp.full_name IS NOT NULL THEN 1 END) as successful_joins,
    COUNT(CASE WHEN dp.full_name IS NULL THEN 1 END) as failed_joins
FROM trip_requests tr
LEFT JOIN driver_profiles dp ON tr.assigned_driver_id = dp.user_id
WHERE tr.assigned_driver_id IS NOT NULL;
