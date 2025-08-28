-- TEST ASAP SYSTEM AFTER ALL FIXES

-- ==============================================
-- STEP 1: Create fresh customer ASAP trip for testing
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
        "street": "POST-FIX TEST - Customer Pickup",
        "postal_code": "12345",
        "formatted_address": "🎯 POST-FIX ASAP TEST - Should work now!"
    }'::jsonb,
    32.395000,
    35.330000,
    '{
        "city": "Delivery City",
        "state": "State",
        "street": "POST-FIX TEST - Customer Delivery", 
        "postal_code": "54321",
        "formatted_address": "Construction Site - Fixed Test Delivery"
    }'::jsonb,
    'construction_materials', 
    2.0, 
    'POST-FIX ASAP TEST - ' || to_char(NOW(), 'HH24:MI:SS') || ' - All issues fixed!',
    '"Test after fixing foreign key constraints and location data"'::jsonb,
    NULL, -- Any truck type
    false, 
    false, 
    'asap', -- CRITICAL: ASAP trip
    NULL, 
    25, 
    2.5, 
    95.00, 
    'pending', -- Ready for matching
    'completed',  -- Payment done
    95.00, 
    NOW(), 
    'TXN_POST_FIX_' || gen_random_uuid()
);

-- Verify trip was created
SELECT 
    '1️⃣ NEW POST-FIX TRIP CREATED:' as step,
    id,
    status,
    pickup_time_preference,
    load_description,
    'SUCCESS' as result
FROM trip_requests 
WHERE load_description LIKE 'POST-FIX ASAP TEST -%'
ORDER BY created_at DESC 
LIMIT 1;

-- ==============================================
-- STEP 2: Trigger ASAP matching
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
    WHERE load_description LIKE 'POST-FIX ASAP TEST -%'
    ORDER BY created_at DESC 
    LIMIT 1;

    IF test_trip_id IS NOT NULL THEN
        RAISE NOTICE '2️⃣ STARTING ASAP MATCHING FOR POST-FIX TRIP: %', test_trip_id;
        
        -- Call the matching function
        SELECT * INTO matching_result FROM start_asap_matching(test_trip_id);
        
        RAISE NOTICE '✅ MATCHING RESULT: Success=%, Message=%, DriversFound=%', 
                     matching_result.success, matching_result.message, matching_result.drivers_found;
    ELSE
        RAISE NOTICE '❌ NO POST-FIX TEST TRIP FOUND!';
    END IF;
END $$;

-- ==============================================
-- STEP 3: Check results
-- ==============================================

-- Check if driver notifications were created
SELECT 
    '3️⃣ DRIVER NOTIFICATIONS:' as step,
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
    WHERE load_description LIKE 'POST-FIX ASAP TEST -%'
    ORDER BY created_at DESC 
    LIMIT 1
)
ORDER BY tr.created_at DESC;

-- ==============================================
-- STEP 4: Final status
-- ==============================================

SELECT 
    '4️⃣ FINAL VERIFICATION:' as step,
    CASE 
        WHEN (SELECT COUNT(*) FROM trip_requests WHERE status = 'pending' AND assigned_driver_id IS NOT NULL AND acceptance_deadline > NOW()) > 0 
        THEN '✅ SUCCESS! ASAP system is working - Check your driver app for notification popup!'
        ELSE '⚠️ No active notifications - check previous steps for issues'
    END as result,
    (SELECT COUNT(*) FROM driver_locations WHERE updated_at > NOW() - INTERVAL '5 minutes') as recent_location_updates,
    (SELECT COUNT(*) FROM trip_requests WHERE status = 'pending' AND assigned_driver_id IS NOT NULL AND acceptance_deadline > NOW()) as active_notifications;

-- Show exactly what your app should receive
SELECT 
    '📱 YOUR DRIVER APP SHOULD SHOW:' as info,
    tr.id as notification_id,
    'ASAP Request Available' as title,
    tr.load_description as description,
    tr.quoted_price::TEXT || ' NIS' as potential_earnings,
    EXTRACT(SECOND FROM (tr.acceptance_deadline - NOW()))::INTEGER as seconds_to_decide,
    'Accept or Decline buttons should appear!' as instruction
FROM trip_requests tr
WHERE tr.assigned_driver_id IN (
    SELECT u.id 
    FROM users u
    JOIN driver_profiles dp ON u.id = dp.user_id
    WHERE dp.is_available = true AND dp.is_approved = true
)
AND tr.status = 'pending'
AND tr.acceptance_deadline > NOW()
ORDER BY tr.created_at DESC
LIMIT 1;
