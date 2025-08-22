-- Check if there are any pending trip requests in the database
SELECT 
    COUNT(*) as total_trips,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_trips,
    COUNT(CASE WHEN status = 'pending' AND assigned_driver_id IS NULL THEN 1 END) as available_trips
FROM trip_requests;

-- Show details of available trips
SELECT 
    id,
    pickup_address,
    pickup_latitude,
    pickup_longitude,
    material_type,
    quoted_price,
    status,
    assigned_driver_id,
    created_at
FROM trip_requests 
WHERE status = 'pending' 
AND assigned_driver_id IS NULL
ORDER BY created_at DESC
LIMIT 10;
