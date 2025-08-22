-- FINAL TEST: Direct truck insert to isolate the exact FK issue
-- Laila's data is perfect, so let's test the exact insert that's failing

-- 1. First, let's verify Laila's user_id exists in the users table one more time
SELECT 
    'FINAL_USER_VERIFICATION' as test,
    id,
    first_name,
    role
FROM users 
WHERE id = '3a4e01cf-ade1-47d6-9a89-901ec04b8471';

-- 2. Get a valid truck_type_id for the test
SELECT 
    'TRUCK_TYPE_CHECK' as test,
    id,
    name
FROM truck_types 
WHERE name = 'Small Truck' 
LIMIT 1;

-- 3. Test the exact INSERT that the trigger is trying to do
-- This will give us the EXACT error message
INSERT INTO trucks (
    truck_type_id,
    license_plate,
    make,
    model,
    year,
    max_payload,
    max_volume,
    current_driver_id,
    is_available,
    is_active
) VALUES (
    (SELECT id FROM truck_types WHERE name = 'Small Truck' LIMIT 1),
    'B12738',
    'Ford',
    'Transit',
    2020,
    5.0,
    15.0,
    '3a4e01cf-ade1-47d6-9a89-901ec04b8471', -- Laila's exact user_id
    true,
    true
);

-- 4. If the insert works, clean it up
-- DELETE FROM trucks WHERE license_plate = 'B12738' AND make = 'Ford';
