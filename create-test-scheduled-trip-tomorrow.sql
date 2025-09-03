-- Create a test scheduled trip for tomorrow (September 3, 2025) at 7:00 AM
-- This will help test the trip expiration functionality

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
    32.38884817361586,
    35.32192772221713,
    '{
        "city": "Test City",
        "state": "Test State", 
        "street": "Test Pickup Street Tomorrow",
        "postal_code": "12345",
        "formatted_address": "Tomorrow 7AM Test Pickup Location"
    }'::jsonb,
    32.390000,
    35.330000,
    '{
        "city": "Test Delivery City",
        "state": "Test State",
        "street": "Test Delivery Street Tomorrow", 
        "postal_code": "54321",
        "formatted_address": "Tomorrow 7AM Test Delivery Location"
    }'::jsonb,
    'concrete_blocks',
    2.50,
    'TEST SCHEDULED Trip for Tomorrow 7AM - Concrete Blocks',
    '{"notes": "This is a test scheduled trip for tomorrow 7AM to test expiration logic"}'::jsonb,
    'scheduled',
    '2025-09-03 04:00:00+00'::timestamp with time zone, -- 7:00 AM local time (UTC+3 = 4:00 AM UTC)
    60,
    8.50,
    120.00,
    'pending',
    'pending',
    120.00,
    NOW(),
    'TXN_TEST_TOMORROW_' || gen_random_uuid()
);

-- Also create an ASAP trip for immediate testing
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
    32.38884817361586,
    35.32192772221713,
    '{
        "city": "Test City",
        "state": "Test State", 
        "street": "Test ASAP Pickup Street",
        "postal_code": "12345",
        "formatted_address": "ASAP Test Pickup Location"
    }'::jsonb,
    32.390000,
    35.330000,
    '{
        "city": "Test Delivery City",
        "state": "Test State",
        "street": "Test ASAP Delivery Street", 
        "postal_code": "54321",
        "formatted_address": "ASAP Test Delivery Location"
    }'::jsonb,
    'sand',
    1.50,
    'TEST ASAP Trip - Sand Delivery',
    '{"notes": "This is a test ASAP trip to test immediate expiration logic"}'::jsonb,
    'asap',
    NULL, -- No scheduled time for ASAP
    30,
    3.20,
    45.00,
    'pending',
    'pending',
    45.00,
    NOW(),
    'TXN_TEST_ASAP_' || gen_random_uuid()
);

-- Show the created trips
SELECT 
    id,
    pickup_time_preference,
    scheduled_pickup_time,
    created_at,
    status,
    load_description,
    CASE 
        WHEN pickup_time_preference = 'scheduled' THEN 
            EXTRACT(EPOCH FROM (scheduled_pickup_time - NOW())) / 3600 || ' hours until pickup'
        ELSE 
            EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 || ' hours since creation'
    END as time_info
FROM trip_requests 
WHERE created_at > NOW() - INTERVAL '5 minutes'
ORDER BY created_at DESC;
