-- Test customer message push notification system
-- This simulates a customer sending a message to test if driver gets push notification

-- 1. First check current trips with assigned drivers
SELECT 
    id,
    assigned_driver_id,
    status,
    load_description,
    created_at
FROM trip_requests 
WHERE assigned_driver_id IS NOT NULL 
ORDER BY created_at DESC
LIMIT 3;

-- 2. Send a test message from customer to driver
-- Use the trip ID from step 1 that has an assigned driver
INSERT INTO trip_messages (
    trip_id,
    sender_id,
    sender_type,
    message_type,
    content,
    is_read,
    delivered_at
) VALUES (
    -- Replace with actual trip ID that has assigned_driver_id
    (SELECT id FROM trip_requests WHERE assigned_driver_id IS NOT NULL ORDER BY created_at DESC LIMIT 1),
    'c9911957-47c1-4ff3-94d8-1f9c87e60a4c', -- Customer ID
    'customer',
    'text',
    'Hello! What time will you arrive for pickup? I have the materials ready.',
    false,
    NOW()
);

-- 3. Check if notification was automatically created by trigger
SELECT 
    n.id,
    n.user_id as driver_id,
    n.trip_id,
    n.title,
    n.message,
    n.type,
    n.priority,
    n.push_sent,
    n.created_at,
    tr.load_description
FROM notifications n
JOIN trip_requests tr ON n.trip_id = tr.id
WHERE n.type = 'customer_message'
ORDER BY n.created_at DESC
LIMIT 1;

-- 4. Show the original message that triggered the notification
SELECT 
    tm.id,
    tm.trip_id,
    tm.sender_type,
    tm.content,
    tm.created_at,
    tr.assigned_driver_id
FROM trip_messages tm
JOIN trip_requests tr ON tm.trip_id = tr.id
WHERE tm.sender_type = 'customer'
ORDER BY tm.created_at DESC
LIMIT 1;
