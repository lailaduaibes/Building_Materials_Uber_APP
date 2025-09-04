-- 🧪 SIMPLE TEST: Create trip and verify queue vs real-time integration

-- First, let's see what drivers are actually available right now
SELECT 
    '=== CURRENT DRIVER AVAILABILITY STATUS ===' as section,
    COUNT(*) as total_drivers,
    COUNT(CASE WHEN is_available = true THEN 1 END) as available_drivers,
    COUNT(CASE WHEN is_approved = true THEN 1 END) as approved_drivers,
    COUNT(CASE WHEN is_available = true AND is_approved = true THEN 1 END) as available_and_approved,
    COUNT(CASE WHEN is_available = true AND status = 'approved' THEN 1 END) as available_and_status_approved
FROM driver_profiles;

-- Show the specific drivers and their status
SELECT 
    '=== SPECIFIC DRIVERS STATUS ===' as section,
    user_id,
    CONCAT(first_name, ' ', last_name) as name,
    is_available,
    is_approved, 
    status,
    approval_status,
    phone
FROM driver_profiles
ORDER BY updated_at DESC;

-- Test what happens when we call start_asap_matching manually
-- (This will help us see the exact error/result)
DO $$
DECLARE
    test_trip_id UUID;
    matching_result RECORD;
BEGIN
    -- Create a simple test trip
    INSERT INTO trip_requests (
        customer_id,
        pickup_address,
        pickup_latitude,
        pickup_longitude,
        delivery_address,
        delivery_latitude,
        delivery_longitude,
        material_type,
        pickup_time_preference,
        status,
        quoted_price
    ) VALUES (
        (SELECT id FROM auth.users WHERE email LIKE '%@%' LIMIT 1), -- First user as customer
        'Test Pickup Location',
        24.4539, -- Dubai coordinates  
        54.3773,
        'Test Delivery Location',
        24.4639,
        54.3873,
        'Sand',
        'asap',
        'pending',
        100.00
    ) RETURNING id INTO test_trip_id;

    RAISE NOTICE '✅ Created test trip: %', test_trip_id;

    -- Now test start_asap_matching function
    BEGIN
        SELECT * INTO matching_result FROM start_asap_matching(test_trip_id);
        RAISE NOTICE '📊 start_asap_matching result: %', matching_result;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ start_asap_matching failed: %', SQLERRM;
    END;

    -- Check what happened to the trip
    SELECT 
        '=== TRIP AFTER MATCHING ATTEMPT ===' as section,
        id,
        status,
        assigned_driver_id,
        created_at
    FROM trip_requests 
    WHERE id = test_trip_id;

    -- Check if queue entry was created
    SELECT 
        '=== QUEUE ENTRY CHECK ===' as section,
        trip_request_id,
        driver_id,
        queue_position,
        status,
        created_at
    FROM asap_driver_queue 
    WHERE trip_request_id = test_trip_id;

    -- Clean up test trip
    DELETE FROM trip_requests WHERE id = test_trip_id;
    DELETE FROM asap_driver_queue WHERE trip_request_id = test_trip_id;
    
    RAISE NOTICE '🧹 Test trip cleaned up';
END $$;

-- Final diagnostic: Check if the issue is with specific criteria
SELECT 
    '=== FINAL DIAGNOSIS ===' as section,
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM driver_profiles WHERE is_available = true) 
        THEN '❌ NO DRIVERS SET AS AVAILABLE'
        WHEN NOT EXISTS (SELECT 1 FROM driver_profiles WHERE is_approved = true) 
        THEN '❌ NO DRIVERS ARE APPROVED'
        WHEN NOT EXISTS (SELECT 1 FROM driver_profiles WHERE is_available = true AND is_approved = true) 
        THEN '❌ NO DRIVERS ARE BOTH AVAILABLE AND APPROVED'
        WHEN NOT EXISTS (
            SELECT 1 FROM auth.users u 
            JOIN driver_profiles dp ON u.id = dp.user_id 
            WHERE dp.is_available = true AND dp.is_approved = true 
            AND u.current_latitude IS NOT NULL
        ) 
        THEN '❌ AVAILABLE DRIVERS HAVE NO LOCATION DATA'
        ELSE '✅ DRIVERS SHOULD BE FOUND - CHECK FUNCTION LOGIC'
    END as diagnosis;

SELECT '🎯 Run this to test the complete flow and identify the exact issue!' as conclusion;
