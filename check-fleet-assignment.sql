-- Check trucks table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'trucks'
ORDER BY ordinal_position;

-- Check what driver assignments exist in trucks table
SELECT 
    id,
    license_plate,
    make,
    model,
    current_driver_id,
    is_available,
    is_active
FROM trucks 
WHERE current_driver_id IS NOT NULL
LIMIT 10;

-- Check driver_profiles table structure first
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'driver_profiles'
ORDER BY ordinal_position;

-- Check driver_profiles data (without email since it doesn't exist)
SELECT 
    user_id,
    first_name,
    last_name,
    phone,
    current_truck_id,
    vehicle_plate,
    vehicle_model,
    truck_added_to_fleet
FROM driver_profiles 
LIMIT 5;

-- Check if there's a mismatch between driver profiles and truck assignments
SELECT 
    dp.user_id,
    dp.first_name,
    dp.last_name,
    dp.phone,
    dp.current_truck_id as dp_truck_id,
    dp.vehicle_plate as dp_vehicle_plate,
    dp.vehicle_model as dp_vehicle_model,
    dp.truck_added_to_fleet,
    t.id as trucks_table_id,
    t.license_plate as trucks_license_plate,
    t.make,
    t.model,
    t.current_driver_id
FROM driver_profiles dp
LEFT JOIN trucks t ON dp.user_id = t.current_driver_id
WHERE dp.user_id IS NOT NULL
LIMIT 10;

-- Check which user_ids exist in driver_profiles vs which are assigned in trucks
SELECT 'driver_profiles' as source, user_id as id FROM driver_profiles WHERE user_id IS NOT NULL
UNION ALL  
SELECT 'trucks_assigned' as source, current_driver_id as id FROM trucks WHERE current_driver_id IS NOT NULL
ORDER BY source, id;
