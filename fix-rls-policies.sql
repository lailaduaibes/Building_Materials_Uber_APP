-- Fix Row Level Security (RLS) for Driver Profiles
-- Run this in Supabase SQL Editor

-- First, check current RLS policies on driver_profiles
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'driver_profiles';

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'driver_profiles' AND schemaname = 'public';

-- Enable RLS if not already enabled
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow drivers to insert their own profile
CREATE POLICY "Drivers can insert their own profile" ON public.driver_profiles
    FOR INSERT 
    WITH CHECK (user_id = auth.uid());

-- Create policy to allow drivers to view their own profile
CREATE POLICY "Drivers can view their own profile" ON public.driver_profiles
    FOR SELECT 
    USING (user_id = auth.uid());

-- Create policy to allow drivers to update their own profile
CREATE POLICY "Drivers can update their own profile" ON public.driver_profiles
    FOR UPDATE 
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Also need to ensure users table has proper RLS policies
-- Check users table policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'users';

-- Enable RLS on users table if needed
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own data
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT 
    USING (id = auth.uid());

-- Allow users to update their own data
CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE 
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Allow authenticated users to insert (for registration)
CREATE POLICY "Authenticated users can insert their own profile" ON public.users
    FOR INSERT 
    WITH CHECK (id = auth.uid());

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.driver_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;

-- Test the policies by checking what the current user can access
SELECT 
    'Current auth.uid():' as info,
    auth.uid() as current_user_id;

-- Verify driver profile access
SELECT 
    'Driver Profile Access Test' as test,
    dp.user_id,
    dp.rating,
    dp.total_trips
FROM public.driver_profiles dp
WHERE dp.user_id = '7a9ce2f0-db9d-46a7-aef3-c01635d90592';

-- Final verification
SELECT 
    'Final Check' as status,
    u.email,
    u.role,
    dp.rating,
    dp.is_available
FROM public.users u
LEFT JOIN public.driver_profiles dp ON u.id = dp.user_id
WHERE u.id = '7a9ce2f0-db9d-46a7-aef3-c01635d90592';
