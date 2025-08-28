-- COMPLETE ASAP FLOW TEST - Debug everything step by step

-- ==============================================
-- SETUP: Create test data if missing
-- ==============================================

-- 1. Ensure we have proper driver location data
WITH available_driver AS (
    SELECT user_id, first_name || ' ' || last_name as name
    FROM driver_profiles 
    WHERE is_approved = true AND is_available = true 
    LIMIT 1
)
INSERT INTO driver_locations (driver_id, latitude, longitude, updated_at)
SELECT 
    user_id, 
    32.38882269537229,  -- Your current GPS coordinates
    35.321972744900584,
    NOW()
FROM available_driver
ON CONFLICT (driver_id) 
DO UPDATE SET 
    latitude = 32.38882269537229,
    longitude = 35.321972744900584,
    updated_at = NOW();

-- Verify location data was created/updated
SELECT 
    '1️⃣ DRIVER LOCATION SETUP:' as step,
    dl.driver_id,
    dp.first_name || ' ' || dp.last_name as driver_name,
    dl.latitude,
    dl.longitude,
    'SUCCESS' as status
FROM driver_locations dl
JOIN driver_profiles dp ON dl.driver_id = dp.user_id
WHERE dl.updated_at > NOW() - INTERVAL '1 minute';

-- ==============================================
-- STEP 2: Test proximity function directly
-- ==============================================

SELECT 
    '2️⃣ PROXIMITY FUNCTION TEST:' as step,
    driver_id,
    driver_name,
    distance_km,
    'FOUND' as result
FROM find_nearby_available_drivers(
    32.390000,  -- Customer pickup near your location
    35.323000,
    15,         -- 15km radius
    30          -- 30 minutes max age
)
LIMIT 3;

-- ==============================================
-- STEP 3: Create customer ASAP trip
-- ==============================================

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
    32.390000, -- Very close to your location  
    35.323000,
    '{
        "city": "Test City",
        "state": "State", 
        "street": "COMPLETE TEST - Customer Pickup",
        "postal_code": "12345",
        "formatted_address": "🚨 COMPLETE ASAP FLOW TEST - Customer needs materials!"
    }'::jsonb,
    32.395000,
    35.330000,
    '{
        "city": "Delivery City",
        "state": "State",
        "street": "COMPLETE TEST - Customer Delivery", 
        "postal_code": "54321",
        "formatted_address": "Construction Site - Test Delivery"
    }'::jsonb,
    'construction_materials', 
    2.0, 
    'COMPLETE ASAP FLOW TEST - ' || to_char(NOW(), 'HH24:MI:SS'),
    '"Complete flow test with all debugging"'::jsonb,
    NULL, -- Any truck type
    false, 
    false, 
    'asap', -- CRITICAL: ASAP trip
    NULL, 
    25, 
    2.5, 
    90.00, 
    'pending', -- Ready for matching
    'completed',  -- Payment done
    90.00, 
    NOW(), 
    'TXN_COMPLETE_TEST_' || gen_random_uuid()
);

-- Verify trip was created
SELECT 
    '3️⃣ CUSTOMER TRIP CREATED:' as step,
    id,
    status,
    pickup_time_preference,
    load_description,
    'SUCCESS' as result
FROM trip_requests 
WHERE load_description LIKE 'COMPLETE ASAP FLOW TEST -%'
ORDER BY created_at DESC 
LIMIT 1;

-- ==============================================
-- STEP 4: Trigger ASAP matching
-- ==============================================

-- Get the trip ID and start matching
DO $$
DECLARE
    test_trip_id UUID;
    matching_result RECORD;
BEGIN
    -- Get the trip we just created
    SELECT id INTO test_trip_id 
    FROM trip_requests 
    WHERE load_description LIKE 'COMPLETE ASAP FLOW TEST -%'
    ORDER BY created_at DESC 
    LIMIT 1;

    IF test_trip_id IS NOT NULL THEN
        RAISE NOTICE '4️⃣ STARTING ASAP MATCHING FOR TRIP: %', test_trip_id;
        
        -- Call the matching function
        SELECT * INTO matching_result FROM start_asap_matching(test_trip_id);
        
        RAISE NOTICE '✅ MATCHING RESULT: Success=%, Message=%, DriversFound=%', 
                     matching_result.success, matching_result.message, matching_result.drivers_found;
    ELSE
        RAISE NOTICE '❌ NO TEST TRIP FOUND!';
    END IF;
END $$;

-- ==============================================
-- STEP 5: Check if driver notifications were created
-- ==============================================

SELECT 
    '5️⃣ DRIVER NOTIFICATIONS CREATED:' as step,
    COUNT(*) as notification_count,
    array_agg(DISTINCT tr.assigned_driver_id) as drivers_notified,
    array_agg(DISTINCT dp.first_name || ' ' || dp.last_name) as driver_names
FROM trip_requests tr
LEFT JOIN driver_profiles dp ON tr.assigned_driver_id = dp.user_id
WHERE tr.original_trip_id IN (
    SELECT id 
    FROM trip_requests 
    WHERE load_description LIKE 'COMPLETE ASAP FLOW TEST -%'
    ORDER BY created_at DESC 
    LIMIT 1
);

-- ==============================================
-- STEP 6: Show current pending requests
-- ==============================================

SELECT 
    '6️⃣ PENDING DRIVER REQUESTS:' as step,
    tr.id,
    tr.assigned_driver_id,
    dp.first_name || ' ' || dp.last_name as driver_name,
    tr.status,
    tr.acceptance_deadline,
    CASE 
        WHEN tr.acceptance_deadline > NOW() THEN 
            '🟢 ACTIVE (' || EXTRACT(SECOND FROM (tr.acceptance_deadline - NOW()))::INTEGER || 's left)'
        ELSE 
            '🔴 EXPIRED'
    END as notification_status
FROM trip_requests tr
LEFT JOIN driver_profiles dp ON tr.assigned_driver_id = dp.user_id
WHERE tr.original_trip_id IN (
    SELECT id 
    FROM trip_requests 
    WHERE load_description LIKE 'COMPLETE ASAP FLOW TEST -%'
    ORDER BY created_at DESC 
    LIMIT 1
)
ORDER BY tr.created_at DESC;

-- ==============================================
-- STEP 7: Final diagnosis
-- ==============================================

SELECT 
    '7️⃣ FINAL SYSTEM STATUS:' as step,
    (SELECT COUNT(*) FROM driver_profiles WHERE is_available = true AND is_approved = true) as available_drivers,
    (SELECT COUNT(*) FROM driver_locations WHERE updated_at > NOW() - INTERVAL '5 minutes') as recent_locations,
    (SELECT COUNT(*) FROM trip_requests WHERE pickup_time_preference = 'asap' AND status = 'pending') as pending_asap_trips,
    (SELECT COUNT(*) FROM trip_requests WHERE assigned_driver_id IS NOT NULL AND status = 'pending' AND acceptance_deadline > NOW()) as active_notifications,
    CASE 
        WHEN (SELECT COUNT(*) FROM trip_requests WHERE assigned_driver_id IS NOT NULL AND status = 'pending' AND acceptance_deadline > NOW()) > 0 
        THEN '✅ SYSTEM WORKING - CHECK YOUR DRIVER APP!'
        ELSE '❌ NO ACTIVE NOTIFICATIONS - SOMETHING IS WRONG'
    END as diagnosis;

-- Show what the driver app should be receiving
SELECT 
    '📱 WHAT YOUR APP SHOULD SEE:' as info,
    tr.id as request_id,
    tr.load_description,
    tr.quoted_price::TEXT || ' NIS' as earnings,
    EXTRACT(SECOND FROM (tr.acceptance_deadline - NOW()))::INTEGER as seconds_to_respond,
    'This should trigger the ASAP popup!' as instruction
FROM trip_requests tr
WHERE tr.assigned_driver_id IN (
    SELECT dp.user_id 
    FROM driver_profiles dp 
    WHERE dp.is_available = true AND dp.is_approved = true
)
AND tr.status = 'pending'
AND tr.acceptance_deadline > NOW()
ORDER BY tr.created_at DESC
LIMIT 1;
