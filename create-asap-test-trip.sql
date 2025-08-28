-- Simple ASAP Test Trip Creator
-- This creates a test trip at the driver's exact location for immediate ASAP testing

-- Get current driver location and info
\echo '🔍 Getting current driver info...'
SELECT 
    u.id as driver_user_id,
    u.first_name,
    u.last_name,
    u.current_latitude,
    u.current_longitude
FROM users u 
WHERE u.email = 'drivetest1412@gmail.com';

-- Delete any existing ASAP test trips
\echo '🧹 Cleaning up existing ASAP test trips...'
DELETE FROM trip_requests 
WHERE load_description LIKE '%ASAP TEST%';

-- Insert new ASAP test trip
\echo '🚨 Creating ASAP test trip...'
INSERT INTO trip_requests (
    id,
    customer_id,
    pickup_latitude,
    pickup_longitude,
    delivery_latitude, 
    delivery_longitude,
    pickup_address,
    delivery_address,
    material_type,
    estimated_weight_tons,
    load_description,
    pickup_time_preference,
    status,
    quoted_price,
    special_requirements,
    created_at
) VALUES (
    gen_random_uuid(),
    'c9911957-47c1-4ff3-94d8-1f9c87e60a4c', -- Laila's customer ID
    32.388850, -- Driver's exact latitude
    32.321952, -- Driver's exact longitude  
    32.39,     -- Nearby delivery
    35.33,     -- Nearby delivery
    jsonb_build_object(
        'street', 'Test Pickup Street',
        'city', 'Test City', 
        'state', 'Test State',
        'postal_code', '12345',
        'formatted_address', '🚨 ASAP TEST - Exact Driver Location'
    ),
    jsonb_build_object(
        'street', 'Test Delivery Street',
        'city', 'Test Delivery City',
        'state', 'Test State', 
        'postal_code', '54321',
        'formatted_address', '🚨 ASAP TEST - Delivery Location'
    ),
    'steel_beams', -- Compatible with Flatbed Truck
    2.5,
    '🚨 ASAP TEST - Steel Beams Delivery - URGENT',
    'asap', -- This is the key for ASAP detection
    'pending', -- Must be pending to be detected
    150,
    'Urgent ASAP test delivery for system testing',
    NOW()
);

-- Verify the trip was created correctly
\echo '✅ Verifying ASAP test trip...'
SELECT 
    id,
    LEFT(id::text, 8) as short_id,
    pickup_time_preference,
    status,
    assigned_driver_id,
    load_description,
    material_type,
    pickup_latitude,
    pickup_longitude
FROM trip_requests 
WHERE load_description LIKE '%ASAP TEST%'
ORDER BY created_at DESC 
LIMIT 1;

\echo '🎯 ASAP test trip created! Now test the driver app - the trip should trigger an ASAP notification!'
