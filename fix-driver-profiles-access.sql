-- =============================================================================
-- FIX DRIVER PROFILES ACCESS ISSUES
-- =============================================================================

-- Check current RLS policies on driver_profiles table
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
WHERE tablename = 'driver_profiles';

-- Temporarily disable RLS on driver_profiles for debugging (REMOVE IN PRODUCTION)
-- ALTER TABLE driver_profiles DISABLE ROW LEVEL SECURITY;

-- Create a policy that allows customers to view driver profiles for their assigned trips
CREATE POLICY "Customers can view assigned driver profiles" ON driver_profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM trip_requests 
            WHERE trip_requests.assigned_driver_id = driver_profiles.id 
               OR trip_requests.assigned_driver_id = driver_profiles.user_id
        )
        OR auth.role() = 'service_role'
    );

-- Create a policy that allows authenticated users to view driver profiles
CREATE POLICY "Authenticated users can view driver profiles" ON driver_profiles
    FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Check if policies were created successfully
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'driver_profiles' 
    AND policyname IN ('Customers can view assigned driver profiles', 'Authenticated users can view driver profiles');

-- Test query that should work
SELECT id, user_id, first_name, last_name, phone 
FROM driver_profiles 
WHERE user_id = '4ab16336-a414-4b73-8dc9-ab97d0eed1a7' 
   OR id = 'ff719181-44cb-4940-b3b7-59a8425e0bea';
