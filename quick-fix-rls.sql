-- Quick fix for driver profiles RLS policies
-- This script adds missing RLS policies to allow drivers to manage their profiles

-- Enable RLS on driver_profiles if not already enabled  
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Drivers can manage own profile" ON driver_profiles;
DROP POLICY IF EXISTS "Users can view driver profiles" ON driver_profiles;
DROP POLICY IF EXISTS "Service role access driver profiles" ON driver_profiles;

-- Create comprehensive policy for drivers to manage their own profile
CREATE POLICY "Drivers can manage own profile" ON driver_profiles
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for authenticated users to view driver profiles (for matching)
CREATE POLICY "Users can view driver profiles" ON driver_profiles
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Service role policy for backend operations
CREATE POLICY "Service role access driver profiles" ON driver_profiles
FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role')
WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
