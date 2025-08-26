-- =============================================================================
-- FIX APPROVAL PROCESS - ENSURE PROPER TRUCK STATUS
-- =============================================================================

-- 1. Fix any existing trucks that are missing truck_type_id
UPDATE trucks 
SET truck_type_id = '69949f18-3e1b-4db2-96fc-5dea17fc658f' -- Small Truck default
WHERE truck_type_id IS NULL;

-- 2. Fix trucks that should be available but aren't (no active trips)
UPDATE trucks 
SET is_available = true
WHERE is_available = false
AND NOT EXISTS (
    SELECT 1 FROM trip_requests 
    WHERE (assigned_truck_id = trucks.id OR assigned_driver_id = trucks.current_driver_id)
    AND status IN ('pending', 'accepted', 'assigned', 'picked_up', 'in_transit', 'en_route')
);

-- 3. Ensure all approved drivers have their trucks marked as available
UPDATE trucks 
SET is_available = true
WHERE current_driver_id IN (
    SELECT user_id FROM driver_profiles 
    WHERE is_approved = true AND approval_status = 'approved'
)
AND NOT EXISTS (
    SELECT 1 FROM trip_requests 
    WHERE (assigned_truck_id = trucks.id OR assigned_driver_id = trucks.current_driver_id)
    AND status IN ('pending', 'accepted', 'assigned', 'picked_up', 'in_transit', 'en_route')
);

-- 4. Verify the fixes
SELECT 
    t.id,
    t.license_plate,
    t.current_driver_id,
    t.is_available,
    t.is_active,
    t.truck_type_id,
    dp.first_name,
    dp.last_name,
    dp.approval_status,
    dp.is_approved,
    CASE 
        WHEN dp.approval_status = 'approved' AND dp.is_approved = true AND t.is_available = true THEN 'Available'
        WHEN dp.approval_status = 'approved' AND dp.is_approved = true AND t.is_available = false THEN 'In Use'
        WHEN dp.approval_status = 'pending' OR dp.is_approved = false THEN 'Pending'
        ELSE 'Unknown'
    END as app_status
FROM trucks t
JOIN driver_profiles dp ON dp.user_id = t.current_driver_id
ORDER BY dp.created_at DESC;

-- 5. Create a function to automatically set truck availability during approval
-- This ensures future approvals work correctly
CREATE OR REPLACE FUNCTION sync_truck_availability()
RETURNS TRIGGER AS $$
BEGIN
    -- When a driver is approved, make sure their truck is available
    IF NEW.is_approved = true AND NEW.approval_status = 'approved' THEN
        UPDATE trucks 
        SET is_available = true, updated_at = NOW()
        WHERE current_driver_id = NEW.user_id
        AND NOT EXISTS (
            SELECT 1 FROM trip_requests 
            WHERE (assigned_truck_id = trucks.id OR assigned_driver_id = trucks.current_driver_id)
            AND status IN ('pending', 'accepted', 'assigned', 'picked_up', 'in_transit', 'en_route')
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger to automatically sync truck availability when driver approval changes
DROP TRIGGER IF EXISTS trigger_sync_truck_availability ON driver_profiles;
CREATE TRIGGER trigger_sync_truck_availability
    AFTER UPDATE OF is_approved, approval_status ON driver_profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_truck_availability();
