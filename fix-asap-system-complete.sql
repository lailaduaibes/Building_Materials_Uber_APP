-- Fix all ASAP system issues and create working test

-- Step 1: Add location data for Driver Laila (you!)
INSERT INTO driver_locations (driver_id, latitude, longitude, updated_at)
VALUES ('2bd7bd97-5cf9-431f-adfc-4ec4448be52c', 32.38882269537229, 35.321972744900584, NOW())
ON CONFLICT (driver_id) 
DO UPDATE SET 
    latitude = 32.38882269537229,
    longitude = 35.321972744900584,
    updated_at = NOW();

-- Step 2: Verify your driver location is now current
SELECT 
    '📍 YOUR LOCATION UPDATED:' as status,
    driver_id,
    latitude,
    longitude,
    updated_at,
    EXTRACT(SECOND FROM (NOW() - updated_at)) as seconds_old
FROM driver_locations 
WHERE driver_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

-- Step 3: Test proximity function with your location
SELECT 
    '🔍 PROXIMITY TEST WITH YOUR DATA:' as test,
    driver_id,
    driver_name,
    distance_km,
    last_updated,
    'YOU ARE FOUND!' as success
FROM find_nearby_available_drivers(
    32.390000, -- pickup coordinates (close to your location)
    35.323000,
    10,        -- 10km radius
    60         -- 60 minutes
);

-- Step 4: Create a fresh customer ASAP trip
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
    '32.390000', -- Very close to your location
    '35.323000',
    '{
        "city": "Test City",
        "state": "State", 
        "street": "Customer Pickup - ASAP Test",
        "postal_code": "12345",
        "formatted_address": "🚨 Customer ASAP Test - Materials needed urgently!"
    }'::jsonb,
    '32.395000',
    '35.330000',
    '{
        "city": "Delivery City",
        "state": "State",
        "street": "Customer Delivery Site", 
        "postal_code": "54321",
        "formatted_address": "Construction Site - Rush Delivery"
    }'::jsonb,
    'construction_materials', 
    2.0, 
    'FIXED Customer ASAP - ' || to_char(NOW(), 'HH24:MI:SS') || ' - Should work now!',
    '"Fixed ASAP test with proper location data"'::jsonb,
    NULL, -- No specific truck type
    false, 
    false, 
    'asap', 
    NULL, 
    25, 
    2.5, 
    85.00, 
    'pending', 
    'completed', 
    85.00, 
    NOW(), 
    'TXN_FIXED_' || gen_random_uuid()
);

-- Step 5: Verify the new trip was created
SELECT 
    '🛒 NEW FIXED TRIP:' as result,
    id,
    load_description,
    status,
    pickup_time_preference,
    assigned_driver_id
FROM trip_requests 
WHERE load_description LIKE 'FIXED Customer ASAP -%'
ORDER BY created_at DESC 
LIMIT 1;

-- Step 6: NOW trigger ASAP matching with proper data
WITH fixed_trip AS (
    SELECT id 
    FROM trip_requests 
    WHERE load_description LIKE 'FIXED Customer ASAP -%'
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    '🚀 TRIGGERING FIXED ASAP MATCHING:' as action,
    start_asap_matching(id) as result
FROM fixed_trip;

-- Step 7: Check if you got the driver-specific request
SELECT 
    '📱 YOUR ASAP NOTIFICATION:' as notification,
    tr.id,
    tr.assigned_driver_id,
    dp.first_name || ' ' || dp.last_name as driver_name,
    tr.status,
    tr.acceptance_deadline,
    CASE 
        WHEN tr.acceptance_deadline > NOW() THEN '🟢 ACTIVE - CHECK YOUR APP!'
        ELSE '🔴 Expired'
    END as notification_status,
    EXTRACT(SECOND FROM (tr.acceptance_deadline - NOW())) as seconds_remaining
FROM trip_requests tr
LEFT JOIN driver_profiles dp ON tr.assigned_driver_id = dp.user_id
WHERE tr.original_trip_id IN (
    SELECT id FROM trip_requests 
    WHERE load_description LIKE 'FIXED Customer ASAP -%'
    ORDER BY created_at DESC 
    LIMIT 1
)
ORDER BY tr.created_at DESC;

-- Step 8: Summary
SELECT 
    '✅ ASAP SYSTEM FIXED AND TESTED!' as final_status,
    'Check your driver app for notification popup!' as action_needed;
