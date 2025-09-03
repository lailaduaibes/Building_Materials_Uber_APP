-- Create a test ASAP notification for the trip you just created
-- This will simulate what should happen when a new ASAP trip is created

-- First, let's find the ASAP trip you just created
SELECT 
    id,
    pickup_time_preference,
    load_description,
    quoted_price,
    status,
    created_at
FROM trip_requests 
WHERE pickup_time_preference = 'asap' 
    AND load_description LIKE '%TEST ASAP%'
ORDER BY created_at DESC
LIMIT 1;

-- Now create a push notification for this trip
INSERT INTO notifications (
    user_id,           -- Driver ID
    trip_id,           -- The ASAP trip ID
    title,
    message,
    type,
    priority,
    data,
    push_sent
)
SELECT 
    'c9911957-47c1-4ff3-94d8-1f9c87e60a4c',  -- Driver user ID (same as customer for testing)
    tr.id,             -- Trip ID from the ASAP trip
    '🚨 URGENT: New ASAP Trip!',
    'Pickup from ' || (tr.pickup_address->>'formatted_address') || ' • Est. ' || tr.quoted_price || '₪ • Tap to accept',
    'asap_assignment',
    'critical',
    json_build_object(
        'pickup_location', tr.pickup_address->>'formatted_address',
        'estimated_earnings', tr.quoted_price,
        'urgency', 'asap',
        'material_type', tr.material_type,
        'distance_km', tr.estimated_distance_km
    )::jsonb,
    false              -- Push not sent yet (will be sent when driver app receives it)
FROM trip_requests tr
WHERE tr.pickup_time_preference = 'asap' 
    AND tr.load_description LIKE '%TEST ASAP%'
    AND tr.status = 'pending'
ORDER BY tr.created_at DESC
LIMIT 1;

-- Show the created notification
SELECT 
    n.id,
    n.title,
    n.message,
    n.type,
    n.priority,
    n.data,
    n.created_at,
    tr.load_description
FROM notifications n
JOIN trip_requests tr ON n.trip_id = tr.id
WHERE n.type = 'asap_assignment'
ORDER BY n.created_at DESC
LIMIT 1;
