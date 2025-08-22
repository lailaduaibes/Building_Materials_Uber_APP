-- STEP 1: Check the Car Carrier truck that exists but isn't available
SELECT 
    t.id,
    t.license_plate,
    t.make,
    t.model,
    t.is_available,
    t.is_active,
    tt.name as truck_type_name
FROM trucks t
JOIN truck_types tt ON t.truck_type_id = tt.id
WHERE tt.name = 'Car Carrier';

-- STEP 2: Fix any trucks that have NULL or false availability (make them available)
UPDATE trucks 
SET is_available = true, updated_at = NOW()
WHERE is_available IS NULL OR is_available = false;

-- STEP 3: Add sample trucks for truck types that have no physical trucks
-- This will ensure customers can see and select all truck types

-- Add Box Truck
INSERT INTO trucks (truck_type_id, license_plate, make, model, year, max_payload, max_volume, is_available, is_active)
SELECT 
    id as truck_type_id,
    'BOX-001' as license_plate,
    'Isuzu' as make,
    'NQR' as model,
    2023 as year,
    5000 as max_payload,
    20 as max_volume,
    true as is_available,
    true as is_active
FROM truck_types 
WHERE name = 'Box Truck'
AND NOT EXISTS (SELECT 1 FROM trucks WHERE truck_type_id = truck_types.id);

-- Add Crane Truck
INSERT INTO trucks (truck_type_id, license_plate, make, model, year, max_payload, max_volume, is_available, is_active)
SELECT 
    id as truck_type_id,
    'CRANE-001' as license_plate,
    'Volvo' as make,
    'FMX' as model,
    2023 as year,
    8000 as max_payload,
    12 as max_volume,
    true as is_available,
    true as is_active
FROM truck_types 
WHERE name = 'Crane Truck'
AND NOT EXISTS (SELECT 1 FROM trucks WHERE truck_type_id = truck_types.id);

-- Add Dump Truck
INSERT INTO trucks (truck_type_id, license_plate, make, model, year, max_payload, max_volume, is_available, is_active)
SELECT 
    id as truck_type_id,
    'DUMP-001' as license_plate,
    'Caterpillar' as make,
    '730C' as model,
    2023 as year,
    15000 as max_payload,
    8 as max_volume,
    true as is_available,
    true as is_active
FROM truck_types 
WHERE name = 'Dump Truck'
AND NOT EXISTS (SELECT 1 FROM trucks WHERE truck_type_id = truck_types.id);

-- STEP 4: Verify the fix - check updated availability
SELECT 
    tt.name as truck_type,
    COUNT(t.id) as total_trucks,
    COUNT(CASE WHEN t.is_available = true THEN 1 END) as available_trucks,
    CASE 
        WHEN COUNT(CASE WHEN t.is_available = true THEN 1 END) > 0 THEN 'WILL SHOW IN APP' 
        ELSE 'NOT AVAILABLE' 
    END as app_visibility
FROM truck_types tt
LEFT JOIN trucks t ON tt.id = t.truck_type_id
WHERE tt.is_active = true
GROUP BY tt.id, tt.name
ORDER BY tt.name;
