-- Complete ASAP test: Fix location, trigger matching, verify integration

-- Step 1: Update Driver Laila's location  
INSERT INTO driver_locations (driver_id, latitude, longitude, updated_at)
VALUES ('2bd7bd97-5cf9-431f-adfc-4ec4448be52c', 32.387000, 35.324000, NOW())
ON CONFLICT (driver_id) 
DO UPDATE SET 
    latitude = 32.387000,
    longitude = 35.324000,
    updated_at = NOW();

-- Step 2: Verify driver location is updated
SELECT 
    '📍 DRIVER LOCATION:' as status,
    driver_id,
    latitude,
    longitude,
    updated_at,
    EXTRACT(SECOND FROM (NOW() - updated_at)) as seconds_ago
FROM driver_locations 
WHERE driver_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

-- Step 3: Test proximity function
SELECT 
    '🔍 PROXIMITY TEST:' as test,
    driver_id,
    driver_name,
    distance_km,
    last_updated
FROM find_nearby_available_drivers(32.387000, 35.324000, 10, 60);

-- Step 4: Trigger ASAP matching for test trip
SELECT 
    '🚀 TRIGGERING ASAP:' as action,
    start_asap_matching('2d41ddaa-59d3-411c-b298-00b899d37af5') as result;

-- Step 5: Check if driver requests were created
SELECT 
    '🎯 DRIVER REQUESTS:' as info,
    COUNT(*) as count,
    array_agg(assigned_driver_id) as drivers
FROM trip_requests 
WHERE original_trip_id = '2d41ddaa-59d3-411c-b298-00b899d37af5';

-- Step 6: Show driver-specific requests with deadlines
SELECT 
    '⏰ ACTIVE REQUESTS:' as type,
    tr.id,
    tr.assigned_driver_id,
    dp.first_name || ' ' || dp.last_name as driver,
    tr.acceptance_deadline,
    EXTRACT(SECOND FROM (tr.acceptance_deadline - NOW())) as seconds_left,
    CASE 
        WHEN tr.acceptance_deadline > NOW() THEN '🟢 ACTIVE - Driver should see popup!'
        ELSE '🔴 EXPIRED'
    END as status
FROM trip_requests tr
LEFT JOIN driver_profiles dp ON tr.assigned_driver_id = dp.user_id
WHERE tr.original_trip_id = '2d41ddaa-59d3-411c-b298-00b899d37af5'
ORDER BY tr.created_at;

SELECT '🎉 Complete! Driver should now see ASAP popup with Accept/Decline buttons!' as final_message;
