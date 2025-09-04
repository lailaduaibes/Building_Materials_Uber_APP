-- 🔍 DEBUG: Driver Availability Issue Analysis
-- Issue: start_asap_matching returns "No available drivers found" but trip reaches driver app

-- 1. Check current driver profiles and their availability status
SELECT 
    '=== DRIVER PROFILE ANALYSIS ===' as section,
    dp.user_id,
    dp.status as profile_status,
    dp.is_available,
    dp.is_approved,
    dp.vehicle_type,
    dp.created_at,
    dp.updated_at
FROM driver_profiles dp
ORDER BY dp.updated_at DESC
LIMIT 5;

-- 2. Check what criteria start_asap_matching_sequential uses for "available drivers"
-- This should match the find_nearby_available_drivers function criteria
SELECT '=== CHECKING FUNCTION DEFINITIONS ===' as section;

-- Check if the function exists and its definition
SELECT 
    routine_name,
    routine_type,
    data_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'find_nearby_available_drivers'
AND routine_schema = 'public';

-- 3. Test the actual criteria that find_nearby_available_drivers uses
-- Based on common patterns, it likely checks:
-- - dp.is_available = true
-- - dp.is_approved = true (or dp.status = 'approved')
-- - Maybe location requirements

SELECT 
    '=== TESTING DRIVER AVAILABILITY CRITERIA ===' as section,
    COUNT(*) as total_drivers,
    COUNT(CASE WHEN dp.is_available = true THEN 1 END) as available_drivers,
    COUNT(CASE WHEN dp.is_approved = true THEN 1 END) as approved_drivers,
    COUNT(CASE WHEN dp.status = 'approved' THEN 1 END) as status_approved_drivers,
    COUNT(CASE WHEN dp.is_available = true AND dp.is_approved = true THEN 1 END) as available_and_approved,
    COUNT(CASE WHEN dp.is_available = true AND dp.status = 'approved' THEN 1 END) as available_and_status_approved
FROM driver_profiles dp;

-- 4. Check user location data (might be required for nearby matching)
SELECT 
    '=== USER LOCATION DATA ===' as section,
    COUNT(*) as total_users,
    COUNT(CASE WHEN u.current_latitude IS NOT NULL THEN 1 END) as users_with_location,
    COUNT(CASE WHEN u.last_location_update > NOW() - INTERVAL '5 minutes' THEN 1 END) as recent_location_updates
FROM auth.users u
JOIN driver_profiles dp ON u.id = dp.user_id
WHERE dp.is_available = true;

-- 5. Check latest trip request that had the issue
SELECT 
    '=== RECENT TRIP REQUEST ===' as section,
    id,
    pickup_latitude,
    pickup_longitude,
    status,
    assigned_driver_id,
    created_at
FROM trip_requests 
ORDER BY created_at DESC 
LIMIT 1;

-- 6. Check if there are any specific constraints in asap_driver_queue
SELECT 
    '=== ASAP QUEUE STATUS ===' as section,
    COUNT(*) as total_queue_entries,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_entries,
    COUNT(CASE WHEN status = 'notified' THEN 1 END) as notified_entries
FROM asap_driver_queue;

-- 7. Final analysis - combine everything to find the mismatch
SELECT 
    '=== MISMATCH ANALYSIS ===' as section,
    (SELECT COUNT(*) FROM driver_profiles WHERE is_available = true AND (is_approved = true OR status = 'approved')) as criteria_1_available_approved,
    (SELECT COUNT(*) FROM auth.users u JOIN driver_profiles dp ON u.id = dp.user_id 
     WHERE dp.is_available = true AND dp.is_approved = true AND u.current_latitude IS NOT NULL) as criteria_2_with_location,
    (SELECT COUNT(*) FROM auth.users u JOIN driver_profiles dp ON u.id = dp.user_id 
     WHERE dp.is_available = true AND dp.status = 'approved' AND u.current_latitude IS NOT NULL) as criteria_3_status_approved_with_location;

SELECT '🔍 Check these results to identify why start_asap_matching finds no drivers!' as conclusion;
