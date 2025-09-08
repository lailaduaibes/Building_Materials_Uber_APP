-- Test the exact same RPC call that customer app makes
-- This simulates what happens when customer app calls the function

-- First, let's create a fresh ASAP trip to test with
INSERT INTO trip_requests (
    id,
    customer_id,
    pickup_address,
    delivery_address,
    materials,
    total_price,
    status,
    trip_type,
    created_at
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM customer_profiles LIMIT 1), -- Use any customer
    '{"street": "123 Test St", "city": "Test City", "coordinates": {"lat": -33.8688, "lng": 151.2093}}',
    '{"street": "456 Delivery Ave", "city": "Test City", "coordinates": {"lat": -33.8650, "lng": 151.2094}}',
    '[{"name": "Cement", "quantity": 5, "unit": "bags"}]',
    150.00,
    'pending',
    'ASAP',
    NOW()
) RETURNING 
    'New test trip created:' as debug_section,
    id,
    customer_id,
    status,
    trip_type;

-- Now test calling the function on this new trip
-- (We'll need to get the trip ID from the above result first)

-- Alternative: Test with a known existing trip
SELECT 'Testing function call with customer context' as test_info;

-- Check current user context
SELECT 
    'Current session info:' as debug_section,
    current_user as db_user,
    session_user as session_user,
    current_setting('role') as current_role;

-- Try calling the function (replace with actual trip ID after creating above)
-- This is exactly what the customer app does via .rpc()
-- We'll need the actual trip ID from the INSERT result above
