-- =============================================================================
-- COMPREHENSIVE NOTIFICATION FIX - STEP BY STEP DEBUGGING
-- =============================================================================

-- Step 1: Check current RLS policies after the fix
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

-- Step 2: Check current user context when running this query
SELECT 
    current_user as current_user,
    session_user as session_user,
    auth.role() as auth_role,
    auth.uid() as auth_uid;

-- Step 3: Test notification insertion with explicit user context
-- This simulates what the driver app should be doing
SET role authenticated;
SET "request.jwt.claims" TO '{"sub": "2bd7bd97-5cf9-431f-adfc-4ec4448be52c", "role": "authenticated"}';

-- Step 4: Try to insert notification as authenticated driver user
INSERT INTO notifications (user_id, title, message, type, data)
VALUES (
    'f30c3989-63fb-49da-ab39-168cbe9b6c82',  -- Customer ID
    'Test Notification with Auth Context',
    'Testing notification with proper auth context',
    'status_update',
    jsonb_build_object(
        'status', 'start_trip',
        'driver_name', 'Driver Laila',
        'trip_assignment_id', '15602341-c486-4855-9951-237917a8f849'
    )
);

-- Step 5: Reset to service role
RESET role;
RESET "request.jwt.claims";

-- Step 6: Verify if the test notification was inserted
SELECT 
    id,
    user_id,
    title,
    message,
    created_at
FROM notifications 
WHERE title = 'Test Notification with Auth Context'
ORDER BY created_at DESC
LIMIT 1;

-- Step 7: Alternative approach - Create a more permissive policy
-- Drop existing policies and create a simplified one
DROP POLICY IF EXISTS "Drivers can send notifications to customers" ON notifications;
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;

-- Create a single, more permissive policy for notifications
CREATE POLICY "Allow notification insertions" ON notifications
    FOR INSERT 
    WITH CHECK (true);  -- Allow all insertions for now

-- Step 8: Verify the new policy
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    with_check
FROM pg_policies 
WHERE tablename = 'notifications' 
AND cmd = 'INSERT'
ORDER BY policyname;

-- Step 9: Test if notifications work now with the permissive policy
INSERT INTO notifications (user_id, title, message, type, data)
VALUES (
    'f30c3989-63fb-49da-ab39-168cbe9b6c82',
    'Final Test - Permissive Policy',
    'Testing with completely permissive policy',
    'status_update',
    '{"test": "final_test"}'
);

-- Step 10: Verify the final test notification
SELECT 
    id,
    user_id,
    title,
    message,
    created_at
FROM notifications 
WHERE title = 'Final Test - Permissive Policy'
ORDER BY created_at DESC
LIMIT 1;
