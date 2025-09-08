-- 🔔 TEST YOUMATS PUSH NOTIFICATIONS 
-- Creates an ASAP trip to test your branded notification system

-- 1. First check available drivers for notification targeting
SELECT 
    '🚛 AVAILABLE DRIVERS FOR NOTIFICATION TEST:' as info,
    dp.user_id,
    dp.first_name || ' ' || dp.last_name as driver_name,
    dp.is_available,
    dp.is_approved,
    dp.status,
    dl.latitude,
    dl.longitude,
    EXTRACT(MINUTE FROM (NOW() - dl.updated_at)) as location_age_minutes
FROM driver_profiles dp
LEFT JOIN driver_locations dl ON dp.user_id = dl.driver_id
WHERE dp.is_available = true 
  AND dp.is_approved = true
  AND dp.status = 'online'
ORDER BY dl.updated_at DESC
LIMIT 5;

-- 2. Get truck type for the test trip
WITH truck_info AS (
    SELECT 
        id as truck_type_id,
        name as truck_name
    FROM truck_types 
    WHERE name ILIKE '%pickup%' OR name ILIKE '%small%' OR name ILIKE '%flatbed%'
    LIMIT 1
)
SELECT 
    '🚚 USING TRUCK TYPE:' as info,
    truck_type_id,
    truck_name
FROM truck_info;

-- 3. Create ASAP trip that will trigger YouMats notifications
WITH truck_type AS (
    SELECT id as truck_type_id 
    FROM truck_types 
    WHERE name ILIKE '%pickup%' OR name ILIKE '%small%' OR name ILIKE '%flatbed%'
    LIMIT 1
),
new_trip_id AS (
    SELECT gen_random_uuid() as trip_id
)
INSERT INTO trip_requests (
    id,
    customer_name,
    customer_phone,
    pickup_address,
    delivery_address,
    load_description,
    load_weight,
    load_volume,
    required_truck_type_id,
    trip_type,
    pickup_time_preference,
    status,
    created_at,
    pickup_time,
    -- Additional fields for ASAP system
    matching_started_at,
    acceptance_deadline
)
SELECT 
    new_trip_id.trip_id,
    'YouMats Test Customer',
    '+1-555-YOUMATS',
    jsonb_build_object(
        'street', '123 YouMats Pickup Location',
        'city', 'Test City',
        'state', 'Test State',
        'lat', 32.387000,
        'lng', 35.324000,
        'formatted_address', '123 YouMats Pickup Location, Test City'
    ),
    jsonb_build_object(
        'street', '456 YouMats Delivery Destination', 
        'city', 'Test City',
        'state', 'Test State',
        'lat', 32.397000,
        'lng', 35.334000,
        'formatted_address', '456 YouMats Delivery Destination, Test City'
    ),
    'YOUMATS NOTIFICATION TEST - ' || to_char(NOW(), 'YYYY-MM-DD HH24:MI:SS') || ' - Building materials delivery',
    750.0,  -- Weight in lbs
    3.5,    -- Volume in cubic meters
    truck_type.truck_type_id,
    'asap',
    'asap',
    'pending',
    NOW(),
    NOW(),
    NOW(),
    NOW() + INTERVAL '10 minutes'  -- 10 minute acceptance window
FROM truck_type, new_trip_id;

-- 4. Get the created trip details
WITH latest_test_trip AS (
    SELECT 
        id,
        customer_name,
        load_description,
        status,
        created_at
    FROM trip_requests 
    WHERE load_description LIKE 'YOUMATS NOTIFICATION TEST -%'
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    '🆕 YOUMATS TEST TRIP CREATED:' as status,
    id as trip_id,
    customer_name,
    load_description,
    status,
    created_at
FROM latest_test_trip;

-- 5. Start ASAP matching (this should trigger YouMats notifications!)
WITH test_trip AS (
    SELECT id
    FROM trip_requests 
    WHERE load_description LIKE 'YOUMATS NOTIFICATION TEST -%'
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    '🎯 STARTING ASAP MATCHING (NOTIFICATIONS SHOULD FIRE!):' as action,
    start_asap_matching(id) as matching_result
FROM test_trip;

-- 6. Check if driver-specific requests were created (these trigger notifications)
WITH test_trip AS (
    SELECT id as original_id
    FROM trip_requests 
    WHERE load_description LIKE 'YOUMATS NOTIFICATION TEST -%'
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    '🚨 DRIVER NOTIFICATIONS SENT TO:' as notification_status,
    COUNT(*) as total_notifications,
    string_agg(
        COALESCE(dp.first_name || ' ' || dp.last_name, 'Driver ' || tr.assigned_driver_id::text), 
        ', '
    ) as notified_drivers
FROM trip_requests tr
LEFT JOIN driver_profiles dp ON tr.assigned_driver_id = dp.user_id
CROSS JOIN test_trip tt
WHERE tr.original_trip_id = tt.original_id;

-- 7. Show active driver-specific requests with countdown
WITH test_trip AS (
    SELECT id as original_id
    FROM trip_requests 
    WHERE load_description LIKE 'YOUMATS NOTIFICATION TEST -%'
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    '⏰ ACTIVE YOUMATS NOTIFICATIONS:' as info,
    tr.id as driver_request_id,
    dp.first_name || ' ' || dp.last_name as driver_name,
    tr.acceptance_deadline,
    CASE 
        WHEN tr.acceptance_deadline > NOW() THEN 
            EXTRACT(SECOND FROM (tr.acceptance_deadline - NOW())) || ' seconds remaining'
        ELSE 'EXPIRED'
    END as time_remaining,
    tr.status
FROM trip_requests tr
LEFT JOIN driver_profiles dp ON tr.assigned_driver_id = dp.user_id
CROSS JOIN test_trip tt
WHERE tr.original_trip_id = tt.original_id
ORDER BY tr.created_at;

-- 8. Final verification and instructions
SELECT 
    '📱 YOUMATS NOTIFICATION TEST COMPLETE!' as final_status,
    'Check your driver app now - you should see YouMats branded notifications!' as instruction,
    'Notifications should show the YouMats logo and "YouMats Driver" branding' as branding_note;

-- 9. Cleanup command (run this later to remove test data)
\echo ''
\echo '🧹 TO CLEANUP TEST DATA LATER, RUN:'
\echo 'DELETE FROM trip_requests WHERE load_description LIKE ''YOUMATS NOTIFICATION TEST -%'';'
