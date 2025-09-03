-- Check notification tables structure and data
-- Run these queries to understand the current notification system

-- 1. Check notifications table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;

-- 2. Check notification_templates table structure  
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'notification_templates' 
ORDER BY ordinal_position;

-- 3. Check user_notification_tokens table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_notification_tokens' 
ORDER BY ordinal_position;

-- 4. Check existing notification templates
SELECT id, title_template, message_template, type, category 
FROM notification_templates 
ORDER BY category, id;

-- 5. Check recent notifications (last 24 hours)
SELECT id, user_id, type, title, body, status, created_at, sent_at, read_at
FROM notifications 
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 20;

-- 6. Check notification types and counts
SELECT type, status, COUNT(*) as count
FROM notifications 
GROUP BY type, status
ORDER BY type, status;

-- 7. Check driver message related notifications
SELECT n.*, nt.title_template, nt.message_template
FROM notifications n
LEFT JOIN notification_templates nt ON nt.id = 'driver_message'
WHERE n.type = 'info' AND n.title LIKE '%Driver%'
ORDER BY n.created_at DESC
LIMIT 10;

-- 8. Check if there are any triggers on trip_messages table
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'trip_messages';

-- 9. Check user notification tokens for customers
SELECT unt.user_id, unt.user_type, unt.platform, unt.active, unt.last_used_at
FROM user_notification_tokens unt
WHERE unt.user_type = 'customer' AND unt.active = true
LIMIT 10;

-- 10. Check if there's a function to send notifications automatically
SELECT routine_name, routine_type, routine_definition
FROM information_schema.routines 
WHERE routine_name LIKE '%notification%' OR routine_name LIKE '%message%'
ORDER BY routine_name;
