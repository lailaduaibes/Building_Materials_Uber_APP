-- =============================================================================
-- DEBUG WHY TRUCK IS STILL SHOWING AS NOT AVAILABLE
-- =============================================================================

-- 1. Check current truck status for the driver
SELECT 
    t.id,
    t.license_plate,
    t.make,
    t.model,
    t.current_driver_id,
    t.is_available,
    t.is_active,
    t.truck_type_id,
    dp.first_name,
    dp.last_name,
    dp.approval_status,
    dp.is_approved
FROM trucks t
JOIN driver_profiles dp ON dp.user_id = t.current_driver_id
WHERE t.current_driver_id = '8adcfea1-03e8-4771-a336-7880a8a4bf46';

-- 2. Check for ANY active trips assigned to this truck
SELECT 
    tr.id,
    tr.status,
    tr.assigned_driver_id,
    tr.assigned_truck_id,
    tr.created_at,
    tr.pickup_started_at,
    tr.delivery_started_at,
    tr.delivered_at
FROM trip_requests tr
WHERE tr.assigned_truck_id = 'cf1ef76c-9968-4777-89f2-76d61292b84d'
ORDER BY tr.created_at DESC
LIMIT 10;

-- 3. Check for ANY active trips assigned to this driver
SELECT 
    tr.id,
    tr.status,
    tr.assigned_driver_id,
    tr.assigned_truck_id,
    tr.created_at,
    tr.pickup_started_at,
    tr.delivery_started_at,
    tr.delivered_at
FROM trip_requests tr
WHERE tr.assigned_driver_id = '8adcfea1-03e8-4771-a336-7880a8a4bf46'
ORDER BY tr.created_at DESC
LIMIT 10;

-- 4. Force update truck to available if no active trips exist
UPDATE trucks 
SET is_available = true
WHERE id = 'cf1ef76c-9968-4777-89f2-76d61292b84d'
AND NOT EXISTS (
    SELECT 1 FROM trip_requests 
    WHERE (assigned_truck_id = 'cf1ef76c-9968-4777-89f2-76d61292b84d' 
           OR assigned_driver_id = '8adcfea1-03e8-4771-a336-7880a8a4bf46')
    AND status IN ('pending', 'accepted', 'assigned', 'picked_up', 'in_transit', 'en_route')
);

-- 5. Verify the final truck status
SELECT 
    id,
    license_plate,
    current_driver_id,
    is_available,
    is_active,
    updated_at
FROM trucks 
WHERE id = 'cf1ef76c-9968-4777-89f2-76d61292b84d';

-- 6. Check what the app logic should show
SELECT 
    dp.approval_status,
    dp.is_approved,
    t.is_available,
    t.is_active,
    CASE 
        WHEN dp.approval_status = 'approved' AND dp.is_approved = true AND t.is_available = true THEN 'Available'
        WHEN dp.approval_status = 'approved' AND dp.is_approved = true AND t.is_available = false THEN 'In Use'
        WHEN dp.approval_status = 'pending' OR dp.is_approved = false THEN 'Pending'
        ELSE 'Unknown'
    END as expected_app_status
FROM driver_profiles dp
JOIN trucks t ON t.current_driver_id = dp.user_id
WHERE dp.user_id = '8adcfea1-03e8-4771-a336-7880a8a4bf46';
