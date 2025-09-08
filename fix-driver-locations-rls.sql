-- Fix RLS policies for driver_locations table to allow proper location updates

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Drivers can update their own location" ON driver_locations;
DROP POLICY IF EXISTS "System can read driver locations" ON driver_locations;

-- Create more permissive policies for driver location updates
CREATE POLICY "Drivers can manage their location"
    ON driver_locations
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Allow service role full access
CREATE POLICY "Service role full access to driver_locations"
    ON driver_locations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- System can read all driver locations for matching
CREATE POLICY "Public read access for location matching"
    ON driver_locations
    FOR SELECT
    TO authenticated, anon
    USING (true);

-- Log the changes
SELECT 'Driver locations RLS policies updated successfully' as status;

-- Show current policies
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
WHERE tablename = 'driver_locations'
ORDER BY policyname;
