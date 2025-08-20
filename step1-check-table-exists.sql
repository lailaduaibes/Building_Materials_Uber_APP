-- Run these queries ONE BY ONE to diagnose the users table issue

-- Query 1: Check if users table exists and RLS status
SELECT 
    'users table exists' as status,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';

-- If nothing shows up, the table might not exist. Try this:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%user%';
