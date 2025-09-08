-- Check all trips with pending status and their timing information
\echo '=== PENDING TRIPS ANALYSIS ==='

-- 1. Count of pending trips
\echo '1. Total pending trips:'
SELECT COUNT(*) as pending_trips_count 
FROM trip_requests 
WHERE status = 'pending';

-- 2. Detailed pending trips analysis
\echo '2. Detailed pending trips (showing first 20):'
SELECT 
    substring(id, 1, 8) as trip_id_short,
    status,
    created_at,
    updated_at,
    assigned_driver_id,
    considering_driver_id,
    acceptance_deadline,
    substring(pickup_address, 1, 30) as pickup_addr_short,
    substring(delivery_address, 1, 30) as delivery_addr_short,
    material_type,
    quoted_price,
    -- Calculate how long ago the trip was created
    ROUND(EXTRACT(EPOCH FROM (NOW() - created_at))/3600, 2) as hours_since_created,
    -- Calculate how long ago it was updated
    ROUND(EXTRACT(EPOCH FROM (NOW() - updated_at))/3600, 2) as hours_since_updated,
    -- Check if acceptance_deadline has passed
    CASE 
        WHEN acceptance_deadline IS NOT NULL AND acceptance_deadline < NOW() 
        THEN 'EXPIRED' 
        ELSE 'NOT_EXPIRED' 
    END as deadline_status
FROM trip_requests 
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 20;

-- 3. Count by status to see distribution
\echo '3. Trip status distribution:'
SELECT status, COUNT(*) as count
FROM trip_requests 
GROUP BY status 
ORDER BY count DESC;

-- 4. Check for trips that should have expired (older than 1 hour in pending)
\echo '4. Trips that should have expired (pending > 1 hour):'
SELECT 
    substring(id, 1, 8) as trip_id_short,
    status,
    created_at,
    ROUND(EXTRACT(EPOCH FROM (NOW() - created_at))/3600, 2) as hours_since_created,
    acceptance_deadline,
    CASE 
        WHEN acceptance_deadline IS NOT NULL AND acceptance_deadline < NOW() 
        THEN 'EXPIRED' 
        ELSE 'NOT_EXPIRED' 
    END as deadline_status
FROM trip_requests 
WHERE status = 'pending' 
AND EXTRACT(EPOCH FROM (NOW() - created_at))/3600 > 1
ORDER BY created_at;

-- 5. Check if there are any cleanup functions or triggers
\echo '5. Checking for automatic cleanup functions:'
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%cleanup%' 
   OR routine_name LIKE '%expire%' 
   OR routine_name LIKE '%pending%'
   OR routine_definition LIKE '%pending%';
