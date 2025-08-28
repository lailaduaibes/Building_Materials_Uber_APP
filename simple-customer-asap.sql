-- Create a simple customer ASAP trip without touching driver data
-- Your app is already tracking your location, so we just need to create the trip

-- Step 1: Create a REAL customer ASAP trip near your current location
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
    required_truck_type_id, -- NULL = ANY driver can take it
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
    '32.390000', -- Close to your location: 32.38882269537229
    '35.323000', -- Close to your location: 35.321972744900584
    '{
        "city": "Customer City",
        "state": "State", 
        "street": "Customer Pickup Location",
        "postal_code": "12345",
        "formatted_address": "Customer needs materials delivered ASAP!"
    }'::jsonb,
    '32.395000', -- Short delivery
    '32.330000',
    '{
        "city": "Delivery City",
        "state": "State",
        "street": "Customer Delivery Site", 
        "postal_code": "54321",
        "formatted_address": "Construction Site - Rush Delivery"
    }'::jsonb,
    'building_materials', 
    2.5, 
    'Customer ASAP Request - ' || to_char(NOW(), 'HH24:MI:SS') || ' - Urgent delivery needed!',
    '"Customer urgent request - construction crew waiting for materials"'::jsonb,
    NULL, -- ✅ No specific truck type - ANY driver can accept
    false, 
    false, 
    'asap', -- ✅ ASAP request from customer
    NULL, 
    30, 
    3.8, 
    100.00, -- Good payment
    'pending', -- ✅ Waiting for driver to accept
    'completed', -- Customer already paid
    100.00, 
    NOW(), 
    'TXN_CUSTOMER_' || gen_random_uuid()
);

-- Step 2: Get the new trip
WITH customer_trip AS (
    SELECT id, load_description
    FROM trip_requests 
    WHERE load_description LIKE 'Customer ASAP Request -%'
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    '🛒 CUSTOMER ASAP TRIP:' as result,
    id,
    load_description
FROM customer_trip;

-- Step 3: Verify it's a proper ASAP trip (no driver/truck assigned)
SELECT 
    '✅ TRIP READY:' as status,
    id,
    status,
    assigned_driver_id,
    required_truck_type_id,
    pickup_time_preference,
    quoted_price
FROM trip_requests 
WHERE load_description LIKE 'Customer ASAP Request -%'
ORDER BY created_at DESC
LIMIT 1;

-- Step 4: Trigger ASAP matching (this finds nearby drivers automatically)
WITH customer_trip AS (
    SELECT id 
    FROM trip_requests 
    WHERE load_description LIKE 'Customer ASAP Request -%'
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    '🚀 STARTING ASAP MATCHING:' as action,
    start_asap_matching(id) as result
FROM customer_trip;

-- Step 5: Check for notifications sent to drivers
SELECT 
    '📱 DRIVER NOTIFICATIONS:' as check,
    COUNT(*) as notifications_sent,
    array_agg(DISTINCT assigned_driver_id) as drivers_notified
FROM trip_requests 
WHERE original_trip_id IN (
    SELECT id FROM trip_requests 
    WHERE load_description LIKE 'Customer ASAP Request -%'
    ORDER BY created_at DESC 
    LIMIT 1
);

SELECT '🎯 Customer ASAP trip ready! Check your driver app for notification!' as message;
