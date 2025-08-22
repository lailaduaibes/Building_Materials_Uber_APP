-- EXECUTE THIS SQL TO ANALYZE THE PROBLEM
-- Copy and paste this into your Supabase SQL editor

-- 1. Check if Laila's user_id exists in the CURRENT referenced table (public.users)
SELECT 
    'CURRENT_FK_TARGET_CHECK' as check_type,
    id, 
    email, 
    first_name, 
    last_name,
    role,
    created_at
FROM users
WHERE id = '3a4e01cf-ade1-47d6-9a89-901ec04b8471';

-- 2. Check if Laila's user exists in auth.users  
SELECT 
    'AUTH_USERS_CHECK' as check_type,
    id, 
    email,
    created_at
FROM auth.users
WHERE id = '3a4e01cf-ade1-47d6-9a89-901ec04b8471';

-- 3. Check all existing trucks with current_driver_id to see the pattern
SELECT 
    'EXISTING_TRUCKS_PATTERN' as check_type,
    id,
    license_plate,
    current_driver_id,
    created_at
FROM trucks 
WHERE current_driver_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check if there are any users in public.users at all
SELECT 
    'PUBLIC_USERS_COUNT' as check_type,
    COUNT(*) as total_users,
    COUNT(CASE WHEN role = 'driver' THEN 1 END) as driver_users
FROM users;

-- 5. See what users exist in both tables and which don't match
SELECT 
    'USER_TABLE_MISMATCH' as check_type,
    'Missing in public.users but exists in auth.users' as issue,
    au.id,
    au.email
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL
LIMIT 5;
