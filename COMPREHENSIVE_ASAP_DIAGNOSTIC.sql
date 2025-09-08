-- 🔍 COMPREHENSIVE ASAP SYSTEM DIAGNOSTIC
-- This script tests the entire ASAP flow end-to-end

-- Test 1: Check if all required functions exist
SELECT '=== FUNCTION EXISTENCE CHECK ===' as test_section;

SELECT 
    routine_name, 
    routine_type,
    CASE 
        WHEN routine_name = 'start_asap_matching_uber_style' THEN '✅ CUSTOMER APP CALLS THIS'
        WHEN routine_name = 'start_asap_matching' THEN '✅ TRIGGER CALLS THIS'
        WHEN routine_name = 'decline_trip_request' THEN '✅ DRIVER APP CALLS THIS'
        WHEN routine_name = 'cleanup_expired_trip_requests' THEN '✅ DRIVER APP CALLS THIS'
        WHEN routine_name = 'trigger_asap_matching' THEN '✅ DATABASE TRIGGER'
        ELSE '📋 Supporting function'
    END as function_role
FROM information_schema.routines 
WHERE routine_name IN (
    'start_asap_matching_uber_style',
    'start_asap_matching', 
    'decline_trip_request',
    'cleanup_expired_trip_requests',
    'trigger_asap_matching',
    'find_nearby_available_drivers'
)
ORDER BY routine_name;

-- Test 2: Check if ASAP trigger exists
SELECT '=== TRIGGER EXISTENCE CHECK ===' as test_section;

SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    trigger_schema
FROM information_schema.triggers 
WHERE trigger_name LIKE '%asap%' OR trigger_name LIKE '%trip%';

-- Test 3: Check recent ASAP trips and their status
SELECT '=== RECENT ASAP TRIPS ANALYSIS ===' as test_section;

SELECT 
    id,
    status,
    pickup_time_preference,
    assigned_driver_id,
    acceptance_deadline,
    matching_started_at,
    created_at,
    CASE 
        WHEN assigned_driver_id IS NOT NULL THEN '✅ ASSIGNED TO DRIVER'
        WHEN status = 'no_drivers_available' THEN '❌ NO DRIVERS FOUND'
        WHEN status = 'expired' THEN '⏰ EXPIRED/TIMEOUT'
        WHEN status = 'pending' AND assigned_driver_id IS NULL THEN '🚨 PENDING BUT NOT ASSIGNED'
        ELSE '❓ OTHER STATUS'
    END as assignment_status,
    CASE 
        WHEN load_description LIKE '%[QUEUE:%' THEN '✅ HAS DRIVER QUEUE'
        ELSE '❌ NO DRIVER QUEUE'
    END as queue_status
FROM trip_requests 
WHERE pickup_time_preference = 'asap' 
ORDER BY created_at DESC 
LIMIT 10;

-- Test 4: Check available drivers for testing
SELECT '=== AVAILABLE DRIVERS FOR TESTING ===' as test_section;

SELECT 
    dp.user_id,
    dp.driver_name,
    dp.phone_number,
    dp.approval_status,
    dl.latitude,
    dl.longitude,
    dl.updated_at,
    CASE 
        WHEN dp.approval_status = 'approved' AND dl.updated_at > NOW() - INTERVAL '1 hour' THEN '✅ AVAILABLE'
        WHEN dp.approval_status != 'approved' THEN '❌ NOT APPROVED'
        WHEN dl.updated_at <= NOW() - INTERVAL '1 hour' THEN '⏰ LOCATION STALE'
        ELSE '❓ UNKNOWN'
    END as availability_status
FROM driver_profiles dp
LEFT JOIN driver_locations dl ON dp.user_id = dl.driver_id
ORDER BY dl.updated_at DESC NULLS LAST
LIMIT 5;

-- Test 5: Simulate creating an ASAP trip (DRY RUN)
SELECT '=== ASAP TRIP CREATION SIMULATION ===' as test_section;

-- Find a test customer and location
WITH test_params AS (
    SELECT 
        '01234567-89ab-cdef-0123-456789abcdef'::UUID as test_customer_id,
        25.276987 as pickup_lat,  -- Dubai coordinates  
        55.296249 as pickup_lng,
        25.197197 as delivery_lat,
        55.274376 as delivery_lng
)
SELECT 
    'Test pickup location: ' || pickup_lat || ', ' || pickup_lng as simulation_info,
    (
        SELECT COUNT(*) 
        FROM find_nearby_available_drivers(pickup_lat, pickup_lng, 50, 1440, NULL)
    ) as nearby_drivers_count,
    CASE 
        WHEN (SELECT COUNT(*) FROM find_nearby_available_drivers(pickup_lat, pickup_lng, 50, 1440, NULL)) > 0 
        THEN '✅ DRIVERS AVAILABLE - ASAP TRIP SHOULD WORK'
        ELSE '❌ NO DRIVERS - ASAP TRIP WILL FAIL'
    END as expected_result
FROM test_params;

-- Instructions for manual testing
SELECT '=== MANUAL TESTING INSTRUCTIONS ===' as test_section,
       'To test the complete flow:' as step_1,
       '1. Create ASAP trip via Customer app' as step_2,
       '2. Check if trip gets assigned_driver_id' as step_3,
       '3. Check if driver sees trip in DriverService real-time subscription' as step_4,
       '4. Test decline to see if it moves to next driver' as step_5;
