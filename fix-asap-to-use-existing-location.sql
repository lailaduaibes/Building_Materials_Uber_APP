-- FIX ASAP SYSTEM TO USE EXISTING LOCATION SYSTEM
-- Instead of driver_locations table, use users table like live tracking does

-- ==============================================
-- STEP 1: Fix the proximity function to use users table
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
        (6371 * acos(
            cos(radians(pickup_lat)) * 
            cos(radians(u.current_latitude)) * 
            cos(radians(u.current_longitude) - radians(pickup_lng)) + 
            sin(radians(pickup_lat)) * 
            sin(radians(u.current_latitude))
        ))::DECIMAL as distance_km,
        u.last_location_update as last_updated,
        dp.current_truck_id,
        dp.vehicle_model,
        dp.vehicle_plate,
        dp.rating,
        dp.total_trips
    FROM driver_profiles dp
    INNER JOIN users u ON dp.user_id = u.id  -- Use users table instead!
    WHERE dp.is_available = true 
    AND dp.is_approved = true
    AND dp.status != 'offline'
    AND u.current_latitude IS NOT NULL    -- Has location data
    AND u.current_longitude IS NOT NULL
    AND u.last_location_update > NOW() - INTERVAL '1 minute' * min_updated_minutes_param
    AND (required_truck_type_id_param IS NULL OR dp.selected_truck_type_id = required_truck_type_id_param)
    AND (6371 * acos(
        cos(radians(pickup_lat)) * 
        cos(radians(u.current_latitude)) * 
        cos(radians(u.current_longitude) - radians(pickup_lng)) + 
        sin(radians(pickup_lat)) * 
        sin(radians(u.current_latitude))
    )) <= max_distance_km_param
    ORDER BY distance_km ASC, dp.rating DESC, dp.total_trips DESC;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- STEP 2: Test the fixed function
-- ==============================================

-- First check what location data exists in users table
SELECT 
    '1️⃣ CURRENT USERS LOCATION DATA:' as step,
    u.id,
    u.first_name || ' ' || u.last_name as name,
    u.current_latitude,
    u.current_longitude,
    u.last_location_update,
    CASE 
        WHEN u.current_latitude IS NOT NULL AND u.current_longitude IS NOT NULL THEN 'HAS LOCATION'
        ELSE 'NO LOCATION'
    END as location_status,
    CASE 
        WHEN u.last_location_update > NOW() - INTERVAL '5 minutes' THEN 'RECENT'
        WHEN u.last_location_update IS NOT NULL THEN 'OUTDATED'
        ELSE 'NEVER'
    END as update_status
FROM users u
JOIN driver_profiles dp ON u.id = dp.user_id
WHERE dp.is_available = true AND dp.is_approved = true
ORDER BY u.last_location_update DESC NULLS LAST;

-- Now test the fixed proximity function
SELECT 
    '2️⃣ FIXED PROXIMITY FUNCTION TEST:' as step,
    driver_id,
    driver_name,
    latitude,
    longitude,
    distance_km,
    'FOUND WITH USERS TABLE!' as result
FROM find_nearby_available_drivers(
    32.390000,  -- Customer pickup coordinates
    35.323000,
    50,         -- 50km radius (generous for testing)
    60          -- 60 minutes (generous for testing) 
)
LIMIT 5;

-- ==============================================
-- STEP 3: Update a driver's location for testing
-- ==============================================

-- Simulate what the driver app does - update location in users table
UPDATE users 
SET 
    current_latitude = 32.38882269537229,
    current_longitude = 35.321972744900584,
    last_location_update = NOW()
WHERE id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';  -- Driver Laila's user_id

-- Verify the update worked
SELECT 
    '3️⃣ LOCATION UPDATE VERIFICATION:' as step,
    u.id,
    u.first_name || ' ' || u.last_name as name,
    u.current_latitude,
    u.current_longitude,
    u.last_location_update,
    'UPDATED SUCCESSFULLY!' as status
FROM users u
WHERE u.id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c';

-- ==============================================
-- STEP 4: Test proximity function again
-- ==============================================

SELECT 
    '4️⃣ PROXIMITY TEST AFTER LOCATION UPDATE:' as step,
    driver_id,
    driver_name,
    latitude,
    longitude,
    distance_km,
    'SHOULD FIND DRIVER NOW!' as result
FROM find_nearby_available_drivers(
    32.390000,  -- Close to updated location
    35.323000,
    15,         -- 15km radius
    10          -- 10 minutes max age
)
LIMIT 5;

-- ==============================================
-- STEP 5: Create and test ASAP trip
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
    32.390000, -- Very close to driver location  
    35.323000,
    '{
        "city": "Test City",
        "state": "State", 
        "street": "FIXED ASAP TEST - Customer Pickup",
        "postal_code": "12345",
        "formatted_address": "🎯 FIXED TO USE EXISTING LOCATION SYSTEM!"
    }'::jsonb,
    32.395000,
    35.330000,
    '{
        "city": "Delivery City",
        "state": "State",
        "street": "FIXED ASAP TEST - Customer Delivery", 
        "postal_code": "54321",
        "formatted_address": "Construction Site - Should work now!"
    }'::jsonb,
    'construction_materials', 
    2.0, 
    'FIXED ASAP TEST - Uses existing location system - ' || to_char(NOW(), 'HH24:MI:SS'),
    '"Now uses users table like live tracking does"'::jsonb,
    NULL, -- Any truck type
    false, 
    false, 
    'asap', -- CRITICAL: ASAP trip
    NULL, 
    25, 
    2.5, 
    100.00, 
    'pending', -- Ready for matching
    'completed',  -- Payment done
    100.00, 
    NOW(), 
    'TXN_FIXED_LOCATION_' || gen_random_uuid()
);

-- Verify trip was created
SELECT 
    '5️⃣ ASAP TRIP CREATED:' as step,
    id,
    load_description,
    'READY FOR MATCHING!' as status
FROM trip_requests 
WHERE load_description LIKE 'FIXED ASAP TEST - Uses existing location system%'
ORDER BY created_at DESC 
LIMIT 1;

-- ==============================================
-- STEP 6: Trigger ASAP matching
-- ==============================================

DO $$
DECLARE
    test_trip_id UUID;
    matching_result RECORD;
BEGIN
    -- Get the trip we just created
    SELECT id INTO test_trip_id 
    FROM trip_requests 
    WHERE load_description LIKE 'FIXED ASAP TEST - Uses existing location system%'
    ORDER BY created_at DESC 
    LIMIT 1;

    IF test_trip_id IS NOT NULL THEN
        RAISE NOTICE '6️⃣ STARTING ASAP MATCHING FOR FIXED TRIP: %', test_trip_id;
        
        -- Call the matching function
        SELECT * INTO matching_result FROM start_asap_matching(test_trip_id);
        
        RAISE NOTICE '🎉 MATCHING RESULT: Success=%, Message=%, DriversFound=%', 
                     matching_result.success, matching_result.message, matching_result.drivers_found;
    ELSE
        RAISE NOTICE '❌ NO TEST TRIP FOUND!';
    END IF;
END $$;

-- ==============================================
-- STEP 7: Check results
-- ==============================================

-- Check if driver notifications were created
SELECT 
    '7️⃣ DRIVER NOTIFICATIONS:' as step,
    tr.id as request_id,
    tr.assigned_driver_id,
    u.first_name || ' ' || u.last_name as driver_name,
    tr.status,
    tr.acceptance_deadline,
    CASE 
        WHEN tr.acceptance_deadline > NOW() THEN 
            '🟢 ACTIVE (' || EXTRACT(SECOND FROM (tr.acceptance_deadline - NOW()))::INTEGER || 's left)'
        ELSE 
            '🔴 EXPIRED'
    END as notification_status,
    tr.quoted_price::TEXT || ' NIS' as earnings
FROM trip_requests tr
LEFT JOIN users u ON tr.assigned_driver_id = u.id
WHERE tr.original_trip_id IN (
    SELECT id 
    FROM trip_requests 
    WHERE load_description LIKE 'FIXED ASAP TEST - Uses existing location system%'
    ORDER BY created_at DESC 
    LIMIT 1
)
ORDER BY tr.created_at DESC;

-- ==============================================
-- STEP 8: Final summary
-- ==============================================

SELECT 
    '8️⃣ SYSTEM STATUS AFTER FIX:' as step,
    (SELECT COUNT(*) FROM driver_profiles WHERE is_available = true AND is_approved = true) as available_drivers,
    (SELECT COUNT(*) FROM users u JOIN driver_profiles dp ON u.id = dp.user_id WHERE u.current_latitude IS NOT NULL AND dp.is_available = true) as drivers_with_location,
    (SELECT COUNT(*) FROM users u JOIN driver_profiles dp ON u.id = dp.user_id WHERE u.last_location_update > NOW() - INTERVAL '5 minutes' AND dp.is_available = true) as drivers_with_recent_location,
    (SELECT COUNT(*) FROM trip_requests WHERE status = 'pending' AND assigned_driver_id IS NOT NULL AND acceptance_deadline > NOW()) as active_notifications,
    CASE 
        WHEN (SELECT COUNT(*) FROM trip_requests WHERE status = 'pending' AND assigned_driver_id IS NOT NULL AND acceptance_deadline > NOW()) > 0 
        THEN '✅ SUCCESS! ASAP system now works with existing location tracking!'
        ELSE '⚠️ Ready to work - just needs drivers to update their location'
    END as diagnosis;

-- Show what the driver app should now receive
SELECT 
    '📱 YOUR DRIVER APP SHOULD NOW SHOW:' as info,
    tr.id as notification_id,
    tr.load_description as description,
    tr.quoted_price::TEXT || ' NIS' as earnings,
    EXTRACT(SECOND FROM (tr.acceptance_deadline - NOW()))::INTEGER as seconds_remaining,
    'Accept/Decline popup should appear!' as instruction
FROM trip_requests tr
WHERE tr.assigned_driver_id = '2bd7bd97-5cf9-431f-adfc-4ec4448be52c'
AND tr.status = 'pending'
AND tr.acceptance_deadline > NOW()
ORDER BY tr.created_at DESC
LIMIT 1;
