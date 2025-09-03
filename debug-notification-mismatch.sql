-- CHECK FOR NOTIFICATIONS WITH DIFFERENT FIELD NAMES
-- The issue might be that notifications are being created but with different field structure

-- 1. Check for any notifications with trip_assignment_id instead of trip_id
SELECT 'Notifications with trip_assignment_id:' as debug_step,
       id, 
       title, 
       message, 
       type, 
       data->>'trip_assignment_id' as trip_assignment_id,
       data->>'message_type' as message_type,
       created_at
FROM notifications 
WHERE data->>'trip_assignment_id' IS NOT NULL
    AND created_at >= NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC;

-- 2. Check all notifications created in the last 2 hours regardless of type
SELECT 'All Recent Notifications:' as debug_step,
       id,
       user_id,
       title,
       LEFT(message, 40) as message_preview,
       type,
       data,
       created_at
FROM notifications 
WHERE created_at >= NOW() - INTERVAL '2 hours'
ORDER BY created_at DESC;

-- 3. Updated query to match notifications using trip_assignment_id
SELECT 'Driver Messages with Corrected Notification Match:' as debug_step,
       tm.id as message_id,
       tm.content,
       tm.message_type,
       tm.created_at as message_time,
       n.id as notification_id,
       n.title,
       n.message as notification_content,
       n.created_at as notification_time,
       n.data->>'trip_assignment_id' as trip_assignment_id
FROM trip_messages tm
LEFT JOIN notifications n ON n.data->>'trip_assignment_id' = tm.trip_id::text 
    AND n.type = 'driver_message'
    AND n.created_at BETWEEN tm.created_at - INTERVAL '2 minutes' AND tm.created_at + INTERVAL '2 minutes'
WHERE tm.sender_type = 'driver'
    AND tm.created_at >= NOW() - INTERVAL '2 hours'
ORDER BY tm.created_at DESC;

-- 4. Check specific message IDs from your test
SELECT 'Specific Message Check:' as debug_step,
       tm.id,
       tm.content,
       tm.trip_id,
       tm.created_at,
       COUNT(n.id) as notification_count
FROM trip_messages tm
LEFT JOIN notifications n ON (
    n.data->>'trip_assignment_id' = tm.trip_id::text 
    AND n.type = 'driver_message'
    AND n.created_at BETWEEN tm.created_at - INTERVAL '5 minutes' AND tm.created_at + INTERVAL '5 minutes'
)
WHERE tm.id IN (
    '6438f0cb-2198-4fcd-9279-9d8ea161ae36',
    '34383e08-e121-45c8-9234-13c31fcb4b38',
    '496982e0-25dd-4bba-a0b2-0aced0f55358'
)
GROUP BY tm.id, tm.content, tm.trip_id, tm.created_at;
