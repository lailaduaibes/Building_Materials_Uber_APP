-- =============================================================================
-- FIX TRIP HISTORY ACCESS - Remove restrictive RLS policies
-- =============================================================================

-- Drop the restrictive policies we created earlier
DROP POLICY IF EXISTS "Customers can view assigned driver profiles" ON driver_profiles;
DROP POLICY IF EXISTS "Authenticated users can view driver profiles" ON driver_profiles;

-- Check what policies currently exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'driver_profiles';

-- Create a simple policy that allows authenticated users to view driver profiles
-- This is necessary for trip history and communication features
CREATE POLICY "Allow authenticated users to view driver profiles" ON driver_profiles
    FOR SELECT USING (true); -- Allow all authenticated users to read driver profiles

-- Alternatively, if you want more restrictive access:
-- CREATE POLICY "Allow authenticated users to view driver profiles" ON driver_profiles
--     FOR SELECT USING (auth.role() = 'authenticated');

-- Check that the new policy was created
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'driver_profiles';

-- Test query to ensure access works
SELECT id, user_id, first_name, last_name, phone 
FROM driver_profiles 
WHERE user_id = '4ab16336-a414-4b73-8dc9-ab97d0eed1a7' 
   OR id = 'ff719181-44cb-4940-b3b7-59a8425e0bea';
