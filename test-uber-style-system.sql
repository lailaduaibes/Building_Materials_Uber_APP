-- ====================================================================
-- VERIFICATION TESTS FOR UBER-STYLE ASAP SYSTEM
-- ====================================================================
-- Run these queries to verify the system is working correctly

-- Test 1: Verify functions were created
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_name LIKE '%uber_style%' 
ORDER BY routine_name;

-- Test 2: Find a recent trip to test with
SELECT 
    id,
    status,
    pickup_time_preference,
    assigned_driver_id,
    load_description,
    created_at
FROM trip_requests 
WHERE status = 'no_drivers_available' 
  AND pickup_time_preference = 'asap'
ORDER BY created_at DESC 
LIMIT 3;

-- Test 3: Reset one trip to test the system
-- (Replace TRIP_ID with an actual ID from Test 2 above)
/*
UPDATE trip_requests 
SET 
    status = 'pending', 
    assigned_driver_id = NULL, 
    acceptance_deadline = NULL,
    matching_started_at = NULL
WHERE id = 'PUT_ACTUAL_TRIP_ID_HERE';
*/

-- Test 4: Test the Uber-style matching function
-- (Replace TRIP_ID with the same ID from Test 3)
/*
SELECT * FROM start_asap_matching_uber_style('PUT_ACTUAL_TRIP_ID_HERE');
*/

-- Test 5: Check if the trip was properly assigned
-- (Replace TRIP_ID with the same ID)
/*
SELECT 
    id,
    status,
    assigned_driver_id,
    acceptance_deadline,
    load_description
FROM trip_requests 
WHERE id = 'PUT_ACTUAL_TRIP_ID_HERE';
*/

-- Test 6: Check if there are drivers with location data
SELECT 
    dp.user_id,
    dp.first_name,
    dp.last_name,
    dp.is_available,
    dp.is_approved,
    dp.status,
    u.current_latitude,
    u.current_longitude,
    u.last_location_update
FROM driver_profiles dp
JOIN users u ON dp.user_id = u.id
WHERE dp.is_available = true 
  AND dp.is_approved = true 
  AND dp.status = 'online'
ORDER BY u.last_location_update DESC NULLS LAST;

-- Test 7: Test find_nearby_available_drivers function
SELECT * FROM find_nearby_available_drivers(
    32.7767::DECIMAL,  -- Dallas coordinates
    -96.7970::DECIMAL,
    50,    -- max_distance_km_param
    1440,  -- min_updated_minutes_param (24 hours)
    NULL   -- required_truck_type_id_param
);

SELECT '🧪 TESTING INSTRUCTIONS:' as step,
       '1. Run Test 2 to find a trip ID' as instruction_1,
       '2. Replace TRIP_ID in Tests 3, 4, 5 with actual ID' as instruction_2,
       '3. Run Tests 3, 4, 5 in sequence' as instruction_3,
       '4. Check if assigned_driver_id is set in Test 5' as instruction_4;
