-- Check all users in the fleet - Comprehensive Fleet Report

-- 1. All drivers and their fleet assignment status
SELECT 
    dp.user_id,
    dp.first_name,
    dp.last_name,
    dp.phone,
    dp.is_approved,
    dp.approval_status,
    dp.truck_added_to_fleet,
    dp.vehicle_plate as profile_vehicle_plate,
    dp.vehicle_model as profile_vehicle_model,
    dp.vehicle_year as profile_vehicle_year,
    t.id as fleet_truck_id,
    t.license_plate as fleet_license_plate,
    t.make as fleet_make,
    t.model as fleet_model,
    t.year as fleet_year,
    t.is_available as fleet_available,
    t.is_active as fleet_active,
    CASE 
        WHEN t.id IS NOT NULL THEN 'Has Fleet Assignment'
        WHEN dp.vehicle_plate IS NOT NULL THEN 'Registration Vehicle Only'
        ELSE 'No Vehicle Info'
    END as fleet_status
FROM driver_profiles dp
LEFT JOIN trucks t ON dp.user_id = t.current_driver_id
ORDER BY dp.first_name, dp.last_name;

-- 2. Summary statistics
SELECT 
    COUNT(*) as total_drivers,
    COUNT(CASE WHEN dp.is_approved = true THEN 1 END) as approved_drivers,
    COUNT(CASE WHEN t.id IS NOT NULL THEN 1 END) as drivers_with_fleet_trucks,
    COUNT(CASE WHEN dp.vehicle_plate IS NOT NULL AND t.id IS NULL THEN 1 END) as drivers_with_registration_only,
    COUNT(CASE WHEN dp.vehicle_plate IS NULL AND t.id IS NULL THEN 1 END) as drivers_without_vehicles
FROM driver_profiles dp
LEFT JOIN trucks t ON dp.user_id = t.current_driver_id;

-- 3. All trucks in the fleet
SELECT 
    t.id as truck_id,
    t.license_plate,
    t.make,
    t.model,
    t.year,
    t.max_payload,
    t.max_volume,
    t.current_driver_id,
    t.is_available,
    t.is_active,
    dp.first_name,
    dp.last_name,
    dp.phone,
    CASE 
        WHEN dp.user_id IS NOT NULL THEN CONCAT(dp.first_name, ' ', dp.last_name)
        ELSE 'Unassigned'
    END as assigned_driver_name
FROM trucks t
LEFT JOIN driver_profiles dp ON t.current_driver_id = dp.user_id
ORDER BY t.license_plate;

-- 4. Drivers who need fleet assignment (approved but no truck)
SELECT 
    dp.user_id,
    dp.first_name,
    dp.last_name,
    dp.phone,
    dp.vehicle_plate,
    dp.vehicle_model,
    dp.vehicle_year,
    dp.truck_added_to_fleet,
    'Needs Fleet Assignment' as action_needed
FROM driver_profiles dp
LEFT JOIN trucks t ON dp.user_id = t.current_driver_id
WHERE dp.is_approved = true 
  AND t.id IS NULL 
  AND dp.vehicle_plate IS NOT NULL
ORDER BY dp.first_name, dp.last_name;

-- 5. Fleet utilization report
SELECT 
    COUNT(*) as total_trucks,
    COUNT(CASE WHEN current_driver_id IS NOT NULL THEN 1 END) as assigned_trucks,
    COUNT(CASE WHEN current_driver_id IS NULL THEN 1 END) as unassigned_trucks,
    COUNT(CASE WHEN is_available = true THEN 1 END) as available_trucks,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_trucks
FROM trucks;
