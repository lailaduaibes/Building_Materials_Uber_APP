-- Test notification system for driver messages
-- Run these queries to verify the implementation is working

-- 1. Verify notifications table exists and has correct structure
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'notifications'
) as notifications_table_exists;

-- 2. Verify notification_templates table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'notification_templates'
) as notification_templates_table_exists;

-- 3. Check for driver_message template
SELECT * FROM notification_templates 
WHERE id = 'driver_message' OR category = 'driver_action';

-- 4. Test: Insert a sample driver message notification (replace UUIDs with real ones)
-- INSERT INTO notifications (
--     user_id, 
--     title, 
--     message, 
--     type, 
--     data
-- ) VALUES (
--     '00000000-0000-0000-0000-000000000000', -- Replace with real customer user_id
--     '💬 Message from Driver',
--     'John Doe: I am on my way to pickup location',
--     'driver_message',
--     '{"message_type": "text", "driver_name": "John Doe", "trip_assignment_id": "trip-123", "content": "I am on my way to pickup location"}'::jsonb
-- );

-- 5. Check recent driver message notifications
SELECT 
    n.id,
    n.user_id,
    n.title,
    n.message,
    n.type,
    n.data,
    n.created_at,
    n.status
FROM notifications n
WHERE n.type = 'driver_message'
ORDER BY n.created_at DESC
LIMIT 10;

-- 6. Check if user_notification_tokens table exists for push notifications
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'user_notification_tokens'
) as user_notification_tokens_exists;

-- 7. Check how many customers have active push tokens
SELECT 
    user_type,
    platform,
    active,
    COUNT(*) as count
FROM user_notification_tokens
WHERE user_type = 'customer'
GROUP BY user_type, platform, active
ORDER BY user_type, platform, active;

-- 8. Test the send_notification_with_template function exists
SELECT EXISTS (
    SELECT FROM information_schema.routines 
    WHERE routine_name = 'send_notification_with_template'
) as send_notification_function_exists;

-- 9. Check notification delivery success rate
SELECT 
    type,
    status,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY type), 2) as percentage
FROM notifications
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY type, status
ORDER BY type, count DESC;

-- 10. Verify RLS policies exist for notifications
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'notifications';
