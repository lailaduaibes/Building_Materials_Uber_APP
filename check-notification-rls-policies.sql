-- =============================================================================
-- CHECK NOTIFICATION RLS POLICIES AND PERMISSIONS
-- =============================================================================

-- 1. Check current RLS policies on notifications table
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

-- 2. Check if RLS is enabled on notifications table
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    forcerowsecurity as force_rls
FROM pg_tables 
WHERE tablename = 'notifications';

-- 3. Check what role the driver is using when making the call
-- This will show the current session's role
SELECT 
    current_user as current_user,
    session_user as session_user,
    auth.role() as auth_role,
    auth.uid() as auth_uid;

-- 4. Check if the driver user exists and their role
SELECT 
    au.id,
    au.email,
    au.role,
    au.created_at
FROM auth.users au
WHERE au.id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

-- 5. Check notifications table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- 6. Test manual notification insertion with service role
-- This should work if RLS is the issue
INSERT INTO notifications (user_id, title, message, type, data)
VALUES (
    'f30c3989-63fb-49da-ab39-168cbe9b6c82',
    'RLS Test Notification',
    'Testing if service role can insert notifications',
    'status_update',
    '{"test": true}'
);

-- 7. Verify the test notification was inserted
SELECT 
    id,
    user_id,
    title,
    message,
    type,
    data,
    created_at
FROM notifications 
WHERE title = 'RLS Test Notification'
ORDER BY created_at DESC
LIMIT 1;

-- 8. Check if there are any constraints that might cause issues
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'notifications';

-- 9. Check auth.users table permissions for the customer
SELECT 
    au.id,
    au.email,
    au.role,
    au.created_at
FROM auth.users au
WHERE au.id = 'f30c3989-63fb-49da-ab39-168cbe9b6c82';
