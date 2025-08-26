-- =============================================================================
-- FORCE FIX TRUCK AVAILABILITY - NO ACTIVE TRIPS FOUND
-- =============================================================================

-- Since no active trips were found, force the truck to be available
UPDATE trucks 
SET is_available = true
WHERE id = 'cf1ef76c-9968-4777-89f2-76d61292b84d';

-- Verify the update worked
SELECT 
    id,
    license_plate,
    current_driver_id,
    is_available,
    is_active,
    updated_at
FROM trucks 
WHERE id = 'cf1ef76c-9968-4777-89f2-76d61292b84d';

-- Check what the app should now show
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
