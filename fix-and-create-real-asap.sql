-- Fix the issue and create a REAL customer ASAP trip (no specific truck/driver requirements)

-- Step 1: Update your driver location to your current GPS coordinates
INSERT INTO driver_locations (driver_id, latitude, longitude, updated_at)
VALUES ('2bd7bd97-5cf9-431f-adfc-4ec4448be52c', 32.38882269537229, 35.321972744900584, NOW())
ON CONFLICT (driver_id) 
DO UPDATE SET 
    latitude = 32.38882269537229,
    longitude = 35.321972744900584,
    updated_at = NOW();

-- Step 2: Make sure you're available for ASAP requests
UPDATE driver_profiles 
SET 
    is_available = true,
    is_approved = true,
    status = 'online'
WHERE user_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

-- Step 3: Create a REAL customer ASAP trip (NO specific truck type - ANY driver can take it!)
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
    required_truck_type_id, -- NULL = ANY truck type can take it (like real customers)
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
    '32.392000', -- Very close to your location: 32.38882269537229
    '35.325000', -- Very close to your location: 35.321972744900584
    '{
        "city": "Urgent City",
        "state": "State", 
        "street": "Emergency Construction Site",
        "postal_code": "12345",
        "formatted_address": "🚨 URGENT: Construction materials needed ASAP!"
    }'::jsonb,
    '32.398000', -- Short delivery distance
    '35.335000',
    '{
        "city": "Delivery City",
        "state": "State",
        "street": "Building Project Site", 
        "postal_code": "54321",
        "formatted_address": "New Building Project - Rush Delivery"
    }'::jsonb,
    'construction_materials', 
    2.8, 
    'REAL Customer ASAP - ' || to_char(NOW(), 'HH24:MI:SS') || ' - Urgent materials delivery!',
    '"Customer needs materials delivered ASAP - construction crew waiting!"'::jsonb,
    NULL, -- ✅ KEY: No specific truck type = ANY driver can accept
    false, 
    false, 
    'asap', -- ✅ KEY: ASAP request from customer
    NULL, 
    35, 
    4.2, 
    120.00, -- Good urgent delivery payment
    'pending', -- ✅ KEY: Waiting for ASAP matching
    'pending', -- ✅ FIXED: Payment pending - triggers ASAP notifications!
    0.00, -- ✅ FIXED: No payment yet - will be cash on delivery
    NULL, -- ✅ FIXED: No payment processed yet
    NULL -- ✅ FIXED: No transaction ID yet
);

-- Step 4: Get the new trip ID
WITH urgent_trip AS (
    SELECT id, load_description
    FROM trip_requests 
    WHERE load_description LIKE 'REAL Customer ASAP -%'
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    '🚨 URGENT CUSTOMER TRIP CREATED:' as result,
    id,
    load_description
FROM urgent_trip;

-- Step 5: Verify it's a proper customer ASAP trip (no assigned driver/truck)
SELECT 
    '📋 TRIP VERIFICATION:' as check,
    id,
    status,
    assigned_driver_id,
    required_truck_type_id,
    pickup_time_preference,
    'Should be: pending, NULL, NULL, asap' as expected
FROM trip_requests 
WHERE load_description LIKE 'REAL Customer ASAP -%'
ORDER BY created_at DESC
LIMIT 1;

-- Step 6: Test proximity - will you be found?
SELECT 
    '🔍 PROXIMITY CHECK:' as test,
    driver_id,
    driver_name,
    distance_km,
    'YOU should appear here!' as note
FROM find_nearby_available_drivers(
    32.392000, -- pickup coordinates 
    35.325000,
    10,        -- 10km radius
    60         -- 60 minutes
);

-- Step 7: NOW TRIGGER ASAP MATCHING (this is what happens when customer submits)
WITH urgent_trip AS (
    SELECT id 
    FROM trip_requests 
    WHERE load_description LIKE 'REAL Customer ASAP -%'
    ORDER BY created_at DESC 
    LIMIT 1
)
SELECT 
    '🚀 TRIGGERING REAL ASAP MATCHING:' as action,
    start_asap_matching(id) as matching_result
FROM urgent_trip;

-- Step 8: Check if you got a driver-specific ASAP request
SELECT 
    '📱 YOUR ASAP NOTIFICATION CHECK:' as notification,
    tr.id,
    tr.assigned_driver_id,
    dp.first_name || ' ' || dp.last_name as driver_name,
    tr.status,
    tr.acceptance_deadline,
    CASE 
        WHEN tr.acceptance_deadline > NOW() THEN '🔔 YOU SHOULD GET POPUP NOW!'
        ELSE '⏰ Request expired'
    END as popup_status,
    EXTRACT(SECOND FROM (tr.acceptance_deadline - NOW())) as countdown_seconds
FROM trip_requests tr
LEFT JOIN driver_profiles dp ON tr.assigned_driver_id = dp.user_id
WHERE tr.original_trip_id IN (
    SELECT id FROM trip_requests 
    WHERE load_description LIKE 'REAL Customer ASAP -%'
    ORDER BY created_at DESC 
    LIMIT 1
)
ORDER BY tr.created_at DESC;

SELECT '🎉 REAL CUSTOMER ASAP READY! You should get popup notification now!' as final_message;
