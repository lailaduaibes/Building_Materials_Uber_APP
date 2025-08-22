-- DEEP DEBUG: If Laila exists in users table, why is FK failing?
-- Let's check the exact data being used in the trigger

-- 1. Verify Laila's exact user_id matches between tables
SELECT 
    'USER_ID_VERIFICATION' as check_type,
    dp.user_id as driver_profile_user_id,
    u.id as public_users_id,
    au.id as auth_users_id,
    dp.first_name,
    u.first_name as public_first_name,
    au.email as auth_email
FROM driver_profiles dp
LEFT JOIN users u ON dp.user_id = u.id
LEFT JOIN auth.users au ON dp.user_id = au.id
WHERE dp.first_name ILIKE '%Laila%';

-- 2. Test the exact INSERT that's failing by simulating it
-- (This will show us the exact error)
SELECT 
    'SIMULATING_TRUCK_INSERT' as check_type,
    dp.user_id,
    dp.vehicle_plate,
    dp.selected_truck_type_id,
    CASE 
        WHEN dp.user_id IS NULL THEN 'USER_ID_IS_NULL'
        WHEN NOT EXISTS(SELECT 1 FROM users WHERE id = dp.user_id) THEN 'USER_NOT_IN_PUBLIC_USERS'
        WHEN dp.vehicle_plate IS NULL THEN 'VEHICLE_PLATE_IS_NULL'
        WHEN dp.selected_truck_type_id IS NULL THEN 'NO_TRUCK_TYPE_SELECTED'
        ELSE 'DATA_LOOKS_GOOD'
    END as validation_result
FROM driver_profiles dp
WHERE dp.first_name ILIKE '%Laila%';

-- 3. Check if there are any triggers or constraints that might interfere
SELECT 
    'TRUCK_CONSTRAINTS' as check_type,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'trucks' 
AND constraint_type IN ('FOREIGN KEY', 'CHECK');

-- 4. Try a minimal truck insert to isolate the problem
-- (Comment this out if you don't want to actually insert)
/*
INSERT INTO trucks (
    truck_type_id,
    license_plate,
    make,
    model,
    max_payload,
    max_volume,
    current_driver_id,
    is_available,
    is_active
) VALUES (
    (SELECT id FROM truck_types WHERE name = 'Small Truck' LIMIT 1),
    'TEST-PLATE',
    'Test',
    'Model',
    5.0,
    10.0,
    '3a4e01cf-ade1-47d6-9a89-901ec04b8471', -- Laila's user_id
    true,
    true
);
*/
