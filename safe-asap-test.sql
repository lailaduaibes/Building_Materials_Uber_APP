-- Safe ASAP test that handles driver ID issues

-- Step 1: Find ANY approved and available driver in the system
SELECT 
    '🔍 FINDING AVAILABLE DRIVER:' as action,
    user_id,
    first_name || ' ' || last_name as name,
    is_approved,
    is_available,
    status
FROM driver_profiles 
WHERE is_approved = true AND is_available = true
ORDER BY created_at DESC
LIMIT 1;

-- Step 2: Create location for the FIRST available driver (whoever it is)
WITH available_driver AS (
    SELECT user_id FROM driver_profiles 
    WHERE is_approved = true AND is_available = true
    ORDER BY created_at DESC
    LIMIT 1
)
INSERT INTO driver_locations (driver_id, latitude, longitude, updated_at)
SELECT user_id, 32.38882269537229, 35.321972744900584, NOW()
FROM available_driver
ON CONFLICT (driver_id) 
DO UPDATE SET 
    latitude = 32.38882269537229,
    longitude = 35.321972744900584,
    updated_at = NOW();

-- Step 3: Verify location was added
SELECT 
    '📍 DRIVER LOCATION READY:' as status,
    dl.driver_id,
    dp.first_name || ' ' || dp.last_name as driver_name,
    dl.latitude,
    dl.longitude,
    dl.updated_at,
    'LOCATION SET!' as note
FROM driver_locations dl
JOIN driver_profiles dp ON dl.driver_id = dp.user_id
WHERE dp.is_approved = true AND dp.is_available = true
ORDER BY dl.updated_at DESC
LIMIT 1;

-- Step 4: Test proximity function
SELECT 
    '🔍 PROXIMITY TEST:' as test,
    driver_id,
    driver_name,
    distance_km,
    'DRIVER FOUND!' as result
FROM find_nearby_available_drivers(
    32.390000, -- pickup coordinates (close to location)
    35.323000,
    10,        -- 10km radius
    60         -- 60 minutes
);

-- Step 5: Create customer ASAP trip (no driver specified)
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
    '32.390000', -- Very close to driver location
    '35.323000',
    '{
        "city": "Customer City",
        "state": "State", 
        "street": "Customer Pickup Location",
        "postal_code": "12345",
        "formatted_address": "🚨 SAFE Customer ASAP Test - Working system!"
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
    'SAFE Customer ASAP - ' || to_char(NOW(), 'HH24:MI:SS') || ' - System test!',
    '"Safe ASAP test with verified driver data"'::jsonb,
    NULL, -- No specific truck type
    false, 
    false, 
    'asap', 
    NULL, 
    25, 
    2.5, 
    90.00, 
    'pending', 
    'completed', 
    90.00, 
    NOW(), 
    'TXN_SAFE_' || gen_random_uuid()
);

-- Step 6: Get the new trip
WITH safe_trip AS (
    SELECT id, load_description
    FROM trip_requests 
    WHERE load_description LIKE 'SAFE Customer ASAP -%'
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    '🛒 SAFE TRIP CREATED:' as result,
    id,
    load_description
FROM safe_trip;

-- Step 7: Trigger ASAP matching
WITH safe_trip AS (
    SELECT id 
    FROM trip_requests 
    WHERE load_description LIKE 'SAFE Customer ASAP -%'
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    '🚀 TRIGGERING SAFE ASAP MATCHING:' as action,
    start_asap_matching(id) as result
FROM safe_trip;

-- Step 8: Check for driver notifications
SELECT 
    '📱 DRIVER NOTIFICATIONS:' as check,
    tr.id,
    tr.assigned_driver_id,
    dp.first_name || ' ' || dp.last_name as driver_name,
    tr.status,
    tr.acceptance_deadline,
    CASE 
        WHEN tr.acceptance_deadline > NOW() THEN '🟢 ACTIVE - CHECK DRIVER APP!'
        ELSE '🔴 Expired'
    END as notification_status,
    EXTRACT(SECOND FROM (tr.acceptance_deadline - NOW())) as seconds_remaining
FROM trip_requests tr
LEFT JOIN driver_profiles dp ON tr.assigned_driver_id = dp.user_id
WHERE tr.original_trip_id IN (
    SELECT id FROM trip_requests 
    WHERE load_description LIKE 'SAFE Customer ASAP -%'
    ORDER BY created_at DESC 
    LIMIT 1
)
ORDER BY tr.created_at DESC;

SELECT '✅ SAFE ASAP TEST COMPLETE! Check the driver app that is approved and available!' as final_message;
