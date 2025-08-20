-- Check policies and RLS status on public.users table
-- This will help diagnose why driver registration can't insert into public.users

-- 1. Check if RLS is enabled on users table
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    (SELECT count(*) FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public') as policy_count
FROM pg_tables 
WHERE tablename = 'users' AND schemaname = 'public';

-- 2. List all existing policies on users table
SELECT 
    policyname,
    cmd as operation,
    roles,
    qual as using_condition,
    with_check as with_check_condition
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public'
ORDER BY cmd, policyname;

-- 3. Check table structure to understand the users table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'users'
ORDER BY ordinal_position;

-- 4. Check if there are any constraints that might be blocking inserts
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    tc.table_name,
    ccu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
WHERE tc.table_schema = 'public' 
AND tc.table_name = 'users'
ORDER BY tc.constraint_type, tc.constraint_name;

-- 5. Test what happens when we try to insert as anon user (like driver registration does)
-- This will show us the exact error
-- NOTE: This will fail but will show us WHY it fails
INSERT INTO public.users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    phone,
    role,
    user_type,
    is_active
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'test-driver@example.com',
    'supabase_auth',
    'Test',
    'Driver',
    '+1234567890',
    'driver',
    'driver',
    true
);

-- Clean up the test insert (if it worked)
DELETE FROM public.users WHERE id = '00000000-0000-0000-0000-000000000001';
