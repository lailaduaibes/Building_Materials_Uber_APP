-- Test if the customer app's function call is working by simulating it exactly

-- 1. First, let's create a new ASAP trip exactly like the customer app does
INSERT INTO trip_requests (
    customer_id,
    pickup_address,
    pickup_latitude,
    pickup_longitude,
    delivery_address,
    delivery_latitude,
    delivery_longitude,
    materials,
    estimated_weight_tons,
    pickup_time_preference,
    quoted_price,
    status,
    estimated_distance_km
) VALUES (
    (SELECT id FROM customer_profiles LIMIT 1),
    '{"street": "Customer App Test Pickup", "city": "Test City"}',
    -33.8688,
    151.2093,
    '{"street": "Customer App Test Delivery", "city": "Test City"}',
    -33.8650,
    151.2094,
    '[{"name": "Test Materials", "quantity": 3, "unit": "tons"}]',
    3.0,
    'asap', -- This is what customer app sends
    150.00,
    'pending',
    2.5
) RETURNING 
    'Simulated customer app trip created:' as debug_section,
    id,
    pickup_time_preference,
    status;

-- 2. Get the trip ID to test with (we'll need to run step 1 first to get this)
-- For now, let's test with an existing trip ID we know exists

-- 3. Test the exact .rpc() call that customer app makes
-- This simulates: await supabase.rpc('start_asap_matching_uber_style', { trip_request_id: data.id })

SELECT 'Testing exact customer app RPC call' as test_info;

-- Call the function exactly as customer app does
SELECT * FROM start_asap_matching_uber_style('e8608137-20e6-49aa-ab16-f5f8115c0174'::UUID);

-- 4. Check if the trip got updated
SELECT 
    'After customer app simulation:' as debug_section,
    id,
    status,
    pickup_time_preference,
    assigned_driver_id,
    matching_started_at,
    acceptance_deadline
FROM trip_requests 
WHERE id = 'e8608137-20e6-49aa-ab16-f5f8115c0174';

-- 5. Check what trips are available for ASAP matching
SELECT 
    'Current ASAP trips available:' as debug_section,
    id,
    pickup_time_preference,
    status,
    assigned_driver_id,
    created_at
FROM trip_requests 
WHERE pickup_time_preference = 'asap' 
AND status = 'pending'
ORDER BY created_at DESC;
