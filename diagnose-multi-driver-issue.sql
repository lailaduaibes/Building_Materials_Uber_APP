-- 🔍 DIAGNOSTIC QUERIES TO IDENTIFY MULTI-DRIVER CONFLICTS

-- 1. Check current active considerations
SELECT 
    'Active Considerations' as query_type,
    tr.id as trip_id,
    tr.considering_driver_id,
    tr.acceptance_deadline,
    u.email as driver_email,
    EXTRACT(EPOCH FROM (tr.acceptance_deadline - NOW())) as seconds_until_expiry,
    tr.load_description
FROM trip_requests tr
LEFT JOIN users u ON tr.considering_driver_id = u.id
WHERE tr.pickup_time_preference = 'asap'
  AND tr.status = 'pending'
  AND tr.considering_driver_id IS NOT NULL;

-- 2. Check if there are multiple drivers in the same location
SELECT 
    'Drivers in Same Location' as query_type,
    u.id,
    u.email,
    u.current_latitude,
    u.current_longitude,
    COUNT(*) OVER (PARTITION BY u.current_latitude, u.current_longitude) as drivers_at_same_location
FROM users u
WHERE u.role = 'driver'
  AND u.current_latitude IS NOT NULL
  AND u.current_longitude IS NOT NULL
ORDER BY u.current_latitude, u.current_longitude;

-- 3. Check recent trip assignments to see patterns
SELECT 
    'Recent Trip Patterns' as query_type,
    tr.id as trip_id,
    tr.assigned_driver_id,
    tr.considering_driver_id,
    tr.status,
    tr.matched_at,
    tr.created_at,
    EXTRACT(EPOCH FROM (COALESCE(tr.matched_at, NOW()) - tr.created_at)) as seconds_to_assignment,
    u.email as assigned_driver_email
FROM trip_requests tr
LEFT JOIN users u ON tr.assigned_driver_id = u.id
WHERE tr.pickup_time_preference = 'asap'
  AND tr.created_at > NOW() - INTERVAL '1 hour'
ORDER BY tr.created_at DESC;

-- 4. Look for any orphaned or stuck considerations
SELECT 
    'Orphaned Considerations' as query_type,
    tr.id as trip_id,
    tr.considering_driver_id,
    tr.acceptance_deadline,
    EXTRACT(EPOCH FROM (NOW() - tr.matching_started_at)) as stuck_for_seconds,
    tr.load_description
FROM trip_requests tr
WHERE tr.pickup_time_preference = 'asap'
  AND tr.status = 'pending'
  AND tr.considering_driver_id IS NOT NULL
  AND tr.acceptance_deadline < NOW() - INTERVAL '5 seconds'; -- Expired but not cleaned

-- 5. Check for potential database-level conflicts
SELECT 
    'Database Locks and Conflicts' as query_type,
    COUNT(*) as active_asap_trips,
    COUNT(CASE WHEN considering_driver_id IS NOT NULL THEN 1 END) as trips_under_consideration,
    COUNT(CASE WHEN assigned_driver_id IS NOT NULL THEN 1 END) as assigned_trips,
    COUNT(CASE WHEN considering_driver_id IS NOT NULL AND acceptance_deadline < NOW() THEN 1 END) as expired_considerations
FROM trip_requests
WHERE pickup_time_preference = 'asap'
  AND status = 'pending';

-- 6. Simulate the exact driver filtering logic
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '🔍 SIMULATING DRIVER FILTERING LOGIC';
    
    FOR rec IN 
        SELECT 
            u.id,
            u.email,
            u.current_latitude,
            u.current_longitude,
            (SELECT COUNT(*) 
             FROM trip_requests tr 
             WHERE tr.pickup_time_preference = 'asap'
               AND tr.status = 'pending'
               AND tr.pickup_latitude IS NOT NULL
               AND tr.pickup_longitude IS NOT NULL
               AND tr.assigned_driver_id IS NULL 
               AND tr.considering_driver_id IS NULL
               AND (6371 * acos(
                     cos(radians(u.current_latitude)) * 
                     cos(radians(tr.pickup_latitude)) * 
                     cos(radians(tr.pickup_longitude) - radians(u.current_longitude)) + 
                     sin(radians(u.current_latitude)) * 
                     sin(radians(tr.pickup_latitude))
                   )) <= 30
            ) as available_trips_for_driver
        FROM users u
        WHERE u.role = 'driver'
          AND u.current_latitude IS NOT NULL
          AND u.current_longitude IS NOT NULL
    LOOP
        RAISE NOTICE 'Driver % (%) sees % available trips', 
            rec.email, 
            rec.id, 
            rec.available_trips_for_driver;
    END LOOP;
END $$;

-- 7. Run the cleanup function and see what it finds
SELECT clean_expired_asap_trips() as cleaned_up_expired_considerations;
