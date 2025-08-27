-- =============================================================================
-- DEBUG NOTIFICATION FLOW WHEN STARTING A TRIP
-- =============================================================================

-- 1. Check current active trips for the driver
SELECT 
    tr.id,
    tr.customer_id,
    tr.assigned_driver_id,
    tr.status,
    tr.pickup_started_at,
    tr.delivery_started_at,
    tr.delivered_at,
    tr.created_at
FROM trip_requests tr
WHERE tr.assigned_driver_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c'
AND tr.status NOT IN ('delivered', 'cancelled')
ORDER BY tr.created_at DESC;

-- 2. Check recent notifications sent to customers
SELECT 
    n.id,
    n.user_id,
    n.title,
    n.message,
    n.type,
    n.data,
    n.created_at,
    au.email as customer_email
FROM notifications n
JOIN auth.users au ON au.id = n.user_id
WHERE n.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY n.created_at DESC
LIMIT 10;

-- 3. Check if there are any foreign key constraint issues
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as referenced_table
FROM pg_constraint 
WHERE contype = 'f' 
AND (conrelid::regclass::text = 'notifications' OR confrelid::regclass::text = 'notifications');

-- 4. Test notification insertion manually (like the driver app would do)
-- This will help us see if notifications can be inserted successfully
INSERT INTO notifications (user_id, title, message, type, data)
SELECT 
    tr.customer_id,
    'Trip Started - Test Notification',
    'Your driver has started the trip to pickup location',
    'status_update',
    json_build_object(
        'status', 'in_transit',
        'driver_name', 'Driver Laila',
        'trip_assignment_id', tr.id
    )
FROM trip_requests tr
WHERE tr.assigned_driver_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c'
AND tr.status NOT IN ('delivered', 'cancelled')
LIMIT 1;

-- 5. Verify the test notification was inserted
SELECT 
    n.id,
    n.user_id,
    n.title,
    n.message,
    n.type,
    n.data,
    n.created_at,
    au.email as customer_email
FROM notifications n
JOIN auth.users au ON au.id = n.user_id
WHERE n.title = 'Trip Started - Test Notification'
ORDER BY n.created_at DESC;

-- 6. Check if there are any RLS policies blocking notification insertion
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY policyname;
