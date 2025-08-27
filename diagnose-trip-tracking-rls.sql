-- =============================================================================
-- FIX TRIP_TRACKING RLS POLICIES FOR COMPLETE FUNCTIONALITY
-- =============================================================================

-- Step 1: Check current RLS policies on trip_tracking table
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

-- Step 2: Check trip_tracking table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'trip_tracking'
ORDER BY ordinal_position;

-- Step 3: Check if there are any existing trip_tracking records
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
LIMIT 5;

-- Step 4: Test manual insertion to see what the exact error is
INSERT INTO trip_tracking (trip_id, driver_id, driver_latitude, driver_longitude, status)
VALUES (
    '15602341-c486-4855-9951-237917a8f849',
    '2bd7bd97-5cf9-431f-adfc-4ec4448be52c',
    32.387637,
    35.318435,
    'en_route_delivery'  -- Using constraint-compliant status instead of 'in_transit'
);

-- Step 5: Check if the test record was inserted
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
