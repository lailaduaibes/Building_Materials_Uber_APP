-- SAFE: Fix only the specific Car Carrier truck that we identified

-- STEP 1: First, let's see exactly what we're about to change
SELECT 
    'BEFORE UPDATE' as status,
    t.id as truck_id,
    t.license_plate,
    t.is_available as current_truck_availability,
    dp.is_available as driver_availability,
    dp.status as driver_status,
    tt.name as truck_type_name
FROM trucks t
JOIN truck_types tt ON t.truck_type_id = tt.id
JOIN users u ON t.current_driver_id = u.id
JOIN driver_profiles dp ON u.id = dp.user_id
WHERE t.id = '5238504c-0a35-4f31-806f-4a6cf5591db6'  -- Specific Car Carrier truck ID
AND tt.name = 'Car Carrier';

-- STEP 2: Safe update - only the specific Car Carrier truck
UPDATE trucks 
SET is_available = true,
    updated_at = NOW()
WHERE id = '5238504c-0a35-4f31-806f-4a6cf5591db6'  -- Specific truck ID only
AND truck_type_id = 'e1e1f58a-f96f-4c6b-ae4b-76ddc7f6ae25';  -- Car Carrier type ID

-- STEP 3: Verify the specific change
SELECT 
    'AFTER UPDATE' as status,
    t.id as truck_id,
    t.license_plate,
    t.is_available as updated_truck_availability,
    dp.is_available as driver_availability,
    dp.status as driver_status,
    tt.name as truck_type_name
FROM trucks t
JOIN truck_types tt ON t.truck_type_id = tt.id
JOIN users u ON t.current_driver_id = u.id
JOIN driver_profiles dp ON u.id = dp.user_id
WHERE t.id = '5238504c-0a35-4f31-806f-4a6cf5591db6'
AND tt.name = 'Car Carrier';

-- STEP 4: Check how many truck types are now available for customers
SELECT 
    'CUSTOMER APP RESULT' as test,
    COUNT(DISTINCT tt.id) as available_truck_types_count
FROM truck_types tt
INNER JOIN trucks t ON tt.id = t.truck_type_id
WHERE tt.is_active = true 
AND t.is_available = true;
