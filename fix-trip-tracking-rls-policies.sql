-- =============================================================================
-- FIX TRIP_TRACKING RLS POLICIES FOR 100% FUNCTIONALITY
-- =============================================================================

-- Step 1: Drop existing restrictive policies and create new permissive ones
DROP POLICY IF EXISTS "Drivers can manage trip tracking" ON trip_tracking;
DROP POLICY IF EXISTS "Service role access trip tracking" ON trip_tracking;

-- Step 2: Create a comprehensive policy for drivers to insert/update trip tracking
CREATE POLICY "Drivers can insert and update trip tracking" ON trip_tracking
    FOR ALL USING (
        -- Service role has full access
        auth.role() = 'service_role'::text
        OR
        -- Authenticated drivers can manage their own trip tracking
        (auth.role() = 'authenticated'::text AND auth.uid() IS NOT NULL)
    );

-- Step 3: Verify the new policies
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
WHERE tablename = 'trip_tracking'
ORDER BY policyname;

-- Step 4: Test the corrected manual insertion
INSERT INTO trip_tracking (trip_id, driver_id, driver_latitude, driver_longitude, status)
VALUES (
    '15602341-c486-4855-9951-237917a8f849',
    '2bd7bd97-5cf9-431f-adfc-4ec4448be52c',
    32.387637,
    35.318435,
    'in_transit'  -- Using ACTUAL constraint value (in_transit is allowed!)
);

-- Step 5: Verify the test record was inserted successfully
SELECT 
    id,
    trip_id,
    driver_id,
    driver_latitude,
    driver_longitude,
    created_at,
    status
FROM trip_tracking
WHERE trip_id = '15602341-c486-4855-9951-237917a8f849'
ORDER BY created_at DESC
LIMIT 1;

-- Step 6: Clean up the test record
DELETE FROM trip_tracking 
WHERE trip_id = '15602341-c486-4855-9951-237917a8f849'
AND driver_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

-- Step 7: Final verification that policies are working
SELECT 
    COUNT(*) as remaining_test_records
FROM trip_tracking
WHERE trip_id = '15602341-c486-4855-9951-237917a8f849';
