-- Create a new ASAP trip request that ANY driver can accept (no truck type restriction)
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
    required_truck_type_id, -- NULL = ANY truck type can accept this trip
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
    'c9911957-47c1-4ff3-94d8-1f9c87e60a4c', -- Use existing customer ID from your data
    '32.387000', -- Near your other trips
    '35.324000',
    '{
        "city": "Test City",
        "state": "Test State", 
        "street": "Test Pickup Street",
        "postal_code": "12345",
        "formatted_address": "Test Pickup Location - Any Truck Type Welcome"
    }'::jsonb,
    '32.390000', -- Close delivery location
    '35.330000',
    '{
        "city": "Test Delivery City",
        "state": "Test State",
        "street": "Test Delivery Street", 
        "postal_code": "54321",
        "formatted_address": "Test Delivery Location - Any Truck Type Welcome"
    }'::jsonb,
    'general_materials', -- General materials work for any truck
    2.0, -- Lighter weight for broader truck compatibility
    'TEST ASAP Trip - ANY TRUCK TYPE ACCEPTED', -- Clear identifier
    '"This is a test ASAP trip - any truck type can accept"'::jsonb, -- Special requirements as JSONB
    NULL, -- ✅ NO TRUCK TYPE RESTRICTION - ANY DRIVER CAN ACCEPT!
    false, -- No crane needed
    false, -- No hydraulic lift needed
    'asap', -- THIS IS KEY - ASAP trip
    NULL, -- No scheduled time
    30, -- Shorter estimated duration
    3.8, -- Distance in km
    65.00, -- Lower price for general materials
    'pending', -- Ready for ASAP matching
    'pending', -- Payment status
    65.00, -- Paid amount
    NOW(), -- Payment processed
    'TXN_TEST_' || gen_random_uuid() -- Transaction ID
) RETURNING id;

-- 🚀 CRITICAL: Start sequential driver matching for the ASAP trip
-- This is what was missing - the trip needs to trigger sequential assignment!
DO $$
DECLARE
    new_trip_id UUID;
BEGIN
    -- Get the ID of the trip we just created
    SELECT id INTO new_trip_id 
    FROM trip_requests 
    WHERE load_description LIKE '%TEST ASAP Trip - ANY TRUCK TYPE%'
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Start the sequential matching process by calling the matching function
    -- This will assign the trip to the first available driver
    IF new_trip_id IS NOT NULL THEN
        RAISE NOTICE '🚀 Starting ASAP matching for trip: %', new_trip_id;
        
        -- Call the existing ASAP matching function (if it exists)
        -- This should assign the trip to the first eligible driver
        PERFORM start_asap_matching(new_trip_id);
        
        RAISE NOTICE '✅ ASAP matching triggered successfully for trip: %', new_trip_id;
    ELSE
        RAISE WARNING '❌ Could not find the created trip to start matching';
    END IF;
END $$;

-- Verify the trip was created and check assignment status
SELECT 
    id,
    customer_id,
    material_type,
    estimated_weight_tons,
    required_truck_type_id, -- Should be NULL
    pickup_time_preference,
    status,
    assigned_driver_id, -- Should now have a driver assigned!
    acceptance_deadline, -- Should have a deadline for the assigned driver
    load_description,
    CASE 
        WHEN assigned_driver_id IS NOT NULL AND acceptance_deadline > NOW() 
        THEN '🚨 ASSIGNED - Driver should see notification!'
        WHEN assigned_driver_id IS NOT NULL AND acceptance_deadline <= NOW()
        THEN '⏰ EXPIRED - Assignment timed out'
        ELSE '❌ NOT ASSIGNED - Matching may have failed'
    END as assignment_status
FROM trip_requests 
WHERE load_description LIKE '%TEST ASAP Trip - ANY TRUCK TYPE%'
ORDER BY created_at DESC 
LIMIT 1;

-- Show driver assignment details and notification status
SELECT 
    'ASAP Driver Assignment Test Results' as test_phase,
    tr.id as trip_id,
    tr.assigned_driver_id,
    u.email as assigned_driver_email,
    dp.first_name || ' ' || dp.last_name as driver_name,
    tr.acceptance_deadline,
    tr.status,
    CASE 
        WHEN tr.assigned_driver_id IS NOT NULL AND tr.acceptance_deadline > NOW() 
        THEN '🚨 ACTIVE - This driver should see the ASAP modal right now!'
        WHEN tr.assigned_driver_id IS NOT NULL AND tr.acceptance_deadline <= NOW()
        THEN '⏰ EXPIRED - Assignment timed out, should assign to next driver'
        WHEN tr.assigned_driver_id IS NULL
        THEN '❌ UNASSIGNED - No driver assigned (matching may have failed)'
        ELSE '❔ UNKNOWN STATUS'
    END as notification_status,
    EXTRACT(EPOCH FROM (tr.acceptance_deadline - NOW())) as seconds_remaining
FROM trip_requests tr
LEFT JOIN users u ON tr.assigned_driver_id = u.id
LEFT JOIN driver_profiles dp ON tr.assigned_driver_id = dp.user_id
WHERE tr.load_description LIKE '%TEST ASAP Trip - ANY TRUCK TYPE%'
ORDER BY tr.created_at DESC 
LIMIT 1;

-- Check for any other pending ASAP assignments (should be 0 or 1 max)
SELECT 
    'Simultaneous Assignment Check' as test_phase,
    COUNT(*) as total_active_asap_assignments,
    COUNT(DISTINCT assigned_driver_id) as unique_drivers_assigned,
    CASE 
        WHEN COUNT(*) = 0 THEN '❌ No active ASAP assignments found'
        WHEN COUNT(*) = 1 AND COUNT(DISTINCT assigned_driver_id) = 1 
        THEN '✅ Perfect - Only 1 driver assigned to 1 ASAP trip'
        ELSE '⚠️ Multiple simultaneous assignments detected!'
    END as result_status
FROM trip_requests 
WHERE pickup_time_preference = 'asap' 
  AND status = 'pending' 
  AND assigned_driver_id IS NOT NULL 
  AND acceptance_deadline > NOW();

-- Show available drivers for comparison
SELECT 
    'Available Drivers for ASAP Trips' as info_type,
    COUNT(*) as total_online_drivers,
    array_agg(dp.first_name || ' ' || dp.last_name || ' (' || u.email || ')') as driver_list
FROM driver_profiles dp
JOIN users u ON dp.user_id = u.id
WHERE dp.is_approved = true 
  AND dp.approval_status = 'approved'
  AND dp.is_online = true;
