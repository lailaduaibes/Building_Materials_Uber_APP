-- Create a realistic ASAP trip as a customer would (no specific driver assigned)
-- This will test the automatic nearby driver detection and notification system

-- Step 1: Update your driver location first
INSERT INTO driver_locations (driver_id, latitude, longitude, updated_at)
VALUES ('2bd7bd97-5cf9-431f-adfc-4ec4448be52c', 32.38882269537229, 35.321972744900584, NOW())
ON CONFLICT (driver_id) 
DO UPDATE SET 
    latitude = 32.38882269537229,
    longitude = 35.321972744900584,
    updated_at = NOW();

-- Step 2: Make sure you're available and approved  
UPDATE driver_profiles 
SET 
    is_available = true,
    is_approved = true,
    status = 'online'
WHERE user_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

-- Step 3: Create a customer ASAP trip (no driver assigned - just like real customer)
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
    required_truck_type_id, -- NULL so any truck type can take it
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
    'c9911957-47c1-4ff3-94d8-1f9c87e60a4c', -- existing customer
    '32.395000', -- Very close pickup: ~0.7km from your location  
    '35.325000',
    '{
        "city": "Test City",
        "state": "Test State", 
        "street": "123 Construction Site",
        "postal_code": "12345",
        "formatted_address": "Construction Site - Need truck ASAP!"
    }'::jsonb,
    '32.405000', -- Delivery location
    '35.340000',
    '{
        "city": "Delivery City",
        "state": "Test State",
        "street": "456 Build Site Avenue", 
        "postal_code": "54321",
        "formatted_address": "New Construction Project Site"
    }'::jsonb,
    'cement_bags', 
    3.2, -- Reasonable weight
    'Customer ASAP Request - ' || to_char(NOW(), 'HH24:MI:SS') || ' - Need cement bags delivered urgently!',
    '"Customer needs cement bags delivered ASAP for construction project"'::jsonb,
    NULL, -- No specific truck type required - any driver can take it
    false, 
    false, 
    'asap', -- THIS IS THE KEY - ASAP request from customer
    NULL, -- No scheduled time
    40, -- 40-minute trip
    3.5, -- Distance in km
    95.00, -- Good earnings for urgent delivery
    'pending', -- Waiting for driver to accept
    'completed', -- Customer already paid
    95.00, 
    NOW(), 
    'TXN_CUSTOMER_' || gen_random_uuid()
);

-- Step 4: Get the trip ID that was just created
WITH new_customer_trip AS (
    SELECT id, load_description
    FROM trip_requests 
    WHERE load_description LIKE 'Customer ASAP Request -%'
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    '🛒 CUSTOMER ASAP TRIP CREATED:' as result,
    id,
    load_description
FROM new_customer_trip;

-- Step 5: Verify the trip is in pending state (no driver assigned yet)
SELECT 
    '📋 TRIP STATUS:' as info,
    id,
    status,
    assigned_driver_id,
    pickup_time_preference,
    quoted_price,
    'Ready for ASAP matching!' as note
FROM trip_requests 
WHERE load_description LIKE 'Customer ASAP Request -%'
ORDER BY created_at DESC
LIMIT 1;

-- Step 6: Test if you would be found by proximity search
SELECT 
    '🔍 PROXIMITY TEST - WOULD YOU BE FOUND?:' as test,
    driver_id,
    driver_name,
    distance_km,
    'This is what the system should find!' as note
FROM find_nearby_available_drivers(
    32.395000, -- pickup coordinates from customer trip
    35.325000,
    10,        -- 10km radius
    60         -- 60 minutes
);

-- Step 7: NOW trigger ASAP matching (this simulates what happens when customer submits)
WITH customer_trip AS (
    SELECT id 
    FROM trip_requests 
    WHERE load_description LIKE 'Customer ASAP Request -%'
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    '🚀 CUSTOMER TRIP - STARTING ASAP MATCHING:' as action,
    start_asap_matching(id) as result
FROM customer_trip;

-- Step 8: Check if you received a driver-specific request
SELECT 
    '📱 YOUR ASAP NOTIFICATION:' as notification_check,
    tr.id,
    tr.assigned_driver_id,
    dp.first_name || ' ' || dp.last_name as your_name,
    tr.status,
    tr.acceptance_deadline,
    CASE 
        WHEN tr.acceptance_deadline > NOW() THEN '🔔 YOU SHOULD GET NOTIFICATION NOW!'
        ELSE '❌ Request expired'
    END as notification_status,
    EXTRACT(SECOND FROM (tr.acceptance_deadline - NOW())) as seconds_to_respond
FROM trip_requests tr
LEFT JOIN driver_profiles dp ON tr.assigned_driver_id = dp.user_id
WHERE tr.original_trip_id IN (
    SELECT id FROM trip_requests 
    WHERE load_description LIKE 'Customer ASAP Request -%'
    ORDER BY created_at DESC 
    LIMIT 1
)
ORDER BY tr.created_at DESC;

SELECT '🎉 CUSTOMER ASAP TRIP READY! This is exactly how real customers create trips!' as final_message;
