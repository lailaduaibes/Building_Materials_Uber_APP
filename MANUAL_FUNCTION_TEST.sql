-- 🧪 MANUAL TEST: Call start_asap_matching_uber_style on existing ASAP trip
-- This will help us see if the function works when called manually

-- Step 1: Show the trip BEFORE calling the function
SELECT 
    '=== BEFORE FUNCTION CALL ===' as test_phase,
    id,
    status,
    assigned_driver_id,
    load_description,
    created_at
FROM trip_requests 
WHERE id = 'e280b170-307a-44e2-b980-002b4a9504a3';

-- Step 2: Call the Uber-style function manually
SELECT 
    '=== CALLING FUNCTION ===' as test_phase,
    * 
FROM start_asap_matching_uber_style('e280b170-307a-44e2-b980-002b4a9504a3');

-- Step 3: Show the trip AFTER calling the function
SELECT 
    '=== AFTER FUNCTION CALL ===' as test_phase,
    id,
    status,
    assigned_driver_id,
    load_description,
    acceptance_deadline,
    matching_started_at
FROM trip_requests 
WHERE id = 'e280b170-307a-44e2-b980-002b4a9504a3';

-- Step 4: Check if any drivers were found
SELECT 
    '=== AVAILABLE DRIVERS CHECK ===' as test_phase,
    driver_id,
    distance_km,
    rating
FROM find_nearby_available_drivers(
    32.38882,  -- pickup latitude
    35.32197,  -- pickup longitude  
    50,        -- max distance 50km
    1440,      -- 24 hours location update window
    NULL       -- no specific truck type
)
LIMIT 5;
