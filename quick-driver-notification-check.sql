-- QUICK DRIVER→CUSTOMER NOTIFICATION CHECK
-- Run this to verify if driver messages are triggering customer notifications

-- 1. Check if driver_message template exists and is correct
SELECT 'Driver Message Template:' as check_type, 
       id, title_template, message_template, type, category 
FROM notification_templates 
WHERE id = 'driver_message';

-- 2. Check recent driver messages in trip_messages table
SELECT 'Recent Driver Messages:' as check_type,
       tm.id,
       tm.trip_id,
       tm.sender_type,
       tm.message_type,
       LEFT(tm.content, 50) as content_preview,
       tm.created_at
FROM trip_messages tm
WHERE tm.sender_type = 'driver'
    AND tm.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY tm.created_at DESC
LIMIT 5;

-- 3. Check if notifications were created for these driver messages
SELECT 'Driver Message Notifications:' as check_type,
       n.id,
       n.title,
       LEFT(n.message, 50) as message_preview,
       n.data->>'message_type' as message_type,
       n.data->>'trip_id' as trip_id,
       n.push_sent,
       n.created_at
FROM notifications n
WHERE n.title LIKE '%Message from Driver%'
    AND n.created_at >= NOW() - INTERVAL '1 hour'
ORDER BY n.created_at DESC
LIMIT 5;

-- 4. Check if there's a mismatch (driver messages without notifications)
SELECT 'Missing Notifications Count:' as check_type,
       COUNT(*) as driver_messages_without_notifications
FROM trip_messages tm
LEFT JOIN notifications n ON n.data->>'trip_id' = tm.trip_id::text 
    AND n.title LIKE '%Message from Driver%'
    AND n.created_at >= tm.created_at - INTERVAL '1 minute'
    AND n.created_at <= tm.created_at + INTERVAL '1 minute'
WHERE tm.sender_type = 'driver'
    AND tm.created_at >= NOW() - INTERVAL '24 hours'
    AND n.id IS NULL;

-- 5. Show the most recent driver→customer communication flow
SELECT 'Recent Driver→Customer Flow:' as check_type,
       'Message ID: ' || tm.id || 
       ' | Type: ' || tm.message_type ||
       ' | Content: ' || LEFT(tm.content, 30) ||
       ' | Notification: ' || COALESCE('YES (ID: ' || n.id || ')', 'NO') as communication_flow
FROM trip_messages tm
LEFT JOIN notifications n ON n.data->>'trip_id' = tm.trip_id::text 
    AND n.title LIKE '%Message from Driver%'
    AND n.created_at BETWEEN tm.created_at - INTERVAL '1 minute' AND tm.created_at + INTERVAL '1 minute'
WHERE tm.sender_type = 'driver'
    AND tm.created_at >= NOW() - INTERVAL '2 hours'
ORDER BY tm.created_at DESC
LIMIT 10;
