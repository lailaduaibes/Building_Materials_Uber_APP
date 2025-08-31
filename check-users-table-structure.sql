-- Check users table structure and data
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

-- Check a sample user record
SELECT 
    id,
    email,
    first_name,
    last_name,
    phone,
    role,
    created_at,
    last_seen
FROM users 
LIMIT 3;

-- =============================================================================

-- Check if there are any users at all
SELECT COUNT(*) as total_users FROM users;

-- =============================================================================

-- Check for RLS policies on users table
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
