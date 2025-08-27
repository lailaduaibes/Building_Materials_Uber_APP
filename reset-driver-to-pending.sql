-- =============================================================================
-- RESET DRIVER STATUS TO PENDING FOR TESTING
-- =============================================================================

-- Reset driver drivetest1412@gmail.com to pending status
UPDATE driver_profiles 
SET 
    is_approved = false,
    approval_status = 'pending',
    truck_added_to_fleet = false,
    approved_at = NULL,
    updated_at = NOW()
WHERE user_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

-- Remove the truck from fleet (it will be re-added with correct type during approval)
DELETE FROM trucks 
WHERE current_driver_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

-- Verify the driver is now pending and has no truck assigned
SELECT 
    dp.user_id,
    dp.first_name,
    dp.last_name,
    dp.vehicle_plate,
    dp.vehicle_model,
    dp.preferred_truck_types,
    dp.is_approved,
    dp.approval_status,
    dp.truck_added_to_fleet,
    dp.updated_at
FROM driver_profiles dp
WHERE dp.user_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

-- Verify no truck exists for this driver
SELECT COUNT(*) as truck_count
FROM trucks 
WHERE current_driver_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';
