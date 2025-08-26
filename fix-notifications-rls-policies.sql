-- =============================================================================
-- FIX NOTIFICATIONS TABLE RLS POLICIES
-- This script fixes the Row Level Security policies causing notification insert errors
-- =============================================================================

-- 1. Check current RLS policies on notifications table
SELECT 
    'Current RLS policies on notifications' as check_type,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'notifications';

-- 2. Check if RLS is enabled on notifications table
SELECT 
    'RLS status' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'notifications';

-- 3. Check notifications table structure
SELECT 
    'notifications table structure' as check_type,
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;

-- 4. Fix RLS policies for notifications table
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can only see their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can only insert their own notifications" ON notifications;
DROP POLICY IF EXISTS "Service role can manage notifications" ON notifications;

-- Create proper RLS policies that allow service operations
-- Policy 1: Allow users to see their own notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (
        auth.uid() = user_id OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Policy 2: Allow inserting notifications (for service and authenticated users)
CREATE POLICY "Allow notification creation" ON notifications
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL OR
        auth.jwt() ->> 'role' = 'service_role' OR
        auth.jwt() ->> 'role' = 'authenticated'
    );

-- Policy 3: Allow service role full access
CREATE POLICY "Service role full access to notifications" ON notifications
    FOR ALL USING (
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Policy 4: Allow updating notification status
CREATE POLICY "Users can update notification status" ON notifications
    FOR UPDATE USING (
        auth.uid() = user_id OR 
        auth.jwt() ->> 'role' = 'service_role'
    );

-- 5. Ensure RLS is enabled but not blocking legitimate operations
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 6. Grant necessary permissions
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON notifications TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 7. Test notification insertion (this should work now)
-- Note: This will only work if run with service_role key
/*
INSERT INTO notifications (
    user_id, 
    trip_id, 
    type, 
    title, 
    message, 
    created_at
) VALUES (
    (SELECT id FROM users WHERE role = 'customer' LIMIT 1),
    gen_random_uuid(),
    'trip_update',
    'Test Notification',
    'Testing RLS policy fix',
    NOW()
);
*/

-- 8. Verify the new policies
SELECT 
    'Updated RLS policies' as check_type,
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'notifications'
ORDER BY policyname;
