-- Create a test ASAP trip at your exact driver location
-- This will guarantee the ASAP system matches you

INSERT INTO trip_requests (
    customer_id,
    pickup_latitude, 
    pickup_longitude,
    pickup_address,
    delivery_latitude,
    delivery_longitude, 
    delivery_address,
    material_type,
    estimated_weight_tons,
    load_description,
    special_requirements,
    required_truck_type_id,
    requires_crane,
    requires_hydraulic_lift,
    pickup_time_preference,
    scheduled_pickup_time,
    estimated_duration_minutes,
    estimated_distance_km,
    quoted_price,
    status,
    payment_status,
    paid_amount,
    payment_processed_at,
    payment_transaction_id
) VALUES (
    'c9911957-47c1-4ff3-94d8-1f9c87e60a4c', -- Use existing customer ID
    '32.38882269537229', -- EXACT driver latitude
    '35.321972744900584', -- EXACT driver longitude
    '{
        "city": "Test City",
        "state": "Test State", 
        "street": "Test Pickup Street",
        "postal_code": "12345",
        "formatted_address": "Test Pickup Location - Exact Driver Location"
    }'::jsonb,
    '32.390000', -- Nearby delivery location
    '35.330000',
    '{
        "city": "Test Delivery City",
        "state": "Test State",
        "street": "Test Delivery Street", 
        "postal_code": "54321",
        "formatted_address": "Test Delivery Location - Flatbed Compatible"
    }'::jsonb,
    'steel_beams',
    3.5,
    'TEST ASAP Trip - Exact Driver Location',
    '"This is a test ASAP trip for exact driver location"'::jsonb,
    'c14a47b8-f4b8-4986-8031-fac2153f21e0', -- Flatbed Truck ID
    false,
    false,
    'asap',
    NULL,
    45,
    0.2,
    85.50,
    'pending',
    'pending',
    85.50,
    NOW(),
    'TXN_TEST_' || gen_random_uuid()
);

-- Show the created trip
SELECT 
    'NEW EXACT LOCATION ASAP TRIP CREATED:' as result,
    id,
    material_type,
    load_description,
    pickup_time_preference,
    status,
    required_truck_type_id,
    pickup_address->>'formatted_address' as pickup,
    delivery_address->>'formatted_address' as delivery,
    quoted_price,
    created_at
FROM trip_requests 
WHERE load_description LIKE '%TEST ASAP Trip - Exact Driver Location%'
ORDER BY created_at DESC
LIMIT 1;

-- Trigger ASAP matching for this trip
WITH latest_test_trip AS (
    SELECT id 
    FROM trip_requests 
    WHERE load_description LIKE '%TEST ASAP Trip - Exact Driver Location%'
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    '🚨 TRIGGERING ASAP MATCHING:' as action,
    start_asap_matching(id) as result
FROM latest_test_trip;

-- Check if driver requests were created
SELECT 
    '📱 CHECKING DRIVER NOTIFICATIONS:' as info,
    COUNT(*) as notifications_created,
    array_agg(DISTINCT assigned_driver_id) as drivers_notified,
    array_agg(DISTINCT original_trip_id) as original_trips
FROM trip_requests 
WHERE original_trip_id IN (
    SELECT id 
    FROM trip_requests 
    WHERE load_description LIKE '%TEST ASAP Trip - Exact Driver Location%'
    ORDER BY created_at DESC 
    LIMIT 1
);

SELECT '🎯 If you see driver notifications created, check your driver app now!' as final_message;
