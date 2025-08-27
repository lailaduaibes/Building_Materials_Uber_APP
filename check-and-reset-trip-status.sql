-- =============================================================================
-- CHECK VALID TRIP STATUSES AND RESET TRIP
-- =============================================================================

-- 1. First, check what statuses are allowed by the constraint
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'trip_requests_status_check';

-- 2. Check current trip status
SELECT 
    id,
    customer_id,
    assigned_driver_id,
    status,
    pickup_started_at,
    delivery_started_at,
    delivered_at,
    created_at
FROM trip_requests
WHERE assigned_driver_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c'
AND status NOT IN ('delivered', 'cancelled')
ORDER BY created_at DESC
LIMIT 1;

-- 3. Reset the trip to a valid starting status 
-- Use 'matched' since that appears to be the state after driver assignment
UPDATE trip_requests 
SET 
    status = 'matched',
    pickup_started_at = NULL,
    delivery_started_at = NULL,
    delivered_at = NULL
WHERE id = '15602341-c486-4855-9951-237917a8f849'
AND assigned_driver_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

-- 4. Verify the trip was reset correctly
SELECT 
    id,
    customer_id,
    assigned_driver_id,
    status,
    pickup_started_at,
    delivery_started_at,
    delivered_at
FROM trip_requests
WHERE id = '15602341-c486-4855-9951-237917a8f849';

-- 5. Clean up test notifications
DELETE FROM notifications 
WHERE title IN (
    'Trip Started - Test Notification',
    'RLS Test Notification', 
    'Driver En Route - Policy Test'
);

-- 6. Check remaining notifications for this customer
SELECT 
    id,
    user_id,
    title,
    message,
    type,
    data,
    created_at
FROM notifications
WHERE user_id = 'f30c3989-63fb-49da-ab39-168cbe9b6c82'
ORDER BY created_at DESC
LIMIT 5;

-- 7. Final confirmation
SELECT 
    CASE 
        WHEN status = 'matched' THEN '✅ Trip is ready for "Start Trip" button'
        WHEN status = 'in_transit' THEN '⚠️ Trip is already in transit'
        WHEN status = 'delivered' THEN '❌ Trip is already delivered'
        ELSE '❓ Trip status: ' || status
    END as trip_status_message,
    status as current_status
FROM trip_requests 
WHERE id = '15602341-c486-4855-9951-237917a8f849';
