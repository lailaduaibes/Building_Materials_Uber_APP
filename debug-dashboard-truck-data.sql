-- CHECK: What truck data the driver actually has vs what the dashboard shows
-- Execute this to see the discrepancy

-- 1. Check what trucks are actually assigned to the approved driver in the trucks table
SELECT 
    t.id,
    t.license_plate,
    t.make,
    t.model,
    t.year,
    t.max_payload,
    t.max_volume,
    t.current_driver_id,
    tt.name as truck_type_name,
    tt.description as truck_type_description,
    u.email as driver_email
FROM trucks t
JOIN truck_types tt ON t.truck_type_id = tt.id
JOIN users u ON t.current_driver_id = u.id
WHERE t.current_driver_id IS NOT NULL
ORDER BY u.email, t.license_plate;

-- 2. Check what's in driver_profiles.preferred_truck_types (what dashboard might be showing)
SELECT 
    dp.id,
    dp.first_name,
    dp.last_name,
    dp.vehicle_plate,
    dp.vehicle_model,
    dp.vehicle_year,
    dp.vehicle_max_payload,
    dp.vehicle_max_volume,
    dp.preferred_truck_types,
    dp.selected_truck_type_id,
    dp.custom_truck_type_name,
    dp.has_custom_truck_type,
    dp.is_approved,
    dp.truck_added_to_fleet,
    u.email
FROM driver_profiles dp
JOIN users u ON dp.user_id = u.id
WHERE dp.is_approved = true
ORDER BY u.email;

-- 3. Check if there's a mismatch between actual trucks and preferred_truck_types
SELECT 
    'MISMATCH ANALYSIS' as analysis,
    u.email,
    dp.preferred_truck_types as dashboard_shows,
    tt.name as actual_truck_type,
    t.license_plate as actual_truck_plate
FROM driver_profiles dp
JOIN users u ON dp.user_id = u.id
LEFT JOIN trucks t ON t.current_driver_id = u.id
LEFT JOIN truck_types tt ON t.truck_type_id = tt.id
WHERE dp.is_approved = true
ORDER BY u.email;
