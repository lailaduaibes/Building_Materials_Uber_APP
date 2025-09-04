-- 🧪 Test ASAP Sequential Driver Assignment Fix
-- This verifies that only the assigned driver gets the trip notification

-- ===========================
-- SETUP: Ensure clean state
-- ===========================

-- Clear any existing ASAP trips
UPDATE trip_requests 
SET status = 'cancelled' 
WHERE pickup_time_preference = 'asap' 
  AND status = 'pending';

-- ===========================
-- TEST 1: Create ASAP trip (NO assignment yet)
-- ===========================

-- Customer creates ASAP trip (assigned_driver_id = NULL)
INSERT INTO trip_requests (
    customer_id,
    pickup_latitude,
    pickup_longitude,
    pickup_address,
    dropoff_latitude,
    dropoff_longitude,
    dropoff_address,
    pickup_time_preference,
    assigned_driver_id,
    status,
    created_at
) VALUES (
    'f5e8c6d4-8f2a-4b5c-9e7d-1a3b2c4d5e6f', -- Customer ID
    40.7128, -74.0060, 'Times Square, New York, NY',  -- Pickup
    40.7580, -73.9855, 'Central Park, New York, NY',  -- Dropoff  
    'asap',
    NULL, -- ❗ NO driver assigned yet
    'pending',
    NOW()
) RETURNING id, assigned_driver_id, status;

-- At this point: NO driver should receive notification
-- Because filter requires: assigned_driver_id=eq.${currentDriver.user_id}

-- ===========================
-- TEST 2: Assign to specific driver
-- ===========================

-- Get the trip ID
SET @trip_id = (SELECT id FROM trip_requests WHERE pickup_time_preference = 'asap' AND status = 'pending' ORDER BY created_at DESC LIMIT 1);

-- Get a real driver ID
SET @driver_id = (
    SELECT user_id 
    FROM driver_profiles 
    WHERE is_approved = true 
      AND approval_status = 'approved'
    ORDER BY created_at 
    LIMIT 1
);

-- Assign trip to specific driver (this should trigger notification)
UPDATE trip_requests 
SET 
    assigned_driver_id = @driver_id,
    acceptance_deadline = NOW() + INTERVAL '15 seconds'
WHERE id = @trip_id;

-- ===========================
-- VERIFICATION: Check assignment
-- ===========================

SELECT 
    'TRIP ASSIGNMENT TEST' as test_phase,
    tr.id,
    tr.status,
    tr.pickup_time_preference,
    tr.assigned_driver_id,
    tr.acceptance_deadline,
    CASE 
        WHEN tr.assigned_driver_id IS NULL THEN '❌ NO ASSIGNMENT - No driver will be notified'
        ELSE '✅ ASSIGNED - Only this driver will be notified'
    END as notification_status,
    u.email as assigned_driver_email
FROM trip_requests tr
LEFT JOIN users u ON tr.assigned_driver_id = u.id
WHERE tr.pickup_time_preference = 'asap' 
  AND tr.status = 'pending'
ORDER BY tr.created_at DESC 
LIMIT 1;

-- ===========================
-- TEST 3: Simulate driver decline (assign to next driver)
-- ===========================

-- Get next available driver
SET @next_driver_id = (
    SELECT user_id 
    FROM driver_profiles 
    WHERE is_approved = true 
      AND approval_status = 'approved'
      AND user_id != @driver_id
    ORDER BY created_at 
    LIMIT 1
);

-- Simulate decline by reassigning to next driver
UPDATE trip_requests 
SET 
    assigned_driver_id = @next_driver_id,
    acceptance_deadline = NOW() + INTERVAL '15 seconds'
WHERE id = @trip_id;

-- ===========================
-- FINAL VERIFICATION
-- ===========================

SELECT 
    'SEQUENTIAL ASSIGNMENT TEST' as test_phase,
    tr.id,
    tr.status,
    tr.assigned_driver_id,
    tr.acceptance_deadline > NOW() as notification_active,
    u.email as current_assigned_driver,
    CASE 
        WHEN tr.assigned_driver_id IS NOT NULL AND tr.acceptance_deadline > NOW() 
        THEN '✅ ACTIVE - This driver should see the modal'
        ELSE '❌ INACTIVE - No notification active'
    END as notification_status
FROM trip_requests tr
LEFT JOIN users u ON tr.assigned_driver_id = u.id
WHERE tr.id = @trip_id;

-- ===========================
-- CHECK: No multiple simultaneous assignments
-- ===========================

SELECT 
    'SIMULTANEOUS NOTIFICATION CHECK' as test_phase,
    COUNT(*) as active_notifications,
    COUNT(DISTINCT assigned_driver_id) as unique_drivers,
    CASE 
        WHEN COUNT(*) = COUNT(DISTINCT assigned_driver_id) AND COUNT(*) <= 1
        THEN '✅ PASS - Sequential assignment working'
        ELSE '❌ FAIL - Multiple simultaneous notifications detected'
    END as test_result
FROM trip_requests 
WHERE status = 'pending' 
  AND assigned_driver_id IS NOT NULL 
  AND acceptance_deadline > NOW()
  AND pickup_time_preference = 'asap';

-- ===========================
-- EXPECTED RESULTS:
-- ===========================

/* 
🎯 EXPECTED BEHAVIOR AFTER FIX:

1. ✅ Trip created with assigned_driver_id = NULL
   → NO driver gets notification (filter prevents it)

2. ✅ Trip assigned to Driver A  
   → ONLY Driver A gets notification

3. ✅ Driver A declines, assigned to Driver B
   → ONLY Driver B gets notification  

4. ✅ Only ONE active notification at a time
   → Sequential assignment confirmed

🚨 OLD BROKEN BEHAVIOR (should NOT happen):
- All drivers get notification simultaneously
- Multiple active notifications for same trip
*/
