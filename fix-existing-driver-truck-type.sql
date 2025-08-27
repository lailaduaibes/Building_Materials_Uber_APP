-- =============================================================================
-- FIX EXISTING DRIVER'S TRUCK TYPE FROM SMALL TRUCK TO FLATBED
-- =============================================================================

-- Update the existing driver's truck to use the correct Flatbed truck type
UPDATE trucks 
SET 
    truck_type_id = 'c14a47b8-f4b8-4986-8031-fac2153f21e0', -- Flatbed Truck ID
    updated_at = NOW()
WHERE current_driver_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

-- Verify the update worked
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

-- Check the driver's preferred truck types to confirm it matches
SELECT 
    dp.first_name,
    dp.last_name,
    dp.preferred_truck_types,
    t.truck_type_id,
    tt.name as assigned_truck_type
FROM driver_profiles dp
JOIN trucks t ON t.current_driver_id = dp.user_id
JOIN truck_types tt ON tt.id = t.truck_type_id
WHERE dp.user_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';
