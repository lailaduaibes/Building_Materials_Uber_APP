-- Fix Alaa's fleet assignment by adding their vehicle to the trucks table

-- First, let's check Alaa's current profile
SELECT 
    user_id,
    first_name,
    last_name,
    vehicle_plate,
    vehicle_model,
    vehicle_year,
    vehicle_max_payload,
    vehicle_max_volume,
    truck_added_to_fleet,
    is_approved
FROM driver_profiles 
WHERE user_id = '4ab16336-a414-4b73-8dc9-ab97d0eed1a7';

-- Add Alaa's vehicle to the trucks fleet
INSERT INTO trucks (
    license_plate,
    make,
    model,
    year,
    max_payload,
    max_volume,
    current_driver_id,
    is_available,
    is_active,
    created_at,
    updated_at
) 
SELECT 
    vehicle_plate,
    COALESCE(SPLIT_PART(vehicle_model, ' ', 1), 'Unknown') as make,
    COALESCE(vehicle_model, 'Unknown') as model,
    COALESCE(vehicle_year, 2020) as year,
    COALESCE(vehicle_max_payload, 5.0) as max_payload,
    COALESCE(vehicle_max_volume, 10.0) as max_volume,
    user_id as current_driver_id,
    true as is_available,
    true as is_active,
    NOW() as created_at,
    NOW() as updated_at
FROM driver_profiles 
WHERE user_id = '4ab16336-a414-4b73-8dc9-ab97d0eed1a7'
  AND vehicle_plate IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM trucks 
    WHERE current_driver_id = '4ab16336-a414-4b73-8dc9-ab97d0eed1a7'
  );

-- Update the driver profile to mark truck as added to fleet
UPDATE driver_profiles 
SET truck_added_to_fleet = true,
    updated_at = NOW()
WHERE user_id = '4ab16336-a414-4b73-8dc9-ab97d0eed1a7';

-- Verify the result
SELECT 
    dp.user_id,
    dp.first_name,
    dp.last_name,
    dp.vehicle_plate as profile_plate,
    dp.truck_added_to_fleet,
    t.id as truck_id,
    t.license_plate as fleet_plate,
    t.make,
    t.model,
    t.current_driver_id
FROM driver_profiles dp
LEFT JOIN trucks t ON dp.user_id = t.current_driver_id
WHERE dp.user_id = '4ab16336-a414-4b73-8dc9-ab97d0eed1a7';
