-- Check function permissions and RLS for start_asap_matching_uber_style

-- 1. Check function permissions
SELECT 
    'Function security details:' as debug_section,
    p.proname,
    p.proacl,
    p.prosecdef,
    CASE 
        WHEN p.proacl IS NULL THEN 'PUBLIC ACCESS (default)'
        ELSE 'RESTRICTED ACCESS'
    END as access_level
FROM pg_proc p
WHERE p.proname = 'start_asap_matching_uber_style';

-- 2. Check if function is accessible to authenticated users
SELECT 
    'Checking function accessibility:' as debug_section,
    has_function_privilege('authenticated', 'public.start_asap_matching_uber_style(uuid)', 'EXECUTE') as can_execute;

-- 3. Check recent trip_requests that should have triggered the function
SELECT 
    'Recent ASAP trips (last 24 hours):' as debug_section,
    id,
    created_at,
    status,
    pickup_time_preference,
    assigned_driver_id,
    matching_started_at,
    CASE 
        WHEN assigned_driver_id IS NULL THEN 'NEVER ASSIGNED'
        ELSE 'ASSIGNED'
    END as assignment_status
FROM trip_requests 
WHERE pickup_time_preference = 'asap' 
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- 4. Check if there are any function call logs (simplified)
SELECT 
    'Recent function calls:' as debug_section,
    query,
    calls,
    total_exec_time,
    mean_exec_time
FROM pg_stat_statements 
WHERE query ILIKE '%start_asap_matching_uber_style%'
ORDER BY calls DESC
LIMIT 5;
