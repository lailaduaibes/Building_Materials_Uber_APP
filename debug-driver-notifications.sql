-- DEBUG DRIVER→CUSTOMER NOTIFICATION ISSUES
-- This will help us understand why notifications aren't being created

-- 1. Check if ANY notifications were created today
SELECT 'All Notifications Today:' as debug_step,
       COUNT(*) as total_notifications,
       string_agg(DISTINCT type, ', ') as notification_types
FROM notifications 
WHERE created_at >= CURRENT_DATE;

-- 2. Check notification_templates to ensure driver_message template exists
SELECT 'Driver Message Template:' as debug_step,
       id, title_template, message_template, type, category
FROM notification_templates 
WHERE id = 'driver_message';

-- 3. Check if there are any notifications with driver-related titles
SELECT 'Driver-Related Notifications:' as debug_step,
       id, title, message, type, created_at
FROM notifications 
WHERE (title LIKE '%driver%' OR title LIKE '%Driver%' OR title LIKE '%MESSAGE%')
    AND created_at >= CURRENT_DATE
ORDER BY created_at DESC
LIMIT 5;

-- 4. Check the recent driver messages with trip details
SELECT 'Driver Messages with Trip Info:' as debug_step,
       tm.id as message_id,
       tm.trip_id,
       tm.content,
       tm.message_type,
       tm.created_at,
       tr.customer_id,
       tr.assigned_driver_id
FROM trip_messages tm
JOIN trip_requests tr ON tr.id = tm.trip_id
WHERE tm.sender_type = 'driver'
    AND tm.created_at >= NOW() - INTERVAL '2 hours'
ORDER BY tm.created_at DESC
LIMIT 5;

-- 5. Check if user_notification_tokens exist for customers
SELECT 'Customer Notification Tokens:' as debug_step,
       COUNT(*) as active_customer_tokens
FROM user_notification_tokens unt
WHERE unt.user_type = 'customer' 
    AND unt.active = true;

-- 6. Check for any errors or failed notifications
SELECT 'Failed/Pending Notifications:' as debug_step,
       COUNT(*) as pending_notifications
FROM notifications 
WHERE (push_sent = false OR push_sent IS NULL)
    AND created_at >= NOW() - INTERVAL '2 hours';

-- 7. Look for notifications that might have been created with different titles
SELECT 'Recent Notifications (any type):' as debug_step,
       id, title, LEFT(message, 30) as message_preview, type, created_at
FROM notifications 
WHERE created_at >= NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC
LIMIT 10;
