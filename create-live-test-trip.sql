-- Create a completely fresh ASAP trip for immediate testing
-- This will have a future deadline so the modal will show

DO $$
DECLARE
    new_trip_id UUID;
    customer_id UUID;
BEGIN
    -- Get a customer ID
    SELECT id INTO customer_id FROM customer_profiles LIMIT 1;
    
    -- Generate new trip ID
    new_trip_id := gen_random_uuid();
    
    -- Create fresh ASAP trip
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
        new_trip_id,
        customer_id,
        '{"street": "123 LIVE TEST St", "city": "Test City", "coordinates": {"lat": -33.8688, "lng": 151.2093}}',
        '{"street": "456 LIVE TEST Ave", "city": "Test City", "coordinates": {"lat": -33.8650, "lng": 151.2094}}',
        '[{"name": "LIVE TEST Cement", "quantity": 10, "unit": "bags"}]',
        250.00,
        'pending',
        'asap',
        15.5,
        NOW()
    );
    
    -- Immediately call the matching function
    PERFORM start_asap_matching_uber_style(new_trip_id);
    
    -- Show the result
    RAISE NOTICE '🚀 LIVE TEST TRIP CREATED AND ASSIGNED!';
    RAISE NOTICE 'Trip ID: %', new_trip_id;
    RAISE NOTICE 'Check your driver app NOW for the modal!';
    
END $$;
