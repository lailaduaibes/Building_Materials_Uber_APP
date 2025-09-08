-- 🔍 Check All Triggers on trip_requests Table
-- Run these SQL commands to see what triggers fire when ASAP trips are created

-- 1. Check all triggers on trip_requests table
SELECT 
    trigger_name,
    event_manipulation as trigger_event,
    action_timing as when_triggered,
    action_statement as trigger_function
FROM information_schema.triggers 
WHERE event_object_table = 'trip_requests'
ORDER BY trigger_name;

-- 2. Get detailed trigger information with function names
SELECT 
    t.trigger_name,
    t.event_manipulation,
    t.action_timing,
    t.action_orientation,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM information_schema.triggers t
LEFT JOIN pg_proc p ON p.proname = regexp_replace(
    regexp_replace(t.action_statement, '.*EXECUTE (FUNCTION|PROCEDURE) ', ''), 
    '\(.*\)', ''
)
WHERE t.event_object_table = 'trip_requests'
ORDER BY t.trigger_name;

-- 3. Check for ASAP-specific triggers (search for 'asap' in trigger names or functions)
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'trip_requests'
  AND (LOWER(trigger_name) LIKE '%asap%' 
       OR LOWER(action_statement) LIKE '%asap%')
ORDER BY trigger_name;

-- 4. Check all functions that might be related to ASAP or trip processing
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as function_code
FROM pg_proc 
WHERE LOWER(proname) LIKE '%asap%' 
   OR LOWER(proname) LIKE '%trip%'
   OR LOWER(proname) LIKE '%assign%'
   OR LOWER(proname) LIKE '%match%'
ORDER BY proname;

-- 5. Check for any functions that reference trip_requests table
SELECT DISTINCT
    p.proname as function_name,
    p.prosrc as function_source
FROM pg_proc p
WHERE LOWER(p.prosrc) LIKE '%trip_requests%'
   AND p.proname NOT LIKE 'pg_%'
ORDER BY p.proname;
