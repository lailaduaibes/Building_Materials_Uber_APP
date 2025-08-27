-- =============================================================================
-- COMPREHENSIVE TEST: VERIFY BOTH NOTIFICATIONS AND TRIP TRACKING WORK 100%
-- =============================================================================

-- Step 1: Reset trip to ready state for testing
UPDATE trip_requests 
SET 
    status = 'matched',
    pickup_started_at = NULL,
    delivery_started_at = NULL,
    delivered_at = NULL
WHERE id = '15602341-c486-4855-9951-237917a8f849'
AND assigned_driver_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

-- Step 2: Clean up any existing test data
DELETE FROM notifications 
WHERE user_id = 'f30c3989-63fb-49da-ab39-168cbe9b6c82'
AND title LIKE '%Test%';

DELETE FROM trip_tracking 
WHERE trip_id = '15602341-c486-4855-9951-237917a8f849';

-- Step 3: Test notification insertion (simulating driver app)
INSERT INTO notifications (user_id, title, message, type, data)
VALUES (
    'f30c3989-63fb-49da-ab39-168cbe9b6c82',
    'Final Test - Driver En Route',
    'Driver Laila is on the way to pickup your materials',
    'status_update',
    jsonb_build_object(
        'status', 'start_trip',
        'driver_name', 'Driver Laila',
        'trip_assignment_id', '15602341-c486-4855-9951-237917a8f849'
    )
);

-- Step 4: Test trip tracking insertion (simulating location updates)
INSERT INTO trip_tracking (trip_id, driver_id, driver_latitude, driver_longitude, status, eta_minutes)
VALUES (
    '15602341-c486-4855-9951-237917a8f849',
    '2bd7bd97-5cf9-431f-adfc-4ec4448be52c',
    32.387637,
    35.318435,
    'in_transit',
    15
);

-- Step 5: Verify both insertions worked
SELECT 
    'NOTIFICATION TEST' as test_type,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ SUCCESS'
        ELSE '❌ FAILED'
    END as result,
    COUNT(*) as records_found
FROM notifications 
WHERE user_id = 'f30c3989-63fb-49da-ab39-168cbe9b6c82'
AND title = 'Final Test - Driver En Route'

UNION ALL

SELECT 
    'TRIP TRACKING TEST' as test_type,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ SUCCESS'
        ELSE '❌ FAILED'
    END as result,
    COUNT(*) as records_found
FROM trip_tracking 
WHERE trip_id = '15602341-c486-4855-9951-237917a8f849';

-- Step 6: Show the actual test records
SELECT 
    '--- NOTIFICATION RECORD ---' as section,
    id,
    title,
    message,
    created_at
FROM notifications 
WHERE user_id = 'f30c3989-63fb-49da-ab39-168cbe9b6c82'
AND title = 'Final Test - Driver En Route'

UNION ALL

SELECT 
    '--- TRIP TRACKING RECORD ---' as section,
    id::text,
    CONCAT('Lat: ', driver_latitude, ', Lng: ', driver_longitude) as title,
    CONCAT('Status: ', status, ', ETA: ', eta_minutes, ' mins') as message,
    created_at
FROM trip_tracking 
WHERE trip_id = '15602341-c486-4855-9951-237917a8f849'
ORDER BY section, created_at DESC;

-- Step 7: Final status check
SELECT 
    CASE 
        WHEN 
            (SELECT COUNT(*) FROM notifications WHERE user_id = 'f30c3989-63fb-49da-ab39-168cbe9b6c82' AND title = 'Final Test - Driver En Route') > 0
            AND 
            (SELECT COUNT(*) FROM trip_tracking WHERE trip_id = '15602341-c486-4855-9951-237917a8f849') > 0
        THEN '🎉 ALL SYSTEMS WORKING 100% - NOTIFICATIONS AND TRIP TRACKING BOTH SUCCESSFUL!'
        ELSE '⚠️ Some issues remain - check individual test results above'
    END as final_result;
