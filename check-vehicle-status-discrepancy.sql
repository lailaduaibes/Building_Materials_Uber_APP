-- Clean up test notification
DELETE FROM notifications WHERE title = 'Test Notification';

-- =============================================================================
-- CHECK VEHICLE STATUS DISCREPANCY FOR NEW DRIVER
-- =============================================================================

-- 1. Find the new driver's user ID
SELECT 
    id as user_id,
    email,
    created_at
FROM auth.users 
WHERE email = 'driverapp1412@gmail.com';

-- 2. Check driver profile vehicle info for new driver
SELECT 
    user_id,
    first_name,
    last_name,
    vehicle_plate,
    vehicle_model,
    truck_added_to_fleet,
    is_approved,
    approval_status
FROM driver_profiles 
WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'driverapp1412@gmail.com'
);

-- 3. Check fleet truck status for new driver
SELECT 
    id,
    license_plate,
    make,
    model,
    current_driver_id,
    is_available,
    is_active,
    truck_type_id
FROM trucks 
WHERE current_driver_id IN (
    SELECT id FROM auth.users WHERE email = 'driverapp1412@gmail.com'
);

-- 4. Check if there are any vehicle-related tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%vehicle%' OR table_name LIKE '%truck%');

-- 5. Check trip_requests table structure first
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'trip_requests' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Check active trips for new driver (using correct column name)
SELECT 
    id,
    assigned_driver_id,
    customer_id,
    status,
    pickup_location,
    delivery_location,
    created_at
FROM trip_requests 
WHERE assigned_driver_id IN (
    SELECT id FROM auth.users WHERE email = 'driverapp1412@gmail.com'
)
AND status NOT IN ('delivered', 'cancelled')
ORDER BY created_at DESC;
