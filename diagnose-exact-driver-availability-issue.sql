-- 🔍 COMPREHENSIVE DRIVER AVAILABILITY MISMATCH DIAGNOSIS
-- This will identify why start_asap_matching says "no drivers" while driver app receives trips

SELECT '=== STEP 1: CURRENT DRIVER PROFILE DATA ===' as step;

-- Get your current driver profile to understand availability status
SELECT 
    user_id,
    id as profile_id,
    first_name,
    last_name,
    phone,
    status as profile_status,
    is_available,
    is_approved,
    approval_status,
    vehicle_type,
    current_location,
    last_location_update,
    created_at,
    updated_at
FROM driver_profiles
ORDER BY updated_at DESC
LIMIT 3;

SELECT '=== STEP 2: USER TABLE LOCATION DATA ===' as step;

-- Check users table for location data which might be required
SELECT 
    u.id,
    u.email,
    u.role,
    u.user_type,
    u.current_latitude,
    u.current_longitude,
    u.last_location_update,
    u.is_online,
    dp.is_available as driver_available,
    dp.approval_status
FROM auth.users u
LEFT JOIN driver_profiles dp ON u.id = dp.user_id
WHERE u.role = 'driver' OR u.user_type = 'driver'
ORDER BY u.last_location_update DESC NULLS LAST
LIMIT 5;

SELECT '=== STEP 3: RECENT TRIP REQUEST THAT FAILED ===' as step;

-- Get the most recent trip that had matching issues
SELECT 
    id,
    customer_id,
    pickup_latitude,
    pickup_longitude,
    pickup_time_preference,
    status,
    assigned_driver_id,
    created_at,
    pickup_address
FROM trip_requests 
WHERE status = 'no_drivers_available'
ORDER BY created_at DESC 
LIMIT 1;

SELECT '=== STEP 4: FUNCTION DEFINITION ANALYSIS ===' as step;

-- Check if start_asap_matching_sequential exists and its requirements
SELECT 
    routine_name,
    routine_type,
    data_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'start_asap_matching_sequential'
AND routine_schema = 'public';

SELECT '=== STEP 5: TEST SIMPLE DRIVER AVAILABILITY QUERY ===' as step;

-- Test the basic query that start_asap_matching likely uses
SELECT 
    '=== Basic availability criteria test ===' as test_type,
    COUNT(*) as total_drivers,
    COUNT(CASE WHEN dp.is_available = true THEN 1 END) as available_drivers,
    COUNT(CASE WHEN dp.is_approved = true THEN 1 END) as approved_drivers,
    COUNT(CASE WHEN dp.status = 'approved' THEN 1 END) as status_approved_drivers,
    COUNT(CASE WHEN dp.is_available = true AND dp.is_approved = true THEN 1 END) as available_and_approved,
    COUNT(CASE WHEN dp.is_available = true AND dp.status = 'approved' THEN 1 END) as available_and_status_approved
FROM driver_profiles dp;

SELECT '=== STEP 6: TEST WITH LOCATION REQUIREMENTS ===' as step;

-- Test including location requirements (which might be the issue)
SELECT 
    '=== With location requirements ===' as test_type,
    COUNT(*) as total_drivers_with_location,
    COUNT(CASE WHEN dp.is_available = true AND dp.is_approved = true THEN 1 END) as available_approved_with_location,
    COUNT(CASE WHEN dp.is_available = true AND dp.status = 'approved' THEN 1 END) as available_status_approved_with_location,
    COUNT(CASE WHEN u.current_latitude IS NOT NULL AND u.current_longitude IS NOT NULL THEN 1 END) as drivers_with_coordinates,
    COUNT(CASE WHEN u.last_location_update > NOW() - INTERVAL '30 minutes' THEN 1 END) as drivers_with_recent_location
FROM auth.users u
JOIN driver_profiles dp ON u.id = dp.user_id
WHERE dp.is_available = true;

SELECT '=== STEP 7: IDENTIFY THE EXACT MISMATCH ===' as step;

-- Show the exact driver data that should be found
SELECT 
    '=== Detailed driver analysis ===' as analysis,
    u.id as user_id,
    dp.id as profile_id,
    CONCAT(dp.first_name, ' ', dp.last_name) as driver_name,
    dp.phone,
    u.email,
    dp.is_available,
    dp.is_approved,
    dp.status,
    dp.approval_status,
    CASE 
        WHEN u.current_latitude IS NOT NULL AND u.current_longitude IS NOT NULL THEN 'HAS_LOCATION'
        ELSE 'NO_LOCATION'
    END as location_status,
    CASE 
        WHEN u.last_location_update > NOW() - INTERVAL '30 minutes' THEN 'RECENT_LOCATION'
        WHEN u.last_location_update IS NOT NULL THEN 'OLD_LOCATION'
        ELSE 'NO_LOCATION_UPDATE'
    END as location_freshness,
    u.is_online,
    dp.created_at as profile_created,
    u.last_location_update
FROM auth.users u
JOIN driver_profiles dp ON u.id = dp.user_id
WHERE (u.role = 'driver' OR u.user_type = 'driver')
ORDER BY dp.updated_at DESC;

SELECT '=== STEP 8: POSSIBLE REASONS FOR MISMATCH ===' as step;

SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM driver_profiles WHERE is_available = true AND is_approved = true) = 0 
        THEN '❌ ISSUE: No drivers marked as both available AND approved'
        WHEN (SELECT COUNT(*) FROM driver_profiles WHERE is_available = true AND status = 'approved') = 0 
        THEN '❌ ISSUE: No drivers marked as both available AND status=approved'
        WHEN (SELECT COUNT(*) FROM auth.users u JOIN driver_profiles dp ON u.id = dp.user_id WHERE dp.is_available = true AND u.current_latitude IS NOT NULL) = 0
        THEN '❌ ISSUE: Available drivers have no location data'
        WHEN (SELECT COUNT(*) FROM auth.users u JOIN driver_profiles dp ON u.id = dp.user_id WHERE dp.is_available = true AND u.last_location_update > NOW() - INTERVAL '10 minutes') = 0
        THEN '❌ ISSUE: Available drivers have stale location data'
        ELSE '✅ Drivers should be found - check function logic'
    END as diagnosis;

SELECT '🎯 RECOMMENDATION: Run this query to identify the exact issue!' as conclusion;
