-- Debug customer data in trip_requests
-- Check if trip_requests have valid customer_id and if they link to users properly

-- 1. Check sample trip_requests and their customer_id values
SELECT 
    id,
    customer_id,
    status,
    pickup_address,
    created_at
FROM trip_requests 
WHERE status IN ('pending', 'assigned', 'accepted')
ORDER BY created_at DESC
LIMIT 10;

-- 2. Check if customer_id values exist in users table
SELECT 
    tr.id as trip_id,
    tr.customer_id,
    tr.status,
    u.id as user_id,
    u.first_name,
    u.last_name,
    u.phone,
    u.email,
    u.role
FROM trip_requests tr
LEFT JOIN users u ON tr.customer_id = u.id
WHERE tr.status IN ('pending', 'assigned', 'accepted')
ORDER BY tr.created_at DESC
LIMIT 10;

-- 3. Check for any trips where customer_id doesn't match users
SELECT 
    COUNT(*) as total_trips,
    COUNT(u.id) as trips_with_valid_customer,
    COUNT(*) - COUNT(u.id) as trips_with_missing_customer
FROM trip_requests tr
LEFT JOIN users u ON tr.customer_id = u.id
WHERE tr.status IN ('pending', 'assigned', 'accepted');

-- 4. Test the exact query that the app is using
SELECT 
    tr.id,
    tr.pickup_latitude,
    tr.pickup_longitude,
    tr.pickup_address,
    tr.delivery_latitude,
    tr.delivery_longitude,
    tr.delivery_address,
    tr.material_type,
    tr.load_description,
    tr.estimated_weight_tons,
    tr.estimated_volume_m3,
    tr.quoted_price,
    tr.estimated_distance_km,
    tr.estimated_duration_minutes,
    tr.special_requirements,
    tr.requires_crane,
    tr.requires_hydraulic_lift,
    tr.pickup_time_preference,
    tr.scheduled_pickup_time,
    tr.created_at,
    tr.customer_id,
    tr.status,
    tr.assigned_driver_id,
    users.first_name,
    users.last_name,
    users.phone
FROM trip_requests tr
LEFT JOIN users ON tr.customer_id = users.id
WHERE tr.status = 'pending'
  AND tr.assigned_driver_id IS NULL
ORDER BY tr.created_at DESC
LIMIT 5;
