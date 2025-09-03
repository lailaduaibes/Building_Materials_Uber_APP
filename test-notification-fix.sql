-- TEST DRIVER→CUSTOMER NOTIFICATIONS AFTER FIX
-- Run this after the code changes to verify notifications are working

-- 1. Check recent driver messages (baseline)
SELECT 'Recent Driver Messages:' as test_step,
       id, trip_id, content, message_type, created_at
FROM trip_messages 
WHERE sender_type = 'driver' 
    AND created_at >= NOW() - INTERVAL '30 minutes'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check for corresponding notifications (should now work with trip_id)
SELECT 'Corresponding Notifications:' as test_step,
       n.id as notification_id,
       n.user_id as customer_id,
       n.trip_id,
       n.title,
       LEFT(n.message, 50) as message_preview,
       n.type,
       n.data->>'message_type' as message_type,
       n.data->>'notification_category' as notification_category,
       n.data->>'trip_id' as data_trip_id,
       n.created_at
FROM notifications n
WHERE (n.type = 'info' AND n.data->>'notification_category' = 'driver_message')
    AND n.created_at >= NOW() - INTERVAL '30 minutes'
ORDER BY n.created_at DESC
LIMIT 5;

-- 3. Updated matching query using trip_id (should now work)
SELECT 'Driver Messages with Notifications (Fixed):' as test_step,
       tm.id as message_id,
       tm.content,
       tm.message_type,
       tm.created_at as message_time,
       n.id as notification_id,
       n.title,
       n.message as notification_content,
       n.created_at as notification_time
FROM trip_messages tm
LEFT JOIN notifications n ON n.trip_id = tm.trip_id 
    AND n.type = 'info' 
    AND n.data->>'notification_category' = 'driver_message'
    AND n.created_at BETWEEN tm.created_at - INTERVAL '2 minutes' AND tm.created_at + INTERVAL '2 minutes'
WHERE tm.sender_type = 'driver'
    AND tm.created_at >= NOW() - INTERVAL '30 minutes'
ORDER BY tm.created_at DESC;

-- 4. Count notification success rate
SELECT 'Notification Success Rate:' as test_step,
       COUNT(tm.id) as total_driver_messages,
       COUNT(n.id) as messages_with_notifications,
       ROUND(
           (COUNT(n.id)::float / NULLIF(COUNT(tm.id), 0)) * 100, 2
       ) as success_rate_percentage
FROM trip_messages tm
LEFT JOIN notifications n ON n.trip_id = tm.trip_id 
    AND n.type = 'info' 
    AND n.data->>'notification_category' = 'driver_message'
    AND n.created_at BETWEEN tm.created_at - INTERVAL '2 minutes' AND tm.created_at + INTERVAL '2 minutes'
WHERE tm.sender_type = 'driver'
    AND tm.created_at >= NOW() - INTERVAL '30 minutes';

-- 5. Test with specific message IDs from your earlier test
SELECT 'Specific Messages Test:' as test_step,
       tm.id as message_id,
       tm.content,
       tm.created_at,
       CASE 
           WHEN n.id IS NOT NULL THEN '✅ NOTIFICATION FOUND'
           ELSE '❌ NO NOTIFICATION'
       END as notification_status,
       n.title
FROM trip_messages tm
LEFT JOIN notifications n ON n.trip_id = tm.trip_id 
    AND n.type = 'info' 
    AND n.data->>'notification_category' = 'driver_message'
    AND n.created_at BETWEEN tm.created_at - INTERVAL '5 minutes' AND tm.created_at + INTERVAL '5 minutes'
WHERE tm.id IN (
    '6438f0cb-2198-4fcd-9279-9d8ea161ae36',
    '34383e08-e121-45c8-9234-13c31fcb4b38',
    '496982e0-25dd-4bba-a0b2-0aced0f55358'
);

-- INSTRUCTIONS:
-- 1. After deploying the code changes, have a driver send a test message
-- 2. Run this script to verify the notification was created
-- 3. If still no notifications, check the app console logs for detailed errors
