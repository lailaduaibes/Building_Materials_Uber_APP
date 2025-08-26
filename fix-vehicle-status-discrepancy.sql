-- =============================================================================
-- FIX VEHICLE STATUS DISCREPANCY
-- =============================================================================

-- Current issue: 
-- - My Vehicles shows "pending status" 
-- - Fleet Assignment shows "in use"
-- - Truck is_available = false but driver is approved

-- 1. Check active trips for this driver's truck
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
AND tr.status NOT IN ('delivered', 'cancelled', 'rejected')
ORDER BY tr.created_at DESC;

-- 2. Check if truck availability should be updated
-- If no active trips, truck should be available
UPDATE trucks 
SET is_available = CASE 
    WHEN EXISTS (
        SELECT 1 FROM trip_requests 
        WHERE assigned_truck_id = 'cf1ef76c-9968-4777-89f2-76d61292b84d'
        AND status IN ('pending', 'accepted', 'assigned', 'picked_up', 'in_transit')
    ) THEN false
    ELSE true
END
WHERE id = 'cf1ef76c-9968-4777-89f2-76d61292b84d';

-- 3. Verify the update
SELECT 
    id,
    license_plate,
    current_driver_id,
    is_available,
    is_active
FROM trucks 
WHERE id = 'cf1ef76c-9968-4777-89f2-76d61292b84d';

-- 4. Check what status logic the app is using
-- Look for any status calculation in the app code that might be causing "pending"
SELECT 
    dp.approval_status,
    dp.is_approved,
    dp.truck_added_to_fleet,
    t.is_available,
    t.is_active,
    CASE 
        WHEN dp.approval_status = 'approved' AND dp.is_approved = true AND t.is_available = true THEN 'Available'
        WHEN dp.approval_status = 'approved' AND dp.is_approved = true AND t.is_available = false THEN 'In Use'
        WHEN dp.approval_status = 'pending' OR dp.is_approved = false THEN 'Pending Approval'
        ELSE 'Unknown'
    END as calculated_status
FROM driver_profiles dp
JOIN trucks t ON t.current_driver_id = dp.user_id
WHERE dp.user_id = '8adcfea1-03e8-4771-a336-7880a8a4bf46';
