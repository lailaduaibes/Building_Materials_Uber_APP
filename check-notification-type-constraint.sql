-- CHECK NOTIFICATION TYPE CONSTRAINT
-- Find out what values are allowed for notifications.type

-- 1. Check the constraint definition
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'notifications_type_check';

-- 2. Check existing notification types in the database
SELECT 'Existing Notification Types:' as check_step,
       type, 
       COUNT(*) as count
FROM notifications 
GROUP BY type
ORDER BY count DESC;

-- 3. Check what the template expects vs what we're using
SELECT 'Template vs Usage Mismatch:' as check_step,
       nt.type as template_type,
       'driver_message' as our_type,
       CASE 
           WHEN nt.type = 'driver_message' THEN '✅ MATCH'
           ELSE '❌ MISMATCH - USE: ' || nt.type
       END as status
FROM notification_templates nt
WHERE nt.id = 'driver_message';

-- 4. Show what types work for recent notifications
SELECT 'Working Notification Types:' as check_step,
       type
FROM notifications 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY type
ORDER BY type;
