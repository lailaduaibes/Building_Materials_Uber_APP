-- Test why start_asap_matching_uber_style is not working

-- Step 1: Take one of your existing unassigned trips and manually call the function
SELECT 'Testing start_asap_matching_uber_style on existing trip' as test_info;

-- Use the most recent trip ID from your debug results
SELECT * FROM start_asap_matching_uber_style('e8608137-20e6-49aa-ab16-f5f8115c0174');

-- Step 2: Check if the trip got assigned after manual call
SELECT 
    'After manual function call:' as debug_section,
    id,
    status, 
    assigned_driver_id,
    acceptance_deadline,
    matching_started_at
FROM trip_requests 
WHERE id = 'e8608137-20e6-49aa-ab16-f5f8115c0174';

-- Step 3: Check if the function even exists
SELECT 
    'Function exists check:' as debug_section,
    routine_name,
    routine_type,
    CASE 
        WHEN routine_definition IS NOT NULL THEN 'EXISTS'
        ELSE 'MISSING'
    END as status
FROM information_schema.routines 
WHERE routine_name = 'start_asap_matching_uber_style'
AND routine_schema = 'public';
