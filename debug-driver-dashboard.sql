-- Debug why the test trip isn't showing on driver dashboard

-- 1. Check if the test trip was created
SELECT 
    '=== TEST TRIP STATUS ===' as section,
    id,
    status,
    pickup_time_preference,
    material_type,
    load_description,
    required_truck_type_id,
    created_at,
    matching_started_at
FROM trip_requests 
WHERE load_description LIKE '%TEST ASAP Trip - Flatbed Compatible%'
ORDER BY created_at DESC;

-- 2. Check if ASAP matching was triggered
SELECT 
    '=== DRIVER-SPECIFIC REQUESTS ===' as section,
    id,
    original_trip_id,
    assigned_driver_id,
    status,
    acceptance_deadline,
    EXTRACT(EPOCH FROM (acceptance_deadline - NOW()))::INTEGER as seconds_remaining,
    driver_request_sent_at
FROM trip_requests 
WHERE original_trip_id IN (
    SELECT id FROM trip_requests 
    WHERE load_description LIKE '%TEST ASAP Trip - Flatbed Compatible%'
);

-- 3. Check your driver availability
SELECT 
    '=== YOUR DRIVER AVAILABILITY ===' as section,
    user_id,
    first_name || ' ' || last_name as driver_name,
    is_available,
    is_approved,
    status,
    current_truck_id,
    selected_truck_type_id
FROM driver_profiles 
WHERE is_approved = true
LIMIT 5;

-- 4. Check driver locations (needed for proximity matching)
SELECT 
    '=== DRIVER LOCATIONS ===' as section,
    driver_id,
    latitude,
    longitude,
    updated_at,
    AGE(NOW(), updated_at) as location_age
FROM driver_locations 
ORDER BY updated_at DESC
LIMIT 5;

-- 5. Test proximity search manually
SELECT 
    '=== MANUAL PROXIMITY TEST ===' as section,
    *
FROM find_nearby_available_drivers(
    32.387000, -- test trip pickup lat
    35.324000, -- test trip pickup lng
    50,        -- 50km radius
    60         -- 60 minutes location freshness
);

-- 6. Check what your driver app should query
SELECT 
    '=== WHAT DRIVER APP SHOULD SEE ===' as section,
    tr.id,
    tr.status,
    tr.pickup_time_preference,
    tr.material_type,
    tr.load_description,
    tr.assigned_driver_id,
    tr.acceptance_deadline,
    CASE 
        WHEN tr.acceptance_deadline IS NOT NULL AND tr.acceptance_deadline > NOW() 
        THEN EXTRACT(EPOCH FROM (tr.acceptance_deadline - NOW()))::INTEGER 
        ELSE NULL 
    END as seconds_remaining
FROM trip_requests tr
WHERE (
    -- Regular pending trips (scheduled)
    (tr.status = 'pending' AND tr.pickup_time_preference = 'scheduled')
    OR
    -- Driver-specific ASAP requests
    (tr.status = 'pending' AND tr.assigned_driver_id IS NOT NULL AND tr.acceptance_deadline IS NOT NULL)
)
ORDER BY tr.created_at DESC;

-- 7. Check pending driver requests view
SELECT 
    '=== PENDING DRIVER REQUESTS VIEW ===' as section,
    *
FROM pending_driver_requests
LIMIT 10;

SELECT 'Debug complete - check sections above for issues' as final_message;
