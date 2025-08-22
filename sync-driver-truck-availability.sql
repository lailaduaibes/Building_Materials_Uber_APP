-- Check the connection between driver status and truck availability

-- STEP 1: Find the Car Carrier truck and its driver connection
SELECT 
    t.id as truck_id,
    t.license_plate,
    t.is_available as truck_available,
    t.current_driver_id,
    u.phone as driver_phone,
    dp.first_name,
    dp.last_name,
    dp.is_available as driver_available,
    dp.status as driver_status,
    dp.truck_info,
    tt.name as truck_type_name
FROM trucks t
JOIN truck_types tt ON t.truck_type_id = tt.id
LEFT JOIN users u ON t.current_driver_id = u.id
LEFT JOIN driver_profiles dp ON u.phone = dp.phone_number
WHERE tt.name = 'Car Carrier';

-- STEP 2: Check if driver and truck availability should be synced
-- Find all drivers and their trucks
SELECT 
    dp.first_name,
    dp.last_name,
    dp.phone_number,
    dp.is_available as driver_available,
    dp.status as driver_status,
    dp.truck_info,
    t.license_plate,
    t.is_available as truck_available,
    tt.name as truck_type_name,
    'SYNC ISSUE' as issue_type
FROM driver_profiles dp
LEFT JOIN users u ON dp.phone_number = u.phone
LEFT JOIN trucks t ON u.id = t.current_driver_id
LEFT JOIN truck_types tt ON t.truck_type_id = tt.id
WHERE dp.truck_info IS NOT NULL
AND (
    (dp.is_available = true AND t.is_available = false) OR 
    (dp.is_available = false AND t.is_available = true)
);

-- STEP 3: Manual fix - sync driver and truck availability
-- Update truck availability to match driver status
UPDATE trucks 
SET is_available = (
    SELECT dp.is_available 
    FROM driver_profiles dp
    JOIN users u ON dp.phone_number = u.phone
    WHERE u.id = trucks.current_driver_id
    AND dp.is_available IS NOT NULL
),
updated_at = NOW()
WHERE current_driver_id IS NOT NULL
AND EXISTS (
    SELECT 1 
    FROM driver_profiles dp
    JOIN users u ON dp.phone_number = u.phone
    WHERE u.id = trucks.current_driver_id
);

-- STEP 4: Also update trucks that don't have drivers assigned (make them available)
UPDATE trucks 
SET is_available = true, updated_at = NOW()
WHERE current_driver_id IS NULL;

-- STEP 5: Verify the fix
SELECT 
    'AFTER SYNC' as status,
    tt.name as truck_type,
    COUNT(t.id) as total_trucks,
    COUNT(CASE WHEN t.is_available = true THEN 1 END) as available_trucks,
    CASE 
        WHEN COUNT(CASE WHEN t.is_available = true THEN 1 END) > 0 
        THEN '✅ AVAILABLE IN APP' 
        ELSE '❌ NOT AVAILABLE' 
    END as app_status
FROM truck_types tt
LEFT JOIN trucks t ON tt.id = t.truck_type_id
WHERE tt.is_active = true
GROUP BY tt.id, tt.name
ORDER BY tt.name;
