-- 🚨 MANUAL TEST: Call start_asap_matching_uber_style directly on existing trip
-- This will tell us if the function works or what's failing

-- Test on the most recent trip
SELECT 'Testing start_asap_matching_uber_style on trip: e280b170-307a-44e2-b980-002b4a9504a3' as test_info;

-- Call the function manually
SELECT * FROM start_asap_matching_uber_style('e280b170-307a-44e2-b980-002b4a9504a3'::UUID);

-- Check the result
SELECT 
    id,
    status,
    assigned_driver_id,
    acceptance_deadline,
    load_description,
    CASE 
        WHEN assigned_driver_id IS NOT NULL THEN '✅ NOW ASSIGNED!'
        ELSE '❌ STILL NOT ASSIGNED'
    END as result_status
FROM trip_requests 
WHERE id = 'e280b170-307a-44e2-b980-002b4a9504a3';
