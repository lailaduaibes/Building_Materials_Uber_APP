-- Create a NEW test ASAP trip and verify the fixed matching system works

-- First, let's check if we have available drivers with fresh location data
SELECT 
    '🚛 AVAILABLE DRIVERS AFTER FIX:' as check_type,
    dp.user_id,
    dp.first_name || ' ' || dp.last_name as name,
    dp.is_available,
    dp.is_approved,
    dp.status,
    dl.updated_at,
    EXTRACT(MINUTE FROM (NOW() - dl.updated_at)) as minutes_ago
FROM driver_profiles dp
LEFT JOIN driver_locations dl ON dp.user_id = dl.driver_id
WHERE dp.is_available = true AND dp.is_approved = true
ORDER BY dl.updated_at DESC;

-- Get a truck type ID for our test
WITH truck_type AS (
    SELECT id as truck_type_id 
    FROM truck_types 
    WHERE name ILIKE '%flatbed%' OR name ILIKE '%pickup%'
    LIMIT 1
)
-- Create a NEW test ASAP trip
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
    status,
    created_at,
    pickup_time
)
SELECT 
    gen_random_uuid(),
    'Test Customer - FRESH',
    '+1234567890',
    '{"street": "123 Test Pickup Street", "city": "Test City", "lat": 32.387000, "lng": 35.324000}'::jsonb,
    '{"street": "456 Test Delivery Ave", "city": "Test City", "lat": 32.397000, "lng": 35.334000}'::jsonb,
    'FRESH TEST ASAP Trip - ' || to_char(NOW(), 'HH24:MI:SS'),
    500.0,
    2.0,
    truck_type_id,
    'asap',
    'pending',
    NOW(),
    NOW()
FROM truck_type;

-- Get the new trip ID
WITH new_trip AS (
    SELECT id, load_description
    FROM trip_requests 
    WHERE load_description LIKE 'FRESH TEST ASAP Trip -%'
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    '🆕 NEW TEST TRIP CREATED:' as info,
    id,
    load_description
FROM new_trip;

-- Now start ASAP matching for the new trip
WITH new_trip AS (
    SELECT id
    FROM trip_requests 
    WHERE load_description LIKE 'FRESH TEST ASAP Trip -%'
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    '🎯 STARTING ASAP MATCHING:' as action,
    start_asap_matching(id) as matching_result
FROM new_trip;

-- Check if driver-specific requests were created
SELECT 
    '🚨 DRIVER REQUESTS CREATED:' as info,
    COUNT(*) as total_requests,
    array_agg(DISTINCT assigned_driver_id) as drivers_notified
FROM trip_requests 
WHERE original_trip_id IN (
    SELECT id FROM trip_requests 
    WHERE load_description LIKE 'FRESH TEST ASAP Trip -%'
);

-- Show the status of our new trip
SELECT 
    '📊 NEW TRIP STATUS:' as info,
    id,
    status,
    matching_started_at,
    assigned_driver_id,
    load_description
FROM trip_requests 
WHERE load_description LIKE 'FRESH TEST ASAP Trip -%'
ORDER BY created_at DESC;

-- Show all driver-specific requests for this trip
SELECT 
    '🎯 DRIVER-SPECIFIC REQUESTS:' as info,
    tr.id,
    tr.assigned_driver_id,
    dp.first_name || ' ' || dp.last_name as driver_name,
    tr.acceptance_deadline,
    EXTRACT(SECOND FROM (tr.acceptance_deadline - NOW())) as seconds_remaining
FROM trip_requests tr
LEFT JOIN driver_profiles dp ON tr.assigned_driver_id = dp.user_id
WHERE tr.original_trip_id IN (
    SELECT id FROM trip_requests 
    WHERE load_description LIKE 'FRESH TEST ASAP Trip -%'
)
ORDER BY tr.created_at;

SELECT '✅ Test complete! Check your driver app dashboard now!' as final_message;
