-- 🧪 TEST OFFER-ONLY SYSTEM FOR RACE CONDITIONS
-- This test simulates multiple drivers calling the function simultaneously

-- First ensure the system is set up
\i offer-only-asap-system.sql

-- Create test ASAP trip
DO $$
DECLARE
    test_trip_id UUID;
    test_customer_id UUID;
BEGIN
    -- Create a test customer
    INSERT INTO users (id, email, first_name, last_name, phone, role)
    VALUES (
        gen_random_uuid(),
        'testcustomer@test.com',
        'Test',
        'Customer',
        '+1234567890',
        'customer'
    ) 
    ON CONFLICT (email) DO UPDATE SET first_name = 'Test'
    RETURNING id INTO test_customer_id;

    -- Create test ASAP trip
    INSERT INTO trip_requests (
        id,
        customer_id,
        pickup_address,
        pickup_latitude,
        pickup_longitude,
        delivery_address,
        delivery_latitude,
        delivery_longitude,
        material_type,
        load_description,
        estimated_weight_tons,
        quoted_price,
        pickup_time_preference,
        status,
        created_at
    ) VALUES (
        gen_random_uuid(),
        test_customer_id,
        '123 Test Pickup St, Test City',
        40.7128,  -- NYC coordinates
        -74.0060,
        '456 Test Delivery Ave, Test City',
        40.7589,
        -73.9851,
        'Concrete',
        'Test concrete delivery for multi-driver testing',
        5.0,
        250.00,
        'asap',
        'pending',
        NOW()
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO test_trip_id;

    RAISE NOTICE 'Test trip created: %', test_trip_id;
END $$;

-- Create test drivers with nearby locations
DO $$
DECLARE
    driver1_id UUID;
    driver2_id UUID;
    driver3_id UUID;
BEGIN
    -- Driver 1 
    INSERT INTO users (id, email, first_name, last_name, phone, role, current_latitude, current_longitude)
    VALUES (
        gen_random_uuid(),
        'testdriver1@test.com',
        'Driver',
        'One',
        '+1111111111',
        'driver',
        40.7128,  -- Same area as pickup
        -74.0060
    )
    ON CONFLICT (email) DO UPDATE SET 
        current_latitude = 40.7128,
        current_longitude = -74.0060
    RETURNING id INTO driver1_id;

    -- Driver 2
    INSERT INTO users (id, email, first_name, last_name, phone, role, current_latitude, current_longitude)
    VALUES (
        gen_random_uuid(),
        'testdriver2@test.com',
        'Driver',
        'Two',
        '+2222222222',
        'driver',
        40.7130,  -- Slightly different but very close
        -74.0058
    )
    ON CONFLICT (email) DO UPDATE SET 
        current_latitude = 40.7130,
        current_longitude = -74.0058
    RETURNING id INTO driver2_id;

    -- Driver 3
    INSERT INTO users (id, email, first_name, last_name, phone, role, current_latitude, current_longitude)
    VALUES (
        gen_random_uuid(),
        'testdriver3@test.com',
        'Driver',
        'Three',
        '+3333333333',
        'driver',
        40.7125,  -- Also very close
        -74.0062
    )
    ON CONFLICT (email) DO UPDATE SET 
        current_latitude = 40.7125,
        current_longitude = -74.0062
    RETURNING id INTO driver3_id;

    RAISE NOTICE 'Test drivers created: %, %, %', driver1_id, driver2_id, driver3_id;
END $$;

-- Test: Simulate multiple drivers calling simultaneously
SELECT '🧪 RACE CONDITION TEST: Multiple drivers calling get_next_asap_trip_for_driver simultaneously' as test_description;

-- Get driver IDs for testing
WITH test_drivers AS (
    SELECT id, email FROM users WHERE email LIKE 'testdriver%@test.com'
),
driver1 AS (
    SELECT id FROM test_drivers WHERE email = 'testdriver1@test.com'
),
driver2 AS (
    SELECT id FROM test_drivers WHERE email = 'testdriver2@test.com'  
),
driver3 AS (
    SELECT id FROM test_drivers WHERE email = 'testdriver3@test.com'
)

-- Show current trip state before test
SELECT 'BEFORE TEST - Trip state:' as phase,
       id as trip_id,
       status,
       considering_driver_id,
       assigned_driver_id,
       acceptance_deadline,
       load_description
FROM trip_requests 
WHERE pickup_time_preference = 'asap' AND status = 'pending';

-- TEST 1: Driver 1 calls function
SELECT '🔍 TEST 1: Driver 1 calls get_next_asap_trip_for_driver' as test_phase;
SELECT trip_id, reserved_for_driver, expires_at 
FROM get_next_asap_trip_for_driver((SELECT id FROM users WHERE email = 'testdriver1@test.com'));

-- Show trip state after Driver 1
SELECT 'AFTER DRIVER 1 - Trip state:' as phase,
       id as trip_id,
       status,
       considering_driver_id,
       assigned_driver_id,
       acceptance_deadline,
       load_description
FROM trip_requests 
WHERE pickup_time_preference = 'asap' AND status = 'pending';

-- TEST 2: Driver 2 calls function (should NOT get the trip if properly reserved)
SELECT '🔍 TEST 2: Driver 2 calls get_next_asap_trip_for_driver (should get NOTHING if working correctly)' as test_phase;
SELECT trip_id, reserved_for_driver, expires_at 
FROM get_next_asap_trip_for_driver((SELECT id FROM users WHERE email = 'testdriver2@test.com'));

-- TEST 3: Driver 3 calls function (should also get NOTHING)
SELECT '🔍 TEST 3: Driver 3 calls get_next_asap_trip_for_driver (should also get NOTHING)' as test_phase;
SELECT trip_id, reserved_for_driver, expires_at 
FROM get_next_asap_trip_for_driver((SELECT id FROM users WHERE email = 'testdriver3@test.com'));

-- TEST 4: Driver 1 calls again (should get the SAME trip, not a new reservation)
SELECT '🔍 TEST 4: Driver 1 calls AGAIN (should get SAME trip, proving no duplicate reservations)' as test_phase;
SELECT trip_id, reserved_for_driver, expires_at 
FROM get_next_asap_trip_for_driver((SELECT id FROM users WHERE email = 'testdriver1@test.com'));

-- Show final state
SELECT 'FINAL STATE - Trip reservations:' as phase;
SELECT * FROM debug_asap_trip_states();

-- Test acceptance
SELECT '🔍 TEST 5: Driver 1 accepts the trip' as test_phase;
WITH trip_to_accept AS (
    SELECT trip_id 
    FROM get_next_asap_trip_for_driver((SELECT id FROM users WHERE email = 'testdriver1@test.com'))
    LIMIT 1
)
SELECT success, message 
FROM accept_asap_trip_simple(
    (SELECT trip_id FROM trip_to_accept),
    (SELECT id FROM users WHERE email = 'testdriver1@test.com')
);

-- Show state after acceptance
SELECT 'AFTER ACCEPTANCE - Trip state:' as phase,
       id as trip_id,
       status,
       considering_driver_id,
       assigned_driver_id,
       matched_at,
       load_description
FROM trip_requests 
WHERE pickup_time_preference = 'asap' AND status IN ('pending', 'matched');

-- TEST 6: Try to accept again (should fail)
SELECT '🔍 TEST 6: Driver 2 tries to accept already accepted trip (should FAIL)' as test_phase;
WITH trip_to_steal AS (
    SELECT id as trip_id 
    FROM trip_requests 
    WHERE pickup_time_preference = 'asap' AND status = 'matched'
    LIMIT 1
)
SELECT success, message 
FROM accept_asap_trip_simple(
    (SELECT trip_id FROM trip_to_steal),
    (SELECT id FROM users WHERE email = 'testdriver2@test.com')
);

SELECT '✅ RACE CONDITION TEST COMPLETED' as result;
SELECT 'If the system works correctly:' as expected_behavior;
SELECT '1. Only Driver 1 should have gotten the trip initially' as check1;
SELECT '2. Driver 2 and 3 should have gotten NOTHING' as check2; 
SELECT '3. Driver 1 calling again should get the SAME trip' as check3;
SELECT '4. Only Driver 1 should successfully accept' as check4;
SELECT '5. Driver 2 should FAIL to accept the already accepted trip' as check5;
