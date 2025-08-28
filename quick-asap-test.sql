-- Quick ASAP Test with Your Real Data
-- Trip: cd51074d-f89b-4142-b175-b49d4ad970c2

-- 1. Check current trip status
SELECT 
    '=== CURRENT TRIP STATUS ===' as section,
    id,
    status,
    pickup_time_preference,
    material_type,
    load_description,
    created_at
FROM trip_requests 
WHERE id = 'cd51074d-f89b-4142-b175-b49d4ad970c2';

-- 2. Check available drivers
SELECT 
    '=== AVAILABLE DRIVERS ===' as section,
    COUNT(*) as total_available_drivers
FROM driver_profiles 
WHERE is_available = true 
AND is_approved = true 
AND status != 'offline';

-- 3. Check driver locations
SELECT 
    '=== DRIVER LOCATIONS ===' as section,
    COUNT(*) as total_locations,
    COUNT(CASE WHEN updated_at > NOW() - INTERVAL '10 minutes' THEN 1 END) as recent_locations
FROM driver_locations;

-- 4. Test proximity search around your pickup location
SELECT 
    '=== NEARBY DRIVERS TEST ===' as section,
    *
FROM find_nearby_available_drivers(
    32.387003, -- your pickup latitude
    35.324645, -- your pickup longitude  
    50,        -- 50km radius for testing
    10         -- 10 minutes for location freshness
) LIMIT 3;

-- 5. START ASAP MATCHING (This will create driver requests!)
SELECT 
    '=== STARTING ASAP MATCHING ===' as section,
    start_asap_matching('cd51074d-f89b-4142-b175-b49d4ad970c2') as result;

-- 6. Check what driver requests were created
SELECT 
    '=== DRIVER REQUESTS CREATED ===' as section,
    id,
    original_trip_id,
    assigned_driver_id,
    status,
    acceptance_deadline,
    EXTRACT(EPOCH FROM (acceptance_deadline - NOW()))::INTEGER as seconds_remaining
FROM trip_requests 
WHERE original_trip_id = 'cd51074d-f89b-4142-b175-b49d4ad970c2'
ORDER BY driver_request_sent_at DESC;

-- 7. Check updated original trip status
SELECT 
    '=== ORIGINAL TRIP UPDATED ===' as section,
    id,
    status,
    matching_started_at,
    assigned_driver_id
FROM trip_requests 
WHERE id = 'cd51074d-f89b-4142-b175-b49d4ad970c2';

-- 8. View pending requests (if any)
SELECT 
    '=== PENDING DRIVER REQUESTS ===' as section,
    COUNT(*) as pending_count
FROM pending_driver_requests
WHERE original_trip_id = 'cd51074d-f89b-4142-b175-b49d4ad970c2';

SELECT 'ASAP Test Complete! Check results above.' as final_message;
