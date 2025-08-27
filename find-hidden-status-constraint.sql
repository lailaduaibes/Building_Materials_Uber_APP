-- =============================================================================
-- FIND THE HIDDEN STATUS CONSTRAINT
-- =============================================================================

-- Step 1: Check for ANY constraint with 'status' in the name or definition
SELECT 
    cc.constraint_name,
    tc.constraint_type,
    tc.table_name,
    cc.check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.table_constraints tc ON cc.constraint_name = tc.constraint_name
WHERE tc.table_name = 'trip_tracking'
   OR cc.check_clause ILIKE '%status%'
   OR cc.constraint_name ILIKE '%status%'
ORDER BY cc.constraint_name;

-- Step 2: Check ALL constraints on trip_tracking table (corrected query)
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause,
    kcu.column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
LEFT JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'trip_tracking'
ORDER BY tc.constraint_type, tc.constraint_name;

-- Step 3: Try to insert with a simple status to see the exact error
DO $$
BEGIN
    BEGIN
        INSERT INTO trip_tracking (trip_id, driver_id, driver_latitude, driver_longitude, status)
        VALUES (
            '15602341-c486-4855-9951-237917a8f849'::uuid,
            '2bd7bd97-5cf9-431f-adfc-4ec4448be52c'::uuid,
            32.387637,
            35.318435,
            'test_status'
        );
        RAISE NOTICE 'SUCCESS: test_status insertion worked';
        
        -- Clean up immediately
        DELETE FROM trip_tracking WHERE trip_id = '15602341-c486-4855-9951-237917a8f849'::uuid;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'ERROR: %', SQLERRM;
        RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
    END;
END $$;

-- Step 4: Test with the problematic 'in_transit' status
DO $$
BEGIN
    BEGIN
        INSERT INTO trip_tracking (trip_id, driver_id, driver_latitude, driver_longitude, status)
        VALUES (
            '15602341-c486-4855-9951-237917a8f849'::uuid,
            '2bd7bd97-5cf9-431f-adfc-4ec4448be52c'::uuid,
            32.387637,
            35.318435,
            'in_transit'
        );
        RAISE NOTICE 'SUCCESS: in_transit insertion worked';
        
        -- Clean up immediately
        DELETE FROM trip_tracking WHERE trip_id = '15602341-c486-4855-9951-237917a8f849'::uuid;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'ERROR with in_transit: %', SQLERRM;
        RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
    END;
END $$;

-- Step 5: Look for constraints in the PostgreSQL catalog directly
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'trip_tracking'::regclass
ORDER BY conname;
