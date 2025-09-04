-- 🔍 Check what ASAP functions currently exist in the database

-- 1. Check for existing ASAP matching functions
SELECT 
    routine_name, 
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%asap%' 
   OR routine_name LIKE '%matching%'
ORDER BY routine_name;

-- 2. Check if asap_driver_queue table exists and has data
SELECT 
    COUNT(*) as total_queue_entries,
    COUNT(CASE WHEN notified_at IS NOT NULL THEN 1 END) as notified_entries,
    COUNT(CASE WHEN response_received_at IS NOT NULL THEN 1 END) as responded_entries
FROM asap_driver_queue;

-- 3. Check for recent ASAP trips and their status (AFTER THE FIX)
SELECT 
    tr.id,
    tr.pickup_time_preference,
    tr.status,
    tr.assigned_driver_id,
    tr.created_at,
    COUNT(adq.id) as queue_entries
FROM trip_requests tr
LEFT JOIN asap_driver_queue adq ON tr.id = adq.trip_request_id
WHERE tr.pickup_time_preference = 'asap'
  AND tr.created_at > NOW() - INTERVAL '2 hours'  -- Last 2 hours to see new tests
GROUP BY tr.id, tr.pickup_time_preference, tr.status, tr.assigned_driver_id, tr.created_at
ORDER BY tr.created_at DESC
LIMIT 10;

-- 4. Check what the TripService is actually calling
SELECT '✅ Run this SQL in Supabase to see current state' as instruction;
