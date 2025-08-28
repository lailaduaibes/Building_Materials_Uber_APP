-- Quick check of what your driver app should see

-- 1. Regular trips (current logic)
SELECT 
    'REGULAR TRIPS (current logic)' as type,
    COUNT(*) as count
FROM trip_requests 
WHERE status = 'pending' 
AND assigned_driver_id IS NULL;

-- 2. Driver-specific ASAP requests (missing from current logic)
SELECT 
    'DRIVER-SPECIFIC ASAP REQUESTS (missing)' as type,
    COUNT(*) as count
FROM trip_requests 
WHERE status = 'pending' 
AND assigned_driver_id IS NOT NULL
AND acceptance_deadline IS NOT NULL;

-- 3. Your test trip status
SELECT 
    'TEST TRIP STATUS' as type,
    id,
    status,
    pickup_time_preference,
    assigned_driver_id,
    acceptance_deadline,
    original_trip_id
FROM trip_requests 
WHERE load_description LIKE '%TEST ASAP Trip - Flatbed Compatible%'
ORDER BY created_at DESC;

-- 4. Driver-specific requests for test trip
SELECT 
    'DRIVER REQUESTS FOR TEST TRIP' as type,
    id,
    status,
    assigned_driver_id,
    acceptance_deadline,
    CASE 
        WHEN acceptance_deadline > NOW() THEN 'ACTIVE'
        ELSE 'EXPIRED'
    END as deadline_status
FROM trip_requests 
WHERE original_trip_id IN (
    SELECT id FROM trip_requests 
    WHERE load_description LIKE '%TEST ASAP Trip - Flatbed Compatible%'
);
