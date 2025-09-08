-- Add INSERT policy for driver_earnings table to allow drivers to create their own earnings
-- This enables testing while maintaining security (drivers can only insert for themselves)

-- Add INSERT policy for driver earnings
CREATE POLICY "Drivers can insert own earnings" ON driver_earnings
    FOR INSERT WITH CHECK (driver_id = auth.uid());

-- Optionally, also add UPDATE policy for drivers to update their own earnings
CREATE POLICY "Drivers can update own earnings" ON driver_earnings
    FOR UPDATE USING (driver_id = auth.uid()) WITH CHECK (driver_id = auth.uid());

-- Check that the policies are created
SELECT 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'driver_earnings'
ORDER BY policyname;
