-- COMPREHENSIVE ASAP SYSTEM DEBUG
-- Let's check everything step by step

-- ==============================================
-- STEP 1: DATABASE SCHEMA VERIFICATION
-- ==============================================

-- Check if all required tables exist
SELECT 
    '📋 TABLE EXISTENCE CHECK:' as step,
    table_name,
    'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('trip_requests', 'driver_profiles', 'driver_locations', 'users', 'truck_types')
ORDER BY table_name;

-- ==============================================
-- STEP 2: CHECK ASAP FUNCTIONS
-- ==============================================

-- Check if ASAP functions exist
SELECT 
    '🔧 FUNCTION CHECK:' as step,
    routine_name,
    'EXISTS' as status
FROM information_schema.routines
WHERE routine_schema = 'public' 
AND routine_name IN ('start_asap_matching', 'find_nearby_available_drivers')
ORDER BY routine_name;

-- ==============================================
-- STEP 3: DRIVER DATA AUDIT
-- ==============================================

-- Check driver profiles in detail
SELECT 
    '👤 DRIVER PROFILES AUDIT:' as step,
    user_id,
    first_name || ' ' || last_name as name,
    is_available,
    is_approved,
    status,
    current_truck_id,
    selected_truck_type_id,
    created_at
FROM driver_profiles
ORDER BY is_approved DESC, is_available DESC;

-- Check users table for the same drivers
SELECT 
    '👥 USERS TABLE CHECK:' as step,
    u.id,
    u.first_name || ' ' || u.last_name as name,
    u.role,
    u.current_latitude,
    u.current_longitude,
    u.last_location_update,
    CASE 
        WHEN u.current_latitude IS NOT NULL THEN 'HAS LOCATION'
        ELSE 'NO LOCATION'
    END as location_status
FROM users u
WHERE u.role = 'driver'
ORDER BY u.last_location_update DESC NULLS LAST;

-- Check driver_locations table
SELECT 
    '📍 DRIVER LOCATIONS TABLE:' as step,
    driver_id,
    latitude,
    longitude,
    updated_at,
    EXTRACT(MINUTE FROM (NOW() - updated_at)) as minutes_old
FROM driver_locations
ORDER BY updated_at DESC;

-- ==============================================
-- STEP 4: TRIP REQUESTS ANALYSIS
-- ==============================================

-- Check existing trip requests
SELECT 
    '🛒 TRIP REQUESTS:' as step,
    id,
    status,
    pickup_time_preference,
    assigned_driver_id,
    original_trip_id,
    acceptance_deadline,
    CASE 
        WHEN pickup_time_preference = 'asap' AND assigned_driver_id IS NULL THEN 'CUSTOMER ASAP TRIP'
        WHEN pickup_time_preference = 'asap' AND assigned_driver_id IS NOT NULL THEN 'DRIVER NOTIFICATION'
        ELSE 'REGULAR TRIP'
    END as trip_type,
    created_at
FROM trip_requests
ORDER BY created_at DESC
LIMIT 10;

-- ==============================================
-- STEP 5: FOREIGN KEY CONSTRAINT CHECK
-- ==============================================

-- Check foreign key constraints that might be causing issues
SELECT 
    '🔗 FOREIGN KEY CONSTRAINTS:' as step,
    tc.table_name,
    tc.constraint_name,
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
    AND tc.table_name IN ('driver_locations', 'trip_requests', 'driver_profiles')
ORDER BY tc.table_name, tc.constraint_name;

-- ==============================================
-- STEP 6: TEST PROXIMITY FUNCTION
-- ==============================================

-- Test if the proximity function works at all
SELECT 
    '🎯 PROXIMITY FUNCTION TEST:' as step,
    'Testing find_nearby_available_drivers function...' as action;

-- Try to call the function with basic parameters
DO $$
BEGIN
    BEGIN
        PERFORM find_nearby_available_drivers(32.388, 35.322, 50, 60);
        RAISE NOTICE '✅ find_nearby_available_drivers function is callable';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ find_nearby_available_drivers function error: %', SQLERRM;
    END;
END $$;

-- ==============================================
-- STEP 7: TEST ASAP MATCHING FUNCTION
-- ==============================================

-- Test if start_asap_matching function works
DO $$
DECLARE
    test_trip_id UUID;
BEGIN
    -- Get any trip ID for testing
    SELECT id INTO test_trip_id FROM trip_requests LIMIT 1;
    
    IF test_trip_id IS NOT NULL THEN
        BEGIN
            PERFORM start_asap_matching(test_trip_id);
            RAISE NOTICE '✅ start_asap_matching function is callable';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '❌ start_asap_matching function error: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '⚠️ No trip requests found for testing start_asap_matching';
    END IF;
END $$;

-- ==============================================
-- STEP 8: RLS POLICIES CHECK
-- ==============================================

-- Check Row Level Security policies that might block operations
SELECT 
    '🛡️ RLS POLICIES:' as step,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('trip_requests', 'driver_profiles', 'driver_locations')
ORDER BY tablename, policyname;

-- ==============================================
-- STEP 9: SUMMARY AND DIAGNOSIS
-- ==============================================

SELECT 
    '🔍 SYSTEM DIAGNOSIS SUMMARY:' as final_check,
    (SELECT COUNT(*) FROM driver_profiles WHERE is_available = true AND is_approved = true) as available_drivers,
    (SELECT COUNT(*) FROM driver_locations) as driver_location_records,
    (SELECT COUNT(*) FROM driver_locations WHERE updated_at > NOW() - INTERVAL '10 minutes') as recent_locations,
    (SELECT COUNT(*) FROM trip_requests WHERE pickup_time_preference = 'asap') as asap_trips,
    (SELECT COUNT(*) FROM trip_requests WHERE status = 'pending') as pending_trips;

-- Show specific issues found
SELECT 
    '🚨 POTENTIAL ISSUES IDENTIFIED:' as issues,
    CASE 
        WHEN (SELECT COUNT(*) FROM driver_profiles WHERE is_available = true AND is_approved = true) = 0 
        THEN 'NO AVAILABLE APPROVED DRIVERS'
        WHEN (SELECT COUNT(*) FROM driver_locations) = 0 
        THEN 'NO DRIVER LOCATION DATA'
        WHEN (SELECT COUNT(*) FROM driver_locations WHERE updated_at > NOW() - INTERVAL '10 minutes') = 0
        THEN 'ALL LOCATION DATA IS OUTDATED'
        ELSE 'BASIC DATA LOOKS OK - CHECK FUNCTION LOGIC'
    END as main_issue;
