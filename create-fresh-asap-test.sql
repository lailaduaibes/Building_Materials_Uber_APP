-- Create a fresh ASAP trip and immediately assign it to test the modal
-- This will have a future deadline so it won't be filtered out

-- Step 1: Create a new ASAP trip with current timestamp
INSERT INTO trip_requests (
    id,
    customer_id,
    pickup_address,
    delivery_address,
    materials,
    total_price,
    status,
    pickup_time_preference,
    estimated_weight_tons,
    created_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM customer_profiles LIMIT 1),
    '{"street": "123 Fresh Test St", "city": "Test City", "coordinates": {"lat": -33.8688, "lng": 151.2093}}',
    '{"street": "456 Fresh Delivery Ave", "city": "Test City", "coordinates": {"lat": -33.8650, "lng": 151.2094}}',
    '[{"name": "Fresh Cement", "quantity": 10, "unit": "bags"}]',
    200.00,
    'pending',
    'asap',
    15.5,
    NOW()
) RETURNING 
    'New fresh ASAP trip created:' as debug_section,
    id,
    created_at,
    pickup_time_preference;

-- Step 2: Get the trip ID and immediately call the matching function
-- (We'll need to replace the trip ID after the above INSERT)
