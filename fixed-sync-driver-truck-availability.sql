-- CORRECTED: Check the connection between driver status and truck availability

-- STEP 1: Find the Car Carrier truck and its driver connection
SELECT 
    t.id as truck_id,
    t.license_plate,
    t.is_available as truck_available,
    t.current_driver_id,
    u.phone as driver_phone,
    dp.first_name,
    dp.last_name,
    dp.phone as driver_profile_phone,
    dp.is_available as driver_available,
    dp.status as driver_status,
    dp.current_truck_id,
    tt.name as truck_type_name
FROM trucks t
JOIN truck_types tt ON t.truck_type_id = tt.id
LEFT JOIN users u ON t.current_driver_id = u.id
LEFT JOIN driver_profiles dp ON u.id = dp.user_id
WHERE tt.name = 'Car Carrier';

-- STEP 2: Check driver-truck relationship via current_truck_id  
SELECT 
    dp.first_name,
    dp.last_name,
    dp.phone,
    dp.is_available as driver_available,
    dp.status as driver_status,
    dp.current_truck_id,
    t.license_plate,
    t.is_available as truck_available,
    tt.name as truck_type_name,
    CASE 
        WHEN dp.is_available = true AND t.is_available = false THEN 'DRIVER ONLINE BUT TRUCK UNAVAILABLE'
        WHEN dp.is_available = false AND t.is_available = true THEN 'DRIVER OFFLINE BUT TRUCK AVAILABLE'
        ELSE 'SYNCED'
    END as sync_status
FROM driver_profiles dp
LEFT JOIN trucks t ON dp.current_truck_id = t.id
LEFT JOIN truck_types tt ON t.truck_type_id = tt.id
WHERE dp.current_truck_id IS NOT NULL;

-- STEP 3: Manual fix - sync truck availability with driver status via current_truck_id
UPDATE trucks 
SET is_available = (
    SELECT dp.is_available 
    FROM driver_profiles dp
    WHERE dp.current_truck_id = trucks.id
    AND dp.is_available IS NOT NULL
),
updated_at = NOW()
WHERE id IN (
    SELECT current_truck_id 
    FROM driver_profiles 
    WHERE current_truck_id IS NOT NULL
);

-- STEP 4: Also fix trucks linked via current_driver_id
UPDATE trucks 
SET is_available = (
    SELECT dp.is_available 
    FROM driver_profiles dp
    WHERE dp.user_id = trucks.current_driver_id
    AND dp.is_available IS NOT NULL
),
updated_at = NOW()
WHERE current_driver_id IS NOT NULL
AND current_driver_id IN (SELECT user_id FROM driver_profiles WHERE user_id IS NOT NULL);

-- STEP 5: Make unassigned trucks available (company fleet)
UPDATE trucks 
SET is_available = true, updated_at = NOW()
WHERE current_driver_id IS NULL AND id NOT IN (
    SELECT current_truck_id FROM driver_profiles WHERE current_truck_id IS NOT NULL
);

-- STEP 6: Verify the fix
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
