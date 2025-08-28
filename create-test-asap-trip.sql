-- Create a test ASAP trip that matches your driver's Flatbed Truck
-- This will appear on your driver app screen

-- First, let's get your driver's truck type ID for Flatbed Truck
SELECT 
    'Your driver truck types:' as info,
    id,
    name,
    description
FROM truck_types 
WHERE name ILIKE '%flatbed%' OR name ILIKE '%flat%'
LIMIT 5;

-- Create a new ASAP trip request that your Flatbed driver can accept
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
    required_truck_type_id, -- This will be NULL so any truck can take it
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
    'c9911957-47c1-4ff3-94d8-1f9c87e60a4c', -- Use existing customer ID from your data
    '32.387000', -- Near your other trips
    '35.324000',
    '{
        "city": "Test City",
        "state": "Test State", 
        "street": "Test Pickup Street",
        "postal_code": "12345",
        "formatted_address": "Test Pickup Location - Flatbed Compatible"
    }'::jsonb,
    '32.390000', -- Close delivery location
    '35.330000',
    '{
        "city": "Test Delivery City",
        "state": "Test State",
        "street": "Test Delivery Street", 
        "postal_code": "54321",
        "formatted_address": "Test Delivery Location - Flatbed Compatible"
    }'::jsonb,
    'steel_beams', -- Good for flatbed trucks
    3.5, -- Weight in tons
    'TEST ASAP Trip - Flatbed Compatible Steel Beams', -- Clear identifier
    '"This is a test ASAP trip for flatbed trucks"'::jsonb, -- Special requirements as JSONB
    'c14a47b8-f4b8-4986-8031-fac2153f21e0', -- YOUR Flatbed Truck ID!
    false, -- No crane needed
    false, -- No hydraulic lift needed
    'asap', -- THIS IS KEY - ASAP trip
    NULL, -- No scheduled time
    45, -- Estimated duration
    5.2, -- Distance in km
    85.50, -- Price
    'pending', -- Ready for ASAP matching
    'pending', -- Payment status
    85.50, -- Paid amount
    NOW(), -- Payment processed
    'TXN_TEST_' || gen_random_uuid() -- Transaction ID
);

-- Show the created trip
SELECT 
    'NEW TEST ASAP TRIP CREATED:' as result,
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
WHERE load_description LIKE '%TEST ASAP Trip - Flatbed Compatible%'
ORDER BY created_at DESC
LIMIT 1;

-- Now test the ASAP matching with this new trip
WITH latest_test_trip AS (
    SELECT id 
    FROM trip_requests 
    WHERE load_description LIKE '%TEST ASAP Trip - Flatbed Compatible%'
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    'STARTING ASAP MATCHING FOR TEST TRIP:' as action,
    start_asap_matching(id) as result
FROM latest_test_trip;

-- Check if driver requests were created
SELECT 
    'DRIVER REQUESTS CREATED:' as info,
    COUNT(*) as count,
    array_agg(assigned_driver_id) as drivers_notified
FROM trip_requests tr1
WHERE original_trip_id IN (
    SELECT id 
    FROM trip_requests 
    WHERE load_description LIKE '%TEST ASAP Trip - Flatbed Compatible%'
    ORDER BY created_at DESC 
    LIMIT 1
);

SELECT 'Test ASAP trip created and matching started! Check your driver app.' as final_message;
