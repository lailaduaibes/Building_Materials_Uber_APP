-- ========================================
-- Test Trip Expiration System 
-- ========================================
-- Simple test to verify trip expiration handling works

-- 1. Check if cleanup function exists
SELECT 'cleanup_expired_trip_requests function exists' as test_name,
       CASE 
           WHEN EXISTS (
               SELECT 1 FROM pg_proc 
               WHERE proname = 'cleanup_expired_trip_requests'
           ) THEN '✅ PASS'
           ELSE '❌ FAIL - Function missing'
       END as result;

-- 2. Test the cleanup function 
SELECT 'Running cleanup function' as test_name,
       cleanup_expired_trip_requests() as expired_count;

-- 3. Check current trip status distribution
SELECT 'Current trip status' as test_name,
       status,
       COUNT(*) as count
FROM trip_requests 
GROUP BY status
ORDER BY status;

-- 4. Check for trips that should be expired but aren't
SELECT 'Trips that should be expired' as test_name,
       COUNT(*) as should_be_expired_count
FROM trip_requests
WHERE status = 'pending' 
AND acceptance_deadline < NOW();

-- 5. Check for old scheduled trips
SELECT 'Old scheduled trips (>2h past pickup time)' as test_name,
       COUNT(*) as old_scheduled_count
FROM trip_requests
WHERE status = 'pending' 
AND pickup_time_preference = 'scheduled'
AND scheduled_pickup_time < NOW() - INTERVAL '2 hours';

-- 6. Show what drivers should see (active trips only)
SELECT 'Active trips for drivers' as test_name,
       COUNT(*) as active_trip_count
FROM trip_requests 
WHERE status = 'pending' 
AND acceptance_deadline > NOW()
AND (
    pickup_time_preference != 'scheduled' 
    OR scheduled_pickup_time > NOW() - INTERVAL '30 minutes'
);

-- 7. Final summary
SELECT 
    '=== EXPIRATION SYSTEM SUMMARY ===' as summary,
    (SELECT COUNT(*) FROM trip_requests WHERE status = 'pending') as total_pending,
    (SELECT COUNT(*) FROM trip_requests WHERE status = 'expired') as total_expired,
    (SELECT COUNT(*) FROM trip_requests WHERE status = 'pending' AND acceptance_deadline < NOW()) as needs_expiring;
