-- =============================================================================
-- VERIFICATION SCRIPT FOR COMMUNICATION FEATURES
-- Check if all tables, indexes, policies, and functions exist
-- =============================================================================

-- 1. CHECK IF TABLES EXIST
SELECT 
    'Tables Check' as check_type,
    table_name,
    CASE WHEN table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('trip_messages', 'trip_photos', 'trip_call_logs', 'user_communication_preferences')
ORDER BY table_name;

-- 2. CHECK TABLE STRUCTURES
SELECT 
    'Table Columns Check' as check_type,
    t.table_name,
    COUNT(c.column_name) as column_count,
    string_agg(c.column_name, ', ' ORDER BY c.ordinal_position) as columns
FROM information_schema.tables t
LEFT JOIN information_schema.columns c ON t.table_name = c.table_name AND c.table_schema = 'public'
WHERE t.table_schema = 'public' 
AND t.table_name IN ('trip_messages', 'trip_photos', 'trip_call_logs', 'user_communication_preferences')
GROUP BY t.table_name
ORDER BY t.table_name;

-- 3. CHECK IF INDEXES EXIST
SELECT 
    'Indexes Check' as check_type,
    indexname,
    tablename,
    CASE WHEN indexname IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname IN (
    'idx_trip_messages_trip_id',
    'idx_trip_messages_sender', 
    'idx_trip_messages_created_at',
    'idx_trip_messages_unread',
    'idx_trip_photos_trip_id',
    'idx_trip_photos_type',
    'idx_trip_photos_taken_by',
    'idx_trip_call_logs_trip_id',
    'idx_trip_call_logs_participants',
    'idx_trip_call_logs_status'
)
ORDER BY indexname;

-- 4. CHECK RLS POLICIES
SELECT 
    'RLS Policies Check' as check_type,
    schemaname,
    tablename,
    policyname,
    cmd as policy_type,
    CASE WHEN policyname IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('trip_messages', 'trip_photos', 'trip_call_logs', 'user_communication_preferences')
ORDER BY tablename, policyname;

-- 5. CHECK FUNCTIONS
SELECT 
    'Functions Check' as check_type,
    routine_name,
    routine_type,
    CASE WHEN routine_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_trip_participants',
    'mark_messages_as_read', 
    'get_unread_message_count',
    'update_updated_at_column'
)
ORDER BY routine_name;

-- 6. CHECK TRIGGERS
SELECT 
    'Triggers Check' as check_type,
    trigger_name,
    event_object_table as table_name,
    CASE WHEN trigger_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name IN (
    'update_trip_messages_updated_at',
    'update_user_communication_preferences_updated_at'
)
ORDER BY trigger_name;

-- 7. CHECK NOTIFICATION TEMPLATES
SELECT 
    'Notification Templates Check' as check_type,
    id,
    title_template,
    CASE WHEN id IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM notification_templates 
WHERE id IN ('new_message', 'photo_requested', 'photo_uploaded', 'call_missed', 'eta_updated_message')
ORDER BY id;

-- 8. CHECK USER COMMUNICATION PREFERENCES DATA
SELECT 
    'User Preferences Data Check' as check_type,
    COUNT(*) as total_users_with_preferences,
    COUNT(CASE WHEN allow_messages THEN 1 END) as users_allowing_messages,
    COUNT(CASE WHEN allow_voice_calls THEN 1 END) as users_allowing_calls
FROM user_communication_preferences;

-- 9. SAMPLE DATA CHECK
SELECT 
    'Sample Data Check' as check_type,
    'trip_messages' as table_name,
    COUNT(*) as record_count
FROM trip_messages
UNION ALL
SELECT 
    'Sample Data Check' as check_type,
    'trip_photos' as table_name,
    COUNT(*) as record_count
FROM trip_photos
UNION ALL
SELECT 
    'Sample Data Check' as check_type,
    'trip_call_logs' as table_name,
    COUNT(*) as record_count
FROM trip_call_logs;

-- 10. OVERALL STATUS SUMMARY
SELECT 
    'SUMMARY' as check_type,
    CASE 
        WHEN (
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('trip_messages', 'trip_photos', 'trip_call_logs', 'user_communication_preferences')
        ) = 4 THEN '✅ All 4 tables exist'
        ELSE '❌ Some tables missing'
    END as tables_status,
    CASE 
        WHEN (
            SELECT COUNT(*) FROM pg_indexes 
            WHERE schemaname = 'public' 
            AND indexname LIKE 'idx_trip_%'
        ) >= 10 THEN '✅ Most indexes exist'
        ELSE '⚠️ Some indexes may be missing'
    END as indexes_status,
    CASE 
        WHEN (
            SELECT COUNT(*) FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_name IN ('get_trip_participants', 'mark_messages_as_read', 'get_unread_message_count')
        ) = 3 THEN '✅ All functions exist'
        ELSE '❌ Some functions missing'
    END as functions_status;
