-- STEP 1: Check the Car Carrier truck details and its creation history
SELECT 
    t.id,
    t.license_plate,
    t.make,
    t.model,
    t.is_available,
    t.is_active,
    t.current_driver_id,
    tt.name as truck_type_name,
    t.created_at,
    t.updated_at,
    -- Check if there's a driver assigned
    CASE 
        WHEN t.current_driver_id IS NOT NULL THEN 'HAS DRIVER ASSIGNED'
        ELSE 'NO DRIVER ASSIGNED'
    END as driver_status
FROM trucks t
JOIN truck_types tt ON t.truck_type_id = tt.id
WHERE tt.name = 'Car Carrier';

-- STEP 2: Check if there's a driver profile with Car Carrier truck
SELECT 
    dp.id as driver_profile_id,
    dp.first_name,
    dp.last_name,
    dp.phone_number,
    dp.status as driver_status,
    dp.is_available as driver_available,
    dp.truck_info,
    dp.created_at as driver_created_at,
    dp.updated_at as driver_updated_at
FROM driver_profiles dp
WHERE dp.truck_info::text ILIKE '%car carrier%' 
   OR dp.truck_info::text ILIKE '%Car Carrier%'
   OR dp.truck_info->'truck_type' = '"Car Carrier"'
   OR dp.truck_info->'truckType' = '"Car Carrier"';

-- STEP 3: Check if truck was created by a trigger when driver was approved
-- Look for any triggers that might create trucks automatically
SELECT 
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'driver_profiles'
   OR event_object_table = 'trucks'
ORDER BY trigger_name;

-- STEP 4: Check the trigger function that creates trucks for drivers
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%driver%truck%' 
   OR routine_name LIKE '%auto%truck%'
   OR routine_name LIKE '%add%truck%'
ORDER BY routine_name;

-- STEP 5: Check driver-truck relationship
SELECT 
    dp.first_name,
    dp.last_name,
    dp.status as driver_status,
    dp.is_available as driver_is_available,
    dp.truck_info,
    t.license_plate,
    t.make,
    t.model,
    t.is_available as truck_is_available,
    t.is_active as truck_is_active,
    tt.name as truck_type_name
FROM driver_profiles dp
LEFT JOIN trucks t ON t.current_driver_id = (
    SELECT id FROM users WHERE phone = dp.phone_number LIMIT 1
)
LEFT JOIN truck_types tt ON t.truck_type_id = tt.id
WHERE dp.truck_info IS NOT NULL
ORDER BY dp.created_at DESC;
