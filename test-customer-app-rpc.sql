-- Test to verify if customer app is calling the function
-- This will help us see if there are any errors

-- 1. Test one of the unassigned trips manually to confirm function works
SELECT 'Testing function on unassigned trip' as test_section;
SELECT * FROM start_asap_matching_uber_style('2a2c6606-dc43-418e-be10-6fa11972664b');

-- 2. Check the trip after manual call
SELECT 
    'After manual call:' as debug_section,
    id,
    assigned_driver_id,
    matching_started_at,
    status
FROM trip_requests 
WHERE id = '2a2c6606-dc43-418e-be10-6fa11972664b';

-- 3. Check if customer app is using the wrong table
-- Maybe it's inserting into a different table?
SELECT 
    'Check if trips are in wrong table:' as debug_section,
    table_name,
    column_name
FROM information_schema.columns 
WHERE column_name = 'pickup_time_preference' 
AND table_name != 'trip_requests';

-- 4. Check if there are any logs or errors we can see
SELECT 
    'Recent database activity:' as debug_section,
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes
FROM pg_stat_user_tables 
WHERE tablename IN ('trip_requests', 'trips', 'customer_trips')
ORDER BY n_tup_ins DESC;
