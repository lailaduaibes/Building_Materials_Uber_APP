-- Debug ASAP System: Manually trigger matching and check results

-- Step 1: Check if the trip was created
SELECT 
    id, 
    status, 
    assigned_driver_id, 
    pickup_time_preference,
    created_at,
    acceptance_deadline
FROM trip_requests 
WHERE pickup_time_preference = 'asap' 
AND status = 'pending'
ORDER BY created_at DESC 
LIMIT 5;

-- Step 2: Check available drivers
SELECT 
    dp.user_id,
    dp.first_name,
    dp.last_name,
    dp.status,
    dp.is_available,
    dp.is_approved,
    u.current_latitude,
    u.current_longitude,
    u.last_location_update
FROM driver_profiles dp
JOIN users u ON dp.user_id = u.id
WHERE dp.is_available = true 
AND dp.is_approved = true 
AND dp.status = 'online'
ORDER BY u.last_location_update DESC;

-- Step 3: Get the latest ASAP trip ID (replace with actual ID from Step 1)
-- SELECT start_asap_matching_uber_style('YOUR_TRIP_ID_HERE');

-- Step 4: After running the function, check if trip got assigned
SELECT 
    id, 
    status, 
    assigned_driver_id, 
    pickup_time_preference,
    acceptance_deadline,
    load_description -- Contains driver queue info
FROM trip_requests 
WHERE pickup_time_preference = 'asap' 
ORDER BY created_at DESC 
LIMIT 3;
