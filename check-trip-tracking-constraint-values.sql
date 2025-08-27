-- =============================================================================
-- CHECK TRIP_TRACKING TABLE STATUS CONSTRAINT VALUES
-- =============================================================================

-- Step 1: Check the exact constraint definition
SELECT 
    constraint_name,
    check_clause
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%trip_tracking%status%'
   OR constraint_name LIKE '%status%check%'
   OR table_name = 'trip_tracking';

-- Step 2: Check all constraints on trip_tracking table
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'trip_tracking'
ORDER BY tc.constraint_type, tc.constraint_name;

-- Step 3: Check current table structure
\d trip_tracking;

-- Alternative way to see table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'trip_tracking'
ORDER BY ordinal_position;

-- Step 4: Test with different status values to see which ones work
-- First, try the original value that failed
DO $$
BEGIN
    BEGIN
        INSERT INTO trip_tracking (trip_id, driver_id, driver_latitude, driver_longitude, status)
        VALUES (
            '15602341-c486-4855-9951-237917a8f849',
            '2bd7bd97-5cf9-431f-adfc-4ec4448be52c',
            32.387637,
            35.318435,
            'in_transit'
        );
        RAISE NOTICE 'SUCCESS: in_transit is allowed';
    EXCEPTION WHEN check_violation THEN
        RAISE NOTICE 'FAILED: in_transit violates constraint: %', SQLERRM;
    END;
    
    -- Clean up
    DELETE FROM trip_tracking WHERE trip_id = '15602341-c486-4855-9951-237917a8f849' AND status = 'in_transit';
END $$;

-- Step 5: Test with constraint-compliant values
DO $$
DECLARE
    test_statuses text[] := ARRAY['assigned', 'en_route_pickup', 'at_pickup', 'loaded', 'en_route_delivery', 'delivered'];
    status_val text;
BEGIN
    FOREACH status_val IN ARRAY test_statuses
    LOOP
        BEGIN
            INSERT INTO trip_tracking (trip_id, driver_id, driver_latitude, driver_longitude, status)
            VALUES (
                '15602341-c486-4855-9951-237917a8f849',
                '2bd7bd97-5cf9-431f-adfc-4ec4448be52c',
                32.387637,
                35.318435,
                status_val
            );
            RAISE NOTICE 'SUCCESS: % is allowed', status_val;
            
            -- Clean up immediately
            DELETE FROM trip_tracking WHERE trip_id = '15602341-c486-4855-9951-237917a8f849' AND status = status_val;
            
        EXCEPTION WHEN check_violation THEN
            RAISE NOTICE 'FAILED: % violates constraint: %', status_val, SQLERRM;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'ERROR with %: %', status_val, SQLERRM;
        END;
    END LOOP;
END $$;
