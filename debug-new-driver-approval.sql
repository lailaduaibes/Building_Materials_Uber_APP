-- =============================================================================
-- DEBUG NEW DRIVER APPROVAL - drivetest1412@gmail.com
-- =============================================================================

-- 1. Find the new driver's user ID and profile
SELECT 
    au.id as user_id,
    au.email,
    dp.first_name,
    dp.last_name,
    dp.vehicle_plate,
    dp.vehicle_model,
    dp.is_approved,
    dp.approval_status,
    dp.truck_added_to_fleet,
    dp.created_at,
    dp.updated_at
FROM auth.users au
JOIN driver_profiles dp ON dp.user_id = au.id
WHERE au.email = 'drivetest1412@gmail.com';

-- 2. Check if truck was added to fleet
SELECT 
    t.id,
    t.license_plate,
    t.make,
    t.model,
    t.current_driver_id,
    t.is_available,
    t.is_active,
    t.truck_type_id,
    t.created_at,
    t.updated_at
FROM trucks t
WHERE t.current_driver_id IN (
    SELECT id FROM auth.users WHERE email = 'drivetest1412@gmail.com'
);

-- 3. Check what status the app logic should calculate
SELECT 
    dp.approval_status,
    dp.is_approved,
    t.is_available,
    t.is_active,
    CASE 
        WHEN dp.approval_status = 'approved' AND dp.is_approved = true AND t.is_available = true THEN 'Available'
        WHEN dp.approval_status = 'approved' AND dp.is_approved = true AND t.is_available = false THEN 'In Use'
        WHEN dp.approval_status = 'pending' OR dp.is_approved = false THEN 'Pending'
        ELSE 'Unknown'
    END as expected_app_status
FROM driver_profiles dp
LEFT JOIN trucks t ON t.current_driver_id = dp.user_id
WHERE dp.user_id IN (
    SELECT id FROM auth.users WHERE email = 'drivetest1412@gmail.com'
);

-- 4. Check if there are any active trips
SELECT 
    tr.id,
    tr.status,
    tr.assigned_driver_id,
    tr.assigned_truck_id,
    tr.created_at
FROM trip_requests tr
WHERE tr.assigned_driver_id IN (
    SELECT id FROM auth.users WHERE email = 'drivetest1412@gmail.com'
)
ORDER BY tr.created_at DESC
LIMIT 5;
