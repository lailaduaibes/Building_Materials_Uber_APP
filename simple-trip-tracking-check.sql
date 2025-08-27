-- =============================================================================
-- SIMPLE CHECK OF TRIP_TRACKING TABLE CURRENT STATE
-- =============================================================================

-- Check if trip_tracking table exists and what's in it
SELECT 
    COUNT(*) as total_records,
    array_agg(DISTINCT status) as existing_statuses
FROM trip_tracking;

-- Check specific trip we're testing
SELECT 
    id,
    trip_id,
    driver_id,
    driver_latitude,
    driver_longitude,
    status,
    created_at
FROM trip_tracking
WHERE trip_id = '15602341-c486-4855-9951-237917a8f849'
ORDER BY created_at DESC;

-- Check what statuses are currently being used
SELECT 
    status,
    COUNT(*) as count
FROM trip_tracking
GROUP BY status
ORDER BY count DESC;

-- Check recent entries to see the pattern
SELECT 
    id,
    trip_id,
    status,
    created_at
FROM trip_tracking
ORDER BY created_at DESC
LIMIT 10;
