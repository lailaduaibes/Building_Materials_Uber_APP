-- DEBUG: Check Laila's user_id and verify it exists in users table

-- 1. Check Laila's user_id in driver_profiles
SELECT 
    'DRIVER_PROFILE_DATA' as check_type,
    id AS driver_profile_id, 
    user_id, 
    first_name, 
    phone,
    approval_status,
    is_approved
FROM driver_profiles
WHERE first_name ILIKE '%Laila%' OR phone LIKE '%laila%';

-- 2. Check if this user_id exists in users table (using Laila's actual user_id)
SELECT 
    'USERS_TABLE_CHECK' as check_type,
    id, 
    email, 
    first_name, 
    last_name,
    role
FROM users
WHERE id = '3a4e01cf-ade1-47d6-9a89-901ec04b8471';

-- 3. Check auth.users table (Supabase auth)
SELECT 
    'AUTH_USERS_CHECK' as check_type,
    id, 
    email,
    created_at
FROM auth.users
WHERE id = '3a4e01cf-ade1-47d6-9a89-901ec04b8471';

-- 4. Check what foreign key constraint is actually pointing to
SELECT 
    'FK_CONSTRAINT_INFO' as check_type,
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'trucks'
AND kcu.column_name = 'current_driver_id';
