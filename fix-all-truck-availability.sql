-- QUICK FIX: Make all trucks available and add missing trucks

-- STEP 1: Fix the Car Carrier truck - set it to available
UPDATE trucks 
SET is_available = true, updated_at = NOW()
WHERE truck_type_id = 'e1e1f58a-f96f-4c6b-ae4b-76ddc7f6ae25'  -- Car Carrier ID
AND is_available = false;

-- STEP 2: Add missing trucks for types that have 0 trucks
-- Box Truck
INSERT INTO trucks (truck_type_id, license_plate, make, model, year, max_payload, max_volume, is_available, is_active)
VALUES (
    '9d5796ba-fe37-4653-b5ae-db8c64846ede',  -- Box Truck ID
    'BOX-001',
    'Isuzu',
    'NPR',
    2023,
    5000.00,
    20.00,
    true,
    true
);

-- Crane Truck  
INSERT INTO trucks (truck_type_id, license_plate, make, model, year, max_payload, max_volume, is_available, is_active)
VALUES (
    'aa972613-2093-4862-9105-c166c9aac0f0',  -- Crane Truck ID
    'CRANE-001',
    'Volvo',
    'FMX',
    2023,
    8000.00,
    12.00,
    true,
    true
);

-- Dump Truck
INSERT INTO trucks (truck_type_id, license_plate, make, model, year, max_payload, max_volume, is_available, is_active)
VALUES (
    '4c6b14b9-be9f-4cdf-a830-c8e6aa2a6e20',  -- Dump Truck ID
    'DUMP-001',
    'Caterpillar',
    '730C',
    2023,
    15000.00,
    8.00,
    true,
    true
);

-- STEP 3: Verify all truck types now have available trucks
SELECT 
    tt.name as truck_type,
    COUNT(t.id) as total_trucks,
    COUNT(CASE WHEN t.is_available = true THEN 1 END) as available_trucks,
    CASE 
        WHEN COUNT(CASE WHEN t.is_available = true THEN 1 END) > 0 
        THEN '✅ WILL SHOW IN CUSTOMER APP' 
        ELSE '❌ NOT AVAILABLE' 
    END as customer_app_status
FROM truck_types tt
LEFT JOIN trucks t ON tt.id = t.truck_type_id
WHERE tt.is_active = true
GROUP BY tt.id, tt.name
ORDER BY tt.name;

-- STEP 4: Test what getAvailableTruckTypes() will return now
SELECT 
    'AVAILABLE TRUCK TYPES FOR CUSTOMERS' as test_result,
    COUNT(DISTINCT tt.id) as available_truck_types
FROM truck_types tt
INNER JOIN trucks t ON tt.id = t.truck_type_id
WHERE tt.is_active = true 
AND t.is_available = true;
