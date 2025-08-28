-- COMPLETE ASAP TEST - FOR RUNNING DRIVER APP
-- This script works with the app you're currently running

-- ==============================================
-- STEP 1: First fix the proximity function (if not done yet)
-- ==============================================

DROP FUNCTION IF EXISTS find_nearby_available_drivers(DECIMAL, DECIMAL, INTEGER, INTEGER, UUID);

CREATE OR REPLACE FUNCTION find_nearby_available_drivers(
    pickup_lat DECIMAL,
    pickup_lng DECIMAL, 
    max_distance_km_param INTEGER DEFAULT 10,
    min_updated_minutes_param INTEGER DEFAULT 5,
    required_truck_type_id_param UUID DEFAULT NULL
)
RETURNS TABLE(
    driver_id UUID,
    driver_name TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    distance_km DECIMAL,
    last_updated TIMESTAMP WITH TIME ZONE,
    current_truck_id UUID,
    vehicle_model TEXT,
    vehicle_plate TEXT,
    rating DECIMAL,
    total_trips INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dp.user_id as driver_id,
        COALESCE(dp.first_name || ' ' || dp.last_name, 'Driver') as driver_name,
        u.current_latitude as latitude,
        u.current_longitude as longitude,
        -- Calculate distance using Haversine formula
        CASE 
            WHEN u.current_latitude IS NOT NULL AND u.current_longitude IS NOT NULL THEN
                (6371 * acos(
                    cos(radians(pickup_lat)) * 
                    cos(radians(u.current_latitude)) * 
                    cos(radians(u.current_longitude) - radians(pickup_lng)) + 
                    sin(radians(pickup_lat)) * 
                    sin(radians(u.current_latitude))
                ))::DECIMAL
            ELSE 999999::DECIMAL  -- Very far if no location
        END as distance_km,
        u.last_location_update as last_updated,
        dp.current_truck_id,
        dp.vehicle_model,
        dp.vehicle_plate,
        dp.rating,
        dp.total_trips
    FROM driver_profiles dp
    INNER JOIN users u ON dp.user_id = u.id  -- Use users table!
    WHERE dp.is_available = true 
    AND dp.is_approved = true
    AND dp.status != 'offline'
    AND u.current_latitude IS NOT NULL    -- Has location data
    AND u.current_longitude IS NOT NULL
    AND (u.last_location_update IS NULL OR u.last_location_update > NOW() - INTERVAL '1 minute' * min_updated_minutes_param)
    AND (required_truck_type_id_param IS NULL OR dp.selected_truck_type_id = required_truck_type_id_param)
    AND CASE 
            WHEN u.current_latitude IS NOT NULL AND u.current_longitude IS NOT NULL THEN
                (6371 * acos(
                    cos(radians(pickup_lat)) * 
                    cos(radians(u.current_latitude)) * 
                    cos(radians(u.current_longitude) - radians(pickup_lng)) + 
                    sin(radians(pickup_lat)) * 
                    sin(radians(u.current_latitude))
                )) <= max_distance_km_param
            ELSE false
        END
    ORDER BY distance_km ASC, dp.rating DESC, dp.total_trips DESC;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- STEP 2: Update your location (simulate what your running app should be doing)
-- ==============================================

-- Update your current location in users table
UPDATE users 
SET 
    current_latitude = 32.38882269537229,
    current_longitude = 35.321972744900584,
    last_location_update = NOW()
WHERE id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';  -- Your driver user_id

-- Verify location update
SELECT 
    '1️⃣ YOUR LOCATION STATUS:' as step,
    u.id,
    u.first_name || ' ' || u.last_name as name,
    u.current_latitude,
    u.current_longitude,
    u.last_location_update,
    'LOCATION UPDATED FOR ASAP!' as status
FROM users u
WHERE u.id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

-- ==============================================
-- STEP 3: Test proximity function
-- ==============================================

SELECT 
    '2️⃣ PROXIMITY TEST:' as step,
    driver_id,
    driver_name,
    latitude,
    longitude,
    distance_km,
    'FOUND YOU!' as result
FROM find_nearby_available_drivers(
    32.390000,  -- Customer pickup near your location
    35.323000,
    20,         -- 20km radius
    60          -- 60 minutes (generous)
)
LIMIT 3;

-- ==============================================
-- STEP 4: Create ASAP trip (customer request)
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
        "street": "RUNNING APP ASAP TEST",
        "postal_code": "12345",
        "formatted_address": "🚨 ASAP TEST - Should trigger notification in your running app!"
    }'::jsonb,
    32.395000,
    35.330000,
    '{
        "city": "Delivery City",
        "state": "State",
        "street": "ASAP Delivery Point", 
        "postal_code": "54321",
        "formatted_address": "Quick Delivery - Steel Beams"
    }'::jsonb,
    'steel_beams', 
    3.0, 
    'RUNNING APP ASAP TEST - ' || to_char(NOW(), 'HH24:MI:SS') || ' - Should trigger popup!',
    '"ASAP notification test for running driver app"'::jsonb,
    NULL, -- Any truck type
    false, 
    false, 
    'asap', -- CRITICAL: ASAP trip
    NULL, 
    30, 
    3.0, 
    120.00, 
    'pending', -- Ready for matching
    'completed',  -- Payment done
    120.00, 
    NOW(), 
    'TXN_RUNNING_APP_' || gen_random_uuid()
);

-- Verify trip creation
SELECT 
    '3️⃣ ASAP TRIP CREATED:' as step,
    id,
    load_description,
    pickup_time_preference,
    status,
    'READY TO TRIGGER NOTIFICATIONS!' as next_step
FROM trip_requests 
WHERE load_description LIKE 'RUNNING APP ASAP TEST -%'
ORDER BY created_at DESC 
LIMIT 1;

-- ==============================================
-- STEP 5: Trigger ASAP matching system
-- ==============================================

DO $$
DECLARE
    test_trip_id UUID;
    matching_result RECORD;
BEGIN
    -- Get the trip we just created
    SELECT id INTO test_trip_id 
    FROM trip_requests 
    WHERE load_description LIKE 'RUNNING APP ASAP TEST -%'
    ORDER BY created_at DESC 
    LIMIT 1;

    IF test_trip_id IS NOT NULL THEN
        RAISE NOTICE '4️⃣ TRIGGERING ASAP MATCHING FOR: %', test_trip_id;
        
        -- Call the matching function
        SELECT * INTO matching_result FROM start_asap_matching(test_trip_id);
        
        RAISE NOTICE '🚨 MATCHING RESULT: Success=%, Message=%, DriversFound=%', 
                     matching_result.success, matching_result.message, matching_result.drivers_found;
    ELSE
        RAISE NOTICE '❌ NO TEST TRIP FOUND!';
    END IF;
END $$;

-- ==============================================
-- STEP 6: Check if notifications were created
-- ==============================================

SELECT 
    '5️⃣ DRIVER NOTIFICATIONS:' as step,
    tr.id as notification_id,
    tr.assigned_driver_id,
    u.first_name || ' ' || u.last_name as driver_name,
    tr.status,
    tr.acceptance_deadline,
    CASE 
        WHEN tr.acceptance_deadline > NOW() THEN 
            '🟢 ACTIVE - CHECK YOUR RUNNING APP NOW! (' || EXTRACT(SECOND FROM (tr.acceptance_deadline - NOW()))::INTEGER || 's left)'
        ELSE 
            '🔴 EXPIRED'
    END as notification_status,
    tr.quoted_price::TEXT || ' NIS' as potential_earnings
FROM trip_requests tr
LEFT JOIN users u ON tr.assigned_driver_id = u.id
WHERE tr.original_trip_id IN (
    SELECT id 
    FROM trip_requests 
    WHERE load_description LIKE 'RUNNING APP ASAP TEST -%'
    ORDER BY created_at DESC 
    LIMIT 1
)
ORDER BY tr.created_at DESC;

-- ==============================================
-- STEP 7: Show what your app should display
-- ==============================================

SELECT 
    '📱 YOUR DRIVER APP SHOULD NOW SHOW:' as alert,
    'ASAP REQUEST POPUP' as popup_title,
    tr.load_description as trip_description,
    tr.quoted_price::TEXT || ' NIS' as earnings,
    'Accept or Decline buttons' as buttons,
    EXTRACT(SECOND FROM (tr.acceptance_deadline - NOW()))::INTEGER as seconds_to_decide,
    CASE 
        WHEN tr.acceptance_deadline > NOW() THEN 
            '🔥 CHECK YOUR RUNNING APP RIGHT NOW!'
        ELSE 
            '⏰ Notification expired - create new test'
    END as urgency
FROM trip_requests tr
WHERE tr.assigned_driver_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c'
AND tr.status = 'pending'
AND tr.acceptance_deadline > NOW()
ORDER BY tr.created_at DESC
LIMIT 1;

-- ==============================================
-- STEP 8: Final system status
-- ==============================================

SELECT 
    '6️⃣ SYSTEM STATUS:' as summary,
    (SELECT COUNT(*) FROM users u JOIN driver_profiles dp ON u.id = dp.user_id WHERE u.current_latitude IS NOT NULL AND dp.is_available = true) as drivers_with_location,
    (SELECT COUNT(*) FROM trip_requests WHERE status = 'pending' AND assigned_driver_id IS NOT NULL AND acceptance_deadline > NOW()) as active_notifications,
    CASE 
        WHEN (SELECT COUNT(*) FROM trip_requests WHERE status = 'pending' AND assigned_driver_id IS NOT NULL AND acceptance_deadline > NOW()) > 0 
        THEN '✅ SUCCESS! Your running app should show ASAP popup!'
        ELSE '⚠️ No active notifications - check logs above'
    END as result;
