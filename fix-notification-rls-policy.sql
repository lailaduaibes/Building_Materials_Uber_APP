-- =============================================================================
-- FIX NOTIFICATION RLS POLICY FOR DRIVER-TO-CUSTOMER NOTIFICATIONS
-- =============================================================================

-- Step 1: Drop the restrictive existing policy
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;

-- Step 2: Create a new policy that allows drivers to send notifications to customers
-- This allows authenticated users to insert notifications for any user
CREATE POLICY "Drivers can send notifications to customers" ON notifications
    FOR INSERT 
    WITH CHECK (
        -- Allow service role (always)
        auth.role() = 'service_role'::text 
        OR 
        -- Allow authenticated users (drivers) to send notifications to any user
        (auth.role() = 'authenticated'::text AND auth.uid() IS NOT NULL)
    );

-- Step 3: Verify the new policy was created
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
AND cmd = 'INSERT'
ORDER BY policyname;

-- Step 4: Test the fix by inserting a notification as the driver would
-- (This simulates what the driver app does)
-- Note: This will work because we're using service role, but it validates the structure

INSERT INTO notifications (user_id, title, message, type, data)
VALUES (
    'f30c3989-63fb-49da-ab39-168cbe9b6c82',  -- Customer ID
    'Driver En Route - Policy Test',
    'Driver Laila is on the way to pickup your materials',
    'status_update',
    jsonb_build_object(
        'status', 'start_trip',
        'driver_name', 'Driver Laila',
        'trip_assignment_id', '15602341-c486-4855-9951-237917a8f849'
    )
);

-- Step 5: Verify the test notification was inserted
SELECT 
    id,
    user_id,
    title,
    message,
    type,
    data,
    created_at
FROM notifications 
WHERE title = 'Driver En Route - Policy Test'
ORDER BY created_at DESC
LIMIT 1;
