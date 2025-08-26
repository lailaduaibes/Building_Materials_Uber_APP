-- Check RLS policies on notifications table

-- 1. Check if RLS is enabled on notifications table
SELECT 
    schemaname, 
    tablename, 
    pg_class.relrowsecurity as rowsecurity, 
    pg_class.relforcerowsecurity as forcerowsecurity 
FROM pg_tables 
JOIN pg_class ON pg_class.relname = pg_tables.tablename 
WHERE tablename = 'notifications';

-- 2. Check existing RLS policies on notifications table
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
WHERE tablename = 'notifications';

-- 3. Check notifications table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- 4. Check current user context (to understand what user is trying to insert)
SELECT current_user, session_user;

-- 5. Try to see what's in notifications table currently (if any)
SELECT id, trip_id, customer_id, driver_id, created_at, message_type
FROM notifications 
LIMIT 5;
