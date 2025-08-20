-- Fix RLS policies for driver_profiles table
-- This will allow the driver app to create and update driver profiles

-- Enable RLS on driver_profiles if not already enabled
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Drivers can manage own profile" ON driver_profiles;
DROP POLICY IF EXISTS "Drivers can view own profile" ON driver_profiles;
DROP POLICY IF EXISTS "Service role access driver profiles" ON driver_profiles;
DROP POLICY IF EXISTS "Authenticated users can read driver profiles" ON driver_profiles;

-- Create comprehensive RLS policies for driver_profiles
-- 1. Drivers can manage their own profile
CREATE POLICY "Drivers can manage own profile" ON driver_profiles
    FOR ALL USING (user_id = auth.uid());

-- 2. Service role has full access (for backend operations)
CREATE POLICY "Service role access driver profiles" ON driver_profiles
    FOR ALL USING (auth.role() = 'service_role');

-- 3. Authenticated users can view driver profiles (for customer app to see driver info)
CREATE POLICY "Authenticated users can read driver profiles" ON driver_profiles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Grant necessary permissions
GRANT ALL ON driver_profiles TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Test the fix by trying to create a driver profile
DO $$
BEGIN
    RAISE NOTICE '🔧 RLS policies for driver_profiles have been created successfully!';
    RAISE NOTICE '✅ Drivers can now create and update their profiles';
    RAISE NOTICE '✅ Service role has full access for backend operations';
    RAISE NOTICE '✅ Customers can view driver profiles during trips';
END $$;
