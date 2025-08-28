-- =============================================================================
-- CHECK SCHEDULING DATA IN DATABASE
-- =============================================================================

-- Check what pickup_time_preference and scheduled_pickup_time values exist
SELECT 
    id,
    pickup_time_preference,
    scheduled_pickup_time,
    status,
    created_at,
    pickup_location,
    delivery_location
FROM trip_requests 
WHERE status IN ('pending', 'assigned', 'accepted')
ORDER BY created_at DESC
LIMIT 20;

-- Check for NULL or missing scheduling data
SELECT 
    COUNT(*) as total_trips,
    COUNT(pickup_time_preference) as has_preference,
    COUNT(scheduled_pickup_time) as has_scheduled_time,
    COUNT(CASE WHEN pickup_time_preference = 'asap' THEN 1 END) as asap_trips,
    COUNT(CASE WHEN pickup_time_preference = 'scheduled' THEN 1 END) as scheduled_trips
FROM trip_requests 
WHERE status IN ('pending', 'assigned', 'accepted');

-- Sample the actual values to see what's in there
SELECT DISTINCT 
    pickup_time_preference,
    CASE 
        WHEN scheduled_pickup_time IS NULL THEN 'NULL'
        ELSE 'HAS_VALUE'
    END as scheduled_time_status
FROM trip_requests 
WHERE status IN ('pending', 'assigned', 'accepted');

-- Insert a test trip with scheduling data to verify the flow
INSERT INTO trip_requests (
    customer_id,
    pickup_location,
    delivery_location,
    materials,
    pickup_time_preference,
    scheduled_pickup_time,
    status
) VALUES (
    (SELECT id FROM users WHERE role = 'customer' LIMIT 1),
    '{"address": "Test Pickup Address", "latitude": 32.387637, "longitude": 35.318435}',
    '{"address": "Test Delivery Address", "latitude": 32.390000, "longitude": 35.320000}',
    '[{"type": "Sand", "quantity": 5, "unit": "tons"}]',
    'scheduled',
    (NOW() + INTERVAL '2 hours')::timestamp,
    'pending'
);

-- Verify the test trip was inserted correctly
SELECT 
    id,
    pickup_time_preference,
    scheduled_pickup_time,
    status,
    materials
FROM trip_requests 
WHERE pickup_location->>'address' = 'Test Pickup Address'
ORDER BY created_at DESC
LIMIT 1;
