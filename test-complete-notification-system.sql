-- COMPREHENSIVE NOTIFICATION SYSTEM TESTING SCRIPT
-- This script tests both customer→driver and driver→customer notifications
-- Run these queries in order to verify the complete notification system

-- =============================================================================
-- PART 1: VERIFY NOTIFICATION INFRASTRUCTURE
-- =============================================================================

-- 1. Check notification tables structure and templates
SELECT 'NOTIFICATION TEMPLATES' as check_type;
SELECT id, title_template, message_template, type, category 
FROM notification_templates 
WHERE category IN ('communication', 'driver_action')
ORDER BY category, id;

-- 2. Check if triggers exist for customer→driver notifications  
SELECT 'CUSTOMER→DRIVER TRIGGERS' as check_type;
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'trip_messages';

-- 3. Check user notification tokens (customers who can receive push notifications)
SELECT 'CUSTOMER NOTIFICATION TOKENS' as check_type;
SELECT unt.user_id, unt.user_type, unt.platform, unt.active, unt.last_used_at
FROM user_notification_tokens unt
WHERE unt.user_type = 'customer' AND unt.active = true
LIMIT 5;

-- =============================================================================
-- PART 2: CHECK RECENT NOTIFICATION ACTIVITY
-- =============================================================================

-- 4. Check recent notifications (last 24 hours)
SELECT 'RECENT NOTIFICATIONS (24h)' as check_type;
SELECT 
    n.id,
    n.user_id,
    n.type,
    n.title,
    LEFT(n.message, 50) as message_preview,
    n.push_sent,
    n.push_sent_at,
    n.created_at,
    CASE 
        WHEN n.data->>'message_type' = 'image' THEN '📷 Photo'
        WHEN n.data->>'message_type' = 'text' THEN '💬 Text'
        ELSE n.data->>'message_type'
    END as message_type
FROM notifications n
WHERE n.created_at >= NOW() - INTERVAL '24 hours'
ORDER BY n.created_at DESC
LIMIT 10;

-- 5. Check driver message notifications specifically
SELECT 'DRIVER MESSAGE NOTIFICATIONS' as check_type;
SELECT 
    n.id,
    n.title,
    n.message,
    n.push_sent,
    n.data->>'message_type' as message_type,
    n.data->>'trip_id' as trip_id,
    n.created_at
FROM notifications n
WHERE n.title LIKE '%Driver%' OR n.title LIKE '%Message from%'
ORDER BY n.created_at DESC
LIMIT 10;

-- =============================================================================
-- PART 3: TEST CUSTOMER→DRIVER NOTIFICATIONS (Auto Trigger)
-- =============================================================================

-- 6. Find an active trip to test with
SELECT 'ACTIVE TRIPS FOR TESTING' as check_type;
SELECT 
    tr.id as trip_id,
    tr.assigned_driver_id,
    tr.customer_id,
    tr.status,
    tr.load_description
FROM trip_requests tr
WHERE tr.assigned_driver_id IS NOT NULL 
    AND tr.status IN ('matched', 'pickup_started', 'in_transit', 'arrived_pickup')
ORDER BY tr.created_at DESC
LIMIT 3;

-- 7. Test customer→driver notification (this should trigger automatically)
INSERT INTO trip_messages (
    trip_id,
    sender_id,
    sender_type,
    message_type,
    content,
    is_read,
    delivered_at
) 
SELECT 
    tr.id,
    tr.customer_id,
    'customer',
    'text',
    'Test message from customer - checking notification system at ' || NOW(),
    false,
    NOW()
FROM trip_requests tr
WHERE tr.assigned_driver_id IS NOT NULL 
    AND tr.status IN ('matched', 'pickup_started', 'in_transit')
ORDER BY tr.created_at DESC
LIMIT 1;

-- 8. Check if the trigger created the notification
SELECT 'CUSTOMER→DRIVER TEST RESULT' as check_type;
SELECT 
    n.id,
    n.title,
    n.message,
    n.type,
    n.data->>'message_id' as message_id,
    n.created_at,
    tm.content as original_message
FROM notifications n
JOIN trip_messages tm ON n.data->>'message_id' = tm.id::text
WHERE n.type = 'customer_message'
    AND n.created_at >= NOW() - INTERVAL '1 minute'
ORDER BY n.created_at DESC
LIMIT 1;

-- =============================================================================
-- PART 4: VERIFY DRIVER→CUSTOMER NOTIFICATION SYSTEM
-- =============================================================================

-- 9. Check if EnhancedNotificationService notifications exist
SELECT 'DRIVER→CUSTOMER NOTIFICATIONS' as check_type;
SELECT 
    n.id,
    n.title,
    n.message,
    n.type,
    n.data->>'message_type' as message_type,
    n.data->>'sender_type' as sender_type,
    n.push_sent,
    n.created_at
FROM notifications n
WHERE (n.title LIKE '%Message from Driver%' OR n.title LIKE '%Driver%')
    AND n.data->>'sender_type' = 'driver'
ORDER BY n.created_at DESC
LIMIT 10;

-- 10. Check notification template usage statistics
SELECT 'NOTIFICATION TEMPLATE USAGE' as check_type;
SELECT 
    nt.id as template_id,
    nt.title_template,
    COUNT(n.id) as notifications_sent,
    MAX(n.created_at) as last_used
FROM notification_templates nt
LEFT JOIN notifications n ON (
    (n.title LIKE REPLACE(nt.title_template, '{driver_name}', '%') OR
     n.title LIKE REPLACE(nt.title_template, '{{sender_type}}', '%') OR
     n.title = nt.title_template)
)
WHERE nt.category IN ('communication', 'driver_action')
GROUP BY nt.id, nt.title_template
ORDER BY notifications_sent DESC;

-- =============================================================================
-- PART 5: NOTIFICATION DELIVERY STATUS
-- =============================================================================

-- 11. Check notification delivery success rates
SELECT 'NOTIFICATION DELIVERY STATUS' as check_type;
SELECT 
    COUNT(*) as total_notifications,
    COUNT(CASE WHEN push_sent = true THEN 1 END) as push_sent_count,
    COUNT(CASE WHEN push_sent = false OR push_sent IS NULL THEN 1 END) as push_pending_count,
    ROUND(
        (COUNT(CASE WHEN push_sent = true THEN 1 END) * 100.0 / COUNT(*)), 2
    ) as delivery_success_rate
FROM notifications
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- 12. Check for any notification errors or issues
SELECT 'RECENT NOTIFICATION ISSUES' as check_type;
SELECT 
    n.id,
    n.title,
    n.push_sent,
    n.push_sent_at,
    n.created_at,
    CASE 
        WHEN n.push_sent = false AND n.created_at < NOW() - INTERVAL '5 minutes' THEN 'DELAYED'
        WHEN n.push_sent IS NULL THEN 'PENDING'
        ELSE 'OK'
    END as status
FROM notifications n
WHERE n.created_at >= NOW() - INTERVAL '1 hour'
    AND (n.push_sent = false OR n.push_sent IS NULL)
ORDER BY n.created_at DESC;

-- =============================================================================
-- SUMMARY REPORT
-- =============================================================================

SELECT 'NOTIFICATION SYSTEM SUMMARY' as check_type;
SELECT 
    'System Status: ' || 
    CASE 
        WHEN EXISTS (SELECT 1 FROM notification_templates WHERE id = 'driver_message') 
             AND EXISTS (SELECT 1 FROM information_schema.triggers WHERE event_object_table = 'trip_messages')
        THEN '✅ FULLY OPERATIONAL'
        ELSE '❌ NEEDS ATTENTION'
    END as system_status;

-- Display recent activity summary
SELECT 
    'Last 24h Activity: ' || 
    COUNT(*) || ' notifications, ' ||
    COUNT(CASE WHEN push_sent = true THEN 1 END) || ' delivered'
    as activity_summary
FROM notifications 
WHERE created_at >= NOW() - INTERVAL '24 hours';
