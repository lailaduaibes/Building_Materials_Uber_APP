-- Check if users table exists and its structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =============================================================================

-- Check if there are any users in the table
SELECT 
    id,
    first_name,
    last_name,
    email,
    role,
    created_at,
    last_seen
FROM users 
LIMIT 5;

-- =============================================================================

-- Check RLS policies on users table
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
WHERE tablename = 'users';

-- =============================================================================

-- Check if RLS is enabled on users table
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'users' 
AND schemaname = 'public';
