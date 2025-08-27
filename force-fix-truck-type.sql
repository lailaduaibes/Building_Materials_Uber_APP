-- =============================================================================
-- CHECK CURRENT STATE AND FORCE FIX TRUCK TYPE
-- =============================================================================

-- 1. Check current driver and truck status
SELECT 
    dp.first_name,
    dp.last_name,
    dp.preferred_truck_types,
    dp.approval_status,
    t.license_plate,
    t.truck_type_id,
    tt.name as current_truck_type_name
FROM driver_profiles dp
LEFT JOIN trucks t ON t.current_driver_id = dp.user_id
LEFT JOIN truck_types tt ON tt.id = t.truck_type_id
WHERE dp.user_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

-- 2. Force update to correct Flatbed truck type
UPDATE trucks 
SET 
    truck_type_id = 'c14a47b8-f4b8-4986-8031-fac2153f21e0',
    updated_at = NOW()
WHERE current_driver_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

-- 3. Verify the fix
SELECT 
    t.id,
    t.license_plate,
    t.truck_type_id,
    tt.name as truck_type_name,
    tt.description,
    t.is_available,
    t.updated_at
FROM trucks t
JOIN truck_types tt ON tt.id = t.truck_type_id
WHERE t.current_driver_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

-- 4. Check what the driver app should now show
SELECT 
    dp.approval_status,
    dp.is_approved,
    t.is_available,
    t.is_active,
    tt.name as truck_type_name,
    CASE 
        WHEN dp.approval_status = 'approved' AND dp.is_approved = true AND t.is_available = true THEN 'Available'
        WHEN dp.approval_status = 'approved' AND dp.is_approved = true AND t.is_available = false THEN 'In Use'
        WHEN dp.approval_status = 'pending' OR dp.is_approved = false THEN 'Pending'
        ELSE 'Unknown'
    END as expected_app_status
FROM driver_profiles dp
JOIN trucks t ON t.current_driver_id = dp.user_id
JOIN truck_types tt ON tt.id = t.truck_type_id
WHERE dp.user_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';
