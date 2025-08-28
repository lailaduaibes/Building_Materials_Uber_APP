-- Complete fix: Update driver location and trigger ASAP matching

-- Step 1: Update driver location to current time and position  
UPDATE driver_locations 
SET 
    latitude = 32.387000,  -- Same as pickup location for testing
    longitude = 35.324000,
    updated_at = NOW()
WHERE driver_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

-- If no location record exists, insert one
INSERT INTO driver_locations (driver_id, latitude, longitude, updated_at)
SELECT '2bd7bd97-5cf9-431f-adfc-4ec4448be52c', 32.387000, 35.324000, NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM driver_locations 
    WHERE driver_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c'
);

-- Step 2: Verify driver location is now fresh
SELECT 
    '📍 UPDATED DRIVER LOCATION:' as info,
    driver_id,
    latitude,
    longitude,
    updated_at,
    EXTRACT(SECOND FROM (NOW() - updated_at)) as seconds_ago
FROM driver_locations 
WHERE driver_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

-- Step 3: Test the proximity function with fresh location
SELECT 
    '🔍 PROXIMITY SEARCH TEST:' as info,
    driver_id,
    driver_name,
    distance_km,
    last_updated
FROM find_nearby_available_drivers(
    32.387000, -- test trip pickup lat
    35.324000, -- test trip pickup lng
    10,        -- 10km radius
    60         -- 60 minutes freshness
)
LIMIT 3;

-- Step 4: Now trigger ASAP matching for our test trip
SELECT 
    '🚀 STARTING ASAP MATCHING:' as action,
    start_asap_matching('2d41ddaa-59d3-411c-b298-00b899d37af5'::uuid) as result;

-- Step 5: Check if driver-specific requests were created
SELECT 
    '🎯 DRIVER REQUESTS AFTER MATCHING:' as info,
    tr.id,
    tr.assigned_driver_id,
    dp.first_name || ' ' || dp.last_name as driver_name,
    tr.status,
    tr.acceptance_deadline,
    CASE 
        WHEN tr.acceptance_deadline > NOW() THEN 'ACTIVE (Driver should see popup!)'
        ELSE 'EXPIRED'
    END as request_status,
    EXTRACT(SECOND FROM (tr.acceptance_deadline - NOW())) as seconds_remaining
FROM trip_requests tr
LEFT JOIN driver_profiles dp ON tr.assigned_driver_id = dp.user_id
WHERE tr.original_trip_id = '2d41ddaa-59d3-411c-b298-00b899d37af5'
ORDER BY tr.created_at DESC;

-- Step 6: Check main trip status
SELECT 
    '📊 MAIN TRIP STATUS AFTER MATCHING:' as info,
    id,
    status,
    matching_started_at,
    assigned_driver_id
FROM trip_requests 
WHERE id = '2d41ddaa-59d3-411c-b298-00b899d37af5';

SELECT '✅ ASAP matching triggered! Driver should now see popup with Accept/Decline!' as final_message;
