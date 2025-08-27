-- =============================================================================
-- TEST COMPLETE TRIP TRACKING FUNCTIONALITY - CORRECTED VERSION
-- =============================================================================

-- Step 1: Check the constraint values for trip_tracking status
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name = 'trip_tracking_status_check';

-- Step 2: Test inserting with the CORRECT status values
INSERT INTO trip_tracking (trip_id, driver_id, driver_latitude, driver_longitude, status)
VALUES (
    '15602341-c486-4855-9951-237917a8f849',
    '2bd7bd97-5cf9-431f-adfc-4ec4448be52c',
    32.387637,
    35.318435,
    'en_route_delivery'  -- This should work with the database constraint
);

-- Step 3: Verify the insertion worked
SELECT 
    id,
    trip_id,
    driver_id,
    driver_latitude,
    driver_longitude,
    status,
    created_at
FROM trip_tracking
WHERE trip_id = '15602341-c486-4855-9951-237917a8f849'
AND status = 'en_route_delivery'
ORDER BY created_at DESC
LIMIT 1;

-- Step 4: Test notification insertion for trip start (should work)
INSERT INTO notifications (
    user_id,
    trip_id,
    type,
    title,
    message,
    status
) VALUES (
    'd3f0bc5f-2b1a-4c8d-9e6a-1f2b3c4d5e6f',  -- customer user_id
    '15602341-c486-4855-9951-237917a8f849',
    'status_update',
    'Trip Started',
    'Your driver is on the way to deliver your materials',
    'sent'
);

-- Step 5: Verify notification was created
SELECT 
    id,
    user_id,
    trip_id,
    type,
    title,
    message,
    status,
    created_at
FROM notifications
WHERE trip_id = '15602341-c486-4855-9951-237917a8f849'
AND type = 'status_update'
ORDER BY created_at DESC
LIMIT 1;

-- Step 6: Clean up test data
DELETE FROM trip_tracking 
WHERE trip_id = '15602341-c486-4855-9951-237917a8f849'
AND driver_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

DELETE FROM notifications 
WHERE trip_id = '15602341-c486-4855-9951-237917a8f849'
AND type = 'status_update';

-- Step 7: Final verification
SELECT 
    'All test data cleaned up' as status,
    COUNT(*) as remaining_records
FROM trip_tracking
WHERE trip_id = '15602341-c486-4855-9951-237917a8f849';

-- Step 8: Show valid status values for reference
SELECT 
    'Valid trip_tracking status values:' as info,
    unnest(ARRAY['assigned', 'en_route_pickup', 'at_pickup', 'loaded', 'en_route_delivery', 'delivered']) as valid_status;
