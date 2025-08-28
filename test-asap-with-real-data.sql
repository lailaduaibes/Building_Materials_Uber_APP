-- Test ASAP Matching System with YOUR Real Data
-- This script uses your existing trip: cd51074d-f89b-4142-b175-b49d4ad970c2

-- 1. Show current status of your ASAP trip
SELECT 
    'Current ASAP Trip Status' as test_step,
    id,
    status,
    pickup_time_preference,
    material_type,
    load_description,
    pickup_address->>'formatted_address' as pickup,
    delivery_address->>'formatted_address' as delivery,
    created_at
FROM trip_requests 
WHERE id = 'cd51074d-f89b-4142-b175-b49d4ad970c2';

-- 2. Check if we have available drivers
SELECT 
    'Available Drivers Check' as test_step,
    user_id,
    first_name,
    last_name,
    is_available,
    is_approved,
    status,
    rating,
    total_trips
FROM driver_profiles 
WHERE is_available = true 
AND is_approved = true 
AND status != 'offline'
LIMIT 5;

-- 3. Check if we have any driver locations (needed for proximity matching)
SELECT 
    'Driver Locations Check' as test_step,
    COUNT(*) as total_locations,
    COUNT(CASE WHEN updated_at > NOW() - INTERVAL '10 minutes' THEN 1 END) as recent_locations
FROM driver_locations;

-- 4. Test the proximity search function
SELECT 
    'Nearby Drivers Test' as test_step,
    *
FROM find_nearby_available_drivers(
    32.387003, -- pickup latitude from your trip
    35.324645, -- pickup longitude from your trip  
    50,        -- 50km radius (larger for testing)
    null       -- no specific truck type required
);

-- 5. START THE ACTUAL ASAP MATCHING TEST
-- This will create driver-specific requests with 15s deadlines
SELECT 
    'ASAP Matching Test' as test_step,
    start_asap_matching('cd51074d-f89b-4142-b175-b49d4ad970c2') as matching_result;

-- 6. Check what driver-specific requests were created
SELECT 
    'Driver Requests Created' as test_step,
    id,
    original_trip_id,
    assigned_driver_id,
    status,
    acceptance_deadline,
    EXTRACT(EPOCH FROM (acceptance_deadline - NOW()))::INTEGER as seconds_remaining,
    driver_request_sent_at
FROM trip_requests 
WHERE original_trip_id = 'cd51074d-f89b-4142-b175-b49d4ad970c2'
ORDER BY driver_request_sent_at DESC;

-- 7. Check the status of the original trip
SELECT 
    'Original Trip Updated Status' as test_step,
    id,
    status,
    matching_started_at,
    matched_at,
    assigned_driver_id
FROM trip_requests 
WHERE id = 'cd51074d-f89b-4142-b175-b49d4ad970c2';

-- 8. Show all pending requests view
SELECT 
    'Pending Requests View' as test_step,
    *
FROM pending_driver_requests
WHERE original_trip_id = 'cd51074d-f89b-4142-b175-b49d4ad970c2'
   OR id = 'cd51074d-f89b-4142-b175-b49d4ad970c2';

-- 9. SIMULATE DRIVER ACCEPTANCE (uncomment to test)
-- Get the first pending request and simulate acceptance
/*
WITH first_pending AS (
    SELECT id, assigned_driver_id 
    FROM trip_requests 
    WHERE original_trip_id = 'cd51074d-f89b-4142-b175-b49d4ad970c2' 
    AND status = 'pending' 
    LIMIT 1
)
SELECT 
    'Driver Acceptance Test' as test_step,
    accept_trip_request(fp.id, fp.assigned_driver_id) as acceptance_result
FROM first_pending fp;
*/

-- 10. CLEANUP TEST (run this to reset for another test)
/*
-- Reset the original trip to pending status
UPDATE trip_requests 
SET status = 'pending',
    matching_started_at = NULL,
    matched_at = NULL,
    assigned_driver_id = NULL
WHERE id = 'cd51074d-f89b-4142-b175-b49d4ad970c2';

-- Remove any driver-specific requests
DELETE FROM trip_requests 
WHERE original_trip_id = 'cd51074d-f89b-4142-b175-b49d4ad970c2';
*/

-- 11. Check system health
SELECT 
    'System Health Check' as test_step,
    (SELECT COUNT(*) FROM trip_requests WHERE status = 'pending' AND pickup_time_preference = 'asap') as pending_asap_trips,
    (SELECT COUNT(*) FROM trip_requests WHERE status = 'matching') as currently_matching,
    (SELECT COUNT(*) FROM driver_profiles WHERE is_available = true AND is_approved = true) as available_drivers,
    (SELECT COUNT(*) FROM driver_locations WHERE updated_at > NOW() - INTERVAL '5 minutes') as active_driver_locations;

-- Expected Test Results:
-- ✅ Step 1: Shows your existing ASAP trip with status 'pending'
-- ✅ Step 2: Lists available approved drivers
-- ✅ Step 3: Shows driver location data exists
-- ✅ Step 4: Shows nearby drivers within 50km of pickup
-- ✅ Step 5: Creates driver-specific requests with 15s deadlines
-- ✅ Step 6: Shows the new driver requests with countdown timers
-- ✅ Step 7: Original trip status changed to 'matching'
-- ✅ Step 8: Pending requests view shows active requests
-- ✅ Step 11: System health metrics

NOTIFY('ASAP Matching Test Complete! Check results above.');
