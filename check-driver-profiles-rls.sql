-- Check RLS policies on driver_profiles table that are blocking driver registration

-- 1. Check if RLS is enabled on driver_profiles
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    (SELECT count(*) FROM pg_policies WHERE tablename = 'driver_profiles' AND schemaname = 'public') as policy_count
FROM pg_tables 
WHERE tablename = 'driver_profiles' AND schemaname = 'public';

-- 2. List all policies on driver_profiles table
SELECT 
    policyname,
    cmd as operation,
    roles,
    qual as using_condition,
    with_check as with_check_condition
FROM pg_policies 
WHERE tablename = 'driver_profiles' AND schemaname = 'public'
ORDER BY cmd, policyname;

-- 3. Test what authentication context the driver registration runs under
SELECT 
    current_user as current_db_user,
    session_user as session_db_user;

-- 4. Check if auth.uid() returns anything (this is what RLS policies usually check)
SELECT auth.uid() as auth_user_id;
