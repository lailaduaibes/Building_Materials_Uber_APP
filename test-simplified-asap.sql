-- Test the Simplified ASAP system with exact driver location
-- Create ASAP trip at exact driver coordinates: 32.38882269537229, 35.321972744900584

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
    'c9911957-47c1-4ff3-94d8-1f9c87e60a4c',
    '32.38882269537229', -- EXACT driver latitude from logs
    '35.321972744900584', -- EXACT driver longitude from logs
    '{
        "city": "Test City",
        "state": "Test State", 
        "street": "Test Pickup Street",
        "postal_code": "12345",
        "formatted_address": "📍 EXACT Driver Location - Simplified ASAP Test"
    }'::jsonb,
    '32.390000',
    '35.330000',
    '{
        "city": "Test Delivery City",
        "state": "Test State",
        "street": "Test Delivery Street", 
        "postal_code": "54321",
        "formatted_address": "📍 Delivery Location - Simplified ASAP Test"
    }'::jsonb,
    'steel_beams',
    2.5,
    '🚨 SIMPLIFIED ASAP TEST - Steel Beams Delivery',
    '"Urgent delivery test for simplified ASAP system"'::jsonb,
    'c14a47b8-f4b8-4986-8031-fac2153f21e0',
    false,
    false,
    'asap', -- ASAP trip
    NULL,
    30,
    0.1, -- Very close distance
    120.00,
    'pending', -- Will be picked up by polling system
    'pending',
    120.00,
    NOW(),
    'TXN_SIMPLE_' || gen_random_uuid()
);

-- Show the created trip with debug info
SELECT 
    '🚨 ASAP TRIP CREATED - DEBUG INFO' as result,
    id,
    material_type,
    load_description,
    pickup_time_preference,
    status,
    assigned_driver_id,
    pickup_latitude,
    pickup_longitude,
    pickup_address->>'formatted_address' as pickup,
    delivery_address->>'formatted_address' as delivery,
    quoted_price,
    created_at,
    -- Check if trip meets ASAP criteria
    CASE 
        WHEN pickup_time_preference = 'asap' AND status = 'pending' AND assigned_driver_id IS NULL
        THEN '✅ SHOULD BE DETECTED AS ASAP'
        ELSE '❌ NOT ASAP ELIGIBLE'
    END as asap_eligibility
FROM trip_requests 
WHERE load_description LIKE '%SIMPLIFIED ASAP TEST%'
ORDER BY created_at DESC
LIMIT 1;

-- Show all recent ASAP trips for comparison
SELECT 
    '📊 ALL RECENT ASAP TRIPS' as info,
    COUNT(*) as total_asap_trips
FROM trip_requests 
WHERE pickup_time_preference = 'asap' 
AND created_at > NOW() - INTERVAL '1 hour';

-- Show the exact trip data that DriverService would see
SELECT 
    '🔍 TRIP AS DRIVERSERVICE SEES IT' as debug,
    id,
    pickup_time_preference,
    status,
    assigned_driver_id,
    customer_id,
    material_type,
    load_description,
    pickup_latitude::numeric as pickup_lat_num,
    pickup_longitude::numeric as pickup_lng_num
FROM trip_requests 
WHERE load_description LIKE '%SIMPLIFIED ASAP TEST%'
ORDER BY created_at DESC
LIMIT 1;

SELECT '✅ ASAP trip created! Check terminal for [ASAP DEBUG] logs.' as message;
