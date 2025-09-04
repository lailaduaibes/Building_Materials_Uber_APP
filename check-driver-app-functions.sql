-- 🔍 Check ALL trip-related functions in the database

-- 1. Check for ALL trip and ASAP related functions
SELECT 
    routine_name, 
    routine_type,
    CASE 
        WHEN routine_definition IS NULL THEN 'No definition available'
        WHEN LENGTH(routine_definition) > 100 THEN LEFT(routine_definition, 100) || '...'
        ELSE routine_definition 
    END as short_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%trip%' 
   OR routine_name LIKE '%asap%'
   OR routine_name LIKE '%matching%'
   OR routine_name LIKE '%accept%'
   OR routine_name LIKE '%decline%'
ORDER BY routine_name;

-- 2. Specifically check for the functions used by driver app
SELECT 
    routine_name,
    routine_type,
    'EXISTS' as status
FROM information_schema.routines 
WHERE routine_name IN (
    'accept_trip_request',
    'decline_trip_request', 
    'start_asap_matching',
    'start_asap_matching_sequential',
    'handle_asap_driver_response',
    'notify_next_driver_in_queue'
)
ORDER BY routine_name;

-- 3. Check if the queue response system is working
SELECT '🔧 Run this SQL to verify all functions exist' as instruction;
