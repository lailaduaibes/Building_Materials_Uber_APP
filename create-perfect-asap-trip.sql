-- Create a perfect ASAP trip compatible with your exact location and truck type

-- Step 1: Update your driver location to match your current GPS coordinates
INSERT INTO driver_locations (driver_id, latitude, longitude, updated_at)
VALUES ('2bd7bd97-5cf9-431f-adfc-4ec4448be52c', 32.38882269537229, 35.321972744900584, NOW())
ON CONFLICT (driver_id) 
DO UPDATE SET 
    latitude = 32.38882269537229,
    longitude = 35.321972744900584,
    updated_at = NOW();

-- Step 2: Get your truck type ID
SELECT 
    '🚛 YOUR TRUCK TYPE:' as info,
    selected_truck_type_id,
    vehicle_model,
    vehicle_plate
FROM driver_profiles 
WHERE user_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

-- Step 3: Create a new ASAP trip very close to your location (only 0.5km away)
WITH your_truck AS (
    SELECT selected_truck_type_id
    FROM driver_profiles 
    WHERE user_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c'
    LIMIT 1
)
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
)
SELECT 
    'c9911957-47c1-4ff3-94d8-1f9c87e60a4c', -- existing customer
    '32.393000', -- Very close pickup: ~0.5km from your location  
    '35.327000',
    '{
        "city": "Your City",
        "state": "Your State", 
        "street": "Perfect Pickup Location - 500m away",
        "postal_code": "12345",
        "formatted_address": "🎯 PERFECT PICKUP - Compatible with your truck!"
    }'::jsonb,
    '32.400000', -- Close delivery
    '35.335000',
    '{
        "city": "Delivery City",
        "state": "Your State",
        "street": "Perfect Delivery Location", 
        "postal_code": "54321",
        "formatted_address": "🏁 PERFECT DELIVERY - Easy route!"
    }'::jsonb,
    'construction_materials', 
    2.5, -- Reasonable weight
    '🎯 PERFECT ASAP Trip - ' || to_char(NOW(), 'HH24:MI:SS') || ' - Compatible with your truck type!',
    '"Perfect ASAP trip created for your location and truck type"'::jsonb,
    selected_truck_type_id, -- YOUR truck type!
    false, 
    false, 
    'asap', -- ASAP trip
    NULL, 
    30, -- Short 30-minute trip
    2.1, -- Close distance
    75.00, -- Good earnings
    'pending', 
    'pending', 
    75.00, 
    NOW(), 
    'TXN_PERFECT_' || gen_random_uuid()
FROM your_truck;

-- Step 4: Show the created trip
SELECT 
    '🎯 PERFECT TRIP CREATED:' as result,
    id,
    load_description,
    pickup_address->>'formatted_address' as pickup,
    delivery_address->>'formatted_address' as delivery,
    required_truck_type_id,
    quoted_price,
    status,
    created_at
FROM trip_requests 
WHERE load_description LIKE '%PERFECT ASAP Trip -%'
ORDER BY created_at DESC
LIMIT 1;

-- Step 5: Test proximity with your exact coordinates
SELECT 
    '🔍 PROXIMITY TEST WITH YOUR LOCATION:' as test,
    driver_id,
    driver_name,
    distance_km,
    'SHOULD BE VERY CLOSE!' as note
FROM find_nearby_available_drivers(
    32.393000, -- pickup coordinates  
    35.327000,
    10,        -- 10km radius
    60         -- 60 minutes
);

-- Step 6: Trigger ASAP matching for the perfect trip
WITH perfect_trip AS (
    SELECT id 
    FROM trip_requests 
    WHERE load_description LIKE '%PERFECT ASAP Trip -%'
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    '🚀 STARTING PERFECT ASAP MATCHING:' as action,
    start_asap_matching(id) as result
FROM perfect_trip;

-- Step 7: Verify driver-specific requests were created
SELECT 
    '🎯 DRIVER REQUESTS FOR PERFECT TRIP:' as info,
    tr.id,
    tr.assigned_driver_id,
    dp.first_name || ' ' || dp.last_name as driver_name,
    tr.status,
    tr.acceptance_deadline,
    CASE 
        WHEN tr.acceptance_deadline > NOW() THEN '🟢 ACTIVE - Check your app now!'
        ELSE '🔴 EXPIRED'
    END as request_status,
    EXTRACT(SECOND FROM (tr.acceptance_deadline - NOW())) as seconds_remaining
FROM trip_requests tr
LEFT JOIN driver_profiles dp ON tr.assigned_driver_id = dp.user_id
WHERE tr.original_trip_id IN (
    SELECT id FROM trip_requests 
    WHERE load_description LIKE '%PERFECT ASAP Trip -%'
    ORDER BY created_at DESC 
    LIMIT 1
)
ORDER BY tr.created_at DESC;

SELECT '🎉 PERFECT ASAP TRIP READY! Check your driver app for the popup!' as final_message;
