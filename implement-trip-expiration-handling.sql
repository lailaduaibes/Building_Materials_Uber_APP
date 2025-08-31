-- ========================================
-- Trip Expiration Handling Implementation
-- ========================================
-- This script implements proper handling for expired trip requests
-- to ensure drivers don't see stale trips from the past

-- Ensure the cleanup function exists and is working properly
CREATE OR REPLACE FUNCTION cleanup_expired_trip_requests()
    RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Update expired requests
    UPDATE trip_requests 
    SET status = 'expired'
    WHERE status = 'pending' 
    AND acceptance_deadline < NOW();
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    -- Log cleanup action (try to insert, ignore if system_logs doesn't exist)
    BEGIN
        INSERT INTO system_logs (level, message, metadata, created_at)
        VALUES ('info', 'Cleaned up expired trip requests', 
                jsonb_build_object('expired_count', expired_count), NOW());
    EXCEPTION WHEN OTHERS THEN
        -- Ignore if system_logs table doesn't exist
        NULL;
    END;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Test the function works
SELECT cleanup_expired_trip_requests() as expired_trips_cleaned;

-- Also clean up any scheduled trips that are far in the past
-- (These would be missed scheduled pickups)
UPDATE trip_requests 
SET status = 'expired'
WHERE status = 'pending' 
AND pickup_time_preference = 'scheduled'
AND scheduled_pickup_time < NOW() - INTERVAL '2 hours'; -- Give 2-hour grace period

-- Check current trip status distribution
SELECT 
    status,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE acceptance_deadline < NOW()) as should_be_expired,
    COUNT(*) FILTER (WHERE scheduled_pickup_time < NOW() - INTERVAL '2 hours') as missed_scheduled
FROM trip_requests 
GROUP BY status
ORDER BY status;

-- Show any trips that should be expired but aren't
SELECT 
    id,
    status,
    pickup_time_preference,
    scheduled_pickup_time,
    acceptance_deadline,
    EXTRACT(MINUTE FROM (NOW() - acceptance_deadline)) as minutes_overdue,
    created_at
FROM trip_requests
WHERE status = 'pending' 
AND (
    acceptance_deadline < NOW() 
    OR (pickup_time_preference = 'scheduled' AND scheduled_pickup_time < NOW() - INTERVAL '2 hours')
)
ORDER BY acceptance_deadline DESC;

-- Create an index to improve expiration queries if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_trip_requests_expiration 
ON trip_requests (status, acceptance_deadline) 
WHERE status = 'pending';

-- Create an index for scheduled trip expiration
CREATE INDEX IF NOT EXISTS idx_trip_requests_scheduled_expiration 
ON trip_requests (status, pickup_time_preference, scheduled_pickup_time) 
WHERE status = 'pending' AND pickup_time_preference = 'scheduled';

-- Final verification: Show active trips that drivers should see
SELECT 
    'Active trips (what drivers should see)' as description,
    COUNT(*) as count
FROM trip_requests 
WHERE status = 'pending' 
AND acceptance_deadline > NOW()
AND (pickup_time_preference != 'scheduled' OR scheduled_pickup_time > NOW() - INTERVAL '30 minutes');

-- Show expired trips that should be hidden
SELECT 
    'Expired trips (should be hidden from drivers)' as description,
    COUNT(*) as count
FROM trip_requests 
WHERE status IN ('expired') 
OR (status = 'pending' AND acceptance_deadline < NOW());

COMMENT ON FUNCTION cleanup_expired_trip_requests IS 'Cleans up expired trip requests - called by driver app before showing available trips';
