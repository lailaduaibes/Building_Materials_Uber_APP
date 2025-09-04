-- ====================================================================
-- CREATE TEST ASAP TRIP FOR UBER-STYLE SYSTEM TESTING
-- ====================================================================
-- This will create a real test trip that you can use with your apps

-- Step 1: Create a test ASAP trip
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
    estimated_volume_m3,
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
    final_price,
    status,
    assigned_driver_id,
    payment_status
) VALUES (
    'e5310d01-f653-4865-b201-83e29dfa8f44', -- Your test customer ID
    32.38882,  -- Driver's current GPS latitude
    35.32197, -- Driver's current GPS longitude
    '{"formatted_address": "Test Location Near Driver", "street": "Test Street", "city": "Test City", "state": "Test State", "zip": "12345"}',
    32.39000,  -- Nearby delivery location (slightly north)
    35.32500, -- Nearby delivery location (slightly east)
    '{"formatted_address": "Test Delivery Location", "street": "Delivery Street", "city": "Test City", "state": "Test State", "zip": "12346"}',
    'concrete',
    15.5,
    12.0,
    'Test Uber-Style ASAP Load - Near Driver Location',
    '{"notes": "Test delivery for Uber-style sequential system at driver coordinates", "access_requirements": "Street access available"}',
    NULL, -- No specific truck type required
    false,
    false,
    'asap', -- This is the key - ASAP trip
    NULL,   -- No scheduled time
    90,     -- 90 minutes estimated
    2.5,    -- 2.5 km distance (very close to driver)
    150.00, -- $150 quoted price (smaller load)
    NULL,   -- No final price yet
    'pending', -- Ready for ASAP matching
    NULL,   -- No driver assigned yet
    'pending'
) RETURNING id, created_at, status;

-- Step 2: Verify the trip was created
SELECT 
    id,
    status,
    pickup_time_preference,
    assigned_driver_id,
    material_type,
    quoted_price,
    created_at
FROM trip_requests 
WHERE created_at >= NOW() - INTERVAL '1 minute'
  AND pickup_time_preference = 'asap'
ORDER BY created_at DESC 
LIMIT 1;

-- Step 3: Check available drivers
SELECT 
    dp.user_id,
    dp.first_name,
    dp.last_name,
    dp.is_available,
    dp.status,
    u.current_latitude,
    u.current_longitude
FROM driver_profiles dp
JOIN users u ON dp.user_id = u.id
WHERE dp.is_available = true 
  AND dp.is_approved = true 
  AND dp.status = 'online'
LIMIT 5;

-- Step 4: Test the Uber-style matching (replace with actual trip ID from Step 2)
/*
-- Copy the trip ID from Step 2 and replace TRIP_ID_HERE
SELECT * FROM start_asap_matching_uber_style('TRIP_ID_HERE');

-- Then check if driver was assigned
SELECT 
    id,
    status,
    assigned_driver_id,
    acceptance_deadline,
    load_description
FROM trip_requests 
WHERE id = 'TRIP_ID_HERE';
*/

-- Instructions for app testing
SELECT 
    '🧪 TEST INSTRUCTIONS' as title,
    '1. Run this SQL to create test trip' as step_1,
    '2. Copy the trip ID from Step 2 result' as step_2,
    '3. Replace TRIP_ID_HERE in Step 4 and run it' as step_3,
    '4. Check your driver apps for notifications' as step_4,
    '5. Only ONE driver should receive notification' as expected_result;
