-- Debug: Check if ASAP trips are getting assigned after matching function is called

-- Check the latest ASAP trips and their assignment status
SELECT 
    id,
    status,
    assigned_driver_id,
    pickup_time_preference,
    acceptance_deadline,
    matching_started_at,
    created_at,
    load_description -- This contains the driver queue info
FROM trip_requests 
WHERE pickup_time_preference = 'asap' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check what drivers are available for matching
SELECT 
    dp.user_id,
    dp.first_name,
    dp.last_name,
    dp.status,
    dp.is_available,
    dp.is_approved,
    u.current_latitude,
    u.current_longitude,
    u.last_location_update,
    CASE 
        WHEN u.current_latitude IS NULL OR u.current_longitude IS NULL THEN 'NO LOCATION'
        WHEN u.last_location_update < NOW() - INTERVAL '1 hour' THEN 'STALE LOCATION'
        WHEN dp.status != 'online' THEN 'NOT ONLINE'
        WHEN dp.is_available = false THEN 'NOT AVAILABLE'
        WHEN dp.is_approved = false THEN 'NOT APPROVED'
        ELSE 'AVAILABLE'
    END as availability_status
FROM driver_profiles dp
LEFT JOIN users u ON dp.user_id = u.id
ORDER BY u.last_location_update DESC NULLS LAST
LIMIT 10;
