-- Fleet Assignment Fixes - Comprehensive Solution

-- 1. Add Alaa's vehicle to the fleet
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
) VALUES (
    'B133-8773',
    'Small',
    'Small Truck',
    2007,
    5.0,
    10.0,
    '4ab16336-a414-4b73-8dc9-ab97d0eed1a7',
    true,
    true,
    NOW(),
    NOW()
);

-- 2. Update Alaa's profile to mark truck as added to fleet
UPDATE driver_profiles 
SET truck_added_to_fleet = true,
    updated_at = NOW()
WHERE user_id = '4ab16336-a414-4b73-8dc9-ab97d0eed1a7';

-- 3. Fix Ahmed Driver's profile flag (he has fleet assignment but flag is false)
UPDATE driver_profiles 
SET truck_added_to_fleet = true,
    updated_at = NOW()
WHERE user_id = '7a9ce2f0-db9d-46a7-aef3-c01635d90592';

-- 4. Remove orphaned truck assignment (truck assigned to non-existent driver)
UPDATE trucks 
SET current_driver_id = NULL,
    is_available = true,
    updated_at = NOW()
WHERE id = '5238504c-0a35-4f31-806f-4a6cf5591db6'
  AND current_driver_id = '635ba037-656d-4b2f-98da-7d0b609b5886';

-- 5. Verify all fixes
SELECT 
    'AFTER FIXES - Driver Fleet Status' as report_type,
    dp.user_id,
    dp.first_name,
    dp.last_name,
    dp.is_approved,
    dp.truck_added_to_fleet,
    dp.vehicle_plate as profile_plate,
    t.license_plate as fleet_plate,
    CASE 
        WHEN t.id IS NOT NULL THEN '✅ Has Fleet Assignment'
        WHEN dp.vehicle_plate IS NOT NULL THEN '❌ Registration Only'
        ELSE '⚠️ No Vehicle Info'
    END as status
FROM driver_profiles dp
LEFT JOIN trucks t ON dp.user_id = t.current_driver_id
ORDER BY dp.first_name, dp.last_name;

-- 6. Fleet utilization after fixes
SELECT 
    'AFTER FIXES - Fleet Utilization' as report_type,
    COUNT(*) as total_trucks,
    COUNT(CASE WHEN current_driver_id IS NOT NULL THEN 1 END) as assigned_trucks,
    COUNT(CASE WHEN current_driver_id IS NULL THEN 1 END) as unassigned_trucks,
    COUNT(CASE WHEN is_available = true THEN 1 END) as available_trucks
FROM trucks;
