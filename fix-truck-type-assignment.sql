-- Fix truck type assignment for Alaa's vehicle

-- 1. Check what truck types exist
SELECT id, name, description FROM truck_types ORDER BY name;

-- 2. Check Alaa's current truck (missing truck_type_id)
SELECT 
    id,
    license_plate,
    make,
    model,
    truck_type_id,
    current_driver_id
FROM trucks 
WHERE current_driver_id = '4ab16336-a414-4b73-8dc9-ab97d0eed1a7';

-- 3. Find the "Small Truck" truck type ID
SELECT id, name FROM truck_types WHERE name ILIKE '%small%' OR name ILIKE '%truck%';

-- 4. Update Alaa's truck to have the correct truck_type_id for "Small Truck"
UPDATE trucks 
SET truck_type_id = '69949f18-3e1b-4db2-96fc-5dea17fc658f',
    updated_at = NOW()
WHERE current_driver_id = '4ab16336-a414-4b73-8dc9-ab97d0eed1a7';

-- 5. Verify the fix
SELECT 
    t.id,
    t.license_plate,
    t.make,
    t.model,
    t.truck_type_id,
    tt.name as truck_type_name,
    t.current_driver_id
FROM trucks t
LEFT JOIN truck_types tt ON t.truck_type_id = tt.id
WHERE t.current_driver_id = '4ab16336-a414-4b73-8dc9-ab97d0eed1a7';
