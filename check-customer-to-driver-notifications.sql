-- CHECK CUSTOMER→DRIVER NOTIFICATIONS IN DATABASE
-- This verifies that customer messages create driver notifications automatically

-- 1. Check recent customer messages
SELECT 'Recent Customer Messages:' as check_step,
       tm.id as message_id,
       tm.trip_id,
       tm.sender_type,
       tm.content,
       tm.created_at
FROM trip_messages tm
WHERE tm.sender_type = 'customer'
    AND tm.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY tm.created_at DESC
LIMIT 5;

-- 2. Check corresponding driver notifications created by the trigger
SELECT 'Customer→Driver Notifications:' as check_step,
       n.id as notification_id,
       n.user_id as driver_id,
       n.trip_id,
       n.title,
       n.message,
       n.type,
       n.data->>'message_id' as original_message_id,
       n.data->>'sender_type' as sender_type,
       n.created_at
FROM notifications n
WHERE n.type = 'customer_message'
    AND n.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY n.created_at DESC
LIMIT 5;

-- 3. Match customer messages with their notifications
SELECT 'Customer Messages with Driver Notifications:' as check_step,
       tm.id as message_id,
       tm.content as customer_message,
       tm.created_at as message_time,
       n.id as notification_id,
       n.title as notification_title,
       n.message as notification_content,
       n.user_id as notified_driver_id,
       n.created_at as notification_time,
       CASE 
           WHEN n.id IS NOT NULL THEN '✅ NOTIFICATION CREATED'
           ELSE '❌ NO NOTIFICATION'
       END as status
FROM trip_messages tm
LEFT JOIN notifications n ON n.data->>'message_id' = tm.id::text
    AND n.type = 'customer_message'
WHERE tm.sender_type = 'customer'
    AND tm.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY tm.created_at DESC
LIMIT 10;

-- 4. Check the trigger function exists and is active
SELECT 'Database Trigger Status:' as check_step,
       trigger_name,
       event_manipulation,
       event_object_table,
       action_timing,
       action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'trip_messages'
    AND trigger_name LIKE '%customer%';

-- 5. Count success rate for customer→driver notifications
SELECT 'Customer→Driver Notification Success Rate:' as check_step,
       COUNT(tm.id) as total_customer_messages,
       COUNT(n.id) as messages_with_notifications,
       ROUND(
           (COUNT(n.id)::float / NULLIF(COUNT(tm.id), 0)) * 100, 2
       ) as success_rate_percentage
FROM trip_messages tm
LEFT JOIN notifications n ON n.data->>'message_id' = tm.id::text
    AND n.type = 'customer_message'
WHERE tm.sender_type = 'customer'
    AND tm.created_at >= NOW() - INTERVAL '24 hours';

-- 6. Show the trigger function definition
SELECT 'Trigger Function Details:' as check_step,
       routine_name,
       routine_type,
       routine_definition
FROM information_schema.routines 
WHERE routine_name = 'notify_driver_of_customer_message';
