-- =============================================================================
-- DEBUG TRUCK TYPE ASSIGNMENT ISSUE
-- =============================================================================

-- 1. Check what truck type the driver selected during registration
SELECT 
    dp.user_id,
    dp.first_name,
    dp.last_name,
    dp.vehicle_plate,
    dp.vehicle_model,
    dp.preferred_truck_types,
    dp.specializations,
    dp.equipment_available,
    dp.created_at
FROM driver_profiles dp
WHERE dp.user_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

-- 2. Check what truck type was assigned in the fleet
SELECT 
    t.id,
    t.license_plate,
    t.truck_type_id,
    tt.name as truck_type_name,
    tt.description,
    t.created_at
FROM trucks t
JOIN truck_types tt ON tt.id = t.truck_type_id
WHERE t.current_driver_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

-- 3. Check all available truck types to see what "Flatbed" should be
SELECT 
    id,
    name,
    description,
    max_payload_tons,
    max_volume_m3
FROM truck_types
ORDER BY name;

-- 4. Find the correct truck type ID for flatbed
SELECT 
    id,
    name,
    description
FROM truck_types
WHERE LOWER(name) LIKE '%flatbed%' OR LOWER(description) LIKE '%flatbed%';

-- 5. Check driver profile fields that might contain truck type info
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'driver_profiles' 
AND table_schema = 'public'
AND (column_name LIKE '%type%' OR column_name LIKE '%truck%' OR column_name LIKE '%vehicle%')
ORDER BY column_name;
