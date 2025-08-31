-- Check current database structure for analytics and notifications
-- Run this to see what we already have

-- 1. List all tables in your database
SELECT 
    '🗄️ ALL TABLES IN DATABASE:' as check_type,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 2. Check if notifications table exists and its structure
SELECT 
    '📱 NOTIFICATIONS TABLE STRUCTURE:' as check_type,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check existing notification data (if any)
SELECT 
    '📊 EXISTING NOTIFICATION DATA:' as check_type,
    COUNT(*) as total_notifications,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) FILTER (WHERE type = 'trip_update') as trip_updates,
    COUNT(*) FILTER (WHERE type = 'system') as system_notifications,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as recent_notifications
FROM notifications;

-- 4. Check trip_requests table structure (for analytics)
SELECT 
    '🚛 TRIP_REQUESTS TABLE STRUCTURE:' as check_type,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'trip_requests' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Check driver_profiles table structure
SELECT 
    '👷 DRIVER_PROFILES TABLE STRUCTURE:' as check_type,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'driver_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Check current trip statistics
SELECT 
    '📈 CURRENT TRIP STATISTICS:' as check_type,
    COUNT(*) as total_trips,
    COUNT(*) FILTER (WHERE status = 'delivered') as completed_trips,
    COUNT(*) FILTER (WHERE pickup_time_preference = 'asap') as asap_trips,
    COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today_trips,
    ROUND(AVG(final_price), 2) as avg_price,
    ROUND(SUM(final_price) FILTER (WHERE status = 'delivered'), 2) as total_revenue
FROM trip_requests;

-- 7. Check current driver statistics  
SELECT 
    '👥 CURRENT DRIVER STATISTICS:' as check_type,
    COUNT(*) as total_drivers,
    COUNT(*) FILTER (WHERE approval_status = 'approved') as approved_drivers,
    COUNT(*) FILTER (WHERE approval_status = 'pending') as pending_drivers,
    COUNT(*) FILTER (WHERE is_online = true) as online_drivers,
    COUNT(*) FILTER (WHERE approval_status = 'approved' AND is_online = true) as active_drivers
FROM driver_profiles;

-- 8. Check what analytics/metrics tables we might already have
SELECT 
    '📊 EXISTING ANALYTICS TABLES:' as check_type,
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
    table_name LIKE '%analytic%' OR 
    table_name LIKE '%metric%' OR 
    table_name LIKE '%stat%' OR
    table_name LIKE '%performance%' OR
    table_name LIKE '%report%'
)
ORDER BY table_name;
