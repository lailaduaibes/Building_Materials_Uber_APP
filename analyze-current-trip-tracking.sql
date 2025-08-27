-- =============================================================================
-- COMPREHENSIVE TRIP_TRACKING TABLE ANALYSIS
-- =============================================================================

-- Step 1: Check if trip_tracking table exists and get its schema
SELECT 
    table_name,
    table_schema,
    table_type
FROM information_schema.tables 
WHERE table_name = 'trip_tracking';

-- Step 2: Get complete table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale,
    ordinal_position
FROM information_schema.columns 
WHERE table_name = 'trip_tracking'
ORDER BY ordinal_position;

-- Step 3: Check ALL constraints on trip_tracking table
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause,
    kcu.column_name,
    rc.referenced_table_name,
    rc.referenced_column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
LEFT JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'trip_tracking'
ORDER BY tc.constraint_type, tc.constraint_name;

-- Step 4: Check RLS policies
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

-- Step 5: Check current data in table
SELECT COUNT(*) as total_records FROM trip_tracking;

-- Step 6: Check what status values are currently in use
SELECT 
    status,
    COUNT(*) as count
FROM trip_tracking
GROUP BY status
ORDER BY count DESC;

-- Step 7: Check recent records structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'trip_tracking'
AND column_name IN ('status', 'trip_id', 'driver_id', 'driver_latitude', 'driver_longitude')
ORDER BY ordinal_position;

-- Step 8: Show sample records (if any exist)
SELECT 
    id,
    trip_id,
    driver_id,
    status,
    created_at
FROM trip_tracking
ORDER BY created_at DESC
LIMIT 5;
