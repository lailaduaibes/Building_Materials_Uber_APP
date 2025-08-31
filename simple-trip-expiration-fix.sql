-- ========================================
-- SIMPLE Trip Expiration Fix
-- ========================================
-- You're right! We overcomplicated everything.
-- Simple rule: If pickup time passed and no driver accepted, mark as expired.

-- From the data analysis:
-- - We have 6 pending trips
-- - 4 ASAP trips from Aug 28 (3+ days old) should be expired
-- - 2 scheduled trips for Sept 2 should stay pending (future dates)
-- - The acceptance_deadline field is NOT needed for this simple logic

-- 1. Mark old ASAP trips as expired (older than 1 hour)
UPDATE trip_requests 
SET status = 'expired'
WHERE status = 'pending' 
AND pickup_time_preference = 'asap' 
AND created_at < NOW() - INTERVAL '1 hour';

-- 2. Mark scheduled trips as expired if their pickup time has passed
UPDATE trip_requests 
SET status = 'expired'
WHERE status = 'pending' 
AND pickup_time_preference = 'scheduled' 
AND scheduled_pickup_time < NOW();

-- 3. Show the results
SELECT 
    'AFTER SIMPLE FIX' as summary,
    status,
    COUNT(*) as count
FROM trip_requests 
GROUP BY status
ORDER BY 
    CASE status 
        WHEN 'pending' THEN 1
        WHEN 'expired' THEN 2
        ELSE 3
    END;

-- 4. Show remaining pending trips (these should be visible to drivers)
SELECT 
    'REMAINING PENDING TRIPS' as section,
    id,
    pickup_time_preference,
    scheduled_pickup_time,
    created_at,
    CASE 
        WHEN pickup_time_preference = 'asap' THEN 'Recent ASAP trip'
        WHEN pickup_time_preference = 'scheduled' AND scheduled_pickup_time > NOW() 
             THEN 'Future scheduled trip'
        ELSE 'Should not be here'
    END as reason_still_pending
FROM trip_requests 
WHERE status = 'pending'
ORDER BY created_at DESC;

-- 5. Remove the acceptance_deadline field since we don't need it
-- (Optional - can be done later if you want to clean up the table)
-- ALTER TABLE trip_requests DROP COLUMN IF EXISTS acceptance_deadline;
